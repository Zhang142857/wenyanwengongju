'use client'

import { useState } from 'react'
import { CloseIcon, PlusIcon } from './Icons'
import type { Definition } from '@/types'
import styles from './AddDefinitionDialog.module.css'

interface AddDefinitionDialogProps {
  character: string
  sentenceText: string
  sentenceId: string
  characterPosition: number
  existingDefinitions: Definition[]
  onAddToExisting: (definitionId: string) => void
  onAddNew: (content: string) => void
  onClose: () => void
}

export default function AddDefinitionDialog({
  character,
  sentenceText,
  existingDefinitions,
  onAddToExisting,
  onAddNew,
  onClose,
}: AddDefinitionDialogProps) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [error, setError] = useState('')

  const handleAddNew = () => {
    if (!newContent.trim()) {
      setError('请输入义项内容')
      return
    }
    onAddNew(newContent.trim())
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.character}>{character}</span>
            <span className={styles.title}>添加义项</span>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="关闭">
            <CloseIcon className={styles.closeIcon} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.sentenceSection}>
            <p className={styles.sentence}>{sentenceText}</p>
          </div>

          {/* 添加到新义项按钮 */}
          {!showNewForm ? (
            <button className={styles.addNewButton} onClick={() => setShowNewForm(true)}>
              <PlusIcon className={styles.addNewIcon} />
              <span>添加到新义项</span>
            </button>
          ) : (
            <div className={styles.newForm}>
              <input
                type="text"
                className={styles.newInput}
                placeholder={`输入"${character}"在此句中的含义...`}
                value={newContent}
                onChange={(e) => {
                  setNewContent(e.target.value)
                  if (error) setError('')
                }}
                autoFocus
              />
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.newFormActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowNewForm(false)
                    setNewContent('')
                    setError('')
                  }}
                >
                  取消
                </button>
                <button type="button" className={styles.confirmBtn} onClick={handleAddNew}>
                  确定
                </button>
              </div>
            </div>
          )}

          {/* 现有义项列表 */}
          {existingDefinitions.length > 0 && (
            <div className={styles.existingSection}>
              <p className={styles.existingLabel}>或添加到现有义项：</p>
              <div className={styles.definitionList}>
                {existingDefinitions.map((def) => (
                  <button
                    key={def.id}
                    className={styles.definitionItem}
                    onClick={() => onAddToExisting(def.id)}
                  >
                    <span className={styles.definitionContent}>{def.content}</span>
                    <span className={styles.addIcon}>+</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {existingDefinitions.length === 0 && !showNewForm && (
            <p className={styles.noDefinitions}>该字暂无义项，请添加新义项</p>
          )}
        </div>
      </div>
    </div>
  )
}
