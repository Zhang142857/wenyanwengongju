'use client';

import React from 'react';
import styles from './UpdateProgressDialog.module.css';

export type UpdateStage = 'downloading' | 'verifying' | 'backing-up' | 'installing' | 'complete' | 'error';

export interface UpdateProgressDialogProps {
  visible: boolean;
  stage: UpdateStage;
  progress: number;
  speedMBps?: number;
  estimatedSeconds?: number;
  error?: string;
  errorType?: string;
  actionableSteps?: string[];
  onRetry?: () => void;
  onCancel?: () => void;
}

/**
 * UpdateProgressDialog Component
 * Displays download progress, verification status, and error messages
 */
export function UpdateProgressDialog({
  visible,
  stage,
  progress,
  speedMBps,
  estimatedSeconds,
  error,
  errorType,
  actionableSteps,
  onRetry,
  onCancel
}: UpdateProgressDialogProps) {
  if (!visible) {
    return null;
  }

  const getStageLabel = (stage: UpdateStage): string => {
    switch (stage) {
      case 'downloading':
        return '正在下载更新...';
      case 'verifying':
        return '正在验证文件...';
      case 'backing-up':
        return '正在创建备份...';
      case 'installing':
        return '正在安装更新...';
      case 'complete':
        return '更新完成！';
      case 'error':
        return '更新失败';
      default:
        return '处理中...';
    }
  };

  const formatSpeed = (speed: number): string => {
    if (speed < 1) {
      return `${(speed * 1024).toFixed(0)} KB/s`;
    }
    return `${speed.toFixed(2)} MB/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds === Infinity || isNaN(seconds)) {
      return '计算中...';
    }
    if (seconds < 60) {
      return `${Math.round(seconds)} 秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes} 分 ${remainingSeconds} 秒`;
  };

  const getStageIcon = (stage: UpdateStage) => {
    switch (stage) {
      case 'downloading':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        );
      case 'verifying':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        );
      case 'backing-up':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        );
      case 'installing':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        );
      case 'complete':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'error':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
    }
  };

  const isError = stage === 'error';
  const isComplete = stage === 'complete';
  const showProgress = stage === 'downloading' || stage === 'verifying' || stage === 'backing-up' || stage === 'installing';

  return (
    <div className={styles.overlay}>
      <div className={`${styles.dialog} ${isError ? styles.error : ''} ${isComplete ? styles.complete : ''}`}>
        <div className={styles.header}>
          <div className={`${styles.icon} ${isError ? styles.errorIcon : ''} ${isComplete ? styles.completeIcon : ''}`}>
            {getStageIcon(stage)}
          </div>
          <h2 className={styles.title}>{getStageLabel(stage)}</h2>
        </div>

        {showProgress && (
          <div className={styles.progressSection}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className={styles.progressText}>
              {progress.toFixed(1)}%
            </div>
          </div>
        )}

        {stage === 'downloading' && (
          <div className={styles.metrics}>
            {speedMBps !== undefined && (
              <div className={styles.metric}>
                <span className={styles.metricLabel}>下载速度</span>
                <span className={styles.metricValue}>{formatSpeed(speedMBps)}</span>
              </div>
            )}
            {estimatedSeconds !== undefined && (
              <div className={styles.metric}>
                <span className={styles.metricLabel}>剩余时间</span>
                <span className={styles.metricValue}>{formatTime(estimatedSeconds)}</span>
              </div>
            )}
          </div>
        )}

        {isError && error && (
          <div className={styles.errorSection}>
            {errorType && (
              <div className={styles.errorType}>
                错误类型: {errorType}
              </div>
            )}
            <div className={styles.errorMessage}>
              {error}
            </div>
            {actionableSteps && actionableSteps.length > 0 && (
              <div className={styles.actionableSteps}>
                <div className={styles.stepsTitle}>建议操作:</div>
                <ul>
                  {actionableSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {isComplete && (
          <div className={styles.completeMessage}>
            应用程序将在几秒后重启...
          </div>
        )}

        <div className={styles.actions}>
          {isError && onRetry && (
            <button className={styles.retryButton} onClick={onRetry}>
              重试
            </button>
          )}
          {!isComplete && onCancel && (
            <button className={styles.cancelButton} onClick={onCancel}>
              取消
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpdateProgressDialog;
