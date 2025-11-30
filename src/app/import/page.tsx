'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import { StorageService } from '@/services/storage'
import { importFromJSON, generateExampleJSON, convertImportData } from '@/utils/import'
import type { ImportLibrary } from '@/utils/import'
import styles from './import.module.css'

export default function ImportPage() {
  const [jsonInput, setJsonInput] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleLoadExample = () => {
    const example = generateExampleJSON()
    setJsonInput(example)
    setMessage('已加载示例数据')
    setMessageType('success')
  }

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setMessage('请输入JSON数据')
      setMessageType('error')
      return
    }

    setIsProcessing(true)
    setMessage('')

    try {
      // 验证和转换数据
      const result = importFromJSON(jsonInput)

      if (!result.success) {
        setMessage(result.message)
        setMessageType('error')
        setIsProcessing(false)
        return
      }

      // 解析JSON并转换
      const importData = JSON.parse(jsonInput) as ImportLibrary[]
      const storageData = convertImportData(importData)

      // 保存到存储
      const storage = new StorageService()
      await storage.initialize()
      
      // 覆盖整个库
      storage['data'] = storageData
      await storage.saveToLocal()

      setMessage(
        `导入成功！\n` +
        `库: ${result.librariesCount}\n` +
        `集: ${result.collectionsCount}\n` +
        `文章: ${result.articlesCount}\n` +
        `句子: ${result.sentencesCount}`
      )
      setMessageType('success')
    } catch (error) {
      setMessage(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setMessageType('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClear = () => {
    setJsonInput('')
    setMessage('')
    setMessageType('')
  }

  const handleDownloadExample = () => {
    const example = generateExampleJSON()
    const blob = new Blob([example], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'example-import.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <div className={styles.importPage}>
        <div className={styles.header}>
          <h1 className={styles.title}>数据导入</h1>
          <p className={styles.subtitle}>导入文言文数据，覆盖整个库</p>
        </div>

        <div className={styles.content}>
          <div className={styles.instructions}>
            <h2>使用说明</h2>
            <ol>
              <li>准备JSON格式的数据（参考示例格式）</li>
              <li>将句子已分割好，每个句子作为数组的一个元素</li>
              <li>粘贴JSON数据到下方文本框</li>
              <li>点击"导入数据"按钮</li>
              <li>导入成功后，原有数据将被完全覆盖</li>
            </ol>

            <div className={styles.buttonGroup}>
              <button onClick={handleLoadExample} className={styles.secondaryButton}>
                加载示例
              </button>
              <button onClick={handleDownloadExample} className={styles.secondaryButton}>
                下载示例文件
              </button>
            </div>
          </div>

          <div className={styles.inputSection}>
            <label htmlFor="jsonInput" className={styles.label}>
              JSON 数据
            </label>
            <textarea
              id="jsonInput"
              className={styles.textarea}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="粘贴JSON数据..."
              rows={20}
            />
          </div>

          {message && (
            <div className={`${styles.message} ${styles[messageType]}`}>
              <pre>{message}</pre>
            </div>
          )}

          <div className={styles.actions}>
            <button
              onClick={handleImport}
              className={styles.primaryButton}
              disabled={isProcessing || !jsonInput.trim()}
            >
              {isProcessing ? '导入中...' : '导入数据'}
            </button>
            <button
              onClick={handleClear}
              className={styles.secondaryButton}
              disabled={isProcessing}
            >
              清空
            </button>
          </div>

          <div className={styles.warning}>
            <strong>⚠️ 警告：</strong>
            导入操作将完全覆盖现有数据，请确保已备份重要数据！
          </div>
        </div>

        <div className={styles.formatSection}>
          <h2>JSON 格式说明</h2>
          <div className={styles.formatExample}>
            <pre>{`[
  {
    "name": "库名称",
    "collections": [
      {
        "name": "集名称",
        "order": 1,
        "articles": [
          {
            "title": "文章标题",
            "sentences": [
              "第一句话。",
              "第二句话。",
              "第三句话。"
            ]
          }
        ]
      }
    ]
  }
]`}</pre>
          </div>

          <div className={styles.formatNotes}>
            <h3>字段说明：</h3>
            <ul>
              <li><code>name</code>: 库的名称（字符串）</li>
              <li><code>collections</code>: 集的数组</li>
              <li><code>order</code>: 集的排序顺序（数字）</li>
              <li><code>articles</code>: 文章的数组</li>
              <li><code>title</code>: 文章标题（字符串）</li>
              <li><code>sentences</code>: 句子数组（字符串数组）</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  )
}
