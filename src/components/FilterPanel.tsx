'use client'

import type { Library, Collection, Article, Definition } from '@/types'
import CustomSelect from './CustomSelect'
import CustomMultiSelect from './CustomMultiSelect'
import styles from './FilterPanel.module.css'

export interface FilterState {
  library: string
  collection: string[]
  article: string[]
  definition: string
}

interface FilterPanelProps {
  filters: FilterState
  availableOptions: {
    libraries: Library[]
    collections: Collection[]
    articles: Article[]
    definitions: Definition[]
  }
  disabled: boolean
  onChange: (filters: FilterState) => void
}

export default function FilterPanel({
  filters,
  availableOptions,
  disabled,
  onChange,
}: FilterPanelProps) {
  const handleLibraryChange = (libraryId: string) => {
    onChange({
      library: libraryId,
      collection: [],
      article: [],
      definition: filters.definition,
    })
  }

  const handleCollectionChange = (collectionIds: string[]) => {
    onChange({
      ...filters,
      collection: collectionIds,
      article: [],
    })
  }

  const handleArticleChange = (articleIds: string[]) => {
    onChange({
      ...filters,
      article: articleIds,
    })
  }

  const handleDefinitionChange = (definitionId: string) => {
    onChange({
      ...filters,
      definition: definitionId,
    })
  }

  // 转换为 CustomSelect 需要的格式
  const libraryOptions = [
    { value: '', label: '所有库' },
    ...availableOptions.libraries.map(lib => ({ value: lib.id, label: lib.name }))
  ]

  const collectionOptions = [
    { value: '', label: '所有集' },
    ...availableOptions.collections.map(col => ({ value: col.id, label: col.name }))
  ]

  const articleOptions = [
    { value: '', label: '所有文章' },
    ...availableOptions.articles.map(art => ({ value: art.id, label: art.title }))
  ]

  const definitionOptions = [
    { value: '', label: '所有义项' },
    ...availableOptions.definitions.map(def => ({ value: def.id, label: def.content }))
  ]

  return (
    <div className={styles.filterPanel}>
      <CustomSelect
        value={filters.library}
        options={libraryOptions}
        placeholder="所有库"
        onChange={handleLibraryChange}
        disabled={disabled}
        aria-label="筛选库"
      />

      <CustomMultiSelect
        values={filters.collection}
        options={collectionOptions.filter(opt => opt.value !== '')}
        placeholder="所有集"
        onChange={handleCollectionChange}
        disabled={disabled}
        aria-label="筛选集"
      />

      <CustomMultiSelect
        values={filters.article}
        options={articleOptions.filter(opt => opt.value !== '')}
        placeholder="所有文章"
        onChange={handleArticleChange}
        disabled={disabled}
        aria-label="筛选文章"
      />

      {availableOptions.definitions.length > 0 && (
        <CustomSelect
          value={filters.definition}
          options={definitionOptions}
          placeholder="所有义项"
          onChange={handleDefinitionChange}
          disabled={disabled}
          aria-label="筛选义项"
        />
      )}
    </div>
  )
}
