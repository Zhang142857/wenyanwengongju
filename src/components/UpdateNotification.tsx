'use client';

import React, { useState, useEffect } from 'react';
import styles from './UpdateNotification.module.css';
import type { UpdateInfo } from '@/types/electron';

export type { UpdateInfo };

export interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  onUpdate: () => void;
  onDismiss: () => void;
  visible?: boolean;
}

interface DownloadProgress {
  progress: number;
  downloadedSize: number;
  totalSize: number;
  speed?: number;
  speedText?: string;
  eta?: string;
  threads?: number;
}

export function UpdateNotification({
  updateInfo,
  onUpdate,
  onDismiss,
  visible = true
}: UpdateNotificationProps) {
  const [isVisible, setIsVisible] = useState(visible);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false); // 安装中状态
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false); // 下载开始后锁定对话框

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  // 检查是否已有下载任务
  useEffect(() => {
    const checkDownloadStatus = async () => {
      if (typeof window !== 'undefined' && window.electronAPI?.isDownloading) {
        try {
          const state = await window.electronAPI.isDownloading();
          if (state.isDownloading) {
            setIsDownloading(true);
            setIsLocked(true);
          }
        } catch (e) {
          // 忽略错误
        }
      }
    };
    checkDownloadStatus();
  }, []);

  // 监听下载进度和状态
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // 监听下载进度
      if (window.electronAPI.onUpdateDownloadProgress) {
        window.electronAPI.onUpdateDownloadProgress((progress: DownloadProgress) => {
          setDownloadProgress(progress);
          // 下载完成时（进度达到100%），显示安装中状态
          if (progress.progress >= 99.9) {
            setIsInstalling(true);
          }
        });
      }

      // 监听下载开始
      if (window.electronAPI.onUpdateDownloadStarted) {
        window.electronAPI.onUpdateDownloadStarted(() => {
          setIsDownloading(true);
          setIsLocked(true);
        });
      }

      // 监听下载错误
      if (window.electronAPI.onUpdateDownloadError) {
        window.electronAPI.onUpdateDownloadError((data: { error: string }) => {
          setError(data.error === 'DOWNLOAD_IN_PROGRESS' ? '已有下载任务进行中' : data.error);
          setIsDownloading(false);
          // 错误后不解锁，让用户可以重试
        });
      }
    }

    return () => {
      if (typeof window !== 'undefined' && window.electronAPI?.removeUpdateListeners) {
        window.electronAPI.removeUpdateListeners();
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    if (isDownloading || isLocked) return; // 下载中或锁定时不允许关闭
    setIsVisible(false);
    onDismiss();
  };

  // 下载并安装更新
  const handleDownloadAndInstall = async () => {
    if (!updateInfo.download_url) {
      setError('下载链接不可用');
      return;
    }

    // 检查是否已有下载任务
    if (typeof window !== 'undefined' && window.electronAPI?.isDownloading) {
      try {
        const state = await window.electronAPI.isDownloading();
        if (state.isDownloading) {
          setError('已有下载任务进行中，请等待完成');
          return;
        }
      } catch (e) {
        // 忽略错误，继续尝试下载
      }
    }

    setIsDownloading(true);
    setIsLocked(true); // 锁定对话框
    setError(null);
    setDownloadProgress({ 
      progress: 0, 
      downloadedSize: 0, 
      totalSize: updateInfo.file_size || 0,
      speedText: '准备中...',
      eta: '计算中...'
    });

    try {
      if (typeof window !== 'undefined' && window.electronAPI?.downloadAndInstall) {
        await window.electronAPI.downloadAndInstall(
          updateInfo.download_url,
          updateInfo.file_name || `update-${updateInfo.version}.exe`,
          updateInfo.version
        );
        // 如果成功，应用会自动重启，不会执行到这里
      } else {
        // 非 Electron 环境，打开下载链接
        window.open(updateInfo.download_url, '_blank');
        setIsDownloading(false);
        setIsLocked(false);
      }
    } catch (err: any) {
      const errorMsg = err.message === 'DOWNLOAD_IN_PROGRESS' 
        ? '已有下载任务进行中' 
        : (err.message || '下载失败');
      setError(errorMsg);
      setIsDownloading(false);
      // 保持锁定状态，让用户可以重试
    }
  };

  const toggleChangelog = () => {
    setIsExpanded(!isExpanded);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className={styles.notification} role="alert" aria-live="polite">
      <div className={styles.content}>
        <div className={styles.icon}>
          {isDownloading ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.spinning}>
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
        </div>
        
        <div className={styles.info}>
          <div className={styles.title}>
            {isInstalling ? (
              <>正在安装更新 <span className={styles.version}>v{updateInfo.version}</span></>
            ) : isDownloading ? (
              <>正在下载更新 <span className={styles.version}>v{updateInfo.version}</span></>
            ) : (
              <>发现新版本 <span className={styles.version}>v{updateInfo.version}</span></>
            )}
          </div>
          
          {/* 下载进度 */}
          {isDownloading && downloadProgress && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${downloadProgress.progress}%` }}
                />
              </div>
              <div className={styles.progressText}>
                {downloadProgress.progress.toFixed(1)}% - {formatSize(downloadProgress.downloadedSize)} / {formatSize(downloadProgress.totalSize)}
              </div>
              {/* 下载速度和剩余时间 */}
              <div className={styles.speedInfo}>
                <span className={styles.speed}>
                  ⚡ {downloadProgress.speedText || '计算中...'}
                </span>
                <span className={styles.eta}>
                  ⏱ 剩余: {downloadProgress.eta || '计算中...'}
                </span>
                {downloadProgress.threads && (
                  <span className={styles.threads}>
                    🧵 {downloadProgress.threads} 线程
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className={styles.error}>{error}</div>
          )}
          
          {/* 更新日志 */}
          {!isDownloading && updateInfo.changelog && (
            <>
              <button 
                className={styles.changelogToggle}
                onClick={toggleChangelog}
                aria-expanded={isExpanded}
              >
                {isExpanded ? '收起更新内容' : '查看更新内容'}
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={isExpanded ? styles.rotated : ''}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              
              {isExpanded && (
                <div className={styles.changelog}>
                  {updateInfo.changelog.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className={styles.actions}>
          {!isDownloading ? (
            <>
              <button 
                className={styles.updateButton}
                onClick={handleDownloadAndInstall}
                disabled={isLocked && !!error}
              >
                {error ? '重试下载' : '立即更新'}
              </button>
              
              {!(updateInfo.force_update || updateInfo.forceUpdate) && !isLocked && (
                <button 
                  className={styles.dismissButton}
                  onClick={handleDismiss}
                  aria-label="稍后提醒"
                >
                  稍后
                </button>
              )}
            </>
          ) : (
            <div className={styles.downloadingText}>
              {isInstalling ? (
                <>🔧 下载完成，正在启动安装程序...</>
              ) : (
                <>🚀 多线程高速下载中，完成后将自动安装...</>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
