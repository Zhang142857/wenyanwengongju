/**
 * Config Backup Manager
 * 配置文件备份管理器
 * 
 * 在程序更新时安全地备份和恢复用户配置文件
 * 确保更新后用户的所有设置和数据不会丢失
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { app } from 'electron';
import { ConfigBackupMetadata } from './types';
import {
  CONFIG_BACKUP_DIRECTORY,
  CONFIG_FILES_TO_BACKUP,
  CONFIG_DIRECTORIES_TO_BACKUP
} from './constants';
import {
  ensureDirectory,
  safeDelete,
  getCurrentTimestamp
} from './utils';

export class ConfigBackupManager extends EventEmitter {
  private userDataPath: string;
  private appPath: string;
  private configDir: string;
  private tempDir: string;
  private cacheDir: string;

  constructor(userDataPath: string, appPath: string) {
    super();
    this.userDataPath = userDataPath;
    this.appPath = appPath;
    
    // 配置目录位于程序目录中
    this.configDir = path.join(appPath, 'config');
    this.tempDir = path.join(appPath, 'temp');
    this.cacheDir = path.join(appPath, 'cache');
  }

  /**
   * 获取配置备份目录
   */
  private getBackupDir(): string {
    return path.join(this.userDataPath, CONFIG_BACKUP_DIRECTORY);
  }

  /**
   * 在更新前备份所有配置文件
   * @param version 当前版本号
   * @returns 备份目录路径
   */
  async backupBeforeUpdate(version: string): Promise<string> {
    const timestamp = Date.now();
    const backupDir = path.join(this.getBackupDir(), `${version}-${timestamp}`);
    
    console.log(`📦 开始备份配置文件到: ${backupDir}`);
    
    try {
      await ensureDirectory(backupDir);
      
      const backedUpFiles: string[] = [];
      const backedUpDirs: string[] = [];
      let totalSize = 0;

      // 备份配置文件
      for (const file of CONFIG_FILES_TO_BACKUP) {
        const sourcePath = path.join(this.configDir, file);
        const destPath = path.join(backupDir, 'config', file);
        
        if (await this.fileExists(sourcePath)) {
          await ensureDirectory(path.dirname(destPath));
          await fs.promises.copyFile(sourcePath, destPath);
          const stat = await fs.promises.stat(sourcePath);
          totalSize += stat.size;
          backedUpFiles.push(file);
          console.log(`   ✓ 备份配置文件: ${file}`);
        }
      }

      // 备份配置目录
      for (const dir of CONFIG_DIRECTORIES_TO_BACKUP) {
        const sourcePath = this.getDirectoryPath(dir);
        const destPath = path.join(backupDir, dir);
        
        if (await this.directoryExists(sourcePath)) {
          const { fileCount, size } = await this.copyDirectory(sourcePath, destPath);
          totalSize += size;
          backedUpDirs.push(dir);
          console.log(`   ✓ 备份目录: ${dir} (${fileCount} 个文件)`);
        }
      }

      // 备份 userData 中的配置文件（向后兼容）
      const userDataConfigs = ['app-config.json', 'classical-chinese-data.json', 'init-data.json'];
      for (const file of userDataConfigs) {
        const sourcePath = path.join(this.userDataPath, file);
        const destPath = path.join(backupDir, 'userData', file);
        
        if (await this.fileExists(sourcePath)) {
          await ensureDirectory(path.dirname(destPath));
          await fs.promises.copyFile(sourcePath, destPath);
          const stat = await fs.promises.stat(sourcePath);
          totalSize += stat.size;
          backedUpFiles.push(`userData/${file}`);
          console.log(`   ✓ 备份用户数据: ${file}`);
        }
      }

      // 创建备份元数据
      const metadata: ConfigBackupMetadata = {
        version,
        createdAt: getCurrentTimestamp(),
        appVersion: app.getVersion(),
        files: backedUpFiles,
        directories: backedUpDirs,
        totalSize,
        appPath: this.appPath,
        configDir: this.configDir
      };

      await fs.promises.writeFile(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf8'
      );

      console.log(`✅ 配置备份完成: ${backedUpFiles.length} 个文件, ${backedUpDirs.length} 个目录`);
      
      this.emit('backup-complete', { 
        backupDir, 
        fileCount: backedUpFiles.length,
        dirCount: backedUpDirs.length,
        totalSize 
      });
      
      return backupDir;
    } catch (error: any) {
      console.error('❌ 配置备份失败:', error);
      await safeDelete(backupDir);
      throw error;
    }
  }

  /**
   * 更新后恢复配置文件
   * @param backupDir 备份目录路径（可选，默认使用最新备份）
   */
  async restoreAfterUpdate(backupDir?: string): Promise<void> {
    const targetBackup = backupDir || await this.findLatestBackup();
    
    if (!targetBackup) {
      console.log('⚠ 没有找到配置备份，跳过恢复');
      return;
    }

    console.log(`📥 开始恢复配置文件从: ${targetBackup}`);

    try {
      // 读取备份元数据
      const metadataPath = path.join(targetBackup, 'metadata.json');
      if (!await this.fileExists(metadataPath)) {
        throw new Error('备份元数据不存在');
      }

      const metadata: ConfigBackupMetadata = JSON.parse(
        await fs.promises.readFile(metadataPath, 'utf8')
      );

      let restoredCount = 0;

      // 恢复配置文件
      const configBackupDir = path.join(targetBackup, 'config');
      if (await this.directoryExists(configBackupDir)) {
        await ensureDirectory(this.configDir);
        const { fileCount } = await this.copyDirectory(configBackupDir, this.configDir);
        restoredCount += fileCount;
        console.log(`   ✓ 恢复配置目录: ${fileCount} 个文件`);
      }

      // 恢复其他目录
      for (const dir of CONFIG_DIRECTORIES_TO_BACKUP) {
        const sourcePath = path.join(targetBackup, dir);
        const destPath = this.getDirectoryPath(dir);
        
        if (await this.directoryExists(sourcePath)) {
          await ensureDirectory(destPath);
          const { fileCount } = await this.copyDirectory(sourcePath, destPath);
          restoredCount += fileCount;
          console.log(`   ✓ 恢复目录 ${dir}: ${fileCount} 个文件`);
        }
      }

      // 恢复 userData 中的配置文件
      const userDataBackupDir = path.join(targetBackup, 'userData');
      if (await this.directoryExists(userDataBackupDir)) {
        const files = await fs.promises.readdir(userDataBackupDir);
        for (const file of files) {
          const sourcePath = path.join(userDataBackupDir, file);
          const destPath = path.join(this.userDataPath, file);
          
          const stat = await fs.promises.stat(sourcePath);
          if (stat.isFile()) {
            await fs.promises.copyFile(sourcePath, destPath);
            restoredCount++;
            console.log(`   ✓ 恢复用户数据: ${file}`);
          }
        }
      }

      // 同步配置到 temp 目录
      await this.syncConfigToTemp();

      console.log(`✅ 配置恢复完成: ${restoredCount} 个文件`);
      
      this.emit('restore-complete', { 
        backupDir: targetBackup, 
        restoredCount,
        version: metadata.version 
      });
    } catch (error: any) {
      console.error('❌ 配置恢复失败:', error);
      this.emit('restore-failed', { error: error.message });
      throw error;
    }
  }


  /**
   * 同步配置到 temp 目录
   */
  private async syncConfigToTemp(): Promise<void> {
    if (!await this.directoryExists(this.configDir)) {
      return;
    }

    await ensureDirectory(this.tempDir);
    
    const files = await fs.promises.readdir(this.configDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sourcePath = path.join(this.configDir, file);
        const destPath = path.join(this.tempDir, file);
        
        const stat = await fs.promises.stat(sourcePath);
        if (stat.isFile()) {
          await fs.promises.copyFile(sourcePath, destPath);
        }
      }
    }
  }

  /**
   * 查找最新的配置备份
   */
  async findLatestBackup(): Promise<string | null> {
    const backupsDir = this.getBackupDir();
    
    try {
      if (!await this.directoryExists(backupsDir)) {
        return null;
      }

      const entries = await fs.promises.readdir(backupsDir, { withFileTypes: true });
      let latestBackup: { path: string; date: Date } | null = null;

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const backupPath = path.join(backupsDir, entry.name);
        const metadataPath = path.join(backupPath, 'metadata.json');

        try {
          const metadata: ConfigBackupMetadata = JSON.parse(
            await fs.promises.readFile(metadataPath, 'utf8')
          );

          const createdAt = new Date(metadata.createdAt);
          if (!latestBackup || createdAt > latestBackup.date) {
            latestBackup = { path: backupPath, date: createdAt };
          }
        } catch {
          // 跳过无效的备份
        }
      }

      return latestBackup?.path || null;
    } catch {
      return null;
    }
  }

  /**
   * 清理旧的配置备份（保留最近 3 个）
   */
  async cleanupOldBackups(keepCount: number = 3): Promise<void> {
    const backupsDir = this.getBackupDir();
    
    try {
      if (!await this.directoryExists(backupsDir)) {
        return;
      }

      const entries = await fs.promises.readdir(backupsDir, { withFileTypes: true });
      const backups: { path: string; date: Date }[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const backupPath = path.join(backupsDir, entry.name);
        const metadataPath = path.join(backupPath, 'metadata.json');

        try {
          const metadata: ConfigBackupMetadata = JSON.parse(
            await fs.promises.readFile(metadataPath, 'utf8')
          );
          backups.push({
            path: backupPath,
            date: new Date(metadata.createdAt)
          });
        } catch {
          // 跳过无效的备份
        }
      }

      // 按日期排序，最新的在前
      backups.sort((a, b) => b.date.getTime() - a.date.getTime());

      // 删除超出保留数量的备份
      for (let i = keepCount; i < backups.length; i++) {
        await safeDelete(backups[i].path);
        console.log(`   🗑️ 删除旧备份: ${path.basename(backups[i].path)}`);
      }

      if (backups.length > keepCount) {
        console.log(`✅ 清理了 ${backups.length - keepCount} 个旧配置备份`);
      }
    } catch (error: any) {
      console.error('清理配置备份失败:', error.message);
    }
  }

  /**
   * 检查是否有待恢复的配置
   */
  async hasPendingRestore(): Promise<boolean> {
    const pendingFlagPath = path.join(this.userDataPath, 'config-restore-pending.json');
    return this.fileExists(pendingFlagPath);
  }

  /**
   * 标记需要恢复配置
   */
  async markPendingRestore(backupDir: string): Promise<void> {
    const pendingFlagPath = path.join(this.userDataPath, 'config-restore-pending.json');
    await fs.promises.writeFile(pendingFlagPath, JSON.stringify({
      backupDir,
      markedAt: getCurrentTimestamp()
    }, null, 2), 'utf8');
  }

  /**
   * 清除恢复标记
   */
  async clearPendingRestore(): Promise<void> {
    const pendingFlagPath = path.join(this.userDataPath, 'config-restore-pending.json');
    await safeDelete(pendingFlagPath);
  }

  /**
   * 在启动时检查并恢复配置
   */
  async checkAndRestoreOnStartup(): Promise<boolean> {
    const pendingFlagPath = path.join(this.userDataPath, 'config-restore-pending.json');
    
    try {
      if (!await this.fileExists(pendingFlagPath)) {
        return false;
      }

      const pendingData = JSON.parse(
        await fs.promises.readFile(pendingFlagPath, 'utf8')
      );

      console.log('🔄 检测到待恢复的配置，开始恢复...');
      
      await this.restoreAfterUpdate(pendingData.backupDir);
      await this.clearPendingRestore();
      
      // 清理旧备份
      await this.cleanupOldBackups();
      
      return true;
    } catch (error: any) {
      console.error('启动时恢复配置失败:', error);
      await this.clearPendingRestore();
      return false;
    }
  }

  /**
   * 获取目录路径
   */
  private getDirectoryPath(dir: string): string {
    switch (dir) {
      case 'config':
        return this.configDir;
      case 'temp':
        return this.tempDir;
      case 'cache':
        return this.cacheDir;
      case 'cache/backgrounds':
        return path.join(this.cacheDir, 'backgrounds');
      default:
        return path.join(this.appPath, dir);
    }
  }

  /**
   * 复制目录
   */
  private async copyDirectory(source: string, dest: string): Promise<{ fileCount: number; size: number }> {
    let fileCount = 0;
    let size = 0;

    await ensureDirectory(dest);
    
    const entries = await fs.promises.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        const result = await this.copyDirectory(sourcePath, destPath);
        fileCount += result.fileCount;
        size += result.size;
      } else {
        await fs.promises.copyFile(sourcePath, destPath);
        const stat = await fs.promises.stat(sourcePath);
        fileCount++;
        size += stat.size;
      }
    }

    return { fileCount, size };
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * 检查目录是否存在
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 获取备份状态信息
   */
  async getBackupStatus(): Promise<{
    hasBackup: boolean;
    latestBackup: string | null;
    backupCount: number;
    totalSize: number;
  }> {
    const backupsDir = this.getBackupDir();
    let backupCount = 0;
    let totalSize = 0;
    
    try {
      if (!await this.directoryExists(backupsDir)) {
        return { hasBackup: false, latestBackup: null, backupCount: 0, totalSize: 0 };
      }

      const entries = await fs.promises.readdir(backupsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const metadataPath = path.join(backupsDir, entry.name, 'metadata.json');
        try {
          const metadata: ConfigBackupMetadata = JSON.parse(
            await fs.promises.readFile(metadataPath, 'utf8')
          );
          backupCount++;
          totalSize += metadata.totalSize;
        } catch {
          // 跳过无效备份
        }
      }

      const latestBackup = await this.findLatestBackup();
      
      return {
        hasBackup: backupCount > 0,
        latestBackup,
        backupCount,
        totalSize
      };
    } catch {
      return { hasBackup: false, latestBackup: null, backupCount: 0, totalSize: 0 };
    }
  }
}
