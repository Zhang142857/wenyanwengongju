/**
 * Update System Utilities
 * Helper functions for the update system
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ErrorType, UpdateError } from './types';
import { ERROR_MESSAGES, RECOVERY_INSTRUCTIONS } from './constants';

/**
 * Compare two semantic version strings
 * @returns positive if v1 > v2, negative if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  
  return 0;
}

/**
 * Check if a version is valid semantic version format
 */
export function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

/**
 * Calculate SHA256 hash of a file using streaming
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Get available disk space in bytes
 */
export async function getAvailableDiskSpace(dirPath: string): Promise<number> {
  // For Windows, we need to use a different approach
  const { exec } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const drive = path.parse(dirPath).root;
    
    exec(`wmic logicaldisk where "DeviceID='${drive.replace('\\', '')}'" get FreeSpace /value`, 
      (error: Error | null, stdout: string) => {
        if (error) {
          reject(error);
          return;
        }
        
        const match = stdout.match(/FreeSpace=(\d+)/);
        if (match) {
          resolve(parseInt(match[1], 10));
        } else {
          // Fallback: assume enough space
          resolve(Number.MAX_SAFE_INTEGER);
        }
      }
    );
  });
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Safely delete a file or directory
 */
export async function safeDelete(targetPath: string): Promise<void> {
  try {
    const stat = await fs.promises.stat(targetPath);
    if (stat.isDirectory()) {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.promises.unlink(targetPath);
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Copy a file with progress callback
 */
export async function copyFileWithProgress(
  source: string,
  destination: string,
  onProgress?: (copied: number, total: number) => void
): Promise<void> {
  const stat = await fs.promises.stat(source);
  const totalSize = stat.size;
  let copiedSize = 0;
  
  const readStream = fs.createReadStream(source);
  const writeStream = fs.createWriteStream(destination);
  
  return new Promise((resolve, reject) => {
    readStream.on('data', (chunk) => {
      copiedSize += chunk.length;
      onProgress?.(copiedSize, totalSize);
    });
    
    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
    
    readStream.pipe(writeStream);
  });
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format seconds to human readable time string
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} 秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  return `${minutes} 分 ${remainingSeconds} 秒`;
}

/**
 * Create an UpdateError with appropriate details
 */
export function createUpdateError(
  type: ErrorType,
  message: string,
  recoverable: boolean = true,
  diagnosticInfo?: Record<string, unknown>
): UpdateError {
  const error: UpdateError = {
    type,
    message,
    recoverable,
    diagnosticInfo
  };
  
  if (recoverable) {
    error.actionableSteps = getActionableSteps(type);
  } else {
    error.actionableSteps = [RECOVERY_INSTRUCTIONS.CONTACT_SUPPORT];
  }
  
  return error;
}

/**
 * Get actionable steps based on error type
 */
function getActionableSteps(type: ErrorType): string[] {
  switch (type) {
    case 'network':
      return [
        '检查网络连接是否正常',
        '稍后重试更新',
        '如果使用代理，请检查代理设置'
      ];
    case 'disk_space':
      return [
        '清理磁盘空间',
        '删除不需要的文件',
        '重新尝试更新'
      ];
    case 'permissions':
      return [
        '以管理员身份运行应用程序',
        '检查文件夹权限设置'
      ];
    case 'corruption':
      return [
        '重新下载更新包',
        '检查网络连接稳定性'
      ];
    case 'system':
      return [
        '重启应用程序',
        '重启计算机后重试'
      ];
    default:
      return ['请稍后重试'];
  }
}

/**
 * Check if a file is currently in use (Windows)
 */
export async function isFileInUse(filePath: string): Promise<boolean> {
  try {
    const fd = await fs.promises.open(filePath, 'r+');
    await fd.close();
    return false;
  } catch (error: any) {
    return error.code === 'EBUSY' || error.code === 'EPERM';
  }
}

/**
 * Get current timestamp in ISO 8601 format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Calculate download speed in MB/s
 */
export function calculateSpeed(bytesDownloaded: number, elapsedMs: number): number {
  if (elapsedMs === 0) return 0;
  const bytesPerSecond = (bytesDownloaded / elapsedMs) * 1000;
  return bytesPerSecond / (1024 * 1024);
}

/**
 * Calculate estimated time remaining in seconds
 */
export function calculateETA(
  bytesDownloaded: number,
  totalBytes: number,
  speedMBps: number
): number {
  if (speedMBps === 0) return Infinity;
  const remainingBytes = totalBytes - bytesDownloaded;
  const remainingMB = remainingBytes / (1024 * 1024);
  return remainingMB / speedMBps;
}

/**
 * Round percentage to 1 decimal place (1% precision)
 */
export function roundPercentage(value: number): number {
  return Math.round(value * 10) / 10;
}
