'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { configService } from '@/services/configService'
import { DEFAULT_CONFIG } from '@/types/config'
import styles from './Tour.module.css'

export interface TourStep {
    target: string // CSS selector
    title: string
    content: string
    position?: 'top' | 'bottom' | 'left' | 'right'
}

interface TourProps {
    pageId: keyof typeof DEFAULT_CONFIG.tourPlayedRecord | string
    steps: TourStep[]
    onComplete?: () => void
}

export default function Tour({ pageId, steps, onComplete }: TourProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [isMounted, setIsMounted] = useState(false)

    // 检查是否已播放过
    useEffect(() => {
        setIsMounted(true)
        const checkStatus = async () => {
            // 确保配置已加载
            if (!configService.getConfig().version) {
                await configService.initialize()
            }

            const hasPlayed = configService.hasTourPlayed(pageId as any)
            const isEnabled = configService.getConfig().system.enableTour

            if (!hasPlayed && isEnabled) {
                // 延迟一点显示，确保页面元素渲染完成
                setTimeout(() => setIsVisible(true), 1000)
            }
        }
        checkStatus()
    }, [pageId])

    // 监听窗口大小变化和步骤变化来更新位置
    useEffect(() => {
        if (!isVisible) return

        const updatePosition = () => {
            const step = steps[currentStepIndex]
            const element = document.querySelector(step.target)

            if (element) {
                // 滚动到元素
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setTargetRect(element.getBoundingClientRect())
            } else {
                // 如果找不到元素，跳过这一步或者隐藏
                console.warn(`Tour target not found: ${step.target}`)
            }
        }

        // 初始延迟更新，给滚动一点时间
        const timer = setTimeout(updatePosition, 300)
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition)
        }
    }, [isVisible, currentStepIndex, steps])

    const handleNext = async () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            await handleComplete()
        }
    }

    const handleSkip = async () => {
        await handleComplete()
    }

    const handleComplete = async () => {
        setIsVisible(false)
        await configService.markTourPlayed(pageId as any)
        if (onComplete) onComplete()
    }

    if (!isMounted || !isVisible || !targetRect) return null

    const step = steps[currentStepIndex]

    // 计算 Popover 位置
    let popoverStyle: React.CSSProperties = {}
    const gap = 12

    if (step.position === 'top') {
        popoverStyle = {
            top: targetRect.top - gap,
            left: targetRect.left + targetRect.width / 2,
            transform: 'translate(-50%, -100%)'
        }
    } else if (step.position === 'bottom') {
        popoverStyle = {
            top: targetRect.bottom + gap,
            left: targetRect.left + targetRect.width / 2,
            transform: 'translate(-50%, 0)'
        }
    } else if (step.position === 'left') {
        popoverStyle = {
            top: targetRect.top + targetRect.height / 2,
            left: targetRect.left - gap,
            transform: 'translate(-100%, -50%)'
        }
    } else { // right or default
        popoverStyle = {
            top: targetRect.top + targetRect.height / 2,
            left: targetRect.right + gap,
            transform: 'translate(0, -50%)'
        }
    }

    // 确保 Popover 不会溢出屏幕
    // 这里做简化的边界检查，实际可能需要更复杂的逻辑

    return createPortal(
        <>
            <div className={styles.highlightBox} style={{
                top: targetRect.top + window.scrollY, // getBoundingClientRect 是相对于视口的，absolute 定位可能需要加上 scrollY
                left: targetRect.left + window.scrollX,
                width: targetRect.width,
                height: targetRect.height,
                position: 'absolute' // 强制 absolute
            }} />

            <div className={styles.popover} style={{
                ...popoverStyle,
                top: (popoverStyle.top as number) + window.scrollY,
                left: (popoverStyle.left as number) + window.scrollX,
            }}>
                <h3 className={styles.title}>{step.title}</h3>
                <p className={styles.content}>{step.content}</p>

                <div className={styles.footer}>
                    <div className={styles.steps}>
                        步骤 {currentStepIndex + 1} / {steps.length}
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.skipBtn} onClick={handleSkip}>
                            跳过
                        </button>
                        <button className={styles.nextBtn} onClick={handleNext}>
                            {currentStepIndex === steps.length - 1 ? '完成' : '下一步'}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
