'use client'

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
        <span key={mode} className={styles.modeBadge}>
          {mode}
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
