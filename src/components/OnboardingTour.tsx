'use client'

import { useState, useEffect } from 'react'
import styles from './OnboardingTour.module.css'

interface TourStep {
  title: string
  description: string
  icon: string
  action?: {
    text: string
    link: string
  }
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '欢迎使用文言文学习助手',
    description: '这是一款专为文言文学习设计的工具，集成了导入、整理、AI辅助、自动出题等多项功能。让我们快速了解一下主要功能。',
    icon: '👋',
  },
  {
    title: '📥 导入文本',
    description: '支持导入纯文本或Word文档，系统会自动分句并按"库-集-文章"三级结构管理。这是使用其他功能的基础。',
    icon: '📥',
    action: {
      text: '去导入',
      link: '/import',
    },
  },
  {
    title: '🎨 思维导图整理',
    description: '使用可视化思维导图整理文章结构，支持拖拽编辑、节点关联句子。可以手动整理，也可以使用AI自动生成。',
    icon: '🎨',
    action: {
      text: '去整理',
      link: '/organize',
    },
  },
  {
    title: '🤖 AI辅助功能',
    description: 'AI可以帮你：\n• 自动识别重点字并生成义项\n• 自动分析文章生成思维导图\n• 根据需求生成正则表达式\n\n使用前需要配置API密钥。',
    icon: '🤖',
    action: {
      text: '配置API',
      link: '/manage/concurrency-settings',
    },
  },
  {
    title: '📝 义项管理',
    description: '为文言文中的字添加义项解释，并关联到具体句子。义项库是自动出题的基础，可以手动添加或使用AI批量生成。',
    icon: '📝',
    action: {
      text: '管理义项',
      link: '/manage',
    },
  },
  {
    title: '📋 自动出题',
    description: '根据义项库自动生成文言文选择题，支持：\n• 多种题型（同字/不同字）\n• 灵活配置（题数、选项数等）\n• 导出Word（教师版/学生版）\n\n系统会智能推荐合适的题型。',
    icon: '📋',
    action: {
      text: '开始出题',
      link: '/exam',
    },
  },
  {
    title: '🔍 全局搜索',
    description: '在首页可以搜索句子、义项、短句，支持实时过滤和高级筛选。快速找到你需要的内容。',
    icon: '🔍',
    action: {
      text: '去搜索',
      link: '/',
    },
  },
  {
    title: '开始使用',
    description: '建议的使用流程：\n1. 导入文本\n2. 配置API（如需使用AI功能）\n3. 生成义项（手动或AI）\n4. 自动出题\n\n随时可以在设置中重新查看本教程。',
    icon: '🚀',
  },
]

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // 检查是否是第一次使用
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour')
    if (!hasSeenTour) {
      setIsOpen(true)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    localStorage.setItem('hasSeenOnboardingTour', 'true')
    setIsOpen(false)
  }

  const handleSkip = () => {
    handleClose()
  }

  const handleGoToAction = (link: string) => {
    handleClose()
    window.location.href = link
  }

  if (!isOpen) return null

  const step = TOUR_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TOUR_STEPS.length - 1

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* 关闭按钮 */}
        <button className={styles.closeButton} onClick={handleClose}>
          ✕
        </button>

        {/* 进度指示器 */}
        <div className={styles.progress}>
          {TOUR_STEPS.map((_, index) => (
            <div
              key={index}
              className={`${styles.progressDot} ${
                index === currentStep ? styles.active : ''
              } ${index < currentStep ? styles.completed : ''}`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        {/* 内容区域 */}
        <div className={styles.content}>
          <div className={styles.icon}>{step.icon}</div>
          <h2 className={styles.title}>{step.title}</h2>
          <p className={styles.description}>{step.description}</p>

          {step.action && (
            <button
              className={styles.actionButton}
              onClick={() => handleGoToAction(step.action!.link)}
            >
              {step.action.text}
            </button>
          )}
        </div>

        {/* 底部按钮 */}
        <div className={styles.footer}>
          <div className={styles.stepIndicator}>
            {currentStep + 1} / {TOUR_STEPS.length}
          </div>

          <div className={styles.buttons}>
            {!isFirstStep && (
              <button className={styles.secondaryButton} onClick={handlePrev}>
                上一步
              </button>
            )}

            {!isLastStep && (
              <button className={styles.skipButton} onClick={handleSkip}>
                跳过教程
              </button>
            )}

            <button className={styles.primaryButton} onClick={handleNext}>
              {isLastStep ? '开始使用' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
