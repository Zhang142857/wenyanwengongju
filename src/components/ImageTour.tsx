'use client'

import { useState, useEffect, useCallback } from 'react'
import { configService } from '@/services/configService'
import styles from './ImageTour.module.css'

interface TourSlide {
  image: string
  title: string
  description: string
}

const TOUR_SLIDES: TourSlide[] = [
  {
    image: '/pictures/首页.png',
    title: '首页 - 快速搜索',
    description: '在首页可以快速搜索句子、义项和短句，支持多种筛选条件，帮助你快速找到需要的内容。',
  },
  {
    image: '/pictures/库管理.png',
    title: '库管理 - 组织内容',
    description: '使用"库-集-文章"三级结构管理你的文言文内容，支持导入Word文档和纯文本。',
  },
  {
    image: '/pictures/AI生成义项.png',
    title: 'AI 智能生成义项',
    description: 'AI 可以自动识别文言文中的重点字词，并生成准确的义项解释，大大提高整理效率。',
  },
  {
    image: '/pictures/自动出题.png',
    title: '自动出题 - 一键生成试卷',
    description: '根据义项库自动生成选择题，支持多种题型配置，可导出教师版和学生版Word文档。',
  },
]

interface ImageTourProps {
  onComplete?: () => void
  forceShow?: boolean
}

export default function ImageTour({ onComplete, forceShow = false }: ImageTourProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // 检查是否需要显示
  useEffect(() => {
    setIsMounted(true)
    
    if (forceShow) {
      setIsVisible(true)
      return
    }

    const checkStatus = async () => {
      if (!configService.getConfig().version) {
        await configService.initialize()
      }

      const hasPlayed = configService.hasTourPlayed('imageTour' as any)
      const isEnabled = configService.getConfig().system.enableTour

      if (!hasPlayed && isEnabled) {
        setTimeout(() => setIsVisible(true), 500)
      }
    }
    checkStatus()
  }, [forceShow])

  // 自动轮播
  useEffect(() => {
    if (!isVisible || isPaused) return

    const timer = setInterval(() => {
      goToNext()
    }, 5000) // 5秒切换

    return () => clearInterval(timer)
  }, [isVisible, isPaused, currentSlide])

  const goToSlide = useCallback((index: number) => {
    if (isAnimating || index === currentSlide) return
    setIsAnimating(true)
    setCurrentSlide(index)
    setTimeout(() => setIsAnimating(false), 500)
  }, [isAnimating, currentSlide])

  const goToNext = useCallback(() => {
    const nextIndex = (currentSlide + 1) % TOUR_SLIDES.length
    goToSlide(nextIndex)
  }, [currentSlide, goToSlide])

  const goToPrev = useCallback(() => {
    const prevIndex = (currentSlide - 1 + TOUR_SLIDES.length) % TOUR_SLIDES.length
    goToSlide(prevIndex)
  }, [currentSlide, goToSlide])

  const handleComplete = async () => {
    setIsVisible(false)
    if (!forceShow) {
      await configService.markTourPlayed('imageTour' as any)
    }
    onComplete?.()
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!isMounted || !isVisible) return null

  const slide = TOUR_SLIDES[currentSlide]

  return (
    <div className={styles.overlay}>
      <div 
        className={styles.modal}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* 关闭按钮 */}
        <button className={styles.closeButton} onClick={handleSkip} title="关闭">
          ✕
        </button>

        {/* 图片展示区 */}
        <div className={styles.imageContainer}>
          <div 
            className={styles.imageSlider}
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {TOUR_SLIDES.map((s, index) => (
              <div key={index} className={styles.imageSlide}>
                <img 
                  src={s.image} 
                  alt={s.title}
                  className={styles.image}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>

          {/* 左右切换按钮 */}
          <button 
            className={`${styles.navButton} ${styles.prevButton}`}
            onClick={goToPrev}
            aria-label="上一张"
          >
            ‹
          </button>
          <button 
            className={`${styles.navButton} ${styles.nextButton}`}
            onClick={goToNext}
            aria-label="下一张"
          >
            ›
          </button>

          {/* 进度条 */}
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ 
                width: `${((currentSlide + 1) / TOUR_SLIDES.length) * 100}%`,
                transition: isPaused ? 'none' : 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* 内容区 */}
        <div className={styles.content}>
          <h2 className={styles.title}>{slide.title}</h2>
          <p className={styles.description}>{slide.description}</p>
        </div>

        {/* 指示器 */}
        <div className={styles.indicators}>
          {TOUR_SLIDES.map((_, index) => (
            <button
              key={index}
              className={`${styles.indicator} ${index === currentSlide ? styles.active : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`跳转到第 ${index + 1} 张`}
            />
          ))}
        </div>

        {/* 底部按钮 */}
        <div className={styles.footer}>
          <button className={styles.skipButton} onClick={handleSkip}>
            跳过教程
          </button>
          <button className={styles.startButton} onClick={handleComplete}>
            {currentSlide === TOUR_SLIDES.length - 1 ? '开始使用' : '我知道了'}
          </button>
        </div>
      </div>
    </div>
  )
}
