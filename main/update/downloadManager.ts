/**
 * Download Manager
 * Handles file downloads with progress tracking, cancellation, and hash verification
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { EventEmitter } from 'events';
import { DownloadProgress, UpdateError } from './types';
import { 
  PROGRESS_UPDATE_INTERVAL_MS,
  MAX_HASH_VERIFICATION_RETRIES 
} from './constants';
import {
  calculateFileHash,
  calculateSpeed,
  calculateETA,
  roundPercentage,
  createUpdateError,
  ensureDirectory,
  safeDelete
} from './utils';

export interface DownloadOptions {
  url: string;
  destination: string;
  expectedHash?: string;
  onProgress?: (progress: DownloadProgress) => void;
}

export class DownloadManager extends EventEmitter {
  private currentDownload: {
    request: http.ClientRequest | null;
    cancelled: boolean;
    startTime: number;
    bytesDownloaded: number;
    totalBytes: number;
  } | null = null;

  private hashRetryCount: number = 0;

  /**
   * Download a file with progress tracking
   */
  async download(options: DownloadOptions): Promise<void> {
    const { url, destination, onProgress } = options;

    // Ensure destination directory exists
    await ensureDirectory(path.dirname(destination));

    // Initialize download state
    this.currentDownload = {
      request: null,
      cancelled: false,
      startTime: Date.now(),
      bytesDownloaded: 0,
      totalBytes: 0
    };

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      const request = protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.download({ ...options, url: redirectUrl })
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        // Check for successful response
        if (response.statusCode !== 200) {
          reject(createUpdateError(
            'network',
            `下载失败: HTTP ${response.statusCode}`,
            true,
            { statusCode: response.statusCode, url }
          ));
          return;
        }

        // Get total file size
        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        this.currentDownload!.totalBytes = totalBytes;

        // Create write stream
        const writeStream = fs.createWriteStream(destination);
        let bytesDownloaded = 0;
        let lastProgressUpdate = Date.now();

        response.on('data', (chunk: Buffer) => {
          if (this.currentDownload?.cancelled) {
            response.destroy();
            writeStream.close();
            safeDelete(destination).catch(() => {});
            reject(createUpdateError('system', '下载已取消', true));
            return;
          }

          bytesDownloaded += chunk.length;
          this.currentDownload!.bytesDownloaded = bytesDownloaded;

          // Throttle progress updates
          const now = Date.now();
          if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL_MS) {
            lastProgressUpdate = now;
            const progress = this.getProgress();
            onProgress?.(progress);
            this.emit('progress', progress);
          }
        });

        response.on('error', (error) => {
          writeStream.close();
          safeDelete(destination).catch(() => {});
          reject(createUpdateError(
            'network',
            `下载错误: ${error.message}`,
            true,
            { error: error.message }
          ));
        });

        writeStream.on('error', (error) => {
          reject(createUpdateError(
            'disk_space',
            `写入文件失败: ${error.message}`,
            true,
            { error: error.message }
          ));
        });

        writeStream.on('finish', () => {
          // Final progress update
          const progress = this.getProgress();
          progress.percentage = 100;
          onProgress?.(progress);
          this.emit('progress', progress);
          this.emit('complete');
          resolve();
        });

        response.pipe(writeStream);
      });

      request.on('error', (error) => {
        reject(createUpdateError(
          'network',
          `网络错误: ${error.message}`,
          true,
          { error: error.message }
        ));
      });

      request.on('timeout', () => {
        request.destroy();
        reject(createUpdateError(
          'network',
          '连接超时',
          true
        ));
      });

      // Set timeout
      request.setTimeout(30000);

      this.currentDownload!.request = request;
    });
  }

  /**
   * Get current download progress
   */
  getProgress(): DownloadProgress {
    if (!this.currentDownload) {
      return {
        bytesDownloaded: 0,
        totalBytes: 0,
        percentage: 0,
        speedMBps: 0,
        estimatedSecondsRemaining: 0
      };
    }

    const { bytesDownloaded, totalBytes, startTime } = this.currentDownload;
    const elapsedMs = Date.now() - startTime;
    const speedMBps = calculateSpeed(bytesDownloaded, elapsedMs);
    const percentage = totalBytes > 0 
      ? roundPercentage((bytesDownloaded / totalBytes) * 100)
      : 0;
    const estimatedSecondsRemaining = calculateETA(bytesDownloaded, totalBytes, speedMBps);

    return {
      bytesDownloaded,
      totalBytes,
      percentage,
      speedMBps: Math.round(speedMBps * 100) / 100,
      estimatedSecondsRemaining: Math.round(estimatedSecondsRemaining)
    };
  }

  /**
   * Cancel the current download
   */
  cancel(): void {
    if (this.currentDownload) {
      this.currentDownload.cancelled = true;
      if (this.currentDownload.request) {
        this.currentDownload.request.destroy();
      }
      this.emit('cancelled');
    }
  }

  /**
   * Verify file integrity using SHA256 hash
   */
  async verifyHash(filePath: string, expectedHash: string): Promise<boolean> {
    try {
      const computedHash = await calculateFileHash(filePath);
      const isValid = computedHash.toLowerCase() === expectedHash.toLowerCase();
      
      if (!isValid) {
        this.hashRetryCount++;
        
        if (this.hashRetryCount >= MAX_HASH_VERIFICATION_RETRIES) {
          // Delete the corrupted file
          await safeDelete(filePath);
          throw createUpdateError(
            'corruption',
            '文件校验失败次数过多，更新已中止',
            false,
            { 
              expectedHash, 
              computedHash,
              retryCount: this.hashRetryCount 
            }
          );
        }
        
        // Delete the corrupted file for retry
        await safeDelete(filePath);
      } else {
        // Reset retry count on success
        this.hashRetryCount = 0;
      }
      
      return isValid;
    } catch (error: any) {
      if (error.type) {
        throw error; // Re-throw UpdateError
      }
      throw createUpdateError(
        'corruption',
        `计算文件哈希失败: ${error.message}`,
        true,
        { error: error.message }
      );
    }
  }

  /**
   * Get current hash retry count
   */
  getHashRetryCount(): number {
    return this.hashRetryCount;
  }

  /**
   * Reset hash retry count
   */
  resetHashRetryCount(): void {
    this.hashRetryCount = 0;
  }

  /**
   * Check if download is in progress
   */
  isDownloading(): boolean {
    return this.currentDownload !== null && !this.currentDownload.cancelled;
  }
}

// Export singleton instance
export const downloadManager = new DownloadManager();
