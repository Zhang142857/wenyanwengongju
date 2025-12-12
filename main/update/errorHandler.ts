/**
 * Error Handler
 * Provides error classification, logging, and actionable error messages
 */

import * as fs from 'fs';
import * as path from 'path';
import { UpdateError, ErrorType } from './types';
import { ERROR_MESSAGES, RECOVERY_INSTRUCTIONS } from './constants';
import { getCurrentTimestamp, ensureDirectory } from './utils';

// Error log entry
interface ErrorLogEntry {
  timestamp: string;
  type: ErrorType;
  message: string;
  recoverable: boolean;
  diagnosticInfo?: Record<string, unknown>;
  stack?: string;
}

export class ErrorHandler {
  private logPath: string;
  private maxLogSize: number = 5 * 1024 * 1024; // 5MB
  private maxLogFiles: number = 3;

  constructor(userDataPath: string) {
    this.logPath = path.join(userDataPath, 'logs', 'update-errors.log');
  }

  /**
   * Classify an error based on its characteristics
   */
  classifyError(error: Error | UpdateError | any): ErrorType {
    // If already classified
    if (error.type && this.isValidErrorType(error.type)) {
      return error.type;
    }

    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';

    // Network errors
    if (
      code.includes('enotfound') ||
      code.includes('econnrefused') ||
      code.includes('etimedout') ||
      code.includes('econnreset') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('dns') ||
      message.includes('http')
    ) {
      return 'network';
    }

    // Disk space errors
    if (
      code.includes('enospc') ||
      message.includes('disk space') ||
      message.includes('no space') ||
      message.includes('磁盘空间')
    ) {
      return 'disk_space';
    }

    // Permission errors
    if (
      code.includes('eacces') ||
      code.includes('eperm') ||
      message.includes('permission') ||
      message.includes('access denied') ||
      message.includes('权限')
    ) {
      return 'permissions';
    }

    // Corruption errors
    if (
      message.includes('hash') ||
      message.includes('corrupt') ||
      message.includes('invalid') ||
      message.includes('校验') ||
      message.includes('损坏')
    ) {
      return 'corruption';
    }

    // Default to system error
    return 'system';
  }

  /**
   * Check if error type is valid
   */
  private isValidErrorType(type: string): type is ErrorType {
    return ['network', 'disk_space', 'permissions', 'corruption', 'system'].includes(type);
  }

  /**
   * Create a user-friendly error message
   */
  createUserMessage(error: Error | UpdateError | any): string {
    const type = this.classifyError(error);
    
    switch (type) {
      case 'network':
        return ERROR_MESSAGES.NETWORK_UNAVAILABLE;
      case 'disk_space':
        return ERROR_MESSAGES.INSUFFICIENT_DISK_SPACE;
      case 'permissions':
        return ERROR_MESSAGES.PERMISSION_DENIED;
      case 'corruption':
        return ERROR_MESSAGES.HASH_MISMATCH;
      case 'system':
      default:
        return error.message || '更新过程中发生未知错误';
    }
  }

  /**
   * Get actionable steps for an error
   */
  getActionableSteps(error: Error | UpdateError | any): string[] {
    const type = this.classifyError(error);
    
    switch (type) {
      case 'network':
        return [
          '检查网络连接是否正常',
          '如果使用代理，请检查代理设置',
          '稍后重试更新'
        ];
      case 'disk_space':
        return [
          '清理磁盘空间，删除不需要的文件',
          '确保有足够的可用空间（至少需要更新包大小的3倍）',
          '重新尝试更新'
        ];
      case 'permissions':
        return [
          '以管理员身份运行应用程序',
          '检查应用程序安装目录的权限设置',
          '确保没有其他程序占用相关文件'
        ];
      case 'corruption':
        return [
          '重新下载更新包',
          '检查网络连接稳定性',
          '如果问题持续，请联系技术支持'
        ];
      case 'system':
      default:
        return [
          '重启应用程序后重试',
          '重启计算机后重试',
          '如果问题持续，请联系技术支持'
        ];
    }
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: Error | UpdateError | any): boolean {
    if (error.recoverable !== undefined) {
      return error.recoverable;
    }

    const type = this.classifyError(error);
    
    // Most errors are recoverable except severe corruption
    switch (type) {
      case 'network':
      case 'disk_space':
      case 'permissions':
        return true;
      case 'corruption':
        // Corruption might not be recoverable if it persists
        return true;
      case 'system':
        return true;
      default:
        return true;
    }
  }

