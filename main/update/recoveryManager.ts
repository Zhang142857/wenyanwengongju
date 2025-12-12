/**
 * Recovery Manager
 * Handles failure detection and automatic recovery from failed updates
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { RecoveryStatus, UpdateState, BackupMetadata } from './types';
import {
  BACKUPS_DIRECTORY,
  UPDATE_STATE_FILE,
  ERROR_MESSAGES,
  RECOVERY_INSTRUCTIONS
} from './constants';
import {
  createUpdateError,
  getCurrentTimestamp,
  compareVersions
} from './utils';
import { FileManager } from './fileManager';

export class RecoveryManager extends EventEmitter {
  private userDataPath: string;
  private appPath: string;
  private fileManager: FileManager;
  private expectedVersion: string | null = null;

  constructor(userDataPath: string, appPath: string) {
    super();
    this.userDataPath = userDataPath;
    this.appPath = appPath;
    this.fileManager = new FileManager(userDataPath, appPath);
  }

  /**
   * Check if recovery is needed on startup
   */
  async checkRecoveryNeeded(): Promise<boolean> {
    try {
      // Check for backup directory
      const latestBackup = await this.fileManager.findLatestBackup();
      if (!latestBackup) {
        return false;
      }

      // Read update state
      const state = await this.readUpdateState();
      if (!state) {
        return false;
      }

      // Check if update was in progress
      if (state.updateInProgress) {
        return true;
      }

      // Check if version verification is needed
      if (state.pendingVersion) {
        const currentVersion = await this.getCurrentVersion();
        if (currentVersion !== state.pendingVersion) {
          this.expectedVersion = state.pendingVersion;
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('检查恢复状态失败:', error);
      return false;
    }
  }

  /**
   * Perform recovery from backup
   */
  async performRecovery(): Promise<void> {
    try {
      const latestBackup = await this.fileManager.findLatestBackup();
      if (!latestBackup) {
        throw createUpdateError(
          'system',
          '没有可用的备份',
          false
        );
      }

      this.emit('recovery-started', { backupPath: latestBackup });

      // Restore from backup
      await this.fileManager.restoreFromBackup(latestBackup);

      // Clear update state
      await this.clearUpdateState();

      this.emit('recovery-complete', { backupPath: latestBackup });

      // Request application restart
      this.emit('restart-required');
    } catch (error: any) {
      this.emit('recovery-failed', { 
        error: error.message,
        manualSteps: RECOVERY_INSTRUCTIONS.MANUAL_RECOVERY
      });
      throw error;
    }
  }

  /**
   * Mark update as successful
   */
  async markUpdateSuccessful(): Promise<void> {
    try {
      const state = await this.readUpdateState();
      if (state) {
        state.updateInProgress = false;
        state.pendingVersion = undefined;
        state.retryCount = 0;
        await this.saveUpdateState(state);
      }
      
      this.emit('update-verified');
    } catch (error) {
      console.error('标记更新成功失败:', error);
    }
  }

  /**
   * Get recovery status
   */
  async getRecoveryStatus(): Promise<RecoveryStatus> {
    const latestBackup = await this.fileManager.findLatestBackup();
    const state = await this.readUpdateState();

    let lastUpdateAttempt: Date | undefined;
    let lastUpdateVersion: string | undefined;

    if (latestBackup) {
      try {
        const metadataPath = path.join(latestBackup, 'metadata.json');
        const metadata: BackupMetadata = JSON.parse(
          await fs.promises.readFile(metadataPath, 'utf8')
        );
        lastUpdateAttempt = new Date(metadata.createdAt);
        lastUpdateVersion = metadata.version;
      } catch {
        // Ignore metadata read errors
      }
    }

    return {
      recoveryNeeded: await this.checkRecoveryNeeded(),
      backupAvailable: latestBackup !== null,
      lastUpdateAttempt,
      lastUpdateVersion
    };
  }

  /**
   * Verify version after update
   */
  async verifyVersion(expectedVersion: string): Promise<boolean> {
    const currentVersion = await this.getCurrentVersion();
    const isValid = currentVersion === expectedVersion;

    if (!isValid) {
      this.emit('version-mismatch', {
        expected: expectedVersion,
        actual: currentVersion
      });
    }

    return isValid;
  }

  /**
   * Get current application version
   */
  private async getCurrentVersion(): Promise<string> {
    try {
      // Try to read from package.json
      const packagePath = path.join(this.appPath, 'package.json');
      const packageJson = JSON.parse(
        await fs.promises.readFile(packagePath, 'utf8')
      );
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Read update state from disk
   */
  private async readUpdateState(): Promise<UpdateState | null> {
    const statePath = path.join(this.userDataPath, UPDATE_STATE_FILE);
    
    try {
      const content = await fs.promises.readFile(statePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Save update state to disk
   */
  async saveUpdateState(state: UpdateState): Promise<void> {
    const statePath = path.join(this.userDataPath, UPDATE_STATE_FILE);
    await fs.promises.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  /**
   * Clear update state
   */
  private async clearUpdateState(): Promise<void> {
    const statePath = path.join(this.userDataPath, UPDATE_STATE_FILE);
    
    try {
      await fs.promises.unlink(statePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Set expected version for verification
   */
  setExpectedVersion(version: string): void {
    this.expectedVersion = version;
  }

  /**
   * Get expected version
   */
  getExpectedVersion(): string | null {
    return this.expectedVersion;
  }

  /**
   * Check if backup exists
   */
  async hasBackup(): Promise<boolean> {
    const latestBackup = await this.fileManager.findLatestBackup();
    return latestBackup !== null;
  }

  /**
   * Initialize recovery check on startup
   */
  async initializeOnStartup(): Promise<void> {
    // Apply any deferred file replacements
    await this.fileManager.applyDeferredReplacements();

    // Check if recovery is needed
    const needsRecovery = await this.checkRecoveryNeeded();
    
    if (needsRecovery) {
      this.emit('recovery-needed');
    } else {
      // Verify version if there was a pending update
      const state = await this.readUpdateState();
      if (state?.pendingVersion) {
        const isValid = await this.verifyVersion(state.pendingVersion);
        if (isValid) {
          await this.markUpdateSuccessful();
          // Clean up old backups
          await this.fileManager.cleanupBackups();
        }
      }
    }
  }
}
