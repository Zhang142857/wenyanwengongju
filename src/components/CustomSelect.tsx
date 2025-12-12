'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './CustomSelect.module.css'

interface Option {
  value: string
  label: string
  description?: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  className,
  disabled = false,
  'aria-label': ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // 检查点击是否在触发器或下拉选项之外
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target)
      const isOutsideOptions = optionsRef.current && !optionsRef.current.contains(target)
      
      if (isOutsideContainer && isOutsideOptions) {
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

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      })
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`${styles.customSelect} ${className || ''}`} ref={containerRef}>
      <div 
        ref={triggerRef}
        className={`${styles.selectTrigger} ${isOpen ? styles.open : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        <span className={styles.selectedValue}>
          {selectedOption?.label || placeholder || '请选择'}
        </span>
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}>▼</span>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={optionsRef}
          className={styles.optionsContainer}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              className={`${styles.option} ${option.value === value ? styles.selected : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              <div className={styles.optionMain}>
                <span className={styles.optionLabel}>{option.label}</span>
                {option.value === value && <span className={styles.checkmark}>✓</span>}
              </div>
              {option.description && (
                <div className={styles.optionDescription}>{option.description}</div>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
