'use client'

import { useEffect, useRef } from 'react'
import styles from './ContextMenu.module.css'

interface ContextMenuProps {
  x: number
  y: number
  isSingleChar: boolean
  onAddDefinition?: () => void
  onAddTranslation?: () => void
  onClose: () => void
}

export default function ContextMenu({ x, y, isSingleChar, onAddDefinition, onAddTranslation, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // 调整位置确保菜单不超出屏幕
  const adjustedX = Math.min(x, window.innerWidth - 160)
  const adjustedY = Math.min(y, window.innerHeight - 100)

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: adjustedX, top: adjustedY }}
    >
      {isSingleChar && onAddDefinition && (
        <button className={styles.menuItem} onClick={onAddDefinition}>
          <span className={styles.menuIcon}>📝</span>
          <span>添加义项</span>
        </button>
      )}
      {!isSingleChar && onAddTranslation && (
        <button className={styles.menuItem} onClick={onAddTranslation}>
          <span className={styles.menuIcon}>🌐</span>
          <span>添加翻译</span>
        </button>
      )}
    </div>
  )
}
