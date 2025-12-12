'use client'

import { useRef, useEffect, useState } from 'react'
import type { MindMapData, MindMapNode, Connection } from '@/services/mindmap'
import styles from './MindMapCanvas.module.css'

interface MindMapCanvasProps {
    data: MindMapData
    isFullscreen?: boolean
    isEditMode?: boolean
    onToggleFullscreen?: () => void
    onToggleEditMode?: () => void
    onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void
    onNodeClick?: (nodeId: string) => void
    onNodeDoubleClick?: (nodeId: string) => void
    onExportPNG?: () => void
    onDataChange?: (data: MindMapData) => void
}

export default function MindMapCanvas({ 
    data, 
    isFullscreen = false,
    isEditMode = false,
    onToggleFullscreen,
    onToggleEditMode,
    onNodeMove, 
    onNodeClick, 
    onNodeDoubleClick, 
    onExportPNG,
    onDataChange 
}: MindMapCanvasProps) {
    const canvasRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const [draggingNode, setDraggingNode] = useState<string | null>(null)
    const [draggingCanvas, setDraggingCanvas] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [viewport, setViewport] = useState(data.viewport)
    const [isExporting, setIsExporting] = useState(false)
    const [localData, setLocalData] = useState(data)
    const [editingNode, setEditingNode] = useState<string | null>(null)

    useEffect(() => {
        setLocalData(data)
    }, [data])

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        if (e.button !== 0) return // 只响应左键
        if (!isEditMode) return // 非编辑模式不允许拖动
        e.stopPropagation() // 阻止事件冒泡到画布

        const node = localData.nodes.find((n) => n.id === nodeId)
        if (!node) return

        setDraggingNode(nodeId)
        setDragOffset({
            x: e.clientX - node.position.x * viewport.zoom,
            y: e.clientY - node.position.y * viewport.zoom,
        })
    }

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return // 只响应左键
        if (draggingNode) return // 如果正在拖动节点，不处理画布拖动

        setDraggingCanvas(true)
        setDragOffset({
            x: e.clientX - viewport.offsetX,
            y: e.clientY - viewport.offsetY,
        })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingNode) {
            // 拖动节点
            const newX = (e.clientX - dragOffset.x) / viewport.zoom
            const newY = (e.clientY - dragOffset.y) / viewport.zoom
            
            const updatedData = {
                ...localData,
                nodes: localData.nodes.map(node => 
                    node.id === draggingNode 
                        ? { ...node, position: { x: newX, y: newY } }
                        : node
                )
            }
            setLocalData(updatedData)
            onDataChange?.(updatedData)
            onNodeMove?.(draggingNode, { x: newX, y: newY })
        } else if (draggingCanvas) {
            // 拖动画布
            const newOffsetX = e.clientX - dragOffset.x
            const newOffsetY = e.clientY - dragOffset.y
            setViewport({ ...viewport, offsetX: newOffsetX, offsetY: newOffsetY })
        }
    }

    const handleMouseUp = () => {
        setDraggingNode(null)
        setDraggingCanvas(false)
    }

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.max(0.1, Math.min(3, viewport.zoom * delta))
        setViewport({ ...viewport, zoom: newZoom })
    }

    const handleExportPNG = async () => {
        if (!contentRef.current) return

        setIsExporting(true)

        try {
            // 动态导入html2canvas
            const html2canvas = (await import('html2canvas')).default

            // 临时重置视口以捕获完整内容
            const originalTransform = contentRef.current.style.transform
            contentRef.current.style.transform = 'none'

            const canvas = await html2canvas(contentRef.current, {
                backgroundColor: '#f5f7fa',
                scale: 2,  // 高清导出
                logging: false,
            })

            // 恢复原始变换
            contentRef.current.style.transform = originalTransform

            // 下载图片
            const link = document.createElement('a')
            link.download = `mindmap-${data.character}-${Date.now()}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()

            onExportPNG?.()
        } catch (error) {
            console.error('导出PNG失败:', error)
            alert('导出失败，请重试')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className={styles.canvasWrapper}>
            {/* 工具栏 */}
            <div className={styles.toolbar}>
                <button
                    className={`${styles.toolbarBtn} ${isFullscreen ? styles.active : ''}`}
                    onClick={onToggleFullscreen}
                    title={isFullscreen ? '退出全屏' : '全屏显示'}
                >
                    {isFullscreen ? '🗗 退出全屏' : '🗖 全屏'}
                </button>
                <button
                    className={`${styles.toolbarBtn} ${isEditMode ? styles.active : ''}`}
                    onClick={onToggleEditMode}
                    title={isEditMode ? '退出编辑' : '编辑模式'}
                >
                    {isEditMode ? '✓ 完成编辑' : '✏️ 编辑'}
                </button>
                <button
                    className={styles.toolbarBtn}
                    onClick={handleExportPNG}
                    disabled={isExporting}
                    title="导出为PNG图片"
                >
                    {isExporting ? '导出中...' : '📥 导出PNG'}
                </button>
                <button
                    className={styles.toolbarBtn}
                    onClick={() => setViewport({ ...viewport, zoom: 1, offsetX: 0, offsetY: 0 })}
                    title="重置视图"
                >
                    🔄 重置
                </button>
                <div className={styles.zoomInfo}>
                    缩放: {(viewport.zoom * 100).toFixed(0)}%
                </div>
                {isEditMode && (
                    <div className={styles.editHint}>
                        💡 拖动节点调整位置，双击节点编辑内容
                    </div>
                )}
            </div>

            <div
                ref={canvasRef}
                className={`${styles.canvas} ${draggingCanvas ? styles.draggingCanvas : ''}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                <div
                    ref={contentRef}
                    className={styles.canvasContent}
                    style={{
                        transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`,
                        transformOrigin: '0 0'
                    }}
                >
                    {/* 渲染连接线 */}
                    <svg className={styles.svg}>
                        {localData.connections.map((connection) => {
                            const fromNode = localData.nodes.find((n) => n.id === connection.fromNodeId)
                            const toNode = localData.nodes.find((n) => n.id === connection.toNodeId)
                            if (!fromNode || !toNode) return null

                            return (
                                <line
                                    key={connection.id}
                                    x1={fromNode.position.x}
                                    y1={fromNode.position.y}
                                    x2={toNode.position.x}
                                    y2={toNode.position.y}
                                    stroke={connection.style.color}
                                    strokeWidth={connection.style.width}
                                    strokeDasharray={connection.style.lineType === 'dashed' ? '5,5' : undefined}
                                />
                            )
                        })}
                    </svg>

                    {/* 渲染节点 */}
                    {localData.nodes.map((node) => (
                        <NodeComponent
                            key={node.id}
                            node={node}
                            isDragging={draggingNode === node.id}
                            isEditing={editingNode === node.id}
                            isEditMode={isEditMode}
                            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                            onClick={() => onNodeClick?.(node.id)}
                            onDoubleClick={() => {
                                if (isEditMode) {
                                    setEditingNode(node.id)
                                }
                                onNodeDoubleClick?.(node.id)
                            }}
                            onContentChange={(newContent) => {
                                const updatedData = {
                                    ...localData,
                                    nodes: localData.nodes.map(n => 
                                        n.id === node.id 
                                            ? { ...n, content: newContent }
                                            : n
                                    )
                                }
                                setLocalData(updatedData)
                                onDataChange?.(updatedData)
                            }}
                            onEditComplete={() => setEditingNode(null)}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

function NodeComponent({
    node,
    isDragging,
    isEditing,
    isEditMode,
    onMouseDown,
    onClick,
    onDoubleClick,
    onContentChange,
    onEditComplete,
}: {
    node: MindMapNode
    isDragging: boolean
    isEditing: boolean
    isEditMode: boolean
    onMouseDown: (e: React.MouseEvent) => void
    onClick: () => void
    onDoubleClick: () => void
    onContentChange: (content: string) => void
    onEditComplete: () => void
}) {
    const [editValue, setEditValue] = useState(node.content)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onContentChange(editValue)
            onEditComplete()
        } else if (e.key === 'Escape') {
            setEditValue(node.content)
            onEditComplete()
        }
    }
    const getShapeClass = () => {
        switch (node.style.shape) {
            case 'ellipse':
                return styles.ellipse
            case 'rounded-rectangle':
                return styles.roundedRectangle
            default:
                return styles.rectangle
        }
    }

    const getNodeClass = () => {
        let className = `${styles.node} ${getShapeClass()}`
        if (isDragging) className += ` ${styles.dragging}`
        if (node.type === 'collapse') className += ` ${styles.collapseNode}`
        return className
    }

    // 计算节点左上角位置（position是中心点）
    const left = node.position.x - node.style.width / 2
    const top = node.position.y - node.style.height / 2

    // 渲染内容，高亮指定字符
    const renderContent = () => {
        if (node.highlightChar && node.type === 'example') {
            // 将内容中的目标字符高亮显示
            const parts = node.content.split(node.highlightChar)
            return (
                <>
                    {parts.map((part, index) => (
                        <span key={index}>
                            {part}
                            {index < parts.length - 1 && (
                                <span className={styles.highlightChar}>{node.highlightChar}</span>
                            )}
                        </span>
                    ))}
                </>
            )
        }
        return node.content
    }

    return (
        <div
            className={getNodeClass()}
            style={{
                left,
                top,
                width: node.style.width,
                height: node.style.height,
                backgroundColor: node.style.backgroundColor,
                color: node.style.textColor,
                fontSize: node.style.fontSize,
                cursor: isEditMode ? 'move' : 'default',
            }}
            onMouseDown={onMouseDown}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            title={node.type === 'collapse' ? '点击展开更多例句' : (isEditMode ? '双击编辑内容' : undefined)}
        >
            {isEditing ? (
                <textarea
                    ref={inputRef}
                    className={styles.nodeInput}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        onContentChange(editValue)
                        onEditComplete()
                    }}
                    style={{
                        fontSize: node.style.fontSize,
                        color: node.style.textColor,
                    }}
                />
            ) : (
                <div className={styles.nodeContent}>{renderContent()}</div>
            )}
        </div>
    )
}
