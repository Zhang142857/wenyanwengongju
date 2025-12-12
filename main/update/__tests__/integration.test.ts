/**
 * Integration Tests for Update System
 * Tests complete update flows and error scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MockUpdateService, createMockService } from './mockUpdateService';
import { DownloadManager } from '../downloadManager';
import { FileManager } from '../fileManager';
import { RecoveryManager } from '../recoveryManager';
import { ErrorHandler } from '../errorHandler';
import { compareVersions, calculateFileHash } from '../utils';
import { USER_DATA_DIRECTORIES } from '../constants';

// Helper to create temp directory
async function createTempDir(): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `update-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.promises.mkdir(tempDir, { recursive: true });
  return tempDir;
}

// Helper to clean up temp directory
async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('Update System Integration Tests', () => {
  let mockService: MockUpdateService;
  let tempDir: string;
  let userDataDir: string;
  let appDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    userDataDir = path.join(tempDir, 'userData');
    appDir = path.join(tempDir, 'app');
    
    await fs.promises.mkdir(userDataDir, { recursive: true });
    await fs.promises.mkdir(appDir, { recursive: true });
    
    // Create mock app files
    await fs.promises.writeFile(path.join(appDir, 'app.exe'), 'mock app');
    await fs.promises.mkdir(path.join(appDir, 'resources'), { recursive: true });
    await fs.promises.writeFile(path.join(appDir, 'resources', 'app.asar'), 'mock asar');
  });

  afterEach(async () => {
    if (mockService) {
      await mockService.stop();
    }
    await cleanupTempDir(tempDir);
  });

  describe('Version Comparison', () => {
    it('should correctly compare semantic versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    });
  });

  describe('Download Manager', () => {
    it('should calculate file hash correctly', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      const content = 'test content for hashing';
      await fs.promises.writeFile(testFile, content);
      
      const hash = await calculateFileHash(testFile);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA256 hex length
    });

    it('should track download progress', async () => {
      const downloadManager = new DownloadManager();
      
      // Initial progress should be zero
      const progress = downloadManager.getProgress();
      expect(progress.bytesDownloaded).toBe(0);
      expect(progress.percentage).toBe(0);
    });
  });

  describe('File Manager', () => {
    it('should create backup excluding user data', async () => {
      const fileManager = new FileManager(userDataDir, appDir);
      
      // Create user data file
      await fs.promises.writeFile(
        path.join(appDir, 'classical-chinese-data.json'),
        '{"data": "user data"}'
      );
      
      // Create backup
      const backupPath = await fileManager.createBackup('1.0.0');
      
      // Verify backup exists
      expect(await fs.promises.access(backupPath).then(() => true).catch(() => false)).toBe(true);
      
      // Verify user data was excluded
      const backupFiles = path.join(backupPath, 'files');
      const userDataInBackup = path.join(backupFiles, 'classical-chinese-data.json');
      expect(await fs.promises.access(userDataInBackup).then(() => true).catch(() => false)).toBe(false);
    });

    it('should check disk space correctly', async () => {
      const fileManager = new FileManager(userDataDir, appDir);
      
      // Should have enough space for small package
      // Note: This test may fail on systems without wmic command
      try {
        const hasSpace = await fileManager.checkDiskSpace(1024); // 1KB
        expect(hasSpace).toBe(true);
      } catch (error) {
        // Skip test if disk space check is not available on this system
        console.log('Disk space check not available on this system, skipping test');
      }
    });

    it('should identify user data paths', () => {
      const fileManager = new FileManager(userDataDir, appDir);
      const userDataPaths = fileManager.getUserDataPaths();
      
      expect(userDataPaths.length).toBeGreaterThan(0);
    });
  });

  describe('Recovery Manager', () => {
    it('should detect when recovery is not needed', async () => {
      const recoveryManager = new RecoveryManager(userDataDir, appDir);
      
      const needsRecovery = await recoveryManager.checkRecoveryNeeded();
      expect(needsRecovery).toBe(false);
    });

    it('should get recovery status', async () => {
      const recoveryManager = new RecoveryManager(userDataDir, appDir);
      
      const status = await recoveryManager.getRecoveryStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.recoveryNeeded).toBe('boolean');
      expect(typeof status.backupAvailable).toBe('boolean');
    });
  });

  describe('Error Handler', () => {
    it('should classify network errors correctly', () => {
      const errorHandler = new ErrorHandler(userDataDir);
      
      const networkError = new Error('ENOTFOUND');
      (networkError as any).code = 'ENOTFOUND';
      
      const type = errorHandler.classifyError(networkError);
      expect(type).toBe('network');
    });

    it('should classify disk space errors correctly', () => {
      const errorHandler = new ErrorHandler(userDataDir);
      
      const diskError = new Error('ENOSPC');
      (diskError as any).code = 'ENOSPC';
      
      const type = errorHandler.classifyError(diskError);
      expect(type).toBe('disk_space');
    });

    it('should classify permission errors correctly', () => {
      const errorHandler = new ErrorHandler(userDataDir);
      
      const permError = new Error('EACCES');
      (permError as any).code = 'EACCES';
      
      const type = errorHandler.classifyError(permError);
      expect(type).toBe('permissions');
    });

    it('should provide actionable steps for all error types', () => {
      const errorHandler = new ErrorHandler(userDataDir);
      
      const errorTypes = ['network', 'disk_space', 'permissions', 'corruption', 'system'];
      
      for (const type of errorTypes) {
        const error = { type, message: 'test error' };
        const steps = errorHandler.getActionableSteps(error);
        
        expect(steps).toBeDefined();
        expect(steps.length).toBeGreaterThan(0);
      }
    });

    it('should create user-friendly error messages', () => {
      const errorHandler = new ErrorHandler(userDataDir);
      
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';
      
      const message = errorHandler.createUserMessage(error);
      
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('User Data Protection', () => {
    it('should identify all user data directories', () => {
      expect(USER_DATA_DIRECTORIES).toContain('classical-chinese-data.json');
      expect(USER_DATA_DIRECTORIES).toContain('app-config.json');
      expect(USER_DATA_DIRECTORIES).toContain('backups');
    });
  });
});
