'use client'

import { ReactNode, useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { useSidebar } from '@/contexts/SidebarContext'
import OnboardingTour from './OnboardingTour'
import ImageTour from './ImageTour'
import UpdateNotification from './UpdateNotification'
import type { UpdateInfo } from '@/types/electron'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  fullWidth?: boolean
}

// 比较版本号：v1 < v2 返回 -1，v1 > v2 返回 1，相等返回 0
function compareVersions(v1: string, v2: string): number {
  const a = v1.split('.').map(Number)
  const b = v2.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const av = a[i] || 0
    const bv = b[i] || 0
    if (av < bv) return -1
    if (av > bv) return 1
  }
  return 0
}

export default function Layout({ children, title = '文言文查询', subtitle = 'Classical Chinese Query Tool', fullWidth = false }: LayoutProps) {
  const { collapsed } = useSidebar()
  const [showImageTour, setShowImageTour] = useState(false)
  const [imageTourCompleted, setImageTourCompleted] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [showUpdateNotification, setShowUpdateNotification] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('')

  useEffect(() => {
    // 获取应用版本号
    if (typeof window !== 'undefined' && window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((version) => {
        setAppVersion(version)
        console.log(`📱 当前应用版本: ${version}`)
      })
    }

    // 检查是否是首次安装（通过检查 localStorage）
    const hasSeenImageTour = localStorage.getItem('hasSeenImageTour')
    if (!hasSeenImageTour) {
      setShowImageTour(true)
    } else {
      setImageTourCompleted(true)
    }

    // 检查是否有待处理的更新
    if (typeof window !== 'undefined' && window.electronAPI?.getPendingUpdate) {
      window.electronAPI.getPendingUpdate().then(async (info) => {
        if (info && info.version) {
          // 获取当前版本号，验证是否真的需要更新
          const currentVersion = await window.electronAPI?.getAppVersion?.() || '0.0.0'
          const needsUpdate = compareVersions(currentVersion, info.version) < 0
          
          console.log(`📋 待处理更新: ${info.version}, 当前版本: ${currentVersion}, 需要更新: ${needsUpdate}`)
          
          if (needsUpdate) {
            setUpdateInfo(info)
            setShowUpdateNotification(true)
          } else {
            // 已经是最新版本，清除待处理的更新
            console.log('✓ 已是最新版本，清除待处理的更新')
            window.electronAPI?.clearPendingUpdate?.()
          }
        }
      })

      // 监听更新可用事件
      window.electronAPI.onUpdateAvailable?.((info) => {
        setUpdateInfo(info)
        setShowUpdateNotification(true)
      })
    }

    return () => {
      // 清理监听器
      if (typeof window !== 'undefined' && window.electronAPI?.removeUpdateListeners) {
        window.electronAPI.removeUpdateListeners()
      }
    }
  }, [])

  const handleImageTourComplete = () => {
    localStorage.setItem('hasSeenImageTour', 'true')
    setShowImageTour(false)
    setImageTourCompleted(true)
  }

  const handleUpdate = () => {
    // 更新通知组件会自己处理下载和安装
    // 这个回调现在主要用于非 Electron 环境的降级处理
    if (updateInfo?.download_url) {
      window.open(updateInfo.download_url, '_blank')
    }
  }

  const handleDismissUpdate = () => {
    setShowUpdateNotification(false)
    // 清除待处理的更新
    if (typeof window !== 'undefined' && window.electronAPI?.clearPendingUpdate) {
      window.electronAPI.clearPendingUpdate()
    }
  }

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return
    
    setIsCheckingUpdate(true)
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.checkForUpdates) {
        const info = await window.electronAPI.checkForUpdates()
        if (info) {
          setUpdateInfo(info)
          setShowUpdateNotification(true)
        } else {
          // 显示已是最新版本的提示
          alert('已是最新版本')
        }
      }
    } catch (error) {
      console.error('检查更新失败:', error)
    } finally {
      setIsCheckingUpdate(false)
    }
  }
  
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={`${styles.mainContainer} ${collapsed ? styles.mainContainerCollapsed : ''}`}>
        <Header 
          title={title} 
          subtitle={subtitle} 
          onCheckUpdate={handleCheckUpdate}
          isCheckingUpdate={isCheckingUpdate}
          appVersion={appVersion}
        />
        <main className={`${styles.main} ${fullWidth ? styles.mainFullWidth : ''}`}>
          {children}
        </main>
      </div>
      {/* 更新通知 */}
      {showUpdateNotification && updateInfo && (
        <UpdateNotification
          updateInfo={updateInfo}
          onUpdate={handleUpdate}
          onDismiss={handleDismissUpdate}
          visible={showUpdateNotification}
        />
      )}
      {/* 首次安装显示图片教程 */}
      {showImageTour && (
        <ImageTour onComplete={handleImageTourComplete} />
      )}
      {/* 图片教程完成后显示文字教程 */}
      {imageTourCompleted && <OnboardingTour />}
    </div>
  )
}

function Header({ title, subtitle, onCheckUpdate, isCheckingUpdate, appVersion }: { 
  title: string; 
  subtitle: string;
  onCheckUpdate: () => void;
  isCheckingUpdate: boolean;
  appVersion: string;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>
          {subtitle}
          {appVersion && <span className={styles.version}> v{appVersion}</span>}
        </p>
      </div>
      <button 
        className={styles.checkUpdateBtn}
        onClick={onCheckUpdate}
        disabled={isCheckingUpdate}
        title="检查更新"
      >
        {isCheckingUpdate ? '检查中...' : '检查更新'}
      </button>
    </header>
  )
}
