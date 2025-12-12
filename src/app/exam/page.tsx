'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { StorageService } from '@/services/storage'
import { ExamGenerator, type ExamConfig, type ExamQuestion } from '@/services/examGenerator'
import { configService } from '@/services/configService'
import styles from './exam-new.module.css'
import ExamStatistics from '@/components/ExamStatistics'
import { useWeightStore } from '@/stores/weightStore'
import { ExamConfig as FullExamConfig } from '@/services/examGenerator' // resolve naming conflict if any, or just use ExamConfig
import { useToast } from '@/contexts/ToastContext'
import WeightManager from '@/components/WeightManager'
import ExamAnnouncement from '@/components/ExamAnnouncement'

/**
 * 高亮显示句子中的考察字（加点字）
 */
function highlightCharacter(
  sentence: string,
  character: string,
  characters?: string[]
): React.ReactNode[] {
  const charsToHighlight = characters || [character]
  const result: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < sentence.length; i++) {
    const char = sentence[i]
    if (charsToHighlight.includes(char)) {
      result.push(
        <span key={key++} className={styles.dottedChar}>{char}</span>
      )
    } else {
      let normalText = char
      while (i + 1 < sentence.length && !charsToHighlight.includes(sentence[i + 1])) {
        i++
        normalText += sentence[i]
      }
      result.push(<span key={key++}>{normalText}</span>)
    }
  }

  return result
}

