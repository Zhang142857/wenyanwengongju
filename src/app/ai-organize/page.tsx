'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import ConcurrencySettingsDialog from '@/components/ConcurrencySettingsDialog'
import { StorageService } from '@/services/storage'
import { findKeyCharacters, batchGenerateDefinitions, validateDefinitionNotName, checkDuplicateDefinitions } from '@/services/ai'
import { findSentencesWithKeyCharacters, deduplicateCharacterSentencePairs, type CharacterSentencePair } from '@/services/aiOrganize'
import { initConcurrencyConfig } from '@/services/concurrencyConfig'
import type { AIDefinitionRequest } from '@/services/ai'
import type { Library, Collection, Article } from '@/types'
import styles from './ai-organize.module.css'

type ProcessingStep = 'idle' | 'step1' | 'step2' | 'step3' | 'step4' | 'complete'

interface StepResult {
  step1?: CharacterSentencePair[]
  step2?: Array<{ character: string; definition: string; sentence: string }>
  step3?: Array<{ character: string; isValid: boolean; reason?: string }>
  step4?: Array<{ keepId: string; deleteId: string; reason: string }>
}

export default function AIOrganizePage() {
  const [storage] = useState(() => new StorageService())
  const [isInitialized, setIsInitialized] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [shouldStop, setShouldStop] = useState(false)
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' })
  const [stepResults, setStepResults] = useState<StepResult>({})
  
  // 性能监测状态
  const [showAdvancedStats, setShowAdvancedStats] = useState(false)
  const [stats, setStats] = useState({
    totalTokens: 0,
    completionTokens: 0,
    speed: 0, // 每秒处理数
    tokenSpeed: 0, // 每秒token数
    startTime: 0,
    elapsed: 0,
  })
  
  // 范围选择
  const [libraries, setLibraries] = useState<Library[]>([])
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('')
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [selectedArticleId, setSelectedArticleId] = useState<string>('')

  // 重点字设置对话框状态 - 必须在所有 useEffect 之前声明
  const [showKeyCharSettings, setShowKeyCharSettings] = useState(false)
  const [showConcurrencySettings, setShowConcurrencySettings] = useState(false)
  const [keyCharacters, setKeyCharacters] = useState<string[]>([])
  const [batchKeyChars, setBatchKeyChars] = useState('')
  const [showBatchInput, setShowBatchInput] = useState(false)
  const [batchDeleteChars, setBatchDeleteChars] = useState('')
  const [showBatchDelete, setShowBatchDelete] = useState(false)
  const [selectedKeyChars, setSelectedKeyChars] = useState<Set<string>>(new Set())

  useEffect(() => {
    const initStorage = async () => {
      await storage.initialize()
      const libs = storage.getLibraries()
      setLibraries(libs)
      setIsInitialized(true)
      
      // 初始化并发配置
      initConcurrencyConfig()
      console.log('✅ 并发配置已初始化')
    }
    initStorage()
  }, [storage])

  // 加载重点字列表
  useEffect(() => {
    if (isInitialized) {
      setKeyCharacters(storage.getKeyCharacters())
    }
  }, [isInitialized, storage])

  const handleStartProcessing = async () => {
    setIsProcessing(true)
    setShouldStop(false)
    setStepResults({})
    setCurrentStep('step1')
    setProgress({ current: 0, total: 0, stage: '准备中...' })
    
    // 显示当前配置
    const { getConcurrencyConfig } = await import('@/services/concurrencyConfig')
    const config = getConcurrencyConfig()
    console.log('🚀 开始处理，当前配置:', {
      并发数: config.aiDefinitionConcurrency,
      批次延迟: `${config.batchDelayMs}ms`,
      模型ID: config.modelId,
      思考模型: config.isThinkingModel ? '是' : '否'
    })

    try {
      // ========== 第一步：程序查找重点字 ==========
      setProgress({ current: 0, total: 1, stage: '第一步：程序查找重点字' })
      const keyChars = storage.getKeyCharacters()
      
      if (keyChars.length === 0) {
        alert('重点字列表为空，请先在重点字管理页面添加重点字')
        setIsProcessing(false)
        setCurrentStep('idle')
        return
      }

      // 构建范围参数
      const scope = {
        libraryId: selectedLibraryId || undefined,
        collectionId: selectedCollectionId || undefined,
        articleId: selectedArticleId || undefined,
      }
      
      const step1Pairs = findSentencesWithKeyCharacters(storage, keyChars, scope)
      
      console.log(`[范围过滤] 库: ${selectedLibraryId || '全部'}, 集: ${selectedCollectionId || '全部'}, 文章: ${selectedArticleId || '全部'}`)
      console.log(`[范围过滤] 找到 ${step1Pairs.length} 个句子-字对`)
      
      if (step1Pairs.length === 0) {
        alert('没有找到包含重点字的句子')
        setIsProcessing(false)
        setCurrentStep('idle')
        return
      }

      setStepResults(prev => ({ ...prev, step1: step1Pairs }))
      setProgress({ current: 1, total: 1, stage: '第一步完成' })
      
      // ========== 第二步：AI分句标重点（去重后） ==========
      setCurrentStep('step2')
      
      // 简化实现：直接使用第一步的结果，不进行去重
      // 因为去重逻辑需要复杂的链接关系，这里先实现基本功能
      const newPairs = step1Pairs
      
      if (newPairs.length === 0) {
        alert('所有重点字句子对都已处理过，无需重复处理')
        setIsProcessing(false)
        setCurrentStep('complete')
        return
      }

      // 准备AI请求
      const requests: AIDefinitionRequest[] = newPairs.map(pair => ({
        sentence: pair.sentence,
        character: pair.character,
      }))

      setProgress({ current: 0, total: requests.length, stage: '第二步：AI生成义项' })
      // 使用配置的并发数（不传参数，让函数自动从配置读取）
      const definitions = await batchGenerateDefinitions(requests, undefined, (current, total, progressStats) => {
        // 检查是否需要停止
        if (shouldStop) {
          throw new Error('用户停止了生成')
        }
        
        setProgress({ current, total, stage: '第二步：AI生成义项' })
        
        if (progressStats) {
          const elapsed = (Date.now() - progressStats.startTime) / 1000
          setStats({
            totalTokens: progressStats.totalTokens,
            completionTokens: progressStats.completionTokens,
            speed: progressStats.speed,
            tokenSpeed: progressStats.tokenSpeed,
            startTime: progressStats.startTime,
            elapsed,
          })
        }
      })

      setStepResults(prev => ({ ...prev, step2: definitions }))
      console.log(`[第二步完成] 生成了 ${definitions.length} 个义项`)
      
      // ========== 第三步：AI二次验证 ==========
      console.log('[第三步开始] AI二次验证')
      setCurrentStep('step3')
      
      // 按字符分组
      const charGroups = new Map<string, string[]>()
      for (const def of definitions) {
        if (!charGroups.has(def.character)) {
          charGroups.set(def.character, [])
        }
        charGroups.get(def.character)!.push(def.sentence)
      }

      // 准备验证请求
      const validationRequests = Array.from(charGroups.entries()).map(([character, sentences]) => ({
        character,
        sentences,
      }))
      
      // 初始化进度
      setProgress({ current: 0, total: validationRequests.length, stage: '第三步：AI二次验证' })

      // 使用并发验证
      const { batchValidateDefinitions } = await import('@/services/ai')
      const step3Results = await batchValidateDefinitions(
        validationRequests,
        (current, total) => {
          setProgress({ 
            current, 
            total, 
            stage: `第三步：AI二次验证 (${current}/${total})` 
          })
        }
      )

      setStepResults(prev => ({ ...prev, step3: step3Results }))
      
      // 过滤掉无效的义项（人名/地名）
      const validDefinitions = definitions.filter(def => {
        const validation = step3Results.find(r => r.character === def.character)
        return validation?.isValid !== false
      })

      // ========== 保存义项到存储 ==========
      const savedDefinitions: Array<{ id: string; character: string; content: string }> = []
      
      for (const def of validDefinitions) {
        // 使用去重逻辑添加义项
        const existingDef = storage.addDefinitionOrGetExisting(def.character, def.definition)
        savedDefinitions.push({
          id: existingDef.id,
          character: existingDef.character,
          content: existingDef.content,
        })
        
        // 创建字-义项-句子关联
        // 找到对应的原始pair，获取sentenceId
        const originalPair = step1Pairs.find(
          p => p.sentence === def.sentence && p.character === def.character
        )
        
        if (originalPair) {
          // 找到字符在句子中的所有位置
          const positions: number[] = []
          for (let i = 0; i < def.sentence.length; i++) {
            if (def.sentence[i] === def.character) {
              positions.push(i)
            }
          }
          
          // 为每个位置创建关联（如果句子中有多个相同的字）
          for (const position of positions) {
            // 检查是否已存在相同的关联
            const existingLinks = storage.getDefinitionLinksForSentence(originalPair.sentenceId)
            const linkExists = existingLinks.some(
              link => link.definitionId === existingDef.id && 
                     link.characterPosition === position
            )
            
            if (!linkExists) {
              storage.addCharacterDefinitionLink(
                existingDef.id,
                originalPair.sentenceId,
                position
              )
            }
          }
        }
      }

      // ========== 第四步：AI合并重复义项 ==========
      setCurrentStep('step4')
      
      // 按字符分组义项
      const defGroups = new Map<string, Array<{ id: string; content: string }>>()
      for (const def of savedDefinitions) {
        if (!defGroups.has(def.character)) {
          defGroups.set(def.character, [])
        }
        defGroups.get(def.character)!.push({ id: def.id, content: def.content })
      }

      // 准备合并检查请求（只检查有多个义项的字符）
      const checkRequests = Array.from(defGroups.entries())
        .filter(([_, defs]) => defs.length >= 2)
        .map(([character, definitions]) => ({
          character,
          definitions,
        }))
      
      // 初始化进度
      setProgress({ current: 0, total: checkRequests.length, stage: '第四步：AI合并重复义项' })

      // 使用并发合并检查
      const { batchCheckDuplicateDefinitions } = await import('@/services/ai')
      const step4Results = await batchCheckDuplicateDefinitions(
        checkRequests,
        (current, total) => {
          setProgress({ 
            current, 
            total, 
            stage: `第四步：AI合并重复义项 (${current}/${total})` 
          })
        }
      )
      
      // 执行合并
      for (const merge of step4Results) {
        storage.mergeDefinitions(merge.keepId, merge.deleteId)
      }

      setStepResults(prev => ({ ...prev, step4: step4Results }))

      // 保存到本地存储
      await storage.saveToLocal()
      
      setCurrentStep('complete')
      setProgress({ current: checkRequests.length, total: checkRequests.length, stage: '全部完成' })
      
      const invalidCount = definitions.length - validDefinitions.length
      const mergeCount = step4Results.length
      const failedCount = step1Pairs.length - definitions.length
      
      let message = `处理完成！\n生成义项：${validDefinitions.length}\n过滤无效：${invalidCount}\n合并重复：${mergeCount}`
      
      if (failedCount > 0) {
        message += `\n\n⚠️ 警告：${failedCount} 个请求失败\n请检查控制台查看详情`
        console.error(`❌ 失败统计：\n- 总请求数：${step1Pairs.length}\n- 成功数：${definitions.length}\n- 失败数：${failedCount}`)
      }
      
      alert(message)
    } catch (error) {
      console.error('处理失败:', error)
      alert('处理失败，请查看控制台')
      setCurrentStep('idle')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isInitialized) {
    return (
      <Layout title="AI义项整理" subtitle="AI Definition Organization">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>加载中...</p>
        </div>
      </Layout>
    )
  }

  // 获取选中库的集列表
  const selectedLibrary = libraries.find(lib => lib.id === selectedLibraryId)
  const collections = selectedLibrary?.collections || []
  
  // 获取选中集的文章列表
  const selectedCollection = collections.find(col => col.id === selectedCollectionId)
  const articles = selectedCollection?.articles || []

  const handleStopProcessing = () => {
    setShouldStop(true)
    setIsProcessing(false)
    setCurrentStep('idle')
    alert('已停止生成')
  }

  const handleToggleKeyChar = (char: string) => {
    const newSelected = new Set(selectedKeyChars)
    if (newSelected.has(char)) {
      newSelected.delete(char)
    } else {
      newSelected.add(char)
    }
    setSelectedKeyChars(newSelected)
  }

  const handleSelectAllKeyChars = () => {
    if (selectedKeyChars.size === keyCharacters.length) {
      setSelectedKeyChars(new Set())
    } else {
      setSelectedKeyChars(new Set(keyCharacters))
    }
  }

  const handleDeleteSelectedKeyChars = () => {
    if (selectedKeyChars.size === 0) {
      alert('请先选择要删除的字')
      return
    }

    if (!confirm(`确定要删除选中的 ${selectedKeyChars.size} 个字吗？`)) {
      return
    }

    selectedKeyChars.forEach(char => {
      storage.removeKeyCharacter(char)
    })
    storage.saveToLocal()
    setKeyCharacters(storage.getKeyCharacters())
    setSelectedKeyChars(new Set())
    alert(`已删除 ${selectedKeyChars.size} 个字`)
  }

  const handleBatchAddKeyChar = () => {
    if (!batchKeyChars.trim()) {
      alert('请输入要添加的字')
      return
    }

    // 提取所有单个字符（过滤空格、换行等）
    const chars = Array.from(batchKeyChars).filter(char => {
      // 只保留中文字符
      return /[\u4e00-\u9fa5]/.test(char)
    })

    if (chars.length === 0) {
      alert('未找到有效的中文字符')
      return
    }

    let addedCount = 0
    let skippedCount = 0

    chars.forEach(char => {
      if (!keyCharacters.includes(char)) {
        storage.addKeyCharacter(char)
        addedCount++
      } else {
        skippedCount++
      }
    })

    storage.saveToLocal()
    setKeyCharacters(storage.getKeyCharacters())
    setBatchKeyChars('')
    setShowBatchInput(false)
    
    let msg = `已添加 ${addedCount} 个字`
    if (skippedCount > 0) {
      msg += `，跳过 ${skippedCount} 个已存在的字`
    }
    alert(msg)
  }

  const handleBatchDeleteKeyChar = () => {
    if (!batchDeleteChars.trim()) {
      alert('请输入要删除的字')
      return
    }

    const chars = Array.from(batchDeleteChars).filter(char => {
      return /[\u4e00-\u9fa5]/.test(char)
    })

    if (chars.length === 0) {
      alert('未找到有效的中文字符')
      return
    }

    let deletedCount = 0
    let notFoundCount = 0

    chars.forEach(char => {
      if (keyCharacters.includes(char)) {
        storage.removeKeyCharacter(char)
        deletedCount++
      } else {
        notFoundCount++
      }
    })

    storage.saveToLocal()
    setKeyCharacters(storage.getKeyCharacters())
    setBatchDeleteChars('')
    setShowBatchDelete(false)
    
    let msg = `已删除 ${deletedCount} 个字`
    if (notFoundCount > 0) {
      msg += `，${notFoundCount} 个字不存在`
    }
    alert(msg)
  }

  return (
    <Layout title="AI义项整理" subtitle="AI Definition Organization">
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.heading}>AI自动生成义项</h2>
              <p className={styles.description}>
                AI将自动分析文言文库中的句子，识别重点字并生成义项。可以选择处理范围。
              </p>
            </div>
            <div className={styles.buttonGroup}>
              <button 
                className={styles.settingsBtn}
                onClick={() => setShowKeyCharSettings(true)}
                title="编辑重点字列表"
              >
                ⚙️ 重点字设置
              </button>
              <button 
                className={styles.settingsBtn}
                onClick={() => setShowConcurrencySettings(true)}
                title="调整并发参数"
              >
                ⚡ 并发设置
              </button>
            </div>
          </div>

          {/* 范围选择 */}
          <div className={styles.scopeSelector}>
            <div className={styles.selectGroup}>
              <label className={styles.selectLabel}>选择库：</label>
              <select 
                className={styles.select}
                value={selectedLibraryId}
                onChange={(e) => {
                  setSelectedLibraryId(e.target.value)
                  setSelectedCollectionId('')
                  setSelectedArticleId('')
                }}
                disabled={isProcessing}
              >
                <option value="">全部库</option>
                {libraries.map(lib => (
                  <option key={lib.id} value={lib.id}>{lib.name}</option>
                ))}
              </select>
            </div>

            {selectedLibraryId && (
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>选择集：</label>
                <select 
                  className={styles.select}
                  value={selectedCollectionId}
                  onChange={(e) => {
                    setSelectedCollectionId(e.target.value)
                    setSelectedArticleId('')
                  }}
                  disabled={isProcessing}
                >
                  <option value="">全部集</option>
                  {collections.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedCollectionId && (
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>选择文章：</label>
                <select 
                  className={styles.select}
                  value={selectedArticleId}
                  onChange={(e) => setSelectedArticleId(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="">全部文章</option>
                  {articles.map(art => (
                    <option key={art.id} value={art.id}>{art.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button 
            className={styles.startButton}
            onClick={handleStartProcessing}
            disabled={isProcessing}
          >
            {isProcessing ? '处理中...' : '开始处理'}
          </button>

          {/* 四步流程进度显示 */}
          {(isProcessing || currentStep !== 'idle') && (
            <div className={styles.stepsContainer}>
              <div className={styles.stepsHeader}>
                <h3>处理流程</h3>
              </div>
              
              {/* 步骤指示器 */}
              <div className={styles.stepsIndicator}>
                <div className={`${styles.stepItem} ${currentStep === 'step1' || currentStep !== 'idle' ? styles.stepActive : ''} ${stepResults.step1 ? styles.stepComplete : ''}`}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepLabel}>程序查找重点字</div>
                </div>
                <div className={`${styles.stepItem} ${currentStep === 'step2' ? styles.stepActive : ''} ${stepResults.step2 ? styles.stepComplete : ''}`}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepLabel}>AI生成义项</div>
                </div>
                <div className={`${styles.stepItem} ${currentStep === 'step3' ? styles.stepActive : ''} ${stepResults.step3 ? styles.stepComplete : ''}`}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepLabel}>AI二次验证</div>
                </div>
                <div className={`${styles.stepItem} ${currentStep === 'step4' ? styles.stepActive : ''} ${stepResults.step4 ? styles.stepComplete : ''}`}>
                  <div className={styles.stepNumber}>4</div>
                  <div className={styles.stepLabel}>AI合并重复</div>
                </div>
              </div>

              {/* 当前进度 */}
              {isProcessing && (
                <div className={styles.progress}>
                  <p className={styles.progressStage}>{progress.stage}</p>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className={styles.progressInfo}>
                    <p className={styles.progressText}>
                      {progress.current} / {progress.total}
                    </p>
                    {stats.speed > 0 && (
                      <p className={styles.speedText}>
                        处理速度: {stats.speed.toFixed(1)} 个/秒
                      </p>
                    )}
                    {showAdvancedStats && stats.speed > 0 && (
                      <div className={styles.advancedStats}>
                        <p>已处理: {progress.current} 个</p>
                        <p>剩余: {progress.total - progress.current} 个</p>
                        <p>已用时: {stats.elapsed.toFixed(1)} 秒</p>
                        <p>预计剩余: {((progress.total - progress.current) / stats.speed).toFixed(1)} 秒</p>
                        <p>总Token: {stats.totalTokens.toLocaleString()}</p>
                        <p>输出Token: {stats.completionTokens.toLocaleString()}</p>
                        <p>Token速度: {stats.tokenSpeed.toFixed(0)} token/秒</p>
                      </div>
                    )}
                    <button 
                      className={styles.advancedStatsBtn}
                      onClick={() => setShowAdvancedStats(!showAdvancedStats)}
                    >
                      {showAdvancedStats ? '隐藏详细信息' : '显示详细信息'}
                    </button>
                  </div>
                </div>
              )}

              {/* 步骤结果预览 */}
              {stepResults.step1 && (
                <div className={styles.stepResult}>
                  <h4>第一步结果：找到 {stepResults.step1.length} 个(句子, 字)对</h4>
                  <div className={styles.resultPreview}>
                    {stepResults.step1.slice(0, 5).map((pair, idx) => (
                      <div key={idx} className={styles.previewItem}>
                        <span className={styles.previewChar}>{pair.character}</span>
                        <span className={styles.previewSentence}>{pair.sentence}</span>
                      </div>
                    ))}
                    {stepResults.step1.length > 5 && (
                      <p className={styles.previewMore}>...还有 {stepResults.step1.length - 5} 个</p>
                    )}
                  </div>
                </div>
              )}

              {stepResults.step2 && (
                <div className={styles.stepResult}>
                  <h4>第二步结果：生成 {stepResults.step2.length} 个义项</h4>
                  <div className={styles.resultPreview}>
                    {stepResults.step2.slice(0, 5).map((def, idx) => (
                      <div key={idx} className={styles.previewItem}>
                        <span className={styles.previewChar}>{def.character}</span>
                        <span className={styles.previewDef}>{def.definition}</span>
                      </div>
                    ))}
                    {stepResults.step2.length > 5 && (
                      <p className={styles.previewMore}>...还有 {stepResults.step2.length - 5} 个</p>
                    )}
                  </div>
                </div>
              )}

              {stepResults.step3 && (
                <div className={styles.stepResult}>
                  <h4>第三步结果：验证 {stepResults.step3.length} 个字</h4>
                  <div className={styles.resultPreview}>
                    {stepResults.step3.filter(r => !r.isValid).length > 0 ? (
                      <>
                        <p className={styles.invalidCount}>
                          发现 {stepResults.step3.filter(r => !r.isValid).length} 个无效字（人名/地名）
                        </p>
                        {stepResults.step3.filter(r => !r.isValid).map((r, idx) => (
                          <div key={idx} className={styles.previewItem}>
                            <span className={styles.previewChar}>{r.character}</span>
                            <span className={styles.previewReason}>{r.reason}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className={styles.allValid}>所有字都有效 ✓</p>
                    )}
                  </div>
                </div>
              )}

              {stepResults.step4 && (
                <div className={styles.stepResult}>
                  <h4>第四步结果：合并 {stepResults.step4.length} 个重复义项</h4>
                  <div className={styles.resultPreview}>
                    {stepResults.step4.length > 0 ? (
                      stepResults.step4.map((merge, idx) => (
                        <div key={idx} className={styles.previewItem}>
                          <span className={styles.previewMerge}>
                            合并 {merge.deleteId.slice(0, 8)} → {merge.keepId.slice(0, 8)}
                          </span>
                          <span className={styles.previewReason}>{merge.reason}</span>
                        </div>
                      ))
                    ) : (
                      <p className={styles.allValid}>没有发现重复义项 ✓</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 重点字设置对话框 */}
        {showKeyCharSettings && (
          <div className={styles.modal} onClick={() => setShowKeyCharSettings(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>重点字设置</h3>
                <button 
                  className={styles.modalClose}
                  onClick={() => setShowKeyCharSettings(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.keyCharAdd}>
                  <button 
                    onClick={() => { setShowBatchInput(!showBatchInput); setShowBatchDelete(false) }} 
                    className={styles.keyCharBatchBtn}
                  >
                    {showBatchInput ? '取消批量添加' : '批量添加'}
                  </button>
                  <button 
                    onClick={() => { setShowBatchDelete(!showBatchDelete); setShowBatchInput(false) }} 
                    className={styles.keyCharBatchDeleteBtn}
                  >
                    {showBatchDelete ? '取消批量删除' : '批量删除'}
                  </button>
                </div>
                
                {showBatchInput && (
                  <div className={styles.keyCharBatchSection}>
                    <textarea
                      value={batchKeyChars}
                      onChange={(e) => setBatchKeyChars(e.target.value)}
                      placeholder="输入多个字，可以直接粘贴文本，系统会自动提取所有中文字符"
                      className={styles.keyCharBatchInput}
                      rows={4}
                    />
                    <button onClick={handleBatchAddKeyChar} className={styles.keyCharBatchAddBtn}>
                      确认批量添加
                    </button>
                  </div>
                )}

                {showBatchDelete && (
                  <div className={styles.keyCharBatchSection}>
                    <textarea
                      value={batchDeleteChars}
                      onChange={(e) => setBatchDeleteChars(e.target.value)}
                      placeholder="输入要删除的字，可以直接粘贴文本，系统会自动提取所有中文字符"
                      className={styles.keyCharBatchInput}
                      rows={4}
                    />
                    <button onClick={handleBatchDeleteKeyChar} className={styles.keyCharBatchDeleteConfirmBtn}>
                      确认批量删除
                    </button>
                  </div>
                )}

                <div className={styles.keyCharStats}>
                  <span>共 {keyCharacters.length} 个重点字</span>
                  {selectedKeyChars.size > 0 && (
                    <span className={styles.keyCharSelectedCount}>已选择 {selectedKeyChars.size} 个</span>
                  )}
                  {selectedKeyChars.size > 0 && (
                    <button onClick={handleDeleteSelectedKeyChars} className={styles.keyCharDeleteSelectedBtn}>
                      删除选中
                    </button>
                  )}
                  {keyCharacters.length > 0 && (
                    <button onClick={handleSelectAllKeyChars} className={styles.keyCharSelectAllBtn}>
                      {selectedKeyChars.size === keyCharacters.length ? '取消全选' : '全选'}
                    </button>
                  )}
                </div>
                <div className={styles.keyCharList}>
                  {keyCharacters.map((char) => (
                    <div 
                      key={char} 
                      className={`${styles.keyCharItem} ${selectedKeyChars.has(char) ? styles.keyCharSelected : ''}`}
                      onClick={() => handleToggleKeyChar(char)}
                    >
                      <span className={styles.keyChar}>{char}</span>
                      {selectedKeyChars.has(char) && (
                        <div className={styles.keyCharCheckmark}>✓</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 并发设置对话框 */}
        <ConcurrencySettingsDialog 
          isOpen={showConcurrencySettings}
          onClose={() => setShowConcurrencySettings(false)}
        />
      </div>
    </Layout>
  )
}
