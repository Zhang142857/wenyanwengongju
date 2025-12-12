/**
 * Update Manager
 * Orchestrates the entire update process including version checking,
 * downloading, verification, backup, installation, and restart
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { EventEmitter } from 'events';
import { app, BrowserWindow } from 'electron';
import {
  UpdateInfo,
  UpdateStatus,
  UpdateState,
  DownloadProgress,
  UpdateLock
} from './types';
import {
  UPDATE_SERVICE_URL,
  UPDATE_CHECK_ENDPOINT,
  UPDATE_CHECK_DELAY_ON_STARTUP,
  UPDATE_CHECK_INTERVAL,
  NETWORK_RETRY_DELAY,
  MAX_UPDATE_CHECK_RETRIES,
  RESTART_COUNTDOWN_SECONDS,
  DOWNLOAD_COMPLETE_DISPLAY_MS,
  UPDATE_STATE_FILE,
  UPDATE_LOCK_FILE,
  DOWNLOADS_DIRECTORY,
  IPC_CHANNELS,
  ERROR_MESSAGES
} from './constants';
import {
  compareVersions,
  createUpdateError,
  getCurrentTimestamp,
  ensureDirectory,
  safeDelete
} from './utils';
import { DownloadManager } from './downloadManager';
import { FileManager } from './fileManager';
import { RecoveryManager } from './recoveryManager';

export class UpdateManager extends EventEmitter {
  private userDataPath: string;
  private appPath: string;
  private currentVersion: string;
  
  private downloadManager: DownloadManager;
  private fileManager: FileManager;
  private recoveryManager: RecoveryManager;
  
  private status: UpdateStatus = { state: 'idle' };
  private checkTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private retryCount: number = 0;
  private pendingUpdateInfo: UpdateInfo | null = null;

  constructor() {
    super();
    this.userDataPath = app.getPath('userData');
    this.appPath = app.isPackaged 
      ? path.dirname(app.getPath('exe'))
      : path.join(__dirname, '../..');
    this.currentVersion = app.getVersion();
    
    this.downloadManager = new DownloadManager();
    this.fileManager = new FileManager(this.userDataPath, this.appPath);
    this.recoveryManager = new RecoveryManager(this.userDataPath, this.appPath);
    
    this.setupEventListeners();
  }

  /**
   * Initialize the update system
   */
  async initialize(): Promise<void> {
    try {
      // Initialize recovery manager first
      await this.recoveryManager.initializeOnStartup();
      
      // Check if recovery is needed
      if (await this.recoveryManager.checkRecoveryNeeded()) {
        this.emit('recovery-needed');
        return;
      }
      
      // Schedule initial update check
      setTimeout(() => {
        this.checkForUpdates();
      }, UPDATE_CHECK_DELAY_ON_STARTUP);
      
      // Schedule periodic update checks
      this.checkTimer = setInterval(() => {
        this.checkForUpdates();
      }, UPDATE_CHECK_INTERVAL);
      
      this.emit('initialized');
    } catch (error: any) {
      console.error('更新系统初始化失败:', error);
      this.emit('error', createUpdateError('system', error.message, true));
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (this.status.state !== 'idle') {
      return null;
    }
    
    this.setStatus({ state: 'checking' });
    
    try {
      const updateInfo = await this.fetchUpdateInfo();
      
      if (updateInfo && compareVersions(updateInfo.version, this.currentVersion) > 0) {
        this.pendingUpdateInfo = updateInfo;
        this.retryCount = 0;
        this.emit('update-available', updateInfo);
        this.setStatus({ state: 'idle' });
        return updateInfo;
      }
      
      this.setStatus({ state: 'idle' });
      return null;
    } catch (error: any) {
      this.handleCheckError(error);
      return null;
    }
  }

  /**
   * Start the update process
   */
  async startUpdate(version?: string): Promise<void> {
    const updateInfo = version 
      ? await this.fetchUpdateInfo()
      : this.pendingUpdateInfo;
    
    if (!updateInfo) {
      throw createUpdateError('system', '没有可用的更新信息', true);
    }
    
    // Check for concurrent updates
    if (await this.isUpdateLocked()) {
      throw createUpdateError('system', ERROR_MESSAGES.UPDATE_IN_PROGRESS, true);
    }
    
    try {
      // Acquire update lock
      await this.acquireUpdateLock(updateInfo.version);
      
      // Check disk space
      const hasSpace = await this.fileManager.checkDiskSpace(updateInfo.packageSize);
      if (!hasSpace) {
        throw createUpdateError(
          'disk_space',
          ERROR_MESSAGES.INSUFFICIENT_DISK_SPACE,
          true,
          { 
            required: this.fileManager.getRequiredSpace(updateInfo.packageSize),
            packageSize: updateInfo.packageSize
          }
        );
      }
      
      // Save update state
      await this.saveUpdateState({
        lastCheckTime: getCurrentTimestamp(),
        currentVersion: this.currentVersion,
        pendingVersion: updateInfo.version,
        updateInProgress: true,
        retryCount: 0
      });
      
      // Download update package
      await this.downloadUpdate(updateInfo);
      
      // Verify hash
      const downloadPath = this.getDownloadPath(updateInfo.version);
      const isValid = await this.downloadManager.verifyHash(downloadPath, updateInfo.fileHash);
      
      if (!isValid) {
        throw createUpdateError('corruption', ERROR_MESSAGES.HASH_MISMATCH, true);
      }
      
      this.setStatus({ state: 'verifying', progress: 100 });
      
      // Create backup
      this.setStatus({ state: 'backing-up' });
      const backupPath = await this.fileManager.createBackup(this.currentVersion);
      
      // Update state with backup path
      await this.saveUpdateState({
        lastCheckTime: getCurrentTimestamp(),
        currentVersion: this.currentVersion,
        pendingVersion: updateInfo.version,
        updateInProgress: true,
        backupPath,
        downloadPath,
        retryCount: 0
      });
      
      // Extract update
      this.setStatus({ state: 'installing' });
      await this.fileManager.extractUpdate(downloadPath);
      
      // Show completion message
      this.emit('update-complete');
      
      // Wait before restart
      await new Promise(resolve => setTimeout(resolve, DOWNLOAD_COMPLETE_DISPLAY_MS));
      
      // Restart application
      await this.restartApplication();
      
    } catch (error: any) {
      await this.releaseUpdateLock();
      this.setStatus({ 
        state: 'error', 
        error: error.message,
        errorType: error.type
      });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Cancel the current update
   */
  cancelUpdate(): void {
    this.downloadManager.cancel();
    this.releaseUpdateLock();
    this.setStatus({ state: 'idle' });
    this.emit('update-cancelled');
  }

  /**
   * Get current update status
   */
  getStatus(): UpdateStatus {
    return { ...this.status };
  }

  /**
   * Dismiss update notification
   */
  async dismissUpdate(): Promise<void> {
    const state = await this.loadUpdateState();
    if (state) {
      state.lastDismissTime = getCurrentTimestamp();
      await this.saveUpdateState(state);
    }
    this.emit('update-dismissed');
  }

  /**
   * Check if notification should be shown
   */
  async shouldShowNotification(): Promise<boolean> {
    const state = await this.loadUpdateState();
    if (!state?.lastDismissTime) {
      return true;
    }
    
    const dismissTime = new Date(state.lastDismissTime).getTime();
    const now = Date.now();
    const NOTIFICATION_REDISPLAY_DELAY = 24 * 60 * 60 * 1000; // 24 hours
    
    return (now - dismissTime) >= NOTIFICATION_REDISPLAY_DELAY;
  }

  // Private methods

  private setupEventListeners(): void {
    this.downloadManager.on('progress', (progress: DownloadProgress) => {
      this.setStatus({ 
        state: 'downloading', 
        progress: progress.percentage 
      });
      this.emit('download-progress', progress);
    });
    
    this.recoveryManager.on('recovery-needed', () => {
      this.emit('recovery-needed');
    });
    
    this.recoveryManager.on('recovery-complete', () => {
      this.emit('recovery-complete');
    });
  }

  private async fetchUpdateInfo(): Promise<UpdateInfo | null> {
    return new Promise((resolve, reject) => {
      const url = `${UPDATE_SERVICE_URL}${UPDATE_CHECK_ENDPOINT}?version=${this.currentVersion}`;
      const protocol = url.startsWith('https') ? https : http;
      
      const request = protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(createUpdateError(
            'network',
            `服务器返回错误: ${response.statusCode}`,
            true
          ));
          return;
        }
        
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const updateInfo = JSON.parse(data);
            resolve(updateInfo);
          } catch {
            reject(createUpdateError('network', '解析更新信息失败', true));
          }
        });
      });
      
      request.on('error', (error) => {
        reject(createUpdateError('network', error.message, true));
      });
      
      request.setTimeout(30000, () => {
        request.destroy();
        reject(createUpdateError('network', ERROR_MESSAGES.NETWORK_TIMEOUT, true));
      });
    });
  }

  private async downloadUpdate(updateInfo: UpdateInfo): Promise<void> {
    this.setStatus({ state: 'downloading', progress: 0 });
    
    const downloadPath = this.getDownloadPath(updateInfo.version);
    await ensureDirectory(path.dirname(downloadPath));
    
    await this.downloadManager.download({
      url: updateInfo.downloadUrl,
      destination: downloadPath,
      expectedHash: updateInfo.fileHash,
      onProgress: (progress) => {
        this.emit('download-progress', progress);
      }
    });
  }

  private getDownloadPath(version: string): string {
    return path.join(this.userDataPath, DOWNLOADS_DIRECTORY, `update-${version}.zip`);
  }

  private handleCheckError(error: any): void {
    this.retryCount++;
    
    if (this.retryCount >= MAX_UPDATE_CHECK_RETRIES) {
      console.error('更新检查失败次数过多，停止重试');
      this.setStatus({ state: 'idle' });
      this.retryCount = 0;
      return;
    }
    
    // Schedule retry
    this.retryTimer = setTimeout(() => {
      this.checkForUpdates();
    }, NETWORK_RETRY_DELAY);
    
    this.setStatus({ state: 'idle' });
  }

  private async restartApplication(): Promise<void> {
    this.setStatus({ state: 'restarting' });
    
    // Emit countdown events
    for (let i = RESTART_COUNTDOWN_SECONDS; i > 0; i--) {
      this.emit('restart-countdown', i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Release lock before restart
    await this.releaseUpdateLock();
    
    // Relaunch application
    app.relaunch();
    app.exit(0);
  }

  private setStatus(status: UpdateStatus): void {
    this.status = status;
    this.emit('status-changed', status);
  }

  private async saveUpdateState(state: UpdateState): Promise<void> {
    const statePath = path.join(this.userDataPath, UPDATE_STATE_FILE);
    await fs.promises.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  private async loadUpdateState(): Promise<UpdateState | null> {
    const statePath = path.join(this.userDataPath, UPDATE_STATE_FILE);
    try {
      const content = await fs.promises.readFile(statePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async isUpdateLocked(): Promise<boolean> {
    const lockPath = path.join(this.userDataPath, UPDATE_LOCK_FILE);
    try {
      const content = await fs.promises.readFile(lockPath, 'utf8');
      const lock: UpdateLock = JSON.parse(content);
      
      // Check if the process is still running
      try {
        process.kill(lock.pid, 0);
        return true; // Process is still running
      } catch {
        // Process is not running, lock is stale
        await safeDelete(lockPath);
        return false;
      }
    } catch {
      return false;
    }
  }

  private async acquireUpdateLock(version: string): Promise<void> {
    const lockPath = path.join(this.userDataPath, UPDATE_LOCK_FILE);
    const lock: UpdateLock = {
      pid: process.pid,
      startedAt: getCurrentTimestamp(),
      version
    };
    await fs.promises.writeFile(lockPath, JSON.stringify(lock, null, 2), 'utf8');
  }

  private async releaseUpdateLock(): Promise<void> {
    const lockPath = path.join(this.userDataPath, UPDATE_LOCK_FILE);
    await safeDelete(lockPath);
  }

  /**
   * Perform recovery
   */
  async performRecovery(): Promise<void> {
    await this.recoveryManager.performRecovery();
  }

  /**
   * Cleanup on shutdown
   */
  async cleanup(): Promise<void> {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    
    // Save state if update is in progress
    if (this.status.state === 'downloading') {
      const state = await this.loadUpdateState();
      if (state) {
        state.updateInProgress = true;
        await this.saveUpdateState(state);
      }
    }
  }
}

// Export singleton instance
let updateManagerInstance: UpdateManager | null = null;

export function getUpdateManager(): UpdateManager {
  if (!updateManagerInstance) {
    updateManagerInstance = new UpdateManager();
  }
  return updateManagerInstance;
}