export default function ExamPage() {
  const [storage] = useState(() => new StorageService())
  const [examGenerator] = useState(() => new ExamGenerator(storage))
  const toast = useToast()

  // 出题配置
  const [config, setConfig] = useState<Partial<ExamConfig>>({
    questionCount: 5,
    questionType: 'same-character',
    answerType: 'find-different',
    optionsCount: 4,
    sentencesPerOption: 3,
  })

  // 生成的题目
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // 权重状态 (仅读取用于生成)
  const { currentConfig: weightConfig } = useWeightStore()

  // 数据选项
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

    // 应用自动筛选
    await configService.initialize()
    const autoFilterConfig = configService.getAutoFilterConfig()
    if (autoFilterConfig.enabled && autoFilterConfig.defaultLibraryId) {
      setConfig(prev => ({
        ...prev,
        scope: { libraryId: autoFilterConfig.defaultLibraryId }
      }))
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


  const handleGenerate = async () => {
    if (!config.questionCount || !config.scope) {
      toast.error('请填写题目数量和考察范围')
      return
    }

    setIsGenerating(true)
    setQuestions([])

    try {
      // 构建包含权重配置的完整配置
      const fullConfig: ExamConfig = {
        ...config as ExamConfig,
      }

      // 如果有权重配置，添加到出题配置中
      if (weightConfig) {
        // 添加重点字权重
        if (weightConfig.characterWeights.length > 0) {
          fullConfig.characterWeights = weightConfig.characterWeights.map(cw => ({
            char: cw.char,
            weight: cw.weight,
          }))
          fullConfig.priorityCharacters = weightConfig.characterWeights.map(cw => cw.char)
        }

        // 添加文章权重
        if (weightConfig.articleWeights.length > 0) {
          fullConfig.articleWeights = weightConfig.articleWeights.map(aw => ({
            articleId: aw.articleId,
            weight: aw.weight,
            included: aw.included,
          }))

          // 日志：显示被选中的文章数量
          const includedCount = weightConfig.articleWeights.filter(aw => aw.included && aw.weight > 0).length
          console.log(`📊 文章权重: ${weightConfig.articleWeights.length}篇文章, ${includedCount}篇被选中`)
        }
      }

      const generatedQuestions = await examGenerator.generateExam(fullConfig)
      setQuestions(generatedQuestions)

      if (generatedQuestions.length === 0) {
        toast.warning('未能生成题目，可能是数据不足')
      } else {
        toast.success(`成功生成 ${generatedQuestions.length} 道题目`)
      }
    } catch (err) {
      console.error('生成题目失败:', err)
      toast.error(err instanceof Error ? err.message : '生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async () => {
    if (questions.length === 0) return

    try {
      const { exportToWord, downloadWord } = await import('@/services/wordExport')
      const blob = await exportToWord(questions, 'teacher')
      const dateStr = new Date().toLocaleDateString().replace(/\//g, '-')
      downloadWord(blob, `文言文练习题_${dateStr}.docx`)
      toast.success('导出成功！')
    } catch (err) {
      toast.error('导出失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }


  return (
    <Layout fullWidth title="自动出题" subtitle="根据义项库自动生成文言文选择题">
      <ExamAnnouncement />
      <div className={styles.examPage}>
        <div className={styles.mainContent}>
          {/* 配置面板 */}
          <div className={styles.configPanel}>
            {/* 基础配置 */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>基础设置</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>题目数量</label>
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
                  <label>题型</label>
                  <select
                    value={config.questionType || 'same-character'}
                    onChange={(e) => setConfig({ ...config, questionType: e.target.value as any })}
                    className={styles.select}
                  >
                    <option value="same-character">同一个字</option>
                    <option value="different-characters">不同字</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>答案类型</label>
                  <select
                    value={config.answerType || 'find-different'}
                    onChange={(e) => setConfig({ ...config, answerType: e.target.value as any })}
                    className={styles.select}
                  >
                    <option value="find-different">找不同</option>
                    <option value="find-same">找相同</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>选项数</label>
                  <select
                    value={config.optionsCount || 4}
                    onChange={(e) => setConfig({ ...config, optionsCount: parseInt(e.target.value) })}
                    className={styles.select}
                  >
                    <option value="3">3个</option>
                    <option value="4">4个</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>每选项短句数</label>
                  <select
                    value={config.sentencesPerOption || 3}
                    onChange={(e) => setConfig({ ...config, sentencesPerOption: parseInt(e.target.value) })}
                    className={styles.select}
                  >
                    <option value="2">2个</option>
                    <option value="3">3个（推荐）</option>
                    <option value="4">4个</option>
                    <option value="5">5个</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>正确答案</label>
                  <select
                    value={config.correctAnswer || ''}
                    onChange={(e) => setConfig({ ...config, correctAnswer: e.target.value as any || undefined })}
                    className={styles.select}
                  >
                    <option value="">随机</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 考察范围 */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>考察范围</h3>
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


            {/* 权重管理 */}
            <WeightManager
              configScope={config.scope || {}}
              libraries={libraries}
              collections={collections}
            />

            {/* 操作按钮 */}
            <div className={styles.actions}>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !config.questionCount || !config.scope}
                className={styles.primaryButton}
              >
                {isGenerating ? '生成中...' : '生成题目'}
              </button>
            </div>
          </div>

          {/* 结果面板 */}
          <div className={styles.resultsPanel}>
            <div className={styles.resultsHeader}>
              <h3 className={styles.resultsTitle}>
                生成的题目 {questions.length > 0 && `(${questions.length})`}
              </h3>
              {questions.length > 0 && (
                <button onClick={handleExport} className={styles.exportButton}>
                  导出Word
                </button>
              )}
            </div>

            <div className={styles.resultsContent}>
              {questions.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>暂无题目</p>
                  <p>点击"生成题目"开始</p>
                </div>
              ) : (
                <>
                  {/* 题目统计 */}
                  <ExamStatistics questions={questions} storage={storage} />

                  {/* 题目列表 */}
                  {questions.map((q, index) => (
                    <div key={q.id} className={styles.question}>
                      <div className={styles.questionTitle}>
                        {index + 1}. 下列选项中加点字的意思{q.answerType === 'find-same' ? '都相同' : '不完全相同'}的一项是（   ）
                      </div>
                      <div className={styles.questionHint}>
                        考察字：<span className={styles.targetChar}>{q.character}</span>
                      </div>
                      <div className={styles.options}>
                        {q.options.map(opt => (
                          <div key={opt.label} className={styles.option}>
                            <span className={styles.optionLabel}>{opt.label}.</span>
                            {q.questionType === 'different-characters'
                              ? highlightCharacter(opt.sentence, opt.character || q.character, opt.character ? [opt.character] : undefined)
                              : highlightCharacter(opt.sentence, q.character)
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
