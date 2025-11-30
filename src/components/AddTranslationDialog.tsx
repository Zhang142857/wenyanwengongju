'use client'

import { useState } from 'react'
import { CloseIcon } from './Icons'
import styles from './AddTranslationDialog.module.css'

interface AddTranslationDialogProps {
  originalText: string
  sentenceText: string
  onSave: (translation: string) => void
  onClose: () => void
}

export default function AddTranslationDialog({
  originalText,
  sentenceText,
  onSave,
  onClose,
}: AddTranslationDialogProps) {
  const [translation, setTranslation] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!translation.trim()) {
      setError('请输入翻译内容')
      return
    }
    onSave(translation.trim())
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.icon}>🌐</span>
            <span className={styles.title}>添加翻译</span>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="关闭">
            <CloseIcon className={styles.closeIcon} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <p className={styles.label}>原文：</p>
            <p className={styles.originalText}>{originalText}</p>
          </div>

          <div className={styles.section}>
            <p className={styles.label}>完整句子：</p>
            <p className={styles.sentence}>{sentenceText}</p>
          </div>

          <div className={styles.section}>
            <label htmlFor="translation-input" className={styles.label}>
              翻译：
            </label>
            <textarea
              id="translation-input"
              className={styles.textarea}
              placeholder="请输入现代汉语翻译..."
              value={translation}
              onChange={(e) => {
                setTranslation(e.target.value)
                if (error) setError('')
              }}
              rows={3}
              autoFocus
            />
            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              取消
            </button>
            <button type="button" className={styles.confirmBtn} onClick={handleSubmit}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
