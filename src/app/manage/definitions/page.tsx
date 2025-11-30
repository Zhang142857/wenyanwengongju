'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { StorageService } from '@/services/storage'
import { EditIcon, SaveIcon, CloseIcon } from '@/components/Icons'
import type { Definition } from '@/types'
import styles from './definitions.module.css'

export default function DefinitionsPage() {
  const [storage] = useState(() => new StorageService())
  const [definitions, setDefinitions] = useState<Definition[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await storage.initialize()
    setDefinitions(storage.getDefinitions())
  }

  const handleEdit = (def: Definition) => {
    setEditingId(def.id)
    setEditContent(def.content)
  }

  const handleSave = async () => {
    if (editingId && editContent.trim()) {
      storage.updateDefinition(editingId, editContent.trim())
      await storage.saveToLocal()
      setEditingId(null)
      loadData()
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个义项吗？')) {
      storage.deleteDefinition(id)
      await storage.saveToLocal()
      loadData()
    }
  }

  const filteredDefinitions = definitions.filter(def =>
    def.character.includes(searchTerm) || def.content.includes(searchTerm)
  )

  // 按字分组
  const groupedDefinitions = filteredDefinitions.reduce((acc, def) => {
    if (!acc[def.character]) {
      acc[def.character] = []
    }
    acc[def.character].push(def)
    return acc
  }, {} as Record<string, Definition[]>)

  const handleClearAll = async () => {
    if (confirm('确定要清空所有义项库吗？此操作不可撤销！')) {
      if (confirm('再次确认：清空所有义项库？')) {
        storage.clearAllDefinitions()
        await storage.saveToLocal()
        setDefinitions([])
        alert('义项库已清空')
      }
    }
  }

  return (
    <Layout title="义项库管理" subtitle="Definition Library Management" fullWidth>
      <div className={styles.container}>
        <div className={styles.header}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="搜索字或义项..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className={styles.stats}>
            共 {definitions.length} 个义项，{Object.keys(groupedDefinitions).length} 个字
          </div>
          <button
            onClick={() => window.location.href = '/manage/clear-definitions'}
            style={{
              padding: '0.6rem 1rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#c82333')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#dc3545')}
          >
            🗑️ 清空所有
          </button>
        </div>

        <div className={styles.content}>
          {Object.entries(groupedDefinitions).map(([character, defs]) => (
            <div key={character} className={styles.characterGroup}>
              <h3 className={styles.characterTitle}>{character}</h3>
              <div className={styles.definitionsList}>
                {defs.map((def) => (
                  <div key={def.id} className={styles.definitionItem}>
                    {editingId === def.id ? (
                      <div className={styles.editForm}>
                        <input
                          type="text"
                          className={styles.editInput}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          autoFocus
                        />
                        <div className={styles.editActions}>
                          <button onClick={handleSave} className={styles.saveBtn}>
                            <SaveIcon />
                          </button>
                          <button onClick={handleCancel} className={styles.cancelBtn}>
                            <CloseIcon />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={styles.definitionContent}>{def.content}</span>
                        <div className={styles.actions}>
                          <button onClick={() => handleEdit(def)} className={styles.editBtn}>
                            <EditIcon />
                          </button>
                          <button onClick={() => handleDelete(def.id)} className={styles.deleteBtn}>
                            删除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredDefinitions.length === 0 && (
            <div className={styles.emptyState}>
              <p>暂无义项数据</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
