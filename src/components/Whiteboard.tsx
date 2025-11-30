'use client'

import { useState, useEffect } from 'react'
import { CloseIcon, SaveIcon } from './Icons'
import { StorageService } from '@/services/storage'
import { MindMapService, MindMapData } from '@/services/mindmap'
import MindMapCanvas from './MindMapCanvas'
import styles from './Whiteboard.module.css'

interface WhiteboardProps {
  character: string
  storage: StorageService
  onExit: () => void
}

export default function Whiteboard({ character, storage, onExit }: WhiteboardProps) {
  const [mindMapService] = useState(() => new MindMapService(storage))
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 尝试加载已保存的思维导图
    let data = mindMapService.loadMindMap(character)

    // 如果没有保存的数据，生成新的思维导图
    if (!data) {
      data = mindMapService.generateMindMap(character)
    }

    setMindMapData(data)
    setIsLoading(false)
  }, [character, mindMapService])

  const handleSave = () => {
    if (mindMapData) {
      mindMapService.saveMindMap(mindMapData)
      alert('保存成功！')
    }
  }

  const handleNodeMove = (nodeId: string, position: { x: number; y: number }) => {
    if (!mindMapData) return

    mindMapService.updateNodePosition(mindMapData, nodeId, position)
    setMindMapData({ ...mindMapData })
  }

  return (
    <div className={styles.whiteboard}>
      <div className={styles.header}>
        <button className={styles.exitButton} onClick={onExit} aria-label="退出白板模式">
          <CloseIcon className={styles.exitIcon} />
          <span>退出</span>
        </button>
        <h1 className={styles.title}>义项整理 - {character}</h1>
        <button className={styles.saveButton} onClick={handleSave} aria-label="保存">
          <SaveIcon className={styles.saveIcon} />
          <span>保存</span>
        </button>
      </div>

      <div className={styles.canvasContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <p>生成思维导图中...</p>
          </div>
        ) : mindMapData && mindMapData.nodes.length > 1 ? (
          <MindMapCanvas data={mindMapData} onNodeMove={handleNodeMove} />
        ) : (
          <div className={styles.noData}>
            <p className={styles.noDataIcon}>📝</p>
            <p className={styles.noDataText}>该字暂无义项数据</p>
            <p className={styles.noDataHint}>请先在查字页面为该字添加义项</p>
          </div>
        )}
      </div>
    </div>
  )
}
