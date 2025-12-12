/**
 * File Manager
 * Handles backup operations, ZIP extraction, and file system management
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { BackupMetadata, DeferredReplacement, UpdateError } from './types';
import {
  BACKUPS_DIRECTORY,
  USER_DATA_DIRECTORIES,
  DISK_SPACE_MULTIPLIER,
  BACKUP_RETENTION_DAYS,
  DEFERRED_REPLACEMENTS_FILE
} from './constants';
import {
  ensureDirectory,
  safeDelete,
  getAvailableDiskSpace,
  createUpdateError,
  getCurrentTimestamp,
  isFileInUse,
  copyFileWithProgress
} from './utils';

export class FileManager extends EventEmitter {
  private userDataPath: string;
  private appPath: string;

  constructor(userDataPath: string, appPath: string) {
    super();
    this.userDataPath = userDataPath;
    this.appPath = appPath;
  }

  /**
   * Create a backup of the current application
   */
  async createBackup(version: string): Promise<string> {
    const backupDir = path.join(this.userDataPath, BACKUPS_DIRECTORY, version);
    const filesDir = path.join(backupDir, 'files');

    try {
      // Create backup directory
      await ensureDirectory(filesDir);

      // Get list of files to backup (excluding user data)
      const filesToBackup = await this.getFilesToBackup();
      
      let totalSize = 0;
      let fileCount = 0;

      // Copy files to backup
      for (const file of filesToBackup) {
        const relativePath = path.relative(this.appPath, file);
        const destPath = path.join(filesDir, relativePath);
        
        await ensureDirectory(path.dirname(destPath));
        
        try {
          await fs.promises.copyFile(file, destPath);
          const stat = await fs.promises.stat(file);
          totalSize += stat.size;
          fileCount++;
        } catch (error: any) {
          // Skip files that can't be copied (might be in use)
          console.warn(`Could not backup file: ${file}`, error.message);
        }
      }

      // Create metadata file
      const metadata: BackupMetadata = {
        version,
        createdAt: getCurrentTimestamp(),
        fileCount,
        totalSize,
        appPath: this.appPath
      };

      await fs.promises.writeFile(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf8'
      );

      this.emit('backup-complete', { backupDir, fileCount, totalSize });
      return backupDir;
    } catch (error: any) {
      // Clean up partial backup
      await safeDelete(backupDir);
      throw createUpdateError(
        'system',
        `创建备份失败: ${error.message}`,
        true,
        { error: error.message }
      );
    }
  }

  /**
   * Get list of files to backup (excluding user data)
   */
  private async getFilesToBackup(): Promise<string[]> {
    const files: string[] = [];
    
    const walkDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(this.appPath, fullPath);
          
          // Skip user data directories
          if (this.isUserData(relativePath)) {
            continue;
          }
          
          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    await walkDir(this.appPath);
    return files;
  }

  /**
   * Check if a path is user data that should be excluded
   */
  private isUserData(relativePath: string): boolean {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    for (const userDataPath of USER_DATA_DIRECTORIES) {
      if (normalizedPath === userDataPath || 
          normalizedPath.startsWith(userDataPath + '/')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extract update package with user data protection
   */
  async extractUpdate(packagePath: string, tempDir?: string): Promise<void> {
    const AdmZip = require('adm-zip');
    const extractDir = tempDir || path.join(this.userDataPath, 'update-temp');
    const deferredReplacements: DeferredReplacement[] = [];

    try {
      await ensureDirectory(extractDir);
      
      const zip = new AdmZip(packagePath);
      const entries = zip.getEntries();

      for (const entry of entries) {
        if (entry.isDirectory) continue;

        const entryPath = entry.entryName;
        
        // Skip user data files
        if (this.isUserData(entryPath)) {
          continue;
        }

        const targetPath = path.join(this.appPath, entryPath);
        const tempPath = path.join(extractDir, entryPath);

        // Extract to temp location first
        await ensureDirectory(path.dirname(tempPath));
        zip.extractEntryTo(entry, path.dirname(tempPath), false, true);

        // Check if target file is in use
        if (await fs.promises.access(targetPath).then(() => true).catch(() => false)) {
          if (await isFileInUse(targetPath)) {
            // Schedule for deferred replacement
            deferredReplacements.push({
              sourcePath: tempPath,
              targetPath,
              scheduledAt: getCurrentTimestamp()
            });
            continue;
          }
        }

        // Replace file atomically
        await ensureDirectory(path.dirname(targetPath));
        await fs.promises.rename(tempPath, targetPath);
      }

      // Save deferred replacements if any
      if (deferredReplacements.length > 0) {
        await this.saveDeferredReplacements(deferredReplacements);
      }

      // Clean up temp directory (except deferred files)
      if (deferredReplacements.length === 0) {
        await safeDelete(extractDir);
      }

      this.emit('extract-complete', { 
        deferredCount: deferredReplacements.length 
      });
    } catch (error: any) {
      await safeDelete(extractDir);
      throw createUpdateError(
        'system',
        `解压更新包失败: ${error.message}`,
        true,
        { error: error.message }
      );
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    const filesDir = path.join(backupPath, 'files');
    
    try {
      // Verify backup exists
      const metadataPath = path.join(backupPath, 'metadata.json');
      if (!await fs.promises.access(metadataPath).then(() => true).catch(() => false)) {
        throw new Error('备份元数据不存在');
      }

      // Read metadata
      const metadata: BackupMetadata = JSON.parse(
        await fs.promises.readFile(metadataPath, 'utf8')
      );

      // Restore files
      const restoreDir = async (dir: string): Promise<void> => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const sourcePath = path.join(dir, entry.name);
          const relativePath = path.relative(filesDir, sourcePath);
          const targetPath = path.join(this.appPath, relativePath);
          
          if (entry.isDirectory()) {
            await ensureDirectory(targetPath);
            await restoreDir(sourcePath);
          } else {
            await ensureDirectory(path.dirname(targetPath));
            await fs.promises.copyFile(sourcePath, targetPath);
          }
        }
      };

      await restoreDir(filesDir);
      this.emit('restore-complete', { version: metadata.version });
    } catch (error: any) {
      throw createUpdateError(
        'system',
        `恢复备份失败: ${error.message}`,
        false,
        { error: error.message, backupPath }
      );
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupBackups(olderThanDays: number = BACKUP_RETENTION_DAYS): Promise<void> {
    const backupsDir = path.join(this.userDataPath, BACKUPS_DIRECTORY);
    
    try {
      if (!await fs.promises.access(backupsDir).then(() => true).catch(() => false)) {
        return;
      }

      const entries = await fs.promises.readdir(backupsDir, { withFileTypes: true });
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const backupPath = path.join(backupsDir, entry.name);
        const metadataPath = path.join(backupPath, 'metadata.json');

        try {
          const metadata: BackupMetadata = JSON.parse(
            await fs.promises.readFile(metadataPath, 'utf8')
          );

          const createdAt = new Date(metadata.createdAt);
          if (createdAt < cutoffDate) {
            await safeDelete(backupPath);
            this.emit('backup-deleted', { version: metadata.version });
          }
        } catch {
          // Skip backups without valid metadata
        }
      }
    } catch (error: any) {
      console.error('清理备份失败:', error.message);
    }
  }

  /**
   * Check available disk space
   */
  async checkDiskSpace(requiredBytes: number): Promise<boolean> {
    const requiredSpace = requiredBytes * DISK_SPACE_MULTIPLIER;
    const availableSpace = await getAvailableDiskSpace(this.userDataPath);
    return availableSpace >= requiredSpace;
  }

  /**
   * Get required disk space for update
   */
  getRequiredSpace(packageSize: number): number {
    return packageSize * DISK_SPACE_MULTIPLIER;
  }

  /**
   * Get user data directories
   */
  getUserDataPaths(): string[] {
    return USER_DATA_DIRECTORIES.map(p => path.join(this.userDataPath, p));
  }

  /**
   * Save deferred replacements to disk
   */
  private async saveDeferredReplacements(replacements: DeferredReplacement[]): Promise<void> {
    const filePath = path.join(this.userDataPath, DEFERRED_REPLACEMENTS_FILE);
    await fs.promises.writeFile(filePath, JSON.stringify(replacements, null, 2), 'utf8');
  }

  /**
   * Load and apply deferred replacements
   */
  async applyDeferredReplacements(): Promise<void> {
    const filePath = path.join(this.userDataPath, DEFERRED_REPLACEMENTS_FILE);
    
    try {
      if (!await fs.promises.access(filePath).then(() => true).catch(() => false)) {
        return;
      }

      const replacements: DeferredReplacement[] = JSON.parse(
        await fs.promises.readFile(filePath, 'utf8')
      );

      for (const replacement of replacements) {
        try {
          await ensureDirectory(path.dirname(replacement.targetPath));
          await fs.promises.rename(replacement.sourcePath, replacement.targetPath);
        } catch (error: any) {
          console.error(`延迟替换失败: ${replacement.targetPath}`, error.message);
        }
      }

      // Clean up
      await safeDelete(filePath);
      await safeDelete(path.join(this.userDataPath, 'update-temp'));
    } catch (error: any) {
      console.error('应用延迟替换失败:', error.message);
    }
  }

  /**
   * Check if backup exists for a version
   */
  async backupExists(version: string): Promise<boolean> {
    const backupPath = path.join(this.userDataPath, BACKUPS_DIRECTORY, version);
    const metadataPath = path.join(backupPath, 'metadata.json');
    return fs.promises.access(metadataPath).then(() => true).catch(() => false);
  }

  /**
   * Get backup path for a version
   */
  getBackupPath(version: string): string {
    return path.join(this.userDataPath, BACKUPS_DIRECTORY, version);
  }

  /**
   * Find latest backup
   */
  async findLatestBackup(): Promise<string | null> {
    const backupsDir = path.join(this.userDataPath, BACKUPS_DIRECTORY);
    
    try {
      if (!await fs.promises.access(backupsDir).then(() => true).catch(() => false)) {
        return null;
      }

      const entries = await fs.promises.readdir(backupsDir, { withFileTypes: true });
      let latestBackup: { path: string; date: Date } | null = null;

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const backupPath = path.join(backupsDir, entry.name);
        const metadataPath = path.join(backupPath, 'metadata.json');

        try {
          const metadata: BackupMetadata = JSON.parse(
            await fs.promises.readFile(metadataPath, 'utf8')
          );

          const createdAt = new Date(metadata.createdAt);
          if (!latestBackup || createdAt > latestBackup.date) {
            latestBackup = { path: backupPath, date: createdAt };
          }
        } catch {
          // Skip invalid backups
        }
      }

      return latestBackup?.path || null;
    } catch {
      return null;
    }
  }
}
