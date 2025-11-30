'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { BookIcon, ToolboxIcon, SettingsIcon, RefreshIcon, UploadIcon, CloseIcon } from '@/components/Icons'
import styles from './home.module.css'

interface Quote {
  text: string
  author?: string
}

export default function Home() {
  const [showSettings, setShowSettings] = useState(false)
  const [backgroundType, setBackgroundType] = useState<'gradient' | 'image' | 'video'>('gradient')
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [backgroundEffect, setBackgroundEffect] = useState<'none' | 'blur' | 'brightness' | 'grayscale'>('none')
  const [currentQuote, setCurrentQuote] = useState<Quote>({ text: '学而不思则罔，思而不学则殆。', author: '孔子' })
  const [quotes, setQuotes] = useState<Quote[]>([
    { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
    { text: '知之为知之，不知为不知，是知也。', author: '孔子' },
    { text: '三人行，必有我师焉。', author: '孔子' },
    { text: '己所不欲，勿施于人。', author: '孔子' },
    { text: '温故而知新，可以为师矣。', author: '孔子' }
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const quoteFileInputRef = useRef<HTMLInputElement>(null)

  const tools = [
    {
      id: 'classical-chinese',
      name: '文言文查询',
      description: '查询文言文字词和句子',
      link: '/query'
    },
    {
      id: 'auto-exam',
      name: '自动出题',
      description: '智能生成练习题目',
      link: '/exam'
    },
    {
      id: 'regex-generator',
      name: '正则生成器',
      description: 'AI辅助生成正则表达式',
      link: '/regex-generator'
    }
  ]

  useEffect(() => {
    const savedBgType = localStorage.getItem('homeBgType') as typeof backgroundType
    const savedBgUrl = localStorage.getItem('homeBgUrl')
    const savedBgEffect = localStorage.getItem('homeBgEffect') as typeof backgroundEffect
    const savedQuotes = localStorage.getItem('homeQuotes')
    const videoNeedsReupload = localStorage.getItem('homeBgVideoNeedsReupload')
    
    if (savedBgType) {
      // 如果是视频类型且需要重新上传，则回退到渐变背景
      if (savedBgType === 'video' && videoNeedsReupload === 'true') {
        setBackgroundType('gradient')
        localStorage.removeItem('homeBgVideoNeedsReupload')
      } else {
        setBackgroundType(savedBgType)
      }
    }
    if (savedBgUrl) setBackgroundUrl(savedBgUrl)
    if (savedBgEffect) setBackgroundEffect(savedBgEffect)
    if (savedQuotes) {
      const parsedQuotes = JSON.parse(savedQuotes)
      setQuotes(parsedQuotes)
      setCurrentQuote(parsedQuotes[Math.floor(Math.random() * parsedQuotes.length)])
    }
  }, [])

  const handleBackgroundChange = (type: typeof backgroundType, url?: string) => {
    setBackgroundType(type)
    if (url !== undefined) {
      setBackgroundUrl(url)
      localStorage.setItem('homeBgUrl', url)
    }
    localStorage.setItem('homeBgType', type)
  }

  const handleEffectChange = (effect: typeof backgroundEffect) => {
    setBackgroundEffect(effect)
    localStorage.setItem('homeBgEffect', effect)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 对于图片，使用 base64 存储以便持久化
      // 对于视频，由于文件较大，使用 blob URL（刷新后需重新上传）
      const type = file.type.startsWith('video/') ? 'video' : 'image'
      
      if (type === 'image') {
        const reader = new FileReader()
        reader.onload = (event) => {
          const base64Url = event.target?.result as string
          handleBackgroundChange(type, base64Url)
        }
        reader.readAsDataURL(file)
      } else {
        // 视频文件使用 blob URL
        const url = URL.createObjectURL(file)
        handleBackgroundChange(type, url)
        // 清除 localStorage 中的旧视频 URL，因为 blob URL 刷新后失效
        localStorage.removeItem('homeBgUrl')
        // 保存一个标记，提示用户视频需要重新上传
        localStorage.setItem('homeBgVideoNeedsReupload', 'true')
      }
    }
    // 重置 input 以便可以重复选择同一文件
    if (e.target) {
      e.target.value = ''
    }
  }

  const handleQuoteFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const lines = content.split('\n').filter(line => line.trim())
          const newQuotes: Quote[] = lines.map(line => {
            const parts = line.split('|')
            return {
              text: parts[0].trim(),
              author: parts[1]?.trim()
            }
          })
          if (newQuotes.length > 0) {
            setQuotes(newQuotes)
            setCurrentQuote(newQuotes[0])
            localStorage.setItem('homeQuotes', JSON.stringify(newQuotes))
            alert(`成功导入 ${newQuotes.length} 条名言`)
          }
        } catch (error) {
          alert('导入失败，请检查文件格式')
        }
      }
      reader.readAsText(file)
    }
  }

  const refreshQuote = () => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    setCurrentQuote(randomQuote)
  }

  const getBackgroundStyle = () => {
    const baseStyle: React.CSSProperties = {}
    
    if (backgroundType === 'image' && backgroundUrl) {
      baseStyle.backgroundImage = `url(${backgroundUrl})`
      baseStyle.backgroundSize = 'cover'
      baseStyle.backgroundPosition = 'center'
    }
    
    return baseStyle
  }

  const getEffectClass = () => {
    switch (backgroundEffect) {
      case 'blur': return styles.effectBlur
      case 'brightness': return styles.effectBrightness
      case 'grayscale': return styles.effectGrayscale
      default: return ''
    }
  }

  return (
    <Layout>
      <div className={styles.container} style={getBackgroundStyle()}>
        {backgroundType === 'video' && backgroundUrl && (
          <video 
            className={`${styles.backgroundVideo} ${getEffectClass()}`}
            autoPlay 
            loop 
            muted 
            playsInline
          >
            <source src={backgroundUrl} />
          </video>
        )}
        
        {backgroundType === 'gradient' && (
          <div className={`${styles.overlay} ${getEffectClass()}`}></div>
        )}
        
        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <ToolboxIcon className={styles.icon} />
              <h1 className={styles.title}>文言文小工具</h1>
            </div>
            
            <button 
              className={styles.settingsBtn}
              onClick={() => setShowSettings(true)}
              title="设置"
            >
              <SettingsIcon />
            </button>
          </header>

          {/* 版权信息 */}
          <div className={styles.copyrightBar}>
            <a 
              href="https://github.com/Zhang142857" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.authorLink}
            >
              <img 
                src="/DM_20251130153613_001.png" 
                alt="作者头像" 
                className={styles.authorAvatar}
              />
              <span className={styles.authorName}>@Zhang142857</span>
            </a>
            <span className={styles.separator}>|</span>
            <a 
              href="https://github.com/Zhang142857/wenyanwengongju" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.projectLink}
            >
              <span>项目地址</span>
            </a>
          </div>

          {/* 每日一言 */}
          <div className={styles.quoteContainer}>
            <div className={styles.quoteHeader}>
              <span>每日一言</span>
              <div className={styles.quoteActions}>
                <button 
                  className={styles.quoteActionBtn}
                  onClick={refreshQuote}
                  title="换一句"
                >
                  <RefreshIcon />
                </button>
                <button 
                  className={styles.quoteActionBtn}
                  onClick={() => quoteFileInputRef.current?.click()}
                  title="导入名言列表"
                >
                  <UploadIcon />
                </button>
                <input 
                  ref={quoteFileInputRef}
                  type="file" 
                  accept=".txt"
                  onChange={handleQuoteFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            <p className={styles.quoteText}>{currentQuote.text}</p>
            {currentQuote.author && (
              <p className={styles.quoteAuthor}>{currentQuote.author}</p>
            )}
          </div>

          {/* 工具列表 */}
          <div className={styles.main}>
            <div className={styles.toolsGrid}>
              {tools.map((tool) => (
                <Link
                  key={tool.id}
                  href={tool.link}
                  className={styles.toolCard}
                >
                  <div className={styles.toolIcon}>
                    <BookIcon />
                  </div>
                  <div className={styles.toolInfo}>
                    <h2 className={styles.toolName}>{tool.name}</h2>
                    <p className={styles.toolDesc}>{tool.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 设置对话框 */}
      {showSettings && (
        <div className={styles.dialogOverlay} onClick={() => setShowSettings(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <h3 className={styles.dialogTitle}>背景设置</h3>
              <button 
                className={styles.dialogClose}
                onClick={() => setShowSettings(false)}
              >
                <CloseIcon />
              </button>
            </div>
            
            <div className={styles.dialogContent}>
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>背景类型</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      checked={backgroundType === 'gradient'}
                      onChange={() => handleBackgroundChange('gradient')}
                    />
                    <span>渐变</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      checked={backgroundType === 'image'}
                      onChange={() => handleBackgroundChange('image')}
                    />
                    <span>图片</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      checked={backgroundType === 'video'}
                      onChange={() => handleBackgroundChange('video')}
                    />
                    <span>视频</span>
                  </label>
                </div>
              </div>

              {(backgroundType === 'image' || backgroundType === 'video') && (
                <div className={styles.settingsGroup}>
                  <button 
                    className={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon /> 上传{backgroundType === 'video' ? '视频' : '图片'}
                  </button>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept={backgroundType === 'video' ? 'video/*' : 'image/*'}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              )}

              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>背景效果</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      checked={backgroundEffect === 'none'}
                      onChange={() => handleEffectChange('none')}
                    />
                    <span>无</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      checked={backgroundEffect === 'blur'}
                      onChange={() => handleEffectChange('blur')}
                    />
                    <span>模糊</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      checked={backgroundEffect === 'brightness'}
                      onChange={() => handleEffectChange('brightness')}
                    />
                    <span>变暗</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      checked={backgroundEffect === 'grayscale'}
                      onChange={() => handleEffectChange('grayscale')}
                    />
                    <span>灰度</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
