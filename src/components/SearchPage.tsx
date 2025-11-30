'use client'

import { useState, useCallback, useEffect } from 'react'
import { SearchTool, highlightCharacter } from '@/tools/search'
import { StorageService } from '@/services/storage'
import { validateInput, getFirstValidCharacter } from '@/utils/validation'
import { useSearchOptions } from '@/hooks/useSearchOptions'
import ContextMenu from './ContextMenu'
import AddDefinitionDialog from './AddDefinitionDialog'
import AddTranslationDialog from './AddTranslationDialog'
import DefinitionTooltip from './DefinitionTooltip'
import FilterPanel, { type FilterState } from './FilterPanel'
import AdvancedMatchMenu from './AdvancedMatchMenu'
import ActiveFiltersIndicator from './ActiveFiltersIndicator'
import type { SearchResult, Definition } from '@/types'
import styles from './SearchPage.module.css'

interface SearchPageProps {
  storage: StorageService
}

interface SelectionState {
  selectedText: string
  sentenceText: string
  sentenceId: string
  startPosition: number
  endPosition: number
}

interface ContextMenuState {
  x: number
  y: number
  selection: SelectionState
  isSingleChar: boolean
}

interface TooltipState {
  x: number
  y: number
  definitions: Definition[]
}

export default function SearchPage({ storage }: SearchPageProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [allResults, setAllResults] = useState<SearchResult[]>([])
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  
  // 搜索选项（使用hook管理持久化）
  const [searchOptions, setSearchOptions] = useSearchOptions()
  
  // 筛选状态
  const [filters, setFilters] = useState<FilterState>({
    library: '',
    collection: [],
    article: [],
    definition: '',
  })
  
  // 选中状态
  const [currentSelection, setCurrentSelection] = useState<SelectionState | null>(null)
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  // 义项对话框状态
  const [showDefinitionDialog, setShowDefinitionDialog] = useState(false)
  // 翻译对话框状态
  const [showTranslationDialog, setShowTranslationDialog] = useState(false)
  // 悬停提示状态
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const handleSearch = () => {
    const validation = validateInput(input)
    
    if (!validation.isValid) {
      setError(validation.errorMessage || '')
      setAllResults([])
      setFilteredResults([])
      setHasSearched(false)
      return
    }

    setError('')
    const searchTool = new SearchTool(storage)
    
    try {
      const searchResults = searchTool.searchWithOptions(input, searchOptions)
      setAllResults(searchResults)
      setFilteredResults(searchResults)
      setHasSearched(true)
      
      // 重置筛选
      setFilters({
        library: '',
        collection: [],
        article: [],
        definition: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索出错')
      setAllResults([])
      setFilteredResults([])
    }
  }

  // 应用筛选
  const applyFilters = useCallback(() => {
    let filtered = [...allResults]

    // 按库筛选（单选）
    if (filters.library) {
      filtered = filtered.filter(r => r.library.id === filters.library)
    }

    // 按集筛选（多选）
    if (filters.collection.length > 0) {
      filtered = filtered.filter(r => filters.collection.includes(r.collection.id))
    }

    // 按文章筛选（多选）
    if (filters.article.length > 0) {
      filtered = filtered.filter(r => filters.article.includes(r.article.id))
    }

    // 按义项筛选
    if (filters.definition) {
      const searchChar = getFirstValidCharacter(input)
      const definitions = storage.getDefinitions().filter(d => d.character === searchChar)
      const targetDef = definitions.find(d => d.id === filters.definition)
      
      if (targetDef) {
        // 获取该义项的所有例句
        const links = storage.getDefinitionLinksForDefinition(targetDef.id)
        const sentenceIds = new Set(links.map(l => l.sentenceId))
        filtered = filtered.filter(r => sentenceIds.has(r.sentence.id))
      }
    }

    setFilteredResults(filtered)
  }, [allResults, filters, storage, input])

  // 当筛选条件或搜索选项改变时重新搜索
  useEffect(() => {
    if (hasSearched && input) {
      handleSearch()
    }
  }, [searchOptions])

  // 当筛选条件改变时应用筛选
  useEffect(() => {
    if (hasSearched) {
      applyFilters()
    }
  }, [filters, hasSearched, applyFilters])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // 获取可用的库列表
  const getAvailableLibraries = useCallback(() => {
    if (allResults.length > 0) {
      const libraries = new Map()
      allResults.forEach(r => {
        if (!libraries.has(r.library.id)) {
          libraries.set(r.library.id, r.library)
        }
      })
      return Array.from(libraries.values())
    }
    // 如果没有搜索结果，返回所有库
    return storage.getLibraries()
  }, [allResults, storage])

  // 获取可用的集列表
  const getAvailableCollections = useCallback(() => {
    if (allResults.length > 0) {
      const collections = new Map()
      const filtered = filters.library 
        ? allResults.filter(r => r.library.id === filters.library)
        : allResults
      
      filtered.forEach(r => {
        if (!collections.has(r.collection.id)) {
          collections.set(r.collection.id, r.collection)
        }
      })
      return Array.from(collections.values()).sort((a, b) => a.order - b.order)
    }
    // 如果没有搜索结果，返回所有集或选定库的集
    const libraries = storage.getLibraries()
    if (filters.library) {
      const lib = libraries.find(l => l.id === filters.library)
      return lib ? lib.collections : []
    }
    return libraries.flatMap(l => l.collections).sort((a, b) => a.order - b.order)
  }, [allResults, filters.library, storage])

  // 获取可用的文章列表
  const getAvailableArticles = useCallback(() => {
    if (allResults.length > 0) {
      const articles = new Map()
      let filtered = allResults
      
      if (filters.library) {
        filtered = filtered.filter(r => r.library.id === filters.library)
      }
      if (filters.collection.length > 0) {
        filtered = filtered.filter(r => filters.collection.includes(r.collection.id))
      }
      
      filtered.forEach(r => {
        if (!articles.has(r.article.id)) {
          articles.set(r.article.id, r.article)
        }
      })
      return Array.from(articles.values())
    }
    // 如果没有搜索结果，返回所有文章或选定集的文章
    const libraries = storage.getLibraries()
    let collections = libraries.flatMap(l => l.collections)
    
    if (filters.library) {
      const lib = libraries.find(l => l.id === filters.library)
      collections = lib ? lib.collections : []
    }
    if (filters.collection.length > 0) {
      collections = collections.filter(c => filters.collection.includes(c.id))
    }
    
    return collections.flatMap(c => c.articles)
  }, [allResults, filters.library, filters.collection, storage])

  // 获取可用的义项列表
  const getAvailableDefinitions = useCallback(() => {
    if (!input) return []
    const searchChar = getFirstValidCharacter(input)
    return storage.getDefinitions().filter(d => d.character === searchChar)
  }, [storage, input])

  // 处理字符选择
  const handleCharacterSelect = useCallback((selection: SelectionState) => {
    setCurrentSelection(selection)
  }, [])

  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, selection: SelectionState) => {
    e.preventDefault()
    const isSingleChar = selection.selectedText.length === 1
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      selection,
      isSingleChar,
    })
  }, [])

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // 打开义项对话框
  const openDefinitionDialog = useCallback(() => {
    if (contextMenu) {
      setCurrentSelection(contextMenu.selection)
      setShowDefinitionDialog(true)
      setContextMenu(null)
    }
  }, [contextMenu])

  // 打开翻译对话框
  const openTranslationDialog = useCallback(() => {
    if (contextMenu) {
      setCurrentSelection(contextMenu.selection)
      setShowTranslationDialog(true)
      setContextMenu(null)
    }
  }, [contextMenu])

  // 添加到现有义项
  const handleAddToExisting = useCallback((definitionId: string) => {
    if (!currentSelection) return

    storage.addCharacterDefinitionLink(
      definitionId,
      currentSelection.sentenceId,
      currentSelection.startPosition
    )
    storage.saveToLocal()

    setShowDefinitionDialog(false)
    setCurrentSelection(null)
    
    // 刷新搜索结果以更新义项标记
    if (hasSearched) {
      handleSearch()
    }
  }, [currentSelection, storage, hasSearched])

  // 添加新义项
  const handleAddNew = useCallback((content: string) => {
    if (!currentSelection) return

    const definition = storage.addDefinition(currentSelection.selectedText, content)
    storage.addCharacterDefinitionLink(
      definition.id,
      currentSelection.sentenceId,
      currentSelection.startPosition
    )
    storage.saveToLocal()

    setShowDefinitionDialog(false)
    setCurrentSelection(null)
    
    // 刷新搜索结果以更新义项标记
    if (hasSearched) {
      handleSearch()
    }
  }, [currentSelection, storage, hasSearched])

  // 添加翻译
  const handleAddTranslation = useCallback((translationText: string) => {
    if (!currentSelection) return

    const translation = storage.addTranslation(currentSelection.selectedText, translationText)
    storage.addSentenceTranslationLink(
      translation.id,
      currentSelection.sentenceId,
      currentSelection.startPosition,
      currentSelection.endPosition
    )
    storage.saveToLocal()

    setShowTranslationDialog(false)
    setCurrentSelection(null)
    
    // 刷新搜索结果
    if (hasSearched) {
      handleSearch()
    }
  }, [currentSelection, storage, hasSearched])

  // 获取字符的义项
  const getDefinitionsForCharacter = useCallback((char: string): Definition[] => {
    return storage.getDefinitions().filter(d => d.character === char)
  }, [storage])

  // 处理悬停显示义项
  const handleCharacterHover = useCallback((char: string, x: number, y: number) => {
    const definitions = getDefinitionsForCharacter(char)
    if (definitions.length > 0) {
      setTooltip({ x, y, definitions })
    }
  }, [getDefinitionsForCharacter])

  // 关闭悬停提示
  const closeTooltip = useCallback(() => {
    setTooltip(null)
  }, [])

  return (
    <div className={styles.searchPage}>
      {/* 搜索输入区域 */}
      <div className={styles.searchSection}>
        <div className={styles.searchControls}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={
              searchOptions.mode === 'regex'
                ? '输入正则表达式 (如: 不亦.*乎)'
                : searchOptions.mode === 'inverse'
                ? '输入要排除的字符或模式'
                : '请输入要查询的汉字...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          
          <div className={styles.controlsRight}>
            <AdvancedMatchMenu
              options={searchOptions}
              onOptionsChange={setSearchOptions}
            />
            
            <FilterPanel
              filters={filters}
              availableOptions={{
                libraries: getAvailableLibraries(),
                collections: getAvailableCollections(),
                articles: getAvailableArticles(),
                definitions: getAvailableDefinitions(),
              }}
              disabled={false}
              onChange={setFilters}
            />
            
            <button
              className={styles.searchButton}
              onClick={handleSearch}
              disabled={!input.trim()}
            >
              搜索
            </button>
          </div>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <ActiveFiltersIndicator
          filters={filters}
          options={searchOptions}
          onClearFilter={(key) => setFilters({ ...filters, [key]: '' })}
          onClearAll={() => {
            setFilters({ library: '', collection: [], article: [], definition: '' })
            setSearchOptions({ ...searchOptions, mode: 'normal' })
          }}
        />
      </div>

      {/* 搜索结果区域 */}
      {hasSearched && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>搜索结果 ({filteredResults.length})</h2>
          </div>
          
          {filteredResults.length > 0 ? (
            <div className={styles.resultsList}>
              {filteredResults.map((result, index) => (
                <ResultItem
                  key={`${result.sentence.id}-${index}`}
                  result={result}
                  storage={storage}
                  onCharacterSelect={handleCharacterSelect}
                  onContextMenu={handleContextMenu}
                  onCharacterHover={handleCharacterHover}
                  onCharacterLeave={closeTooltip}
                />
              ))}
            </div>
          ) : (
            <NoResults />
          )}
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isSingleChar={contextMenu.isSingleChar}
          onAddDefinition={contextMenu.isSingleChar ? openDefinitionDialog : undefined}
          onAddTranslation={!contextMenu.isSingleChar ? openTranslationDialog : undefined}
          onClose={closeContextMenu}
        />
      )}

      {/* 添加义项对话框 */}
      {showDefinitionDialog && currentSelection && (
        <AddDefinitionDialog
          character={currentSelection.selectedText}
          sentenceText={currentSelection.sentenceText}
          sentenceId={currentSelection.sentenceId}
          characterPosition={currentSelection.startPosition}
          existingDefinitions={getDefinitionsForCharacter(currentSelection.selectedText)}
          onAddToExisting={handleAddToExisting}
          onAddNew={handleAddNew}
          onClose={() => {
            setShowDefinitionDialog(false)
            setCurrentSelection(null)
          }}
        />
      )}

      {/* 添加翻译对话框 */}
      {showTranslationDialog && currentSelection && (
        <AddTranslationDialog
          originalText={currentSelection.selectedText}
          sentenceText={currentSelection.sentenceText}
          onSave={handleAddTranslation}
          onClose={() => {
            setShowTranslationDialog(false)
            setCurrentSelection(null)
          }}
        />
      )}

      {/* 悬停提示 */}
      {tooltip && (
        <DefinitionTooltip
          definitions={tooltip.definitions}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  )
}

interface ResultItemProps {
  result: SearchResult
  storage: StorageService
  onCharacterSelect: (selection: SelectionState) => void
  onContextMenu: (e: React.MouseEvent, selection: SelectionState) => void
  onCharacterHover: (char: string, x: number, y: number) => void
  onCharacterLeave: () => void
}

function ResultItem({
  result,
  storage,
  onCharacterSelect,
  onContextMenu,
  onCharacterHover,
  onCharacterLeave,
}: ResultItemProps) {
  // 获取有义项的字符位置
  const getCharactersWithDefinitions = (): Set<string> => {
    const chars = new Set<string>()
    const definitions = storage.getDefinitions()
    definitions.forEach(d => chars.add(d.character))
    return chars
  }

  const charsWithDefs = getCharactersWithDefinitions()

  // 渲染带有义项标记的文本
  const renderText = () => {
    const text = result.sentence.text
    const elements: JSX.Element[] = []

    // 检查字符是否在匹配范围内
    const isCharacterHighlighted = (charIndex: number): boolean => {
      // 对于单字符匹配（普通搜索）
      if (result.matchPositions.includes(charIndex)) {
        return true
      }
      
      // 对于多字符匹配（正则搜索）
      if (result.matchLengths) {
        for (let i = 0; i < result.matchPositions.length; i++) {
          const startPos = result.matchPositions[i]
          const length = result.matchLengths[i] || 1
          
          // 如果匹配长度等于整个句子长度，说明是全句匹配（如 ^(?!不).*知.*$）
          // 这种情况下不高亮，因为高亮整个句子没有意义
          if (length >= text.length) {
            return false
          }
          
          if (charIndex >= startPos && charIndex < startPos + length) {
            return true
          }
        }
      }
      
      return false
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const isHighlighted = isCharacterHighlighted(i)
      const hasDefinition = charsWithDefs.has(char)

      elements.push(
        <span
          key={i}
          className={`${styles.char} ${isHighlighted ? styles.highlighted : ''} ${hasDefinition ? styles.hasDefinition : ''}`}
          data-position={i}
          onMouseEnter={(e) => {
            if (hasDefinition) {
              const rect = e.currentTarget.getBoundingClientRect()
              onCharacterHover(char, rect.left, rect.top)
            }
          }}
          onMouseLeave={onCharacterLeave}
          onContextMenu={(e) => {
            e.preventDefault()
            
            // 检查是否有选中的文本
            const selection = window.getSelection()
            const selectedText = selection?.toString() || char
            
            // 计算选中文本的起始和结束位置
            let startPos = i
            let endPos = i
            
            if (selectedText.length > 1) {
              const textBeforeSelection = text.substring(0, i)
              startPos = text.indexOf(selectedText, Math.max(0, textBeforeSelection.length - selectedText.length))
              if (startPos === -1) startPos = i
              endPos = startPos + selectedText.length - 1
            }
            
            const selectionState: SelectionState = {
              selectedText,
              sentenceText: text,
              sentenceId: result.sentence.id,
              startPosition: startPos,
              endPosition: endPos,
            }
            
            onCharacterSelect(selectionState)
            onContextMenu(e, selectionState)
          }}
        >
          {char}
        </span>
      )
    }

    return elements
  }

  return (
    <div className={styles.resultItem}>
      <div className={styles.sentenceText}>{renderText()}</div>
      
      <div className={styles.metadata}>
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>文章：</span>
          <span>{result.article.title}</span>
        </div>
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>集：</span>
          <span>{result.collection.name}</span>
        </div>
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>库：</span>
          <span>{result.library.name}</span>
        </div>
      </div>
    </div>
  )
}

function NoResults() {
  return (
    <div className={styles.noResults}>
      <div className={styles.noResultsIcon}>📚</div>
      <p className={styles.noResultsText}>未找到相关结果</p>
    </div>
  )
}
