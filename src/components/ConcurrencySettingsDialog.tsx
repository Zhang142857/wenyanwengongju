'use client'

import { useState, useEffect } from 'react'
import {
  getConcurrencyConfig,
  updateConcurrencyConfig,
  resetConcurrencyConfig,
  initConcurrencyConfig,
  type ConcurrencyConfig,
} from '@/services/concurrencyConfig'
import styles from './ConcurrencySettingsDialog.module.css'

interface ConcurrencySettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConcurrencySettingsDialog({ isOpen, onClose }: ConcurrencySettingsDialogProps) {
  const [config, setConfig] = useState<ConcurrencyConfig | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      initConcurrencyConfig()
      setConfig(getConcurrencyConfig())
    }
  }, [isOpen])

  const handleChange = (key: keyof ConcurrencyConfig, value: number) => {
    if (config) {
      setConfig({ ...config, [key]: value })
      setIsSaved(false)
    }
  }

  const handleSave = () => {
    if (config) {
      updateConcurrencyConfig(config)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  }

  const handleReset = () => {
    if (confirm('确定要重置为默认配置吗？')) {
      const defaultConfig = resetConcurrencyConfig()
      setConfig(defaultConfig)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  }

  if (!isOpen || !config) {
    return null
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>⚡ 并发参数设置</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          {/* AI定义并发数 */}
          <div className={styles.setting}>
            <label className={styles.label}>AI义项生成并发数</label>
            <div className={styles.control}>
              <input
                type="range"
                min="1"
                max="512"
                value={config.aiDefinitionConcurrency}
                onChange={(e) => handleChange('aiDefinitionConcurrency', parseInt(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.value}>{config.aiDefinitionConcurrency}</span>
            </div>
            <p className={styles.hint}>范围: 1-512 | 默认: 2 | 建议: 4-8</p>
          </div>

          {/* 短句生成并发数 */}
          <div className={styles.setting}>
            <label className={styles.label}>短句生成并发数</label>
            <div className={styles.control}>
              <input
                type="range"
                min="1"
                max="512"
                value={config.shortSentenceConcurrency}
                onChange={(e) => handleChange('shortSentenceConcurrency', parseInt(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.value}>{config.shortSentenceConcurrency}</span>
            </div>
            <p className={styles.hint}>范围: 1-512 | 默认: 12 | 建议: 8-16</p>
          </div>

          {/* 批次间延迟 */}
          <div className={styles.setting}>
            <label className={styles.label}>批次间延迟 (毫秒)</label>
            <div className={styles.control}>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={config.batchDelayMs}
                onChange={(e) => handleChange('batchDelayMs', parseInt(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.value}>{config.batchDelayMs}ms</span>
            </div>
            <p className={styles.hint}>范围: 0-5000ms | 默认: 200ms | 建议: 150-300ms</p>
          </div>

          {/* 重试延迟 */}
          <div className={styles.setting}>
            <label className={styles.label}>重试延迟 (毫秒)</label>
            <div className={styles.control}>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={config.retryDelayMs}
                onChange={(e) => handleChange('retryDelayMs', parseInt(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.value}>{config.retryDelayMs}ms</span>
            </div>
            <p className={styles.hint}>范围: 0-5000ms | 默认: 500ms | 建议: 300-800ms</p>
          </div>

          {/* 分隔线 */}

        </div>

        <div className={styles.footer}>
          <button className={styles.saveBtn} onClick={handleSave}>
            💾 保存配置
          </button>
          <button className={styles.resetBtn} onClick={handleReset}>
            🔄 重置默认
          </button>
          <button className={styles.closeDialogBtn} onClick={onClose}>
            关闭
          </button>
        </div>

        {isSaved && (
          <div className={styles.savedMessage}>
            ✅ 配置已保存
          </div>
        )}
      </div>
    </div>
  )
}
