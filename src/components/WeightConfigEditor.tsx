'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { WeightConfigService, type WeightConfig } from '@/services/weightConfig'
import { StorageService } from '@/services/storage'
import { AIKeyPointService } from '@/services/aiKeyPoint'
import type { CharacterWeight, ExamScope } from '@/services/examGenerator'
import styles from './WeightConfigEditor.module.css'

interface WeightConfigEditorProps {
  initialCharacters?: CharacterWeight[]
  scope?: ExamScope
  onConfirm: (characters: CharacterWeight[]) => void
  onClose: () => void
}

export default function WeightConfigEditor({ initialCharacters = [], scope, onConfirm, onClose }: WeightConfigEditorProps) {
  const toast = useToast()
  const [service] = useState(() => new WeightConfigService())
  const [storage] = useState(() => new StorageService())
  const [aiService] = useState(() => new AIKeyPointService(storage))
  const [characters, setCharacters] = useState<CharacterWeight[]>(initialCharacters)
  const [savedConfigs, setSavedConfigs] = useState<WeightConfig[]>([])
  const [inputValue, setInputValue] = useState('')
  const [configName, setConfigName] = useState('')
  const [configNote, setConfigNote] = useState('')
  const [aiRequirement, setAiRequirement] = useState('')
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    storage.initialize()
    setSavedConfigs(service.getAll())
  }, [service, storage])

  // 添加字符
  const handleAddChars = () => {
    if (!inputValue.trim()) return
    const chars = Array.from(inputValue).filter(c => /[\u4e00-\u9fa5]/.test(c))
    if (chars.length === 0) {
      toast.warning('请输入中文字符')
      return
    }
    const existingChars = new Set(characters.map(c => c.char))
    const newChars = chars.filter(c => !existingChars.has(c))
    if (newChars.length === 0) {
      toast.info('所有字符已存在')
      return
    }
    setCharacters([...characters, ...newChars.map(char => ({ char, weight: 100 }))])
    setInputValue('')
    toast.success(`添加了 ${newChars.length} 个字符`)
  }

  // 自动生成权重（基于数据库中的义项数据）
  const handleAutoGenerate = () => {
    if (!scope) {
      toast.warning('请先选择考察范围')
      return
    }

    // 获取范围内的所有义项
    const definitions = storage.getDefinitions()
    const libraries = storage.getLibraries()
    
    // 获取范围内的句子ID
    const sentenceIdsInScope = new Set<string>()
    for (const library of libraries) {
      if (scope.libraryId && library.id !== scope.libraryId) continue
      for (const collection of library.collections) {
        if (scope.collectionId && collection.id !== scope.collectionId) continue
        for (const article of collection.articles) {
          if (scope.articleId && article.id !== scope.articleId) continue
          article.sentences.forEach(s => sentenceIdsInScope.add(s.id))
        }
      }
    }

    // 统计每个字的义项数量和关联句子数量
    const charStats = new Map<string, { definitionCount: number; linkCount: number }>()
    
    for (const def of definitions) {
      const links = storage.getDefinitionLinksForDefinition(def.id)
      const linksInScope = links.filter(link => sentenceIdsInScope.has(link.sentenceId))
      
      if (linksInScope.length === 0) continue
      
      const char = def.character
      const existing = charStats.get(char) || { definitionCount: 0, linkCount: 0 }
      existing.definitionCount++
      existing.linkCount += linksInScope.length
      charStats.set(char, existing)
    }

    if (charStats.size === 0) {
      toast.warning('当前范围内没有可用的义项数据')
      return
    }

    // 计算权重：基于义项数量和关联数量
    const maxLinks = Math.max(...Array.from(charStats.values()).map(s => s.linkCount))
    const newChars: CharacterWeight[] = []
    
    charStats.forEach((stats, char) => {
      // 权重计算：义项数量 * 20 + 关联数量占比 * 60，最高100
      const defScore = Math.min(stats.definitionCount * 20, 40)
      const linkScore = Math.round((stats.linkCount / maxLinks) * 60)
      const weight = Math.min(defScore + linkScore, 100)
      newChars.push({ char, weight })
    })

    // 按权重排序
    newChars.sort((a, b) => b.weight - a.weight)
    
    setCharacters(newChars)
    toast.success(`自动生成了 ${newChars.length} 个考点`)
  }

  // AI生成考点
  const handleAiGenerate = async () => {
    if (!aiRequirement.trim()) {
      toast.warning('请输入考点需求描述')
      return
    }
    if (!scope) {
      toast.warning('请先选择考察范围')
      return
    }

    setIsAiGenerating(true)
    try {
      const result = await aiService.generateKeyPoints({
        requirement: aiRequirement,
        scope,
        questionType: 'same-character'
      })

      if (result.characters.length === 0) {
        toast.warning('AI未能生成考点，请尝试修改需求描述')
        return
      }

      // 将AI生成的字符添加到列表，根据可用性设置权重
      const existingChars = new Set(characters.map(c => c.char))
      const newChars: CharacterWeight[] = []
      
      result.characters.forEach(char => {
        if (!existingChars.has(char)) {
          const isAvailable = result.availability.get(char)
          newChars.push({
            char,
            weight: isAvailable ? 100 : 30 // 可用的设为100，不可用的设为30
          })
        }
      })

      if (newChars.length === 0) {
        toast.info('AI推荐的字符都已存在')
        return
      }

      setCharacters([...characters, ...newChars])
      toast.success(`AI生成了 ${newChars.length} 个考点`)
      
      // 显示AI的推理说明
      if (result.reasoning) {
        toast.info(result.reasoning, 5000)
      }
    } catch (error) {
      console.error('AI生成失败:', error)
      toast.error('AI生成失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsAiGenerating(false)
    }
  }

  // 更新权重
  const updateWeight = (index: number, weight: number) => {
    const newChars = [...characters]
    newChars[index].weight = Math.max(0, Math.min(100, weight))
    setCharacters(newChars)
  }

  // 删除字符
  const removeChar = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index))
  }

  // 移动字符
  const moveChar = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === characters.length - 1) return
    const newChars = [...characters]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newChars[index], newChars[targetIndex]] = [newChars[targetIndex], newChars[index]]
    setCharacters(newChars)
  }

  // 快捷操作
  const setAllWeights = (weight: number) => {
    setCharacters(characters.map(c => ({ ...c, weight })))
  }

  const distributeWeights = () => {
    if (characters.length === 0) return
    const step = 100 / characters.length
    setCharacters(characters.map((c, i) => ({ ...c, weight: Math.round((i + 1) * step) })))
  }

  // 保存配置
  const handleSaveConfig = () => {
    if (!configName.trim()) {
      toast.warning('请输入配置名称')
      return
    }
    if (characters.length === 0) {
      toast.warning('请先添加字符')
      return
    }
    service.create(configName, characters, configNote)
    setSavedConfigs(service.getAll())
    setConfigName('')
    setConfigNote('')
    toast.success('配置已保存')
  }

  // 加载配置
  const handleLoadConfig = (config: WeightConfig) => {
    setCharacters([...config.characters])
    toast.success(`已加载: ${config.name}`)
  }

  // 删除配置
  const handleDeleteConfig = (id: string) => {
    service.delete(id)
    setSavedConfigs(service.getAll())
    toast.success('配置已删除')
  }

  // 导出JSON
  const handleExport = () => {
    if (characters.length === 0) {
      toast.warning('没有可导出的数据')
      return
    }
    const data: Partial<WeightConfig> = {
      name: configName || '未命名配置',
      note: configNote,
      characters
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weight-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('导出成功')
  }

  // 导入JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.characters && Array.isArray(data.characters)) {
          setCharacters(data.characters)
          if (data.name) setConfigName(data.name)
          if (data.note) setConfigNote(data.note)
          toast.success('导入成功')
        } else {
          toast.error('无效的配置文件')
        }
      } catch {
        toast.error('解析文件失败')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // 计算统计
  const avgWeight = characters.length > 0 
    ? Math.round(characters.reduce((sum, c) => sum + c.weight, 0) / characters.length)
    : 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>考点权重配置</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {/* 左侧：添加和配置管理 */}
          <div className={styles.leftPanel}>
            <div className={styles.section}>
              <h3>添加考点</h3>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="输入要考察的字..."
                  className={styles.input}
                  onKeyDown={e => e.key === 'Enter' && handleAddChars()}
                />
                <button onClick={handleAddChars} className={styles.addButton}>添加</button>
              </div>
              <div className={styles.autoGenButtons}>
                <button 
                  onClick={handleAutoGenerate} 
                  className={styles.autoGenButton}
                  disabled={!scope}
                >
                  📊 自动生成
                </button>
                <button 
                  onClick={() => setShowAiPanel(!showAiPanel)} 
                  className={styles.aiToggleButton}
                >
                  {showAiPanel ? '收起AI' : '🤖 AI生成'}
                </button>
              </div>
              
              {showAiPanel && (
                <div className={styles.aiPanel}>
                  <textarea
                    value={aiRequirement}
                    onChange={e => setAiRequirement(e.target.value)}
                    placeholder="描述你想考察的内容，例如：重点考察常见虚词的用法、考察实词的一词多义..."
                    className={styles.aiTextarea}
                    rows={3}
                  />
                  <button 
                    onClick={handleAiGenerate} 
                    disabled={isAiGenerating || !scope}
                    className={styles.aiGenerateButton}
                  >
                    {isAiGenerating ? '生成中...' : '生成考点'}
                  </button>
                  {!scope && (
                    <p className={styles.aiHint}>请先在出题页面选择考察范围</p>
                  )}
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h3>已保存的配置</h3>
              <div className={styles.configList}>
                {savedConfigs.length === 0 ? (
                  <p className={styles.emptyText}>暂无保存的配置</p>
                ) : (
                  savedConfigs.map(config => (
                    <div key={config.id} className={styles.configItem}>
                      <div className={styles.configInfo}>
                        <span className={styles.configName}>{config.name}</span>
                        <span className={styles.configMeta}>{config.characters.length}个字</span>
                      </div>
                      <div className={styles.configActions}>
                        <button onClick={() => handleLoadConfig(config)} className={styles.smallButton}>加载</button>
                        <button onClick={() => handleDeleteConfig(config.id)} className={styles.smallButtonDanger}>删除</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.importExport}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImport}
                  accept=".json"
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current?.click()} className={styles.secondaryButton}>
                  导入JSON
                </button>
                <button onClick={handleExport} className={styles.secondaryButton}>
                  导出JSON
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：权重编辑 */}
          <div className={styles.rightPanel}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>权重编辑</h3>
                {characters.length > 0 && (
                  <span className={styles.stats}>{characters.length}个字，平均权重 {avgWeight}</span>
                )}
              </div>

              {characters.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>暂无考点</p>
                  <p>在左侧添加字符，或加载已保存的配置</p>
                </div>
              ) : (
                <>
                  <div className={styles.weightList}>
                    {characters.map((item, index) => (
                      <div key={`${item.char}-${index}`} className={styles.weightItem}>
                        <span className={styles.charLabel}>{item.char}</span>
                        <div className={styles.weightControl}>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={item.weight}
                            onChange={e => updateWeight(index, parseInt(e.target.value))}
                            className={styles.weightSlider}
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.weight}
                            onChange={e => updateWeight(index, parseInt(e.target.value) || 0)}
                            className={styles.weightInput}
                          />
                        </div>
                        <div className={styles.itemActions}>
                          <button 
                            onClick={() => moveChar(index, 'up')} 
                            disabled={index === 0}
                            className={styles.iconButton}
                          >↑</button>
                          <button 
                            onClick={() => moveChar(index, 'down')} 
                            disabled={index === characters.length - 1}
                            className={styles.iconButton}
                          >↓</button>
                          <button 
                            onClick={() => removeChar(index)} 
                            className={styles.iconButtonDanger}
                          >×</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.quickActions}>
                    <button onClick={() => setAllWeights(100)} className={styles.quickButton}>全部100</button>
                    <button onClick={() => setAllWeights(50)} className={styles.quickButton}>全部50</button>
                    <button onClick={distributeWeights} className={styles.quickButton}>递增分配</button>
                    <button onClick={() => setCharacters([])} className={styles.quickButtonDanger}>清空</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.saveSection}>
            <input
              type="text"
              value={configName}
              onChange={e => setConfigName(e.target.value)}
              placeholder="配置名称"
              className={styles.footerInput}
            />
            <input
              type="text"
              value={configNote}
              onChange={e => setConfigNote(e.target.value)}
              placeholder="备注（可选）"
              className={styles.footerInput}
            />
            <button onClick={handleSaveConfig} className={styles.saveButton}>保存配置</button>
          </div>
          <div className={styles.actionButtons}>
            <button onClick={onClose} className={styles.cancelButton}>取消</button>
            <button onClick={() => onConfirm(characters)} className={styles.confirmButton}>应用</button>
          </div>
        </div>
      </div>
    </div>
  )
}
