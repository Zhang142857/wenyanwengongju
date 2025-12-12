'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { configService } from '@/services/configService'
import styles from './ExamAnnouncement.module.css'

interface ExamAnnouncementProps {
  onClose?: () => void
}

export default function ExamAnnouncement({ onClose }: ExamAnnouncementProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [canClose, setCanClose] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    const checkStatus = async () => {
      if (!configService.getConfig().version) {
        await configService.initialize()
      }

      const hasPlayed = configService.hasTourPlayed('examAnnouncement' as any)
      const isEnabled = configService.getConfig().system.enableTour

      if (!hasPlayed && isEnabled) {
        setIsVisible(true)
      }
    }
    checkStatus()
  }, [])

  // 倒计时逻辑
  useEffect(() => {
    if (!isVisible) return

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setCanClose(true)
    }
  }, [isVisible, countdown])

  const handleClose = async () => {
    if (!canClose) return
    
    setIsVisible(false)
    await configService.markTourPlayed('examAnnouncement' as any)
    onClose?.()
  }

  if (!isMounted || !isVisible) return null

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.icon}>📢</span>
          <h2 className={styles.title}>使用须知</h2>
        </div>
        
        <div className={styles.content}>
          <p className={styles.text}>
            这是用来出导学案上字意对比题的，做这个功能是因为闲着没事，用之前请确保您已经自动生成或手动添加了足够多的义项，并生成了短句库，请不要跟同学说这个功能是我做的😳
          </p>
        </div>

        <div className={styles.footer}>
          <button 
            className={`${styles.closeButton} ${canClose ? styles.active : styles.disabled}`}
            onClick={handleClose}
            disabled={!canClose}
          >
            {canClose ? '我知道了' : `请等待 ${countdown} 秒...`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
