'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './CustomMultiSelect.module.css'

interface Option {
  value: string
  label: string
}

interface CustomMultiSelectProps {
  values: string[]
  options: Option[]
  placeholder?: string
  onChange: (values: string[]) => void
  disabled?: boolean
  'aria-label'?: string
}

export default function CustomMultiSelect({
  values,
  options,
  placeholder = '请选择',
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}: CustomMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(target)
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target)
      
      if (isOutsideWrapper && isOutsideDropdown) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const toggleDropdown = () => {
    if (disabled) return
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: Math.max(rect.width, 150),
      })
    }
    setIsOpen(!isOpen)
  }

  const handleToggle = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter(v => v !== optionValue))
    } else {
      onChange([...values, optionValue])
    }
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const selectedOptions = options.filter(opt => values.includes(opt.value))
  const displayText = selectedOptions.length > 0
    ? selectedOptions.length === 1
      ? selectedOptions[0].label
      : `已选 ${selectedOptions.length} 项`
    : placeholder

  return (
    <div className={styles.selectWrapper} ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.selectButton} ${values.length > 0 ? styles.active : ''} ${isOpen ? styles.open : ''}`}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles.buttonText}>{displayText}</span>
        <div className={styles.icons}>
          {values.length > 0 && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClearAll}
              aria-label="清除选择"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          <svg
            className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`}
            width="14"
            height="14"
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
        </div>
      </button>

      {isOpen && createPortal(
        <div ref={dropdownRef} className={styles.dropdown} style={dropdownStyle} role="listbox">
          {options.map((option) => {
            const isSelected = values.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleToggle(option.value)}
                role="option"
                aria-selected={isSelected}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className={styles.checkbox}
                  tabIndex={-1}
                />
                <span className={styles.optionLabel}>{option.label}</span>
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}
