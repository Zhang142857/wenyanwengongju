'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { StorageService } from '@/services/storage'
import { batchExtractShortSentences } from '@/services/shortSentence'
import type { ShortSentence } from '@/types'
import type { ShortSentenceRequest } from '@/services/shortSentence'
import styles from './short-sentences.module.css'

export default function ShortSentencesPage() {
  const [storage] = useState(() => new StorageService())
  const [shortSentences, setShortSentences] = useState<ShortSentence[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await storage.initialize()
    setShortSentences(storage.getShortSentences())
  }

  const handleGenerate = async () => {
    if (!confirm('这将清空现有短句库并重新生成，确定继续吗？')) {
      return
    }

    setIsGenerating(true)
    setProgress({ current: 0, total: 0 })

    try {
      // 获取所有句子
      const libraries = storage.getLibraries()
      const requests: ShortSentenceRequest[] = []

      for (const library of libraries) {
        for (const collection of library.collections) {
          for (const article of collection.articles) {
            for (const sentence of article.sentences) {
              requests.push({
                sentence: sentence.text,
                articleId: article.id,
                sentenceId: sentence.id,
              })
            }
          }
        }
      }

      if (requests.length === 0) {
        alert('没有找到任何句子，请先导入文言文库')
        setIsGenerating(false)
        return
      }

      // 清空现有短句
      storage.clearShortSentences()

      // 生成短句
      const results = await batchExtractShortSentences(requests, (current, total) => {
        setProgress({ current, total })
      })

      // 保存到存储
      for (const result of results) {
        for (const shortText of result.shortSentences) {
          storage.addShortSentence(shortText, result.sourceArticleId, result.sourceSentenceId)
        }
      }

      await storage.saveToLocal()
      loadData()
      alert(`成功生成 ${storage.getShortSentences().length} 个短句！`)
    } catch (error) {
      console.error('生成失败:', error)
      alert('生成失败，请查看控制台')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个短句吗？')) {
      storage.deleteShortSentence(id)
      await storage.saveToLocal()
      loadData()
    }
  }

  const filteredSentences = shortSentences.filter(s =>
    s.text.includes(searchTerm)
  )

  return (
    <Layout title="短句库管理" subtitle="Short Sentence Library Management" fullWidth>
      <div className={styles.container}>
        <div className={styles.header}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="搜索短句..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className={styles.stats}>
            共 {shortSentences.length} 个短句
          </div>
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : 'AI重新生成'}
          </button>
        </div>

        {isGenerating && (
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className={styles.progressText}>
              {progress.current} / {progress.total}
            </p>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.sentencesList}>
            {filteredSentences.map((sentence) => (
              <div key={sentence.id} className={styles.sentenceItem}>
                <span className={styles.sentenceText}>{sentence.text}</span>
                <button
                  onClick={() => handleDelete(sentence.id)}
                  className={styles.deleteBtn}
                >
                  删除
                </button>
              </div>
            ))}
          </div>

          {filteredSentences.length === 0 && !isGenerating && (
            <div className={styles.emptyState}>
              <p>暂无短句数据</p>
              <p className={styles.emptyHint}>点击"AI重新生成"按钮自动生成短句库</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