  /**
   * Create a complete UpdateError from any error
   */
  createUpdateError(error: Error | any): UpdateError {
    const type = this.classifyError(error);
    const message = this.createUserMessage(error);
    const recoverable = this.isRecoverable(error);
    const actionableSteps = this.getActionableSteps(error);

    return {
      type,
      message,
      recoverable,
      actionableSteps,
      diagnosticInfo: {
        originalMessage: error.message,
        code: error.code,
        stack: error.stack
      }
    };
  }

  /**
   * Log an error with diagnostic information
   */
  async logError(error: Error | UpdateError | any): Promise<void> {
    try {
      await ensureDirectory(path.dirname(this.logPath));
      
      const entry: ErrorLogEntry = {
        timestamp: getCurrentTimestamp(),
        type: this.classifyError(error),
        message: error.message || String(error),
        recoverable: this.isRecoverable(error),
        diagnosticInfo: error.diagnosticInfo || {
          code: error.code,
          errno: error.errno
        },
        stack: error.stack
      };

      const logLine = JSON.stringify(entry) + '\n';
      
      // Check log rotation
      await this.rotateLogsIfNeeded();
      
      // Append to log file
      await fs.promises.appendFile(this.logPath, logLine, 'utf8');
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Rotate logs if they exceed max size
   */
  private async rotateLogsIfNeeded(): Promise<void> {
    try {
      const stat = await fs.promises.stat(this.logPath);
      
      if (stat.size >= this.maxLogSize) {
        // Rotate existing logs
        for (let i = this.maxLogFiles - 1; i >= 1; i--) {
          const oldPath = `${this.logPath}.${i}`;
          const newPath = `${this.logPath}.${i + 1}`;
          
          try {
            await fs.promises.rename(oldPath, newPath);
          } catch {
            // Ignore if file doesn't exist
          }
        }
        
        // Rename current log
        await fs.promises.rename(this.logPath, `${this.logPath}.1`);
      }
    } catch {
      // File doesn't exist yet, no rotation needed
    }
  }

  /**
   * Get recent error logs
   */
  async getRecentErrors(count: number = 10): Promise<ErrorLogEntry[]> {
    try {
      const content = await fs.promises.readFile(this.logPath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      
      return lines
        .slice(-count)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ErrorLogEntry[];
    } catch {
      return [];
    }
  }

  /**
   * Clear error logs
   */
  async clearLogs(): Promise<void> {
    try {
      await fs.promises.unlink(this.logPath);
      
      // Also clear rotated logs
      for (let i = 1; i <= this.maxLogFiles; i++) {
        try {
          await fs.promises.unlink(`${this.logPath}.${i}`);
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Format error for display
   */
  formatErrorForDisplay(error: UpdateError): string {
    let display = `错误类型: ${this.getErrorTypeLabel(error.type)}\n`;
    display += `错误信息: ${error.message}\n\n`;
    
    if (error.actionableSteps && error.actionableSteps.length > 0) {
      display += '建议操作:\n';
      error.actionableSteps.forEach((step, index) => {
        display += `${index + 1}. ${step}\n`;
      });
    }
    
    if (!error.recoverable) {
      display += `\n${RECOVERY_INSTRUCTIONS.CONTACT_SUPPORT}`;
    }
    
    return display;
  }

  /**
   * Get human-readable error type label
   */
  private getErrorTypeLabel(type: ErrorType): string {
    switch (type) {
      case 'network':
        return '网络错误';
      case 'disk_space':
        return '磁盘空间不足';
      case 'permissions':
        return '权限错误';
      case 'corruption':
        return '文件损坏';
      case 'system':
        return '系统错误';
      default:
        return '未知错误';
    }
  }
}
