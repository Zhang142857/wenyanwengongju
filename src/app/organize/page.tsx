'use client'

import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/Layout'
import MindMapCanvas from '@/components/MindMapCanvas'
import { StorageService } from '@/services/storage'
import { MindMapService, type MindMapData } from '@/services/mindmap'
import { configService } from '@/services/configService'
import { useToast } from '@/contexts/ToastContext'
import type { Library } from '@/types'
import styles from './organize.module.css'

export default function OrganizePage() {
  const [storage] = useState(() => new StorageService())
  const [mindMapService] = useState(() => new MindMapService(storage))
  const [isInitialized, setIsInitialized] = useState(false)
  const toast = useToast()

  // 范围选择
  const [libraries, setLibraries] = useState<Library[]>([])
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('')
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [selectedArticleId, setSelectedArticleId] = useState<string>('')

  // 字符选择
  const [character, setCharacter] = useState('')
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null)
  const [availableCharacters, setAvailableCharacters] = useState<string[]>([])
  
  // 全屏和编辑模式
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // 是否已初始化自动筛选
  const autoFilterInitialized = useRef(false)

  useEffect(() => {
    const initStorage = async () => {
      await storage.initialize()
      const libs = storage.getLibraries()
      setLibraries(libs)

      // 获取所有有义项的字符
      const definitions = storage.getDefinitions()
      const chars = Array.from(new Set(definitions.map(d => d.character))).sort()
      setAvailableCharacters(chars)

      // 应用自动筛选设置
      if (!autoFilterInitialized.current) {
        await configService.initialize()
        const autoFilterConfig = configService.getAutoFilterConfig()
        
        if (autoFilterConfig.enabled && autoFilterConfig.defaultLibraryId) {
          const libraryExists = libs.some(lib => lib.id === autoFilterConfig.defaultLibraryId)
          if (libraryExists) {
            setSelectedLibraryId(autoFilterConfig.defaultLibraryId)
          }
        }
        autoFilterInitialized.current = true
      }

      setIsInitialized(true)
    }
    initStorage()
  }, [storage])

  const handleGenerateMindMap = async () => {
    if (!character.trim()) {
      toast.warning('请输入要查看的字')
      return
    }

    // 重新从 localStorage 加载最新数据，确保能看到其他页面保存的义项
    await storage.initialize()
    
    // 更新可用字符列表
    const definitions = storage.getDefinitions()
    const chars = Array.from(new Set(definitions.map(d => d.character))).sort()
    setAvailableCharacters(chars)

    const scope = {
      libraryId: selectedLibraryId || undefined,
      collectionId: selectedCollectionId || undefined,
      articleId: selectedArticleId || undefined,
    }

    const data = mindMapService.generateMindMap(character, scope)

    if (data.nodes.length === 1) {
      toast.warning(`字"${character}"在选定范围内没有义项或例句`)
      return
    }

    toast.success('思维导图生成成功')
    setMindMapData(data)
  }

  const handleSaveMindMap = () => {
    if (mindMapData) {
      mindMapService.saveMindMap(mindMapData)
      toast.success('思维导图已保存')
    }
  }

  if (!isInitialized) {
    return (
      <Layout title="义项整理" subtitle="Definition Organization">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>加载中...</p>
        </div>
      </Layout>
    )
  }

  const selectedLibrary = libraries.find(lib => lib.id === selectedLibraryId)
  const collections = selectedLibrary?.collections || []
  const selectedCollection = collections.find(col => col.id === selectedCollectionId)
  const articles = selectedCollection?.articles || []

  return (
    <Layout title="义项整理" subtitle="Definition Organization" fullWidth={true}>
      <div className={styles.container}>
        {!isFullscreen && <div className={styles.sidebar}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>生成思维导图</h3>

            {/* 字符输入 */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>选择字符：</label>
              <input
                type="text"
                className={styles.input}
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
                placeholder="输入一个字"
                maxLength={1}
              />
            </div>

            {/* 范围选择 */}
            <div className={styles.scopeSection}>
              <label className={styles.label}>查看范围（可选）：</label>

              <select
                className={styles.select}
                value={selectedLibraryId}
                onChange={(e) => {
                  setSelectedLibraryId(e.target.value)
                  setSelectedCollectionId('')
                  setSelectedArticleId('')
                }}
              >
                <option value="">全部库</option>
                {libraries.map(lib => (
                  <option key={lib.id} value={lib.id}>{lib.name}</option>
                ))}
              </select>

              {selectedLibraryId && (
                <select
                  className={styles.select}
                  value={selectedCollectionId}
                  onChange={(e) => {
                    setSelectedCollectionId(e.target.value)
                    setSelectedArticleId('')
                  }}
                >
                  <option value="">全部集</option>
                  {collections.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              )}

              {selectedCollectionId && (
                <select
                  className={styles.select}
                  value={selectedArticleId}
                  onChange={(e) => setSelectedArticleId(e.target.value)}
                >
                  <option value="">全部文章</option>
                  {articles.map(art => (
                    <option key={art.id} value={art.id}>{art.title}</option>
                  ))}
                </select>
              )}
            </div>

            <button
              className={styles.generateBtn}
              onClick={handleGenerateMindMap}
            >
              生成思维导图
            </button>

            {/* 字符列表 */}
            <div className={styles.charList}>
              <p className={styles.charListTitle}>可用字符 ({availableCharacters.length})：</p>
              <div className={styles.charGrid}>
                {availableCharacters.map(char => (
                  <button
                    key={char}
                    className={`${styles.charBtn} ${character === char ? styles.charBtnActive : ''}`}
                    onClick={() => setCharacter(char)}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {mindMapData && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>统计信息</h3>
              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>义项数：</span>
                  <span className={styles.statValue}>
                    {mindMapData.nodes.filter(n => n.type === 'definition').length}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>例句数：</span>
                  <span className={styles.statValue}>
                    {mindMapData.nodes.filter(n => n.type === 'example').length}
                  </span>
                </div>
                {mindMapData.scope && (
                  <div className={styles.scopeInfo}>
                    <p className={styles.scopeLabel}>当前范围：</p>
                    {mindMapData.scope.articleId && (
                      <p className={styles.scopeValue}>
                        文章: {articles.find(a => a.id === mindMapData.scope?.articleId)?.title}
                      </p>
                    )}
                    {mindMapData.scope.collectionId && !mindMapData.scope.articleId && (
                      <p className={styles.scopeValue}>
                        集: {collections.find(c => c.id === mindMapData.scope?.collectionId)?.name}
                      </p>
                    )}
                    {mindMapData.scope.libraryId && !mindMapData.scope.collectionId && (
                      <p className={styles.scopeValue}>
                        库: {libraries.find(l => l.id === mindMapData.scope?.libraryId)?.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                className={styles.saveBtn}
                onClick={handleSaveMindMap}
              >
                保存思维导图
              </button>
            </div>
          )}
        </div>}

        <div className={`${styles.mainContent} ${isFullscreen ? styles.fullscreen : ''}`}>
          {mindMapData ? (
            <MindMapCanvas
              data={mindMapData}
              isFullscreen={isFullscreen}
              isEditMode={isEditMode}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              onToggleEditMode={() => setIsEditMode(!isEditMode)}
              onExportPNG={() => console.log('PNG导出完成')}
              onDataChange={(newData) => setMindMapData(newData)}
            />
          ) : (
            <div className={styles.placeholder}>
              <div className={styles.placeholderContent}>
                <h2>👈 选择字符生成思维导图</h2>
                <p>1. 选择查看范围（可选）</p>
                <p>2. 输入或点击一个字</p>
                <p>3. 点击"生成思维导图"</p>
                <p>4. 使用鼠标拖动和滚轮缩放查看</p>
                <p>5. 点击"导出PNG"保存图片</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
