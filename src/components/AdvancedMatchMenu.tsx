'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { SearchOptions } from '@/types'
import styles from './AdvancedMatchMenu.module.css'

interface AdvancedMatchMenuProps {
  options: SearchOptions
  onOptionsChange: (options: SearchOptions) => void
}

export default function AdvancedMatchMenu({
  options,
  onOptionsChange,
}: AdvancedMatchMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
      })
    }
    setIsOpen(!isOpen)
  }

  const handleModeChange = (mode: 'normal' | 'regex' | 'inverse') => {
    onOptionsChange({ ...options, mode })
  }

  const handleToggle = (key: keyof SearchOptions, value: boolean) => {
    onOptionsChange({ ...options, [key]: value })
  }

  return (
    <div className={styles.advancedMatchMenu} ref={menuRef}>
      <button
        ref={buttonRef}
        className={`${styles.toggleButton} ${isOpen ? styles.active : ''}`}
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-label="高级匹配选项"
      >
        <span>高级</span>
        <svg
          className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && createPortal(
        <div ref={panelRef} className={styles.menuPanel} style={menuStyle}>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>匹配模式</h4>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="mode"
                  checked={options.mode === 'normal'}
                  onChange={() => handleModeChange('normal')}
                />
                <span>普通匹配</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="mode"
                  checked={options.mode === 'regex'}
                  onChange={() => handleModeChange('regex')}
                  title="在搜索框中输入正则表达式进行复杂模式匹配"
                />
                <span>正则表达式</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="mode"
                  checked={options.mode === 'inverse'}
                  onChange={() => handleModeChange('inverse')}
                  title="查找不包含搜索内容的句子，应用所有筛选条件"
                />
                <span>反向匹配</span>
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>匹配选项</h4>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={options.caseSensitive}
                  onChange={(e) => handleToggle('caseSensitive', e.target.checked)}
                  title="区分大小写（对中文通常无效）"
                />
                <span>区分大小写</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={options.wholeWord}
                  onChange={(e) => handleToggle('wholeWord', e.target.checked)}
                  title="仅匹配完整的词"
                />
                <span>全词匹配</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={options.fuzzyMatch}
                  onChange={(e) => handleToggle('fuzzyMatch', e.target.checked)}
                  title="允许近似匹配"
                />
                <span>模糊匹配</span>
              </label>
            </div>
          </div>

          {options.fuzzyMatch && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                模糊匹配容差: {options.fuzzyTolerance.toFixed(2)}
              </h4>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={options.fuzzyTolerance}
                onChange={(e) =>
                  onOptionsChange({
                    ...options,
                    fuzzyTolerance: parseFloat(e.target.value),
                  })
                }
                className={styles.slider}
              />
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
