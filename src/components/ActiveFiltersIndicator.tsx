'use client'

import { useState } from 'react'
import type { SearchOptions } from '@/types'
import type { FilterState } from './FilterPanel'
import styles from './ActiveFiltersIndicator.module.css'

interface ActiveFiltersIndicatorProps {
  filters: FilterState
  options: SearchOptions
  onClearFilter: (filterKey: keyof FilterState) => void
  onClearAll: () => void
}

export default function ActiveFiltersIndicator({
  filters,
  options,
  onClearFilter,
  onClearAll,
}: ActiveFiltersIndicatorProps) {
  const [showRegexTooltip, setShowRegexTooltip] = useState(false)
  const activeFilters: Array<{ key: keyof FilterState; label: string }> = []
  
  if (filters.library) activeFilters.push({ key: 'library', label: '库' })
  if (filters.collection) activeFilters.push({ key: 'collection', label: '集' })
  if (filters.article) activeFilters.push({ key: 'article', label: '文章' })
  if (filters.definition) activeFilters.push({ key: 'definition', label: '义项' })

  const activeModes: string[] = []
  if (options.mode === 'regex') activeModes.push('正则')
  if (options.mode === 'inverse') activeModes.push('反向')
  if (options.caseSensitive) activeModes.push('区分大小写')
  if (options.wholeWord) activeModes.push('全词')
  if (options.fuzzyMatch) activeModes.push('模糊')

  const totalActive = activeFilters.length + activeModes.length

  if (totalActive === 0) return null

  return (
    <div className={styles.indicator}>
      <span className={styles.count}>{totalActive} 个筛选</span>
      
      {activeFilters.map(({ key, label }) => (
        <button
          key={key}
          className={styles.badge}
          onClick={() => onClearFilter(key)}
          title={`移除${label}筛选`}
        >
          {label}
          <span className={styles.close}>×</span>
        </button>
      ))}

      {activeModes.map((mode) => (
        <span 
          key={mode} 
          className={`${styles.modeBadge} ${mode === '正则' ? styles.regexBadge : ''}`}
          onMouseEnter={() => mode === '正则' && setShowRegexTooltip(true)}
          onMouseLeave={() => mode === '正则' && setShowRegexTooltip(false)}
        >
          {mode === '正则' && '🔍 '}
          {mode}
          {mode === '正则' && showRegexTooltip && (
            <div className={styles.regexTooltip}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipIcon}>⚠️</span>
                <strong>正则表达式模式</strong>
              </div>
              <div className={styles.tooltipContent}>
                <p>当前不是普通查字模式！</p>
                <p>正在使用正则语法进行高级匹配</p>
                <div className={styles.tooltipExample}>
                  <div>示例：</div>
                  <code>不亦.*乎</code> - 匹配"不亦"和"乎"之间的任意内容
                </div>
              </div>
            </div>
          )}
        </span>
      ))}

      {totalActive > 1 && (
        <button className={styles.clearAll} onClick={onClearAll}>
          清除全部
        </button>
      )}
    </div>
  )
}
