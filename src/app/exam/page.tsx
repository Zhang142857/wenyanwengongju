'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { StorageService } from '@/services/storage'
import { ExamGenerator, type ExamConfig, type ExamQuestion } from '@/services/examGenerator'
import { findKeyCharacters, batchGenerateDefinitions, type AIDefinitionRequest } from '@/services/ai'
import styles from './exam.module.css'

export default function ExamPage() {
  const [storage] = useState(() => new StorageService())
  const [examGenerator] = useState(() => new ExamGenerator(storage))
  const [isInitialized, setIsInitialized] = useState(false)

  // 出题配置
  const [config, setConfig] = useState<Partial<ExamConfig>>({
    questionCount: 5,
    questionType: 'same-character',
    answerType: 'find-different',
    optionsCount: 4,
    includePreviousKnowledge: false,
  })

  // 生成的题目
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  
  // 数据统计
  const [dataStats, setDataStats] = useState({
    totalDefinitions: 0,
    totalShortSentences: 0,
    charsWithMultipleDefinitions: 0,
    charsWithSingleDefinition: 0,
    recommendedType: '' as 'same-character' | 'different-characters' | ''
  })

  // AI 生成义项
  const [isGeneratingDefinitions, setIsGeneratingDefinitions] = useState(false)
  const [aiProgress, setAiProgress] = useState({
    stage: '' as 'finding' | 'generating' | 'saving' | '',
    current: 0,
    total: 0,
    currentSentence: '',
    foundCharacters: [] as string[],
    generatedDefinitions: [] as Array<{ character: string; definition: string; sentence: string }>,
  })

  // 可用选项
  const [libraries, setLibraries] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [articles, setArticles] = useState<any[]>([])

  useEffect(() => {
    initializeData()
  }, [])

  const initializeData = async () => {
    await storage.initialize()
    const libs = storage.getLibraries()
    setLibraries(libs)
    setIsInitialized(true)
    
    // 分析数据，推荐题型
    analyzeDataAndRecommendQuestionType()
  }
  
  // 分析数据并推荐题型
  const analyzeDataAndRecommendQuestionType = () => {
    const definitions = storage.getDefinitions()
    const shortSentences = storage.getShortSentences()
    
    // 按字符分组
    const charGroups = new Map<string, any[]>()
    for (const def of definitions) {
      if (!charGroups.has(def.character)) {
        charGroups.set(def.character, [])
      }
      charGroups.get(def.character)!.push(def)
    }
    
    // 统计有多个义项的字符数量
    const multipleDefChars = Array.from(charGroups.entries())
      .filter(([_, defs]) => defs.length >= 2)
      .length
    
    const singleDefChars = charGroups.size - multipleDefChars
    
    // 推荐题型
    let recommendedType: 'same-character' | 'different-characters' = 'different-characters'
    if (multipleDefChars >= 10) {
      recommendedType = 'same-character'
    }
    
    setDataStats({
      totalDefinitions: definitions.length,
      totalShortSentences: shortSentences.length,
      charsWithMultipleDefinitions: multipleDefChars,
      charsWithSingleDefinition: singleDefChars,
      recommendedType
    })
    
    // 如果有多个义项的字符少于5个，自动切换到"不同字"题型
    if (multipleDefChars < 5) {
      console.log(`📊 数据分析：只有 ${multipleDefChars} 个字有多个义项，推荐使用"不同字"题型`)
      setConfig(prev => ({ ...prev, questionType: 'different-characters' }))
    }
  }

  // 更新集列表
  useEffect(() => {
    if (config.scope?.libraryId) {
      const lib = libraries.find(l => l.id === config.scope?.libraryId)
      setCollections(lib?.collections || [])
    } else {
      setCollections([])
    }
  }, [config.scope?.libraryId, libraries])

  // 更新文章列表
  useEffect(() => {
    if (config.scope?.collectionId) {
      const col = collections.find(c => c.id === config.scope?.collectionId)
      setArticles(col?.articles || [])
    } else {
      setArticles([])
    }
  }, [config.scope?.collectionId, collections])

  const handleGenerateExam = async () => {
    console.log('开始生成题目，配置:', config)
    
    if (!config.questionCount || !config.scope) {
      setError('请填写题目数量和考察范围')
      return
    }

    setIsGenerating(true)
    setError('')
    setQuestions([]) // 清空之前的题目

    try {
      console.log('调用 examGenerator.generateExam')
      const generatedQuestions = await examGenerator.generateExam(config as ExamConfig)
      console.log('生成的题目:', generatedQuestions)
      setQuestions(generatedQuestions)
      
      if (generatedQuestions.length === 0) {
        setError('未能生成题目，可能是义项库数据不足或范围内没有足够的例句')
      }
    } catch (err) {
      console.error('生成题目失败:', err)
      const errorMessage = err instanceof Error ? err.message : '生成失败'
      setError(`生成失败: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateDefinitions = async () => {
    if (!config.scope) {
      setError('请先选择考察范围')
      return
    }

    setIsGeneratingDefinitions(true)
    setError('')
    setAiProgress({
      stage: 'finding',
      current: 0,
      total: 0,
      currentSentence: '',
      foundCharacters: [],
      generatedDefinitions: [],
    })

    try {
      // 获取范围内的所有句子
      const sentences = getSentencesInScope()

      if (sentences.length === 0) {
        throw new Error('指定范围内没有句子')
      }

      // 第一轮：找出重点字
      setAiProgress(prev => ({
        ...prev,
        stage: 'finding',
        total: sentences.length,
        currentSentence: '正在分析句子...',
      }))

      const keyCharsResults = await findKeyCharacters(
        sentences.map(s => s.text),
        (current, total) => {
          setAiProgress(prev => ({
            ...prev,
            current,
            total,
            currentSentence: `正在分析句子... (${current}/${total})`,
          }))
        }
      )

      // 统计找到的字符
      const allFoundChars = new Set<string>()
      keyCharsResults.forEach(result => {
        result.characters.forEach(char => allFoundChars.add(char))
      })

      setAiProgress(prev => ({
        ...prev,
        foundCharacters: Array.from(allFoundChars),
      }))

      // 构建请求列表
      const requests: AIDefinitionRequest[] = []
      for (const result of keyCharsResults) {
        for (const char of result.characters) {
          requests.push({
            sentence: result.sentence,
            character: char,
          })
        }
      }

      if (requests.length === 0) {
        throw new Error('没有找到需要制作义项的字')
      }

      // 第二轮：生成义项
      setAiProgress(prev => ({
        ...prev,
        stage: 'generating',
        total: requests.length,
        current: 0,
        currentSentence: '开始生成义项...',
      }))

      // 分批生成，实时更新进度
      const definitions: Array<{ character: string; definition: string; sentence: string }> = []
      const batchSize = 5

      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize)

        setAiProgress(prev => ({
          ...prev,
          current: i,
          currentSentence: `正在处理: ${batch[0].character} (${batch[0].sentence.substring(0, 20)}...)`,
        }))

        const batchResults = await batchGenerateDefinitions(batch, batchSize)
        definitions.push(...batchResults)

        setAiProgress(prev => ({
          ...prev,
          generatedDefinitions: [...prev.generatedDefinitions, ...batchResults],
        }))

        // 避免请求过快
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // 保存到存储
      setAiProgress(prev => ({
        ...prev,
        stage: 'saving',
        currentSentence: '正在保存到义项库...',
      }))

      let savedCount = 0
      let skippedCount = 0

      for (const def of definitions) {
        // 检查是否已存在相同的义项
        const existing = storage.getDefinitions().find(
          d => d.character === def.character && d.content === def.definition
        )

        if (!existing) {
          const newDef = storage.addDefinition(def.character, def.definition)

          // 关联到句子
          const sentence = sentences.find(s => s.text === def.sentence)
          if (sentence) {
            const charPos = sentence.text.indexOf(def.character)
            if (charPos !== -1) {
              storage.addCharacterDefinitionLink(newDef.id, sentence.id, charPos)
            }
          }
          savedCount++
        } else {
          skippedCount++
        }
      }

      await storage.saveToLocal()

      setAiProgress(prev => ({
        ...prev,
        stage: '',
        currentSentence: `完成！新增 ${savedCount} 个义项，跳过 ${skippedCount} 个重复义项`,
      }))

      // 3秒后自动关闭进度显示
      setTimeout(() => {
        setIsGeneratingDefinitions(false)
      }, 3000)
    } catch (err) {
      console.error('AI 生成失败:', err)
      const errorMessage = err instanceof Error ? err.message : 'AI 生成失败'
      setError(`${errorMessage}\n\n请检查：\n1. 网络连接是否正常\n2. API Key 是否有效\n3. 是否有足够的配额`)
      setIsGeneratingDefinitions(false)
      setAiProgress({
        stage: '',
        current: 0,
        total: 0,
        currentSentence: '',
        foundCharacters: [],
        generatedDefinitions: [],
      })
    }
  }

  const getSentencesInScope = () => {
    const sentences: any[] = []
    const libs = config.scope?.libraryId
      ? libraries.filter(l => l.id === config.scope?.libraryId)
      : libraries

    for (const lib of libs) {
      const cols = config.scope?.collectionId
        ? lib.collections.filter((c: any) => c.id === config.scope?.collectionId)
        : lib.collections

      for (const col of cols) {
        const arts = config.scope?.articleId
          ? col.articles.filter((a: any) => a.id === config.scope?.articleId)
          : col.articles

        for (const art of arts) {
          sentences.push(...art.sentences)
        }
      }
    }

    return sentences
  }

  // 导出菜单状态
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExportWord = async (version: 'teacher' | 'student' | 'both') => {
    if (questions.length === 0) {
      setError('没有可导出的题目')
      return
    }

    setShowExportMenu(false)

    try {
      const { exportToWord, exportBothVersions, downloadWord } = await import('@/services/wordExport')
      const dateStr = new Date().toLocaleDateString().replace(/\//g, '-')

      if (version === 'both') {
        // 导出两个版本
        const { teacher, student } = await exportBothVersions(questions)
        downloadWord(teacher, `文言文练习题_教师版_${dateStr}.docx`)
        // 稍微延迟下载第二个文件
        setTimeout(() => {
          downloadWord(student, `文言文练习题_学生版_${dateStr}.docx`)
        }, 500)
      } else {
        const blob = await exportToWord(questions, version)
        const versionName = version === 'teacher' ? '教师版' : '学生版'
        downloadWord(blob, `文言文练习题_${versionName}_${dateStr}.docx`)
      }
    } catch (err) {
      setError('导出失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  if (!isInitialized) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>加载中...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className={styles.examPage}>
        <div className={styles.header}>
          <h1 className={styles.title}>自动出题</h1>
          <p className={styles.subtitle}>根据义项库自动生成文言文选择题</p>
        </div>

        <div className={styles.content}>
          {/* 数据统计 */}
          {dataStats.totalDefinitions > 0 && (
            <div className={styles.statsSection}>
              <h3>📊 数据统计</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>义项总数</span>
                  <span className={styles.statValue}>{dataStats.totalDefinitions}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>短句总数</span>
                  <span className={styles.statValue}>{dataStats.totalShortSentences}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>多义项字符</span>
                  <span className={styles.statValue} style={{ color: dataStats.charsWithMultipleDefinitions >= 10 ? '#28a745' : '#ff6b6b' }}>
                    {dataStats.charsWithMultipleDefinitions}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>单义项字符</span>
                  <span className={styles.statValue}>{dataStats.charsWithSingleDefinition}</span>
                </div>
              </div>
              {dataStats.recommendedType && (
                <div className={styles.recommendation}>
                  💡 推荐题型：
                  <strong>
                    {dataStats.recommendedType === 'same-character' ? '同一个字' : '不同字'}
                  </strong>
                  {dataStats.recommendedType === 'different-characters' && (
                    <span className={styles.recommendReason}>
                      （多义项字符较少，建议使用"不同字"题型）
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 配置区域 */}
          <div className={styles.configSection}>
            <h2>出题配置</h2>

            <div className={styles.formGroup}>
              <label className={styles.required}>题目数量</label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.questionCount || ''}
                onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) || 0 })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>优先考察的字（可选，用空格分隔）</label>
              <input
                type="text"
                placeholder="例如：学 而 时 习"
                onChange={(e) => setConfig({ ...config, targetCharacters: e.target.value.split(/\s+/).filter(Boolean) })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>题型</label>
              <select
                value={config.questionType || 'same-character'}
                onChange={(e) => setConfig({ ...config, questionType: e.target.value as any })}
                className={styles.select}
              >
                <option value="same-character">同一个字（四个选项都考同一个字）</option>
                <option value="different-characters">不同字（每个选项考不同的字）</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>答案类型</label>
              <select
                value={config.answerType || 'find-different'}
                onChange={(e) => setConfig({ ...config, answerType: e.target.value as any })}
                className={styles.select}
              >
                <option value="find-different">找不同（找出意思不完全相同的一项）</option>
                <option value="find-same">找相同（找出意思都相同的一项）</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>每题选项数</label>
              <select
                value={config.optionsCount || 4}
                onChange={(e) => setConfig({ ...config, optionsCount: parseInt(e.target.value) })}
                className={styles.select}
              >
                <option value="4">4个选项</option>
                <option value="3">3个选项</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>每选项短句数</label>
              <select
                value={config.sentencesPerOption || 3}
                onChange={(e) => setConfig({ ...config, sentencesPerOption: parseInt(e.target.value) })}
                className={styles.select}
              >
                <option value="2">2个短句</option>
                <option value="3">3个短句（推荐）</option>
                <option value="4">4个短句</option>
                <option value="5">5个短句</option>
              </select>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.5rem 0 0 0' }}>
                💡 如果生成失败，可以尝试减少短句数
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>正确答案</label>
              <select
                value={config.correctAnswer || ''}
                onChange={(e) => setConfig({ ...config, correctAnswer: e.target.value as any })}
                className={styles.select}
              >
                <option value="">随机</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.required}>考察范围</label>
              <div className={styles.scopeSelects}>
                <select
                  value={config.scope?.libraryId || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    scope: { libraryId: e.target.value || undefined }
                  })}
                  className={styles.select}
                >
                  <option value="">所有库</option>
                  {libraries.map(lib => (
                    <option key={lib.id} value={lib.id}>{lib.name}</option>
                  ))}
                </select>

                <select
                  value={config.scope?.collectionId || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    scope: { ...config.scope, collectionId: e.target.value || undefined }
                  })}
                  className={styles.select}
                  disabled={!config.scope?.libraryId}
                >
                  <option value="">所有集</option>
                  {collections.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>

                <select
                  value={config.scope?.articleId || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    scope: { ...config.scope, articleId: e.target.value || undefined }
                  })}
                  className={styles.select}
                  disabled={!config.scope?.collectionId}
                >
                  <option value="">所有文章</option>
                  {articles.map(art => (
                    <option key={art.id} value={art.id}>{art.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={config.includePreviousKnowledge || false}
                  onChange={(e) => setConfig({ ...config, includePreviousKnowledge: e.target.checked })}
                />
                <span>包括之前知识（包含order更小的集）</span>
              </label>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <button
                onClick={handleGenerateExam}
                disabled={isGenerating || !config.questionCount || !config.scope}
                className={styles.primaryButton}
              >
                {isGenerating ? '生成中...' : '生成题目'}
              </button>

              <button
                onClick={handleGenerateDefinitions}
                disabled={isGeneratingDefinitions || !config.scope}
                className={styles.secondaryButton}
              >
                {isGeneratingDefinitions
                  ? `AI生成义项中...`
                  : 'AI自动生成义项'}
              </button>

              <button
                onClick={() => window.open('/manage/definitions/diagnose', '_blank')}
                className={styles.secondaryButton}
                style={{ fontSize: '0.85rem' }}
              >
                🔍 诊断义项库
              </button>

              <button
                onClick={async () => {
                  try {
                    setError('正在测试 API 连接...')
                    const { generateDefinition } = await import('@/services/ai')
                    const result = await generateDefinition('学而时习之，不亦说乎？', '学')
                    setError(`API 测试成功！\n"学"的意思：${result}`)
                  } catch (err) {
                    setError(`API 测试失败：${err instanceof Error ? err.message : '未知错误'}`)
                  }
                }}
                className={styles.secondaryButton}
                style={{ fontSize: '0.85rem' }}
              >
                测试 API
              </button>
            </div>
          </div>

          {/* AI 生成进度 */}
          {isGeneratingDefinitions && (
            <div className={styles.aiProgressSection}>
              <h2>AI 生成义项进度</h2>

              <div className={styles.progressStages}>
                <div className={`${styles.stage} ${aiProgress.stage === 'finding' ? styles.active : aiProgress.stage ? styles.completed : ''}`}>
                  <div className={styles.stageIcon}>1</div>
                  <div className={styles.stageName}>找出重点字</div>
                </div>
                <div className={styles.stageArrow}>→</div>
                <div className={`${styles.stage} ${aiProgress.stage === 'generating' ? styles.active : aiProgress.stage === 'saving' ? styles.completed : ''}`}>
                  <div className={styles.stageIcon}>2</div>
                  <div className={styles.stageName}>生成义项</div>
                </div>
                <div className={styles.stageArrow}>→</div>
                <div className={`${styles.stage} ${aiProgress.stage === 'saving' ? styles.active : ''}`}>
                  <div className={styles.stageIcon}>3</div>
                  <div className={styles.stageName}>保存到库</div>
                </div>
              </div>

              {aiProgress.total > 0 && (
                <div className={styles.progressBar}>
                  <div className={styles.progressBarLabel}>
                    <span>{aiProgress.currentSentence}</span>
                    <span>{aiProgress.current} / {aiProgress.total}</span>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${(aiProgress.current / aiProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {aiProgress.foundCharacters.length > 0 && (
                <div className={styles.foundCharacters}>
                  <h3>找到的重点字 ({aiProgress.foundCharacters.length})</h3>
                  <div className={styles.characterTags}>
                    {aiProgress.foundCharacters.map((char, index) => (
                      <span key={index} className={styles.characterTag}>{char}</span>
                    ))}
                  </div>
                </div>
              )}

              {aiProgress.generatedDefinitions.length > 0 && (
                <div className={styles.generatedDefinitions}>
                  <h3>已生成的义项 ({aiProgress.generatedDefinitions.length})</h3>
                  <div className={styles.definitionsList}>
                    {aiProgress.generatedDefinitions.slice(-10).reverse().map((def, index) => (
                      <div key={index} className={styles.definitionItem}>
                        <span className={styles.defChar}>{def.character}</span>
                        <span className={styles.defContent}>{def.definition}</span>
                        <span className={styles.defSentence}>{def.sentence.substring(0, 30)}...</span>
                      </div>
                    ))}
                    {aiProgress.generatedDefinitions.length > 10 && (
                      <div className={styles.moreIndicator}>
                        还有 {aiProgress.generatedDefinitions.length - 10} 个...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 题目预览 */}
          {questions.length > 0 && (
            <div className={styles.questionsSection}>
              <div className={styles.questionsHeader}>
                <h2>生成的题目 ({questions.length})</h2>
                <div className={styles.exportDropdown}>
                  <button 
                    onClick={() => setShowExportMenu(!showExportMenu)} 
                    className={styles.exportButton}
                  >
                    导出为 Word ▼
                  </button>
                  {showExportMenu && (
                    <div className={styles.exportMenu}>
                      <button onClick={() => handleExportWord('teacher')}>
                        📚 教师版（含答案解析）
                      </button>
                      <button onClick={() => handleExportWord('student')}>
                        📝 学生版（不含答案）
                      </button>
                      <button onClick={() => handleExportWord('both')}>
                        📦 全部导出（两个版本）
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {questions.map((q, index) => {
                // 根据答案类型显示不同的题目标题
                const questionTitle = q.answerType === 'find-same'
                  ? `${index + 1}. 下列选项中加点字的意思都相同的一项是（   ）`
                  : `${index + 1}. 下列选项中加点字的意思不完全相同的一项是（   ）`
                
                return (
                  <div key={q.id} className={styles.question}>
                    <div className={styles.questionTitle}>
                      {questionTitle}
                    </div>
                    <div className={styles.questionHint}>
                      {q.questionType === 'different-characters' ? (
                        <>
                          考察字：
                          {q.characters?.map((char, i) => (
                            <span key={i}>
                              <strong className={styles.targetChar}>{char}</strong>
                              {i < (q.characters?.length || 0) - 1 && '、'}
                            </span>
                          ))}
                          {' | '}
                          正确答案考察：<strong className={styles.targetChar}>{q.character}</strong> - {q.definition}
                        </>
                      ) : (
                        <>
                          考察字：<strong className={styles.targetChar}>{q.character}</strong> | 义项：{q.definition}
                        </>
                      )}
                    </div>
                    <div className={styles.options}>
                      {q.options.map(opt => {
                        // 处理多个目标字的高亮
                        const targetChar = q.questionType === 'different-characters' ? opt.character : q.character
                        
                        const renderSentenceWithDots = (text: string, char: string) => {
                          const parts: React.ReactNode[] = []
                          let lastIndex = 0
                          let currentIndex = text.indexOf(char, lastIndex)
                          let key = 0

                          while (currentIndex !== -1) {
                            // 字符前的文本
                            if (currentIndex > lastIndex) {
                              parts.push(
                                <span key={`text-${key++}`}>
                                  {text.substring(lastIndex, currentIndex)}
                                </span>
                              )
                            }

                            // 加点的字
                            parts.push(
                              <span key={`dot-${key++}`} className={styles.dottedChar}>
                                {char}
                              </span>
                            )

                            lastIndex = currentIndex + char.length
                            currentIndex = text.indexOf(char, lastIndex)
                          }

                          // 剩余的文本
                          if (lastIndex < text.length) {
                            parts.push(
                              <span key={`text-${key++}`}>
                                {text.substring(lastIndex)}
                              </span>
                            )
                          }

                          return parts
                        }

                        return (
                          <div
                            key={opt.label}
                            className={`${styles.option} ${opt.label === q.correctAnswer ? styles.correct : ''}`}
                          >
                            <span className={styles.optionLabel}>{opt.label}.</span>
                            <span className={styles.optionText}>
                              {renderSentenceWithDots(opt.sentence, targetChar || q.character)}
                            </span>
                            {q.questionType === 'different-characters' && opt.character && (
                              <span className={styles.optionHint}>
                                （{opt.character}：{opt.definition}）
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className={styles.answer}>
                      <strong>答案：{q.correctAnswer}</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
