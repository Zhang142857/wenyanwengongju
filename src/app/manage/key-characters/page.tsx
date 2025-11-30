'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { StorageService } from '@/services/storage'
import { DEFAULT_KEY_CHARACTERS } from '@/types'
import styles from './key-characters.module.css'

export default function KeyCharactersPage() {
  const [storage] = useState(() => new StorageService())
  const [isInitialized, setIsInitialized] = useState(false)
  const [keyCharacters, setKeyCharacters] = useState<string[]>([])
  const [batchChars, setBatchChars] = useState('')
  const [showBatchInput, setShowBatchInput] = useState(false)
  const [batchDeleteChars, setBatchDeleteChars] = useState('')
  const [showBatchDelete, setShowBatchDelete] = useState(false)
  const [selectedChars, setSelectedChars] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')

  useEffect(() => {
    const initStorage = async () => {
      await storage.initialize()
      const chars = storage.getKeyCharacters()
      
      // 如果没有重点字，使用默认列表
      if (chars.length === 0) {
        DEFAULT_KEY_CHARACTERS.forEach(char => storage.addKeyCharacter(char))
        await storage.saveToLocal()
        setKeyCharacters([...DEFAULT_KEY_CHARACTERS])
      } else {
        setKeyCharacters(chars)
      }
      
      setIsInitialized(true)
    }
    initStorage()
  }, [storage])

  const handleToggleChar = (char: string) => {
    const newSelected = new Set(selectedChars)
    if (newSelected.has(char)) {
      newSelected.delete(char)
    } else {
      newSelected.add(char)
    }
    setSelectedChars(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedChars.size === keyCharacters.length) {
      setSelectedChars(new Set())
    } else {
      setSelectedChars(new Set(keyCharacters))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedChars.size === 0) {
      setMessage('请先选择要删除的字')
      return
    }

    if (!confirm(`确定要删除选中的 ${selectedChars.size} 个字吗？`)) {
      return
    }

    selectedChars.forEach(char => {
      storage.removeKeyCharacter(char)
    })
    await storage.saveToLocal()
    setKeyCharacters(storage.getKeyCharacters())
    setSelectedChars(new Set())
    setMessage(`已删除 ${selectedChars.size} 个字`)
    setTimeout(() => setMessage(''), 2000)
  }

  const handleResetToDefault = async () => {
    // 清空现有重点字
    keyCharacters.forEach(char => storage.removeKeyCharacter(char))
    
    // 添加默认重点字
    DEFAULT_KEY_CHARACTERS.forEach(char => storage.addKeyCharacter(char))
    await storage.saveToLocal()
    setKeyCharacters(storage.getKeyCharacters())
    setMessage('已重置为默认列表')
    setTimeout(() => setMessage(''), 2000)
  }

  const handleBatchAdd = async () => {
    if (!batchChars.trim()) {
      setMessage('请输入要添加的字')
      return
    }

    // 提取所有单个字符（过滤空格、换行等）
    const chars = Array.from(batchChars).filter(char => {
      // 只保留中文字符
      return /[\u4e00-\u9fa5]/.test(char)
    })

    if (chars.length === 0) {
      setMessage('未找到有效的中文字符')
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

    await storage.saveToLocal()
    setKeyCharacters(storage.getKeyCharacters())
    setBatchChars('')
    setShowBatchInput(false)
    
    let msg = `已添加 ${addedCount} 个字`
    if (skippedCount > 0) {
      msg += `，跳过 ${skippedCount} 个已存在的字`
    }
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleBatchDelete = async () => {
    if (!batchDeleteChars.trim()) {
      setMessage('请输入要删除的字')
      return
    }

    // 提取所有单个字符（过滤空格、换行等）
    const chars = Array.from(batchDeleteChars).filter(char => {
      // 只保留中文字符
      return /[\u4e00-\u9fa5]/.test(char)
    })

    if (chars.length === 0) {
      setMessage('未找到有效的中文字符')
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

    await storage.saveToLocal()
    setKeyCharacters(storage.getKeyCharacters())
    setBatchDeleteChars('')
    setShowBatchDelete(false)
    
    let msg = `已删除 ${deletedCount} 个字`
    if (notFoundCount > 0) {
      msg += `，${notFoundCount} 个字不存在`
    }
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  if (!isInitialized) {
    return (
      <Layout title="重点字管理" subtitle="Key Characters Management">
        <div className={styles.container}>
          <p>加载中...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="重点字管理" subtitle="Key Characters Management">
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h2>重点字列表</h2>
            <p className={styles.description}>
              管理用于AI整理义项的重点字列表。这些字将在AI整理时优先处理。
            </p>
          </div>

          {message && (
            <div className={styles.message}>
              {message}
            </div>
          )}

          <div className={styles.addSection}>
            <button 
              onClick={() => setShowBatchInput(!showBatchInput)} 
              className={styles.batchButton}
            >
              {showBatchInput ? '取消批量添加' : '批量添加'}
            </button>
            <button 
              onClick={() => setShowBatchDelete(!showBatchDelete)} 
              className={styles.batchDeleteButton}
            >
              {showBatchDelete ? '取消批量删除' : '批量删除'}
            </button>
            <button onClick={handleResetToDefault} className={styles.resetButton}>
              重置为默认
            </button>
          </div>

          {showBatchInput && (
            <div className={styles.batchSection}>
              <textarea
                value={batchChars}
                onChange={(e) => setBatchChars(e.target.value)}
                placeholder="输入多个字，可以直接粘贴文本，系统会自动提取所有中文字符"
                className={styles.batchInput}
                rows={5}
              />
              <div className={styles.batchActions}>
                <button onClick={handleBatchAdd} className={styles.batchAddButton}>
                  确认批量添加
                </button>
                <span className={styles.batchHint}>
                  提示：可以输入任意文本，系统会自动提取其中的中文字符并去重
                </span>
              </div>
            </div>
          )}

          {showBatchDelete && (
            <div className={styles.batchSection}>
              <textarea
                value={batchDeleteChars}
                onChange={(e) => setBatchDeleteChars(e.target.value)}
                placeholder="输入要删除的字，可以直接粘贴文本，系统会自动提取所有中文字符"
                className={styles.batchInput}
                rows={5}
              />
              <div className={styles.batchActions}>
                <button onClick={handleBatchDelete} className={styles.batchDeleteConfirmButton}>
                  确认批量删除
                </button>
                <span className={styles.batchHint}>
                  提示：可以输入任意文本，系统会自动提取其中的中文字符
                </span>
              </div>
            </div>
          )}

          <div className={styles.stats}>
            <span>共 {keyCharacters.length} 个重点字</span>
            {selectedChars.size > 0 && (
              <span className={styles.selectedCount}>已选择 {selectedChars.size} 个</span>
            )}
            {selectedChars.size > 0 && (
              <button onClick={handleDeleteSelected} className={styles.deleteSelectedButton}>
                删除选中
              </button>
            )}
            {keyCharacters.length > 0 && (
              <button onClick={handleSelectAll} className={styles.selectAllButton}>
                {selectedChars.size === keyCharacters.length ? '取消全选' : '全选'}
              </button>
            )}
          </div>

          <div className={styles.charList}>
            {keyCharacters.map((char) => (
              <div 
                key={char} 
                className={`${styles.charItem} ${selectedChars.has(char) ? styles.selected : ''}`}
                onClick={() => handleToggleChar(char)}
              >
                <span className={styles.char}>{char}</span>
                {selectedChars.has(char) && (
                  <div className={styles.checkmark}>✓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
