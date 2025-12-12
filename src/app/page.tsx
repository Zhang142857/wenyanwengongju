'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { BookIcon, ToolboxIcon, SettingsIcon, RefreshIcon, UploadIcon, CloseIcon } from '@/components/Icons'
import { configService } from '@/services/configService'
import type { BackgroundEffects } from '@/types/config'
import styles from './home.module.css'

interface Quote {
  text: string
  author?: string
}

const DEFAULT_EFFECTS: BackgroundEffects = {
  blur: false,
  darken: false,
  grayscale: false,
  blurAmount: 8,
  brightness: 50,
  saturation: 100,
}

export default function Home() {
  const [showSettings, setShowSettings] = useState(false)
  const [backgroundType, setBackgroundType] = useState<'gradient' | 'image' | 'video' | 'color'>('gradient')
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e')
  const [mediaPath, setMediaPath] = useState('')
  const [effects, setEffects] = useState<BackgroundEffects>(DEFAULT_EFFECTS)
  const [currentQuote, setCurrentQuote] = useState<Quote>({ text: '学而不思则罔，思而不学则殆。', author: '孔子' })
  const [quotes, setQuotes] = useState<Quote[]>([
    { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
    { text: '知之为知之，不知为不知，是知也。', author: '孔子' },
    { text: '三人行，必有我师焉。', author: '孔子' },
    { text: '己所不欲，勿施于人。', author: '孔子' },
    { text: '温故而知新，可以为师矣。', author: '孔子' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const quoteFileInputRef = useRef<HTMLInputElement>(null)

  const tools = [
    { id: 'classical-chinese', name: '文言文查询', description: '查询文言文字词和句子', link: '/query' },
    { id: 'auto-exam', name: '自动出题', description: '智能生成练习题目', link: '/exam' },
    { id: 'regex-generator', name: '正则生成器', description: 'AI辅助生成正则表达式', link: '/regex-generator' }
  ]

  // 加载背景媒体
  const loadBackgroundMedia = useCallback(async (path: string) => {
    if (!path || typeof window === 'undefined' || !window.electronAPI?.getBackgroundMedia) {
      return null
    }
    try {
      const result = await window.electronAPI.getBackgroundMedia(path)
      if (result.success && result.data) {
        return result.data
      }
    } catch (error) {
      console.error('加载背景媒体失败:', error)
    }
    return null
  }, [])

  // 初始化加载配置
  useEffect(() => {
    const loadConfig = async () => {
      await configService.initialize()
      const config = configService.getConfig()
      const bgSettings = config.system.backgroundSettings

      setBackgroundType(bgSettings.type)
      setBackgroundColor(bgSettings.color || '#1a1a2e')
      
      // 加载效果设置
      if (bgSettings.effects) {
        setEffects(bgSettings.effects)
      } else if (bgSettings.effect && bgSettings.effect !== 'none') {
        // 向后兼容旧版单选效果
        setEffects({
          ...DEFAULT_EFFECTS,
          blur: bgSettings.effect === 'blur',
          darken: bgSettings.effect === 'brightness',
          grayscale: bgSettings.effect === 'grayscale',
        })
      }

      // 加载媒体文件
      if (bgSettings.mediaPath) {
        setMediaPath(bgSettings.mediaPath)
        const mediaData = await loadBackgroundMedia(bgSettings.mediaPath)
        if (mediaData) {
          setBackgroundUrl(mediaData)
        }
      } else if (bgSettings.url) {
        setBackgroundUrl(bgSettings.url)
      }

      // 加载名言
      const savedQuotes = localStorage.getItem('homeQuotes')
      if (savedQuotes) {
        const parsedQuotes = JSON.parse(savedQuotes)
        setQuotes(parsedQuotes)
        setCurrentQuote(parsedQuotes[Math.floor(Math.random() * parsedQuotes.length)])
      }
    }
    loadConfig()
  }, [loadBackgroundMedia])

  // 保存背景设置到配置
  const saveBackgroundSettings = useCallback(async (
    type: typeof backgroundType,
    url?: string,
    path?: string,
    color?: string,
    newEffects?: BackgroundEffects
  ) => {
    const config = configService.getConfig()
    config.system.backgroundSettings = {
      ...config.system.backgroundSettings,
      type,
      url: url || '',
      mediaPath: path || '',
      color: color || config.system.backgroundSettings.color,
      effects: newEffects || effects,
    }
    await configService.updateConfig(config)
  }, [effects])

  const handleBackgroundTypeChange = async (type: typeof backgroundType) => {
    setBackgroundType(type)
    if (type === 'gradient' || type === 'color') {
      setBackgroundUrl('')
      setMediaPath('')
    }
    await saveBackgroundSettings(type, '', '', backgroundColor, effects)
  }

  const handleColorChange = async (color: string) => {
    setBackgroundColor(color)
    await saveBackgroundSettings('color', '', '', color, effects)
  }

  const handleEffectToggle = async (effectKey: keyof Pick<BackgroundEffects, 'blur' | 'darken' | 'grayscale'>) => {
    const newEffects = { ...effects, [effectKey]: !effects[effectKey] }
    setEffects(newEffects)
    await saveBackgroundSettings(backgroundType, backgroundUrl, mediaPath, backgroundColor, newEffects)
  }

  const handleEffectValueChange = async (key: 'blurAmount' | 'brightness' | 'saturation', value: number) => {
    const newEffects = { ...effects, [key]: value }
    setEffects(newEffects)
    await saveBackgroundSettings(backgroundType, backgroundUrl, mediaPath, backgroundColor, newEffects)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const type = file.type.startsWith('video/') ? 'video' : 'image'

    try {
      // 读取文件为 base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string
        
        // 尝试保存到 Electron 用户数据目录
        if (typeof window !== 'undefined' && window.electronAPI?.saveBackgroundMedia) {
          const result = await window.electronAPI.saveBackgroundMedia(base64Data, file.name, type)
          if (result.success && result.path) {
            // 删除旧的媒体文件
            if (mediaPath && window.electronAPI?.deleteBackgroundMedia) {
              await window.electronAPI.deleteBackgroundMedia(mediaPath)
            }
            setMediaPath(result.path)
            setBackgroundUrl(base64Data)
            setBackgroundType(type)
            await saveBackgroundSettings(type, '', result.path, backgroundColor, effects)
            setIsLoading(false)
            return
          }
        }

        // 回退：直接使用 base64（仅图片，视频太大）
        if (type === 'image') {
          setBackgroundUrl(base64Data)
          setBackgroundType(type)
          await saveBackgroundSettings(type, base64Data, '', backgroundColor, effects)
        } else {
          // 视频使用 blob URL（刷新后失效）
          const blobUrl = URL.createObjectURL(file)
          setBackgroundUrl(blobUrl)
          setBackgroundType(type)
          alert('视频背景在非 Electron 环境下刷新后需要重新上传')
        }
        setIsLoading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('上传背景失败:', error)
      setIsLoading(false)
    }

    if (e.target) e.target.value = ''
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
            return { text: parts[0].trim(), author: parts[1]?.trim() }
          })
          if (newQuotes.length > 0) {
            setQuotes(newQuotes)
            setCurrentQuote(newQuotes[0])
            localStorage.setItem('homeQuotes', JSON.stringify(newQuotes))
            alert(`成功导入 ${newQuotes.length} 条名言`)
          }
        } catch {
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

  // 计算背景滤镜样式
  const getFilterStyle = (): string => {
    const filters: string[] = []
    if (effects.blur) filters.push(`blur(${effects.blurAmount}px)`)
    if (effects.grayscale) filters.push('grayscale(100%)')
    
    // 亮度：50为正常(1)，0为全黑(0)，100为最亮(2)
    const brightnessValue = effects.brightness / 50
    if (effects.darken || effects.brightness !== 50) {
      const finalBrightness = effects.darken ? brightnessValue * 0.6 : brightnessValue
      filters.push(`brightness(${finalBrightness})`)
    }
    
    // 饱和度：100为正常(1)
    if (effects.saturation !== 100) {
      filters.push(`saturate(${effects.saturation / 100})`)
    }
    
    return filters.length > 0 ? filters.join(' ') : 'none'
  }

  const getBackgroundStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {}
    
    if (backgroundType === 'color') {
      style.backgroundColor = backgroundColor
    } else if (backgroundType === 'image' && backgroundUrl) {
      style.backgroundImage = `url(${backgroundUrl})`
      style.backgroundSize = 'cover'
      style.backgroundPosition = 'center'
    }
    
    return style
  }

  return (
    <Layout>
      <div className={styles.container} style={getBackgroundStyle()}>
        {/* 视频背景 */}
        {backgroundType === 'video' && backgroundUrl && (
          <video 
            className={styles.backgroundVideo}
            style={{ filter: getFilterStyle() }}
            autoPlay loop muted playsInline
          >
            <source src={backgroundUrl} />
          </video>
        )}
        
        {/* 图片背景滤镜层 */}
        {backgroundType === 'image' && backgroundUrl && (
          <div 
            className={styles.imageFilterLayer}
            style={{ 
              backgroundImage: `url(${backgroundUrl})`,
              filter: getFilterStyle()
            }}
          />
        )}
        
        {/* 渐变背景 */}
        {backgroundType === 'gradient' && (
          <div className={styles.overlay} style={{ filter: getFilterStyle() }} />
        )}
        
        {/* 纯色背景滤镜层 */}
        {backgroundType === 'color' && (
          <div 
            className={styles.colorFilterLayer}
            style={{ 
              backgroundColor: backgroundColor,
              filter: getFilterStyle()
            }}
          />
        )}
        
        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <ToolboxIcon className={styles.icon} />
              <h1 className={styles.title}>文言文小工具</h1>
            </div>
            <button className={styles.settingsBtn} onClick={() => setShowSettings(true)} title="设置">
              <SettingsIcon />
            </button>
          </header>

          <div className={styles.copyrightBar}>
            <span className={styles.versionBadge}>v1.2.1</span>
            <span className={styles.separator}>|</span>
            <a href="https://github.com/Zhang142857" target="_blank" rel="noopener noreferrer" className={styles.authorLink}>
              <img src="/DM_20251130153613_001.png" alt="作者头像" className={styles.authorAvatar} />
              <span className={styles.authorName}>@Zhang142857</span>
            </a>
            <span className={styles.separator}>|</span>
            <a href="https://github.com/Zhang142857/wenyanwengongju" target="_blank" rel="noopener noreferrer" className={styles.projectLink}>
              <span>项目地址</span>
            </a>
          </div>

          <div className={styles.quoteContainer}>
            <div className={styles.quoteHeader}>
              <span>每日一言</span>
              <div className={styles.quoteActions}>
                <button className={styles.quoteActionBtn} onClick={refreshQuote} title="换一句"><RefreshIcon /></button>
                <button className={styles.quoteActionBtn} onClick={() => quoteFileInputRef.current?.click()} title="导入名言列表"><UploadIcon /></button>
                <input ref={quoteFileInputRef} type="file" accept=".txt" onChange={handleQuoteFileUpload} style={{ display: 'none' }} />
              </div>
            </div>
            <p className={styles.quoteText}>{currentQuote.text}</p>
            {currentQuote.author && <p className={styles.quoteAuthor}>{currentQuote.author}</p>}
          </div>

          <div className={styles.main}>
            <div className={styles.toolsGrid}>
              {tools.map((tool) => (
                <Link key={tool.id} href={tool.link} className={styles.toolCard}>
                  <div className={styles.toolIcon}><BookIcon /></div>
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
              <button className={styles.dialogClose} onClick={() => setShowSettings(false)}><CloseIcon /></button>
            </div>
            
            <div className={styles.dialogContent}>
              {/* 背景类型 */}
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>背景类型</label>
                <div className={styles.radioGroup}>
                  {(['gradient', 'color', 'image', 'video'] as const).map(type => (
                    <label key={type} className={styles.radioLabel}>
                      <input type="radio" checked={backgroundType === type} onChange={() => handleBackgroundTypeChange(type)} />
                      <span>{{ gradient: '渐变', color: '纯色', image: '图片', video: '视频' }[type]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 纯色选择器 */}
              {backgroundType === 'color' && (
                <div className={styles.settingsGroup}>
                  <label className={styles.settingsLabel}>背景颜色</label>
                  <div className={styles.colorPickerRow}>
                    <input type="color" value={backgroundColor} onChange={(e) => handleColorChange(e.target.value)} className={styles.colorPicker} />
                    <input type="text" value={backgroundColor} onChange={(e) => handleColorChange(e.target.value)} className={styles.colorInput} placeholder="#000000" />
                  </div>
                </div>
              )}

              {/* 上传按钮 */}
              {(backgroundType === 'image' || backgroundType === 'video') && (
                <div className={styles.settingsGroup}>
                  <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    <UploadIcon /> {isLoading ? '上传中...' : `上传${backgroundType === 'video' ? '视频' : '图片'}`}
                  </button>
                  <input ref={fileInputRef} type="file" accept={backgroundType === 'video' ? 'video/*' : 'image/*'} onChange={handleFileUpload} style={{ display: 'none' }} />
                  {backgroundUrl && <p className={styles.uploadHint}>✓ 已设置背景{backgroundType === 'video' ? '视频' : '图片'}</p>}
                </div>
              )}

              {/* 效果开关（多选） */}
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>背景效果（可多选）</label>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={effects.blur} onChange={() => handleEffectToggle('blur')} />
                    <span>模糊</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={effects.darken} onChange={() => handleEffectToggle('darken')} />
                    <span>变暗</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={effects.grayscale} onChange={() => handleEffectToggle('grayscale')} />
                    <span>灰度</span>
                  </label>
                </div>
              </div>

              {/* 模糊程度滑块 */}
              {effects.blur && (
                <div className={styles.settingsGroup}>
                  <label className={styles.settingsLabel}>模糊程度: {effects.blurAmount}px</label>
                  <input type="range" min="0" max="20" value={effects.blurAmount} onChange={(e) => handleEffectValueChange('blurAmount', Number(e.target.value))} className={styles.slider} />
                </div>
              )}

              {/* 亮度滑块 */}
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>亮度: {effects.brightness}%</label>
                <input type="range" min="0" max="100" value={effects.brightness} onChange={(e) => handleEffectValueChange('brightness', Number(e.target.value))} className={styles.slider} />
              </div>

              {/* 饱和度滑块 */}
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>饱和度: {effects.saturation}%</label>
                <input type="range" min="0" max="200" value={effects.saturation} onChange={(e) => handleEffectValueChange('saturation', Number(e.target.value))} className={styles.slider} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
