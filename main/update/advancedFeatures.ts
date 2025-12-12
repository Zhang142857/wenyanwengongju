/**
 * Advanced Features for Update System
 * Handles permission preservation, deferred file replacement, and disk space monitoring
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { DeferredReplacement } from './types';
import {
  DEFERRED_REPLACEMENTS_FILE,
  DISK_SPACE_MULTIPLIER
} from './constants';
import {
  ensureDirectory,
  getAvailableDiskSpace,
  isFileInUse,
  getCurrentTimestamp,
  createUpdateError
} from './utils';

/**
 * Check if the current process is running with elevated permissions
 */
export async function isElevated(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('net session', (error) => {
      resolve(!error);
    });
  });
}

/**
 * Launch application with elevated permissions
 */
export async function launchElevated(executablePath: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `powershell -Command "Start-Process -FilePath '${executablePath}' -ArgumentList '${args.join(' ')}' -Verb RunAs"`;
    
    exec(command, (error) => {
      if (error) {
        reject(createUpdateError('permissions', '无法以管理员权限启动应用程序', true));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Launch application with same permissions as current process
 */
export async function launchWithSamePermissions(executablePath: string, args: string[] = []): Promise<void> {
  const elevated = await isElevated();
  
  if (elevated) {
    await launchElevated(executablePath, args);
  } else {
    spawn(executablePath, args, {
      detached: true,
      stdio: 'ignore'
    }).unref();
  }
}

/**
 * Disk Space Monitor
 * Monitors available disk space during download
 */
export class DiskSpaceMonitor extends EventEmitter {
  private userDataPath: string;
  private requiredSpace: number = 0;
  private monitorInterval: NodeJS.Timeout | null = null;
  private isPaused: boolean = false;

  constructor(userDataPath: string) {
    super();
    this.userDataPath = userDataPath;
  }

  /**
   * Start monitoring disk space
   */
  startMonitoring(packageSize: number, intervalMs: number = 5000): void {
    this.requiredSpace = packageSize * DISK_SPACE_MULTIPLIER;
    this.isPaused = false;
    
    this.monitorInterval = setInterval(async () => {
      await this.checkSpace();
    }, intervalMs);
    
    // Initial check
    this.checkSpace();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Check available space
   */
  private async checkSpace(): Promise<void> {
    try {
      const availableSpace = await getAvailableDiskSpace(this.userDataPath);
      
      if (availableSpace < this.requiredSpace && !this.isPaused) {
        this.isPaused = true;
        this.emit('space-exhausted', {
          available: availableSpace,
          required: this.requiredSpace
        });
      } else if (availableSpace >= this.requiredSpace && this.isPaused) {
        this.isPaused = false;
        this.emit('space-available', {
          available: availableSpace,
          required: this.requiredSpace
        });
      }
    } catch (error) {
      console.error('检查磁盘空间失败:', error);
    }
  }

  /**
   * Check if download is paused due to space
   */
  isDownloadPaused(): boolean {
    return this.isPaused;
  }
}

/**
 * Deferred File Replacement Manager
 * Handles files that are in use during update
 */
export class DeferredReplacementManager {
  private userDataPath: string;
  private replacements: DeferredReplacement[] = [];

  constructor(userDataPath: string) {
    this.userDataPath = userDataPath;
  }

  /**
   * Schedule a file for deferred replacement
   */
  async scheduleReplacement(sourcePath: string, targetPath: string): Promise<void> {
    this.replacements.push({
      sourcePath,
      targetPath,
      scheduledAt: getCurrentTimestamp()
    });
    
    await this.saveReplacements();
  }

  /**
   * Check if a file needs deferred replacement
   */
  async needsDeferredReplacement(targetPath: string): Promise<boolean> {
    try {
      // Check if file exists
      await fs.promises.access(targetPath);
      
      // Check if file is in use
      return await isFileInUse(targetPath);
    } catch {
      return false;
    }
  }

  /**
   * Apply all deferred replacements
   */
  async applyReplacements(): Promise<{ success: number; failed: number }> {
    await this.loadReplacements();
    
    let success = 0;
    let failed = 0;
    
    for (const replacement of this.replacements) {
      try {
        // Check if source still exists
        await fs.promises.access(replacement.sourcePath);
        
        // Ensure target directory exists
        await ensureDirectory(path.dirname(replacement.targetPath));
        
        // Try to replace
        if (await isFileInUse(replacement.targetPath)) {
          // Still in use, keep for next startup
          failed++;
          continue;
        }
        
        await fs.promises.rename(replacement.sourcePath, replacement.targetPath);
        success++;
      } catch (error) {
        console.error(`延迟替换失败: ${replacement.targetPath}`, error);
        failed++;
      }
    }
    
    // Update saved replacements (keep failed ones)
    this.replacements = this.replacements.filter(r => {
      try {
        fs.accessSync(r.sourcePath);
        return true;
      } catch {
        return false;
      }
    });
    
    await this.saveReplacements();
    
    return { success, failed };
  }

  /**
   * Get pending replacements count
   */
  getPendingCount(): number {
    return this.replacements.length;
  }

  /**
   * Save replacements to disk
   */
  private async saveReplacements(): Promise<void> {
    const filePath = path.join(this.userDataPath, DEFERRED_REPLACEMENTS_FILE);
    
    if (this.replacements.length === 0) {
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // Ignore if file doesn't exist
      }
      return;
    }
    
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(this.replacements, null, 2),
      'utf8'
    );
  }

  /**
   * Load replacements from disk
   */
  private async loadReplacements(): Promise<void> {
    const filePath = path.join(this.userDataPath, DEFERRED_REPLACEMENTS_FILE);
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      this.replacements = JSON.parse(content);
    } catch {
      this.replacements = [];
    }
  }
}

/**
 * Check for antivirus interference
 */
export async function checkAntivirusInterference(filePath: string): Promise<boolean> {
  try {
    // Try to open file for writing
    const fd = await fs.promises.open(filePath, 'r+');
    await fd.close();
    return false;
  } catch (error: any) {
    // EBUSY or EPERM might indicate antivirus interference
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      return true;
    }
    return false;
  }
}

/**
 * Get antivirus guidance message
 */
export function getAntivirusGuidance(): string[] {
  return [
    '检测到可能的杀毒软件干扰',
    '请尝试以下操作:',
    '1. 暂时禁用杀毒软件的实时保护',
    '2. 将应用程序添加到杀毒软件的白名单',
    '3. 以管理员身份运行应用程序',
    '4. 重新尝试更新'
  ];
}
