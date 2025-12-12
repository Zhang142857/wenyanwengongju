'use client'

import { useState } from 'react'
import { AIKeyPointService, type AIKeyPointRequest, type AIKeyPointResult } from '@/services/aiKeyPoint'
import { StorageService } from '@/services/storage'
import type { ExamScope, QuestionType } from '@/services/examGenerator'
import ApiConfigSelector from './ApiConfigSelector'
import styles from './AIKeyPointDialog.module.css'

interface AIKeyPointDialogProps {
  scope: ExamScope
  questionType: QuestionType
  onConfirm: (characters: string[]) => void
  onClose: () => void
}

export default function AIKeyPointDialog({ scope, questionType, onConfirm, onClose }: AIKeyPointDialogProps) {
  const [requirement, setRequirement] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<AIKeyPointResult | null>(null)
  const [error, setError] = useState('')
  const [selectedApiConfigId, setSelectedApiConfigId] = useState<string>()

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      setError('请输入考点需求')
      return
    }

    setIsGenerating(true)
    setError('')
    setResult(null)

    try {
      const storage = new StorageService()
      await storage.initialize()
      
      const service = new AIKeyPointService(storage)
      
      const request: AIKeyPointRequest = {
        requirement: requirement.trim(),
        scope,
        questionType,
        apiConfigId: selectedApiConfigId,
      }

      const generatedResult = await service.generateKeyPoints(request)
      setResult(generatedResult)
    } catch (err) {
      console.error('AI生成考点失败:', err)
      setError(err instanceof Error ? err.message : 'AI生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConfirm = () => {
    if (result && result.characters.length > 0) {
      // 只返回可用的考点
      const availableChars = result.characters.filter(char => result.availability.get(char))
      onConfirm(availableChars)
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>AI出考点</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label>考点需求</label>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="例如：重点考察常见虚词的用法"
              className={styles.textarea}
              rows={3}
              disabled={isGenerating}
            />
          </div>

          <div className={styles.formGroup}>
            <label>AI配置</label>
            <ApiConfigSelector
              value={selectedApiConfigId}
              onChange={(val) => setSelectedApiConfigId(val)}
            />
          </div>

          <div className={styles.info}>
            <p><strong>考察范围：</strong>{getScopeDescription(scope)}</p>
            <p><strong>题型：</strong>{questionType === 'same-character' ? '同一个字' : '不同字'}</p>
          </div>

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          {result && (
            <div className={styles.result}>
              <h3>AI推荐考点</h3>
              
              <div className={styles.reasoning}>
                <strong>推理说明：</strong>
                <p>{result.reasoning}</p>
              </div>

              <div className={styles.characters}>
                <strong>推荐的字：</strong>
                <div className={styles.characterList}>
                  {result.characters.map((char, index) => {
                    const isAvailable = result.availability.get(char)
                    return (
                      <span
                        key={index}
                        className={`${styles.characterTag} ${isAvailable ? styles.available : styles.unavailable}`}
                        title={isAvailable ? '范围内有数据' : '范围内无数据'}
                      >
                        {char}
                        {!isAvailable && ' ⚠️'}
                      </span>
                    )
                  })}
                </div>
              </div>

              {result.characters.some(char => !result.availability.get(char)) && (
                <div className={styles.warning}>
                  ⚠️ 部分考点在当前范围内没有数据，将被自动过滤
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !requirement.trim()}
            className={styles.primaryButton}
          >
            {isGenerating ? '生成中...' : '生成考点'}
          </button>

          {result && (
            <button
              onClick={handleConfirm}
              disabled={result.characters.filter(char => result.availability.get(char)).length === 0}
              className={styles.primaryButton}
            >
              确认使用
            </button>
          )}

          <button onClick={onClose} className={styles.secondaryButton}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

function getScopeDescription(scope: ExamScope): string {
  // 这里简化处理，实际应该从storage获取名称
  if (scope.articleId) return '指定文章'
  if (scope.collectionId) return '指定集'
  if (scope.libraryId) return '指定库'
  return '所有内容'
}
