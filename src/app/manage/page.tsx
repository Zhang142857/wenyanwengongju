'use client'

import { useEffect, useState, useRef } from 'react'
import Layout from '@/components/Layout'
import { StorageService } from '@/services/storage'
import { batchExtractShortSentences } from '@/services/shortSentence'
import { useToast } from '@/contexts/ToastContext'
import { PlusIcon, SaveIcon, CloseIcon, EditIcon, LibraryIcon, CollectionIcon, ArticleIcon } from '@/components/Icons'
import type { Library, Collection, Article, Definition, ShortSentence } from '@/types'
import type { ShortSentenceRequest } from '@/services/shortSentence'
import styles from './manage.module.css'

type ContextMenuType = 'library' | 'collection' | 'article' | null

export default function ManagePage() {
  const [storage] = useState(() => new StorageService())
  const toast = useToast()
  const [libraries, setLibraries] = useState<Library[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  
  // 义项库状态
  const [definitions, setDefinitions] = useState<Definition[]>([])
  const [editingDefId, setEditingDefId] = useState<string | null>(null)
  const [editDefContent, setEditDefContent] = useState('')
  const [defSearchTerm, setDefSearchTerm] = useState('')
  
  // 短句库状态
  const [shortSentences, setShortSentences] = useState<ShortSentence[]>([])
  const [isGeneratingShort, setIsGeneratingShort] = useState(false)
  const [shortProgress, setShortProgress] = useState({ current: 0, total: 0 })
  const [shortSearchTerm, setShortSearchTerm] = useState('')
  
  // 短句生成统计
  const [shortStats, setShortStats] = useState({
    speed: 0,
    startTime: 0,
    elapsed: 0,
    totalGenerated: 0,
  })
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: ContextMenuType
    data: Library | Collection | Article | null
  } | null>(null)
  
  // 下拉菜单状态
  const [showLibraryMenu, setShowLibraryMenu] = useState(false)
  const [showCollectionMenu, setShowCollectionMenu] = useState(false)
  const [showArticleMenu, setShowArticleMenu] = useState(false)
  
  // 重命名状态
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState('')
  const [renamingType, setRenamingType] = useState<'library' | 'collection' | 'article' | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
    
    // 点击或右键其他地方关闭菜单和完成重命名
    const closeMenus = () => {
      setContextMenu(null)
      setShowLibraryMenu(false)
      setShowCollectionMenu(false)
      setShowArticleMenu(false)
      if (renamingId) {
        finishRenaming()
      }
    }
    
    document.addEventListener('click', closeMenus)
    document.addEventListener('contextmenu', closeMenus)
    
    return () => {
      document.removeEventListener('click', closeMenus)
      document.removeEventListener('contextmenu', closeMenus)
    }
  }, [renamingId, renamingValue, renamingType])

  const loadData = async () => {
    await storage.initialize()
    setLibraries(storage.getLibraries())
    setDefinitions(storage.getDefinitions())
    setShortSentences(storage.getShortSentences())
  }

  const addLibrary = () => {
    const count = libraries.length + 1
    const tempName = `未命名的库_${count}`
    const lib = storage.addLibrary(tempName)
    storage.saveToLocal()
    loadData()
    
    // 进入重命名模式
    setRenamingId(lib.id)
    setRenamingValue(tempName)
    setRenamingType('library')
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  const addCollection = () => {
    if (!selectedLibrary) {
      toast.warning('请先选择一个库')
      return
    }
    const count = selectedLibrary.collections.length + 1
    const tempName = `未命名的集_${count}`
    const order = selectedLibrary.collections.length + 1
    const col = storage.addCollection(selectedLibrary.id, tempName, order)
    storage.saveToLocal()
    loadData()
    
    // 进入重命名模式
    setRenamingId(col.id)
    setRenamingValue(tempName)
    setRenamingType('collection')
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  const addArticle = () => {
    if (!selectedCollection) {
      toast.warning('请先选择一个集')
      return
    }
    const count = selectedCollection.articles.length + 1
    const tempTitle = `未命名的文章_${count}`
    const art = storage.addArticle(selectedCollection.id, {
      title: tempTitle,
      content: '',
      collectionId: selectedCollection.id,
    })
    storage.saveToLocal()
    loadData()
    
    // 进入重命名模式
    setRenamingId(art.id)
    setRenamingValue(tempTitle)
    setRenamingType('article')
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  // 完成重命名
  const finishRenaming = () => {
    if (!renamingId || !renamingValue.trim()) {
      setRenamingId(null)
      loadData()
      return
    }

    if (renamingType === 'library') {
      const lib = libraries.find(l => l.id === renamingId)
      if (lib) {
        lib.name = renamingValue
        storage.saveToLocal()
      }
    } else if (renamingType === 'collection' && selectedLibrary) {
      const col = selectedLibrary.collections.find(c => c.id === renamingId)
      if (col) {
        col.name = renamingValue
        storage.saveToLocal()
      }
    } else if (renamingType === 'article' && selectedCollection) {
      const art = selectedCollection.articles.find(a => a.id === renamingId)
      if (art) {
        art.title = renamingValue
        storage.saveToLocal()
      }
    }

    setRenamingId(null)
    loadData()
  }

  // 删除
  const deleteItem = (type: 'library' | 'collection' | 'article', id: string) => {
    if (!confirm(`确定要删除吗？`)) return

    if (type === 'library') {
      const index = libraries.findIndex(l => l.id === id)
      if (index > -1) {
        libraries.splice(index, 1)
        storage.saveToLocal()
        setSelectedLibrary(null)
        setSelectedCollection(null)
        setSelectedArticle(null)
      }
    } else if (type === 'collection' && selectedLibrary) {
      const index = selectedLibrary.collections.findIndex(c => c.id === id)
      if (index > -1) {
        selectedLibrary.collections.splice(index, 1)
        storage.saveToLocal()
        setSelectedCollection(null)
        setSelectedArticle(null)
      }
    } else if (type === 'article' && selectedCollection) {
      const index = selectedCollection.articles.findIndex(a => a.id === id)
      if (index > -1) {
        selectedCollection.articles.splice(index, 1)
        storage.saveToLocal()
        setSelectedArticle(null)
      }
    }

    loadData()
    setContextMenu(null)
  }

  // 渲染列表项（支持重命名）
  const renderListItem = (item: Library | Collection | Article, type: 'library' | 'collection' | 'article', isSelected: boolean, onClick: () => void) => {
    const isRenaming = renamingId === item.id && renamingType === type
    const displayName = type === 'article' ? (item as Article).title : (item as any).name

    return (
      <div
        key={item.id}
        className={`${styles.listItem} ${isSelected ? styles.active : ''}`}
        onClick={onClick}
        onContextMenu={(e) => handleContextMenu(e, type, item)}
      >
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            className={styles.renameInput}
            value={renamingValue}
            onChange={(e) => setRenamingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishRenaming()
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div className={styles.itemContent}>
              {type === 'library' && <LibraryIcon className={styles.itemIcon} />}
              {type === 'collection' && <CollectionIcon className={styles.itemIcon} />}
              {type === 'article' && <ArticleIcon className={styles.itemIcon} />}
              <span>{displayName}</span>
            </div>
            {type === 'article' && (
              <button
                className={styles.editBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  editArticle(item as Article)
                }}
              >
                <EditIcon />
              </button>
            )}
            <div className={styles.tooltip}>{displayName}</div>
          </>
        )}
      </div>
    )
  }

  const editArticle = (article: Article) => {
    setSelectedArticle(article)
    setEditContent(article.content)
    setIsEditing(true)
  }

  const saveArticle = () => {
    if (selectedArticle) {
      selectedArticle.content = editContent
      storage.saveToLocal()
      setIsEditing(false)
      loadData()
      toast.success('保存成功！')
    }
  }

  // 导出功能
  const exportLibrary = (lib: Library) => {
    const dataStr = JSON.stringify(lib, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${lib.name}_库.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportCollection = (col: Collection) => {
    const dataStr = JSON.stringify(col, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${col.name}_集.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportArticle = (art: Article) => {
    const dataStr = JSON.stringify(art, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${art.title}_文章.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 导入功能
  const importLibrary = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const lib = JSON.parse(e.target?.result as string) as Library
        if (!lib.collections || !Array.isArray(lib.collections)) {
          toast.error('文件格式错误：不是有效的库文件')
          return
        }
        storage.addLibrary(lib.name)
        const newLib = storage.getLibraries().find(l => l.name === lib.name)
        if (newLib) {
          lib.collections.forEach(col => {
            storage.addCollection(newLib.id, col.name, col.order)
            const newCol = newLib.collections.find(c => c.name === col.name)
            if (newCol) {
              col.articles.forEach(art => {
                storage.addArticle(newCol.id, {
                  title: art.title,
                  content: art.content,
                  collectionId: newCol.id
                })
              })
            }
          })
        }
        storage.saveToLocal()
        loadData()
        toast.success('导入成功！')
      } catch (error) {
        toast.error('导入失败：文件格式错误')
      }
    }
    reader.readAsText(file)
  }

  const importCollection = (file: File) => {
    if (!selectedLibrary) {
      toast.warning('请先选择一个库')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const col = JSON.parse(e.target?.result as string) as Collection
        if (!col.articles || !Array.isArray(col.articles)) {
          toast.error('文件格式错误：不是有效的集文件')
          return
        }
        const order = selectedLibrary.collections.length + 1
        storage.addCollection(selectedLibrary.id, col.name, order)
        const newCol = selectedLibrary.collections.find(c => c.name === col.name)
        if (newCol) {
          col.articles.forEach(art => {
            storage.addArticle(newCol.id, {
              title: art.title,
              content: art.content,
              collectionId: newCol.id
            })
          })
        }
        storage.saveToLocal()
        loadData()
        toast.success('导入成功！')
      } catch (error) {
        toast.error('导入失败：文件格式错误')
      }
    }
    reader.readAsText(file)
  }

  const importArticle = (file: File) => {
    if (!selectedCollection) {
      toast.warning('请先选择一个集')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const art = JSON.parse(e.target?.result as string) as Article
        if (!art.title || !art.content) {
          toast.error('文件格式错误：不是有效的文章文件')
          return
        }
        storage.addArticle(selectedCollection.id, {
          title: art.title,
          content: art.content,
          collectionId: selectedCollection.id
        })
        storage.saveToLocal()
        loadData()
        toast.success('导入成功！')
      } catch (error) {
        toast.error('导入失败：文件格式错误')
      }
    }
    reader.readAsText(file)
  }

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, type: ContextMenuType, data: Library | Collection | Article) => {
    e.preventDefault()
    e.stopPropagation()
    // 使用 setTimeout 确保在全局关闭事件之后执行
    setTimeout(() => {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type,
        data
      })
    }, 0)
  }

  const handleExport = () => {
    if (!contextMenu) return
    
    switch (contextMenu.type) {
      case 'library':
        exportLibrary(contextMenu.data as Library)
        break
      case 'collection':
        exportCollection(contextMenu.data as Collection)
        break
      case 'article':
        exportArticle(contextMenu.data as Article)
        break
    }
    setContextMenu(null)
  }

  // ========== 义项库管理函数 ==========
  const handleEditDefinition = (def: Definition) => {
    setEditingDefId(def.id)
    setEditDefContent(def.content)
  }

  const handleSaveDefinition = async () => {
    if (editingDefId && editDefContent.trim()) {
      storage.updateDefinition(editingDefId, editDefContent.trim())
      await storage.saveToLocal()
      setEditingDefId(null)
      loadData()
    }
  }

  const handleCancelDefinition = () => {
    setEditingDefId(null)
    setEditDefContent('')
  }

  const handleDeleteDefinition = async (id: string) => {
    if (confirm('确定要删除这个义项吗？')) {
      storage.deleteDefinition(id)
      await storage.saveToLocal()
      loadData()
    }
  }

  // ========== 短句库管理函数 ==========
  const handleGenerateShortSentences = async () => {
    if (!confirm('这将清空现有短句库并重新生成，确定继续吗？')) {
      return
    }

    setIsGeneratingShort(true)
    setShortProgress({ current: 0, total: 0 })
    setShortStats({ speed: 0, startTime: 0, elapsed: 0, totalGenerated: 0 })

    try {
      const libraries = storage.getLibraries()
      const requests: ShortSentenceRequest[] = []

      for (const library of libraries) {
        for (const collection of library.collections) {
          for (const article of collection.articles) {
            for (const sentence of article.sentences) {
              requests.push({
                sentence: sentence.text,
                articleId: article.id,
                sentenceId: sentence.id,
              })
            }
          }
        }
      }

      if (requests.length === 0) {
        toast.warning('没有找到任何句子，请先导入文言文库')
        setIsGeneratingShort(false)
        return
      }

      storage.clearShortSentences()

      const results = await batchExtractShortSentences(requests, (current, total, stats) => {
        setShortProgress({ current, total })
        
        if (stats) {
          const elapsed = (Date.now() - stats.startTime) / 1000
          setShortStats({
            speed: stats.speed,
            startTime: stats.startTime,
            elapsed,
            totalGenerated: stats.totalGenerated,
          })
        }
      })

      for (const result of results) {
        for (const shortText of result.shortSentences) {
          storage.addShortSentence(shortText, result.sourceArticleId, result.sourceSentenceId)
        }
      }

      await storage.saveToLocal()
      loadData()
      toast.success(`成功生成 ${storage.getShortSentences().length} 个短句！`)
    } catch (error) {
      console.error('生成失败:', error)
      toast.error('生成失败，请查看控制台')
    } finally {
      setIsGeneratingShort(false)
    }
  }

  const handleDeleteShortSentence = async (id: string) => {
    if (confirm('确定要删除这个短句吗？')) {
      storage.deleteShortSentence(id)
      await storage.saveToLocal()
      loadData()
    }
  }

  const handleClearAllDefinitions = async () => {
    if (!confirm('确定要清除所有义项吗？这将删除所有义项、关联和短句，此操作无法撤销！')) {
      return
    }
    
    if (!confirm('再次确认：真的要清除所有义项吗？')) {
      return
    }

    storage.clearAllDefinitions()
    await storage.saveToLocal()
    loadData()
    toast.success('已清除所有义项')
  }

  // 库类型选择状态
  const [selectedLibType, setSelectedLibType] = useState<'text' | 'definition' | 'short'>('text')

  return (
    <Layout title="编辑库" subtitle="管理文言文库、集和文章" fullWidth>
      <div className={styles.container}>
        {/* 左侧：统一的库列表 */}
        <div className={styles.leftPanel}>
          <div className={styles.libTypeSelector}>
            <button 
              className={`${styles.libTypeBtn} ${selectedLibType === 'text' ? styles.active : ''}`}
              onClick={() => {
                setSelectedLibType('text')
                setSelectedLibrary(null)
                setSelectedCollection(null)
                setSelectedArticle(null)
              }}
            >
              文言文库
            </button>
            <button 
              className={`${styles.libTypeBtn} ${selectedLibType === 'definition' ? styles.active : ''}`}
              onClick={() => setSelectedLibType('definition')}
            >
              义项库
            </button>
            <button 
              className={`${styles.libTypeBtn} ${selectedLibType === 'short' ? styles.active : ''}`}
              onClick={() => setSelectedLibType('short')}
            >
              短句库
            </button>
          </div>

          {/* 文言文库视图 */}
          {selectedLibType === 'text' && (
            <div className={styles.listsContainer}>
              {/* 库列表 */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>库</h3>
                  <div className={styles.addBtnContainer}>
                    <button 
                      className={styles.addBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTimeout(() => setShowLibraryMenu(!showLibraryMenu), 0)
                      }}
                    >
                      <PlusIcon className={styles.addBtnIcon} />
                    </button>
                    {showLibraryMenu && (
                      <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { addLibrary(); setShowLibraryMenu(false) }}>新建</button>
                        <button onClick={() => { fileInputRef.current?.click(); setShowLibraryMenu(false) }}>导入</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.list}>
                  {libraries.map((lib) => renderListItem(lib, 'library', selectedLibrary?.id === lib.id, () => {
                    setSelectedLibrary(lib)
                    setSelectedCollection(null)
                    setSelectedArticle(null)
                  }))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) importLibrary(file)
                    e.target.value = ''
                  }}
                />
              </div>

              {/* 集列表 */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>集</h3>
                  <div className={styles.addBtnContainer}>
                    <button 
                      className={styles.addBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTimeout(() => setShowCollectionMenu(!showCollectionMenu), 0)
                      }}
                      disabled={!selectedLibrary}
                    >
                      <PlusIcon className={styles.addBtnIcon} />
                    </button>
                    {showCollectionMenu && selectedLibrary && (
                      <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { addCollection(); setShowCollectionMenu(false) }}>新建</button>
                        <button onClick={() => { 
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = '.json'
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0]
                            if (file) importCollection(file)
                          }
                          input.click()
                          setShowCollectionMenu(false)
                        }}>导入</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.list}>
                  {selectedLibrary?.collections.map((col) => renderListItem(col, 'collection', selectedCollection?.id === col.id, () => {
                    setSelectedCollection(col)
                    setSelectedArticle(null)
                  }))}
                </div>
              </div>

              {/* 文章列表 */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>文章</h3>
                  <div className={styles.addBtnContainer}>
                    <button 
                      className={styles.addBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTimeout(() => setShowArticleMenu(!showArticleMenu), 0)
                      }}
                      disabled={!selectedCollection}
                    >
                      <PlusIcon className={styles.addBtnIcon} />
                    </button>
                    {showArticleMenu && selectedCollection && (
                      <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { addArticle(); setShowArticleMenu(false) }}>新建</button>
                        <button onClick={() => { 
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = '.json'
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0]
                            if (file) importArticle(file)
                          }
                          input.click()
                          setShowArticleMenu(false)
                        }}>导入</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.list}>
                  {selectedCollection?.articles.map((art) => renderListItem(art, 'article', selectedArticle?.id === art.id, () => setSelectedArticle(art)))}
                </div>
              </div>
            </div>
          )}

          {/* 义项库视图 */}
          {selectedLibType === 'definition' && (
            <div className={styles.singleLibView}>
              <div className={styles.libViewHeader}>
                <h3 className={styles.libViewTitle}>义项库</h3>
                <div className={styles.libViewActions}>
                  <button 
                    className={styles.clearBtn}
                    onClick={handleClearAllDefinitions}
                    title="清除所有义项"
                  >
                    清除全部
                  </button>
                  <div className={styles.libViewStats}>
                    共 {definitions.length} 项
                  </div>
                </div>
              </div>
              <input
                type="text"
                className={styles.searchBox}
                placeholder="搜索义项..."
                value={defSearchTerm}
                onChange={(e) => setDefSearchTerm(e.target.value)}
              />
              <div className={styles.libViewList}>
                {definitions
                  .filter(def => 
                    def.character.includes(defSearchTerm) || 
                    def.content.includes(defSearchTerm)
                  )
                  .map((def) => (
                    <div key={def.id} className={styles.defItem}>
                      {editingDefId === def.id ? (
                        <div className={styles.editForm}>
                          <input
                            type="text"
                            className={styles.editInput}
                            value={editDefContent}
                            onChange={(e) => setEditDefContent(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveDefinition()
                              if (e.key === 'Escape') handleCancelDefinition()
                            }}
                          />
                          <div className={styles.editActions}>
                            <button onClick={handleSaveDefinition} className={styles.saveBtn}>
                              <SaveIcon />
                            </button>
                            <button onClick={handleCancelDefinition} className={styles.cancelBtn}>
                              <CloseIcon />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.defContent}>
                            <span className={styles.defChar}>{def.character}</span>
                            <span className={styles.defText}>{def.content}</span>
                          </div>
                          <div className={styles.defActions}>
                            <button onClick={() => handleEditDefinition(def)} className={styles.editBtn}>
                              <EditIcon />
                            </button>
                            <button onClick={() => handleDeleteDefinition(def.id)} className={styles.deleteBtn}>
                              ×
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                {definitions.filter(def => 
                  def.character.includes(defSearchTerm) || 
                  def.content.includes(defSearchTerm)
                ).length === 0 && (
                  <div className={styles.emptyText}>暂无义项</div>
                )}
              </div>
            </div>
          )}

          {/* 短句库视图 */}
          {selectedLibType === 'short' && (
            <div className={styles.singleLibView}>
              <div className={styles.libViewHeader}>
                <h3 className={styles.libViewTitle}>短句库</h3>
                <div className={styles.libViewActions}>
                  <button 
                    className={styles.generateBtn}
                    onClick={handleGenerateShortSentences}
                    disabled={isGeneratingShort}
                    title="AI重新生成"
                  >
                    {isGeneratingShort ? '生成中...' : 'AI生成'}
                  </button>
                  <div className={styles.libViewStats}>
                    共 {shortSentences.length} 句
                  </div>
                </div>
              </div>
              <input
                type="text"
                className={styles.searchBox}
                placeholder="搜索短句..."
                value={shortSearchTerm}
                onChange={(e) => setShortSearchTerm(e.target.value)}
              />
              {isGeneratingShort && (
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressTitle}>⏳ 正在生成短句...</span>
                    <span className={styles.progressSpeed}>{shortStats.speed.toFixed(1)} req/s</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${shortProgress.total > 0 ? (shortProgress.current / shortProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className={styles.progressStats}>
                    <span>进度：{shortProgress.current}/{shortProgress.total}</span>
                    <span>已生成：{shortStats.totalGenerated} 个短句</span>
                    <span>已用时：{shortStats.elapsed.toFixed(1)}秒</span>
                  </div>
                </div>
              )}
              <div className={styles.libViewList}>
                {shortSentences
                  .filter(s => s.text.includes(shortSearchTerm))
                  .map((sentence) => (
                    <div key={sentence.id} className={styles.shortItem}>
                      <span className={styles.shortText}>{sentence.text}</span>
                      <button
                        onClick={() => handleDeleteShortSentence(sentence.id)}
                        className={styles.deleteBtn}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                {shortSentences.filter(s => s.text.includes(shortSearchTerm)).length === 0 && !isGeneratingShort && (
                  <div className={styles.emptyText}>暂无短句</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：编辑/预览区域 */}
        <div className={styles.rightPanel}>
          {/* 编辑器 */}
          {isEditing && selectedArticle && (
            <div className={styles.editor}>
              <div className={styles.editorHeader}>
                <h3>编辑：{selectedArticle.title}</h3>
                <div className={styles.editorActions}>
                  <button onClick={saveArticle} className={styles.saveBtn}>
                    <SaveIcon className={styles.btnIcon} />
                    <span>保存</span>
                  </button>
                  <button onClick={() => setIsEditing(false)} className={styles.cancelBtn}>
                    <CloseIcon className={styles.btnIcon} />
                    <span>取消</span>
                  </button>
                </div>
              </div>
              <textarea
                className={styles.textarea}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="请输入文章内容..."
              />
            </div>
          )}

          {/* 预览 */}
          {!isEditing && selectedArticle && (
            <div className={styles.preview}>
              <h3 className={styles.previewTitle}>{selectedArticle.title}</h3>
              <p className={styles.previewContent}>{selectedArticle.content}</p>
            </div>
          )}

          {/* 空状态 */}
          {!selectedArticle && (
            <div className={styles.emptyState}>
              <p>请从左侧选择一篇文章</p>
            </div>
          )}


        </div>

        {/* 右键菜单 */}
        {contextMenu && (
          <div 
            className={styles.contextMenu}
            style={{ 
              left: contextMenu.x, 
              top: contextMenu.y 
            }}
          >
            <button onClick={(e) => {
              e.stopPropagation()
              setRenamingId(contextMenu.data?.id || null)
              setRenamingValue(contextMenu.type === 'article' ? (contextMenu.data as Article)?.title || '' : (contextMenu.data as any)?.name || '')
              setRenamingType(contextMenu.type)
              setContextMenu(null)
              setTimeout(() => renameInputRef.current?.focus(), 0)
            }}>
              重命名
            </button>
            <button onClick={(e) => {
              e.stopPropagation()
              deleteItem(contextMenu.type as any, contextMenu.data?.id || '')
            }}>
              删除
            </button>
            <button onClick={(e) => {
              e.stopPropagation()
              handleExport()
            }}>
              导出{contextMenu.type === 'library' ? '库' : contextMenu.type === 'collection' ? '集' : '文章'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
