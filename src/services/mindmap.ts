import { v4 as uuidv4 } from 'uuid'
import { StorageService } from './storage'

// 思维导图节点
export interface MindMapNode {
  id: string
  type: 'character' | 'definition' | 'example' | 'custom' | 'collapse'
  content: string
  position: { x: number; y: number }
  style: NodeStyle
  definitionId?: string
  exampleId?: string
  collapsed?: boolean  // 是否折叠
  childrenIds?: string[]  // 子节点ID列表（用于折叠）
  highlightChar?: string  // 需要高亮的字符
}

// 节点样式
export interface NodeStyle {
  backgroundColor: string
  textColor: string
  fontSize: number
  shape: 'rectangle' | 'rounded-rectangle' | 'ellipse'
  width: number
  height: number
}

// 连接线
export interface Connection {
  id: string
  fromNodeId: string
  toNodeId: string
  style: ConnectionStyle
}

// 连接线样式
export interface ConnectionStyle {
  color: string
  width: number
  lineType: 'solid' | 'dashed'
}

// 手绘路径
export interface DrawingPath {
  id: string
  points: { x: number; y: number }[]
  color: string
  width: number
}

// 思维导图数据
export interface MindMapData {
  character: string
  nodes: MindMapNode[]
  connections: Connection[]
  drawings: DrawingPath[]
  viewport: {
    zoom: number
    offsetX: number
    offsetY: number
  }
  scope?: {  // 生成范围
    libraryId?: string
    collectionId?: string
    articleId?: string
  }
  createdAt: string
  updatedAt: string
}

// 默认样式配置
const DEFAULT_STYLES = {
  character: {
    backgroundColor: '#e3f2fd',
    textColor: '#1976d2',
    fontSize: 24,
    shape: 'ellipse' as const,
    width: 70,
    height: 70,
  },
  definition: {
    backgroundColor: '#fff3e0',
    textColor: '#e65100',
    fontSize: 13,
    shape: 'rounded-rectangle' as const,
    width: 120,
    height: 50,
  },
  example: {
    backgroundColor: '#f3e5f5',
    textColor: '#7b1fa2',
    fontSize: 12,
    shape: 'rectangle' as const,
    width: 200,
    height: 45,
  },
  custom: {
    backgroundColor: '#e8f5e9',
    textColor: '#2e7d32',
    fontSize: 14,
    shape: 'rounded-rectangle' as const,
    width: 100,
    height: 50,
  },
}

// 布局配置
const LAYOUT_CONFIG = {
  // 中心节点位置
  centerX: 100,
  centerYOffset: 100,
  // 层级间距
  definitionLayerX: 220,
  exampleLayerX: 380,
  // 垂直间距
  exampleSpacing: 12,  // 例句行间距
  groupSpacing: 60,  // 义项之间的间距
  // 多列布局
  exampleColumns: 3,  // 例句列数
  exampleColumnSpacing: 15,  // 列间距
}

const DEFAULT_CONNECTION_STYLE: ConnectionStyle = {
  color: '#64b5f6',
  width: 3,
  lineType: 'solid',
}

export class MindMapService {
  private storage: StorageService
  private mindMaps: Map<string, MindMapData> = new Map()

  constructor(storage: StorageService) {
    this.storage = storage
    this.loadMindMaps()
  }

  /**
   * 根据文本长度计算例句节点尺寸
   */
  private calculateExampleSize(text: string): { width: number; height: number } {
    const fontSize = DEFAULT_STYLES.example.fontSize
    const charsPerLine = 18  // 每行大约18个字符
    const lineHeight = fontSize * 1.5
    const padding = 16  // 内边距
    
    const textLength = text.length
    
    // 计算需要的行数
    const lines = Math.ceil(textLength / charsPerLine)
    
    // 根据行数计算尺寸
    if (lines <= 1) {
      // 短句：单行
      return { width: Math.max(100, textLength * fontSize * 0.7 + padding * 2), height: 35 }
    } else if (lines <= 2) {
      // 中等：两行
      return { width: 180, height: 50 }
    } else if (lines <= 3) {
      // 较长：三行
      return { width: 200, height: 65 }
    } else {
      // 很长：四行或更多
      return { width: 220, height: 80 }
    }
  }

  /**
   * 计算义项组的总高度（支持多列，动态尺寸）
   */
  private calculateGroupHeightWithSizes(exampleSizes: { width: number; height: number }[]): number {
    if (exampleSizes.length === 0) {
      return DEFAULT_STYLES.definition.height
    }
    
    const columns = LAYOUT_CONFIG.exampleColumns
    const rows = Math.ceil(exampleSizes.length / columns)
    
    // 计算每行的最大高度
    let totalHeight = 0
    for (let row = 0; row < rows; row++) {
      let maxRowHeight = 0
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col
        if (index < exampleSizes.length) {
          maxRowHeight = Math.max(maxRowHeight, exampleSizes[index].height)
        }
      }
      totalHeight += maxRowHeight
    }
    
    totalHeight += (rows - 1) * LAYOUT_CONFIG.exampleSpacing
    return Math.max(totalHeight, DEFAULT_STYLES.definition.height)
  }

  /**
   * 生成思维导图（优化的树状布局，支持范围过滤）
   */
  generateMindMap(
    character: string, 
    scope?: { libraryId?: string; collectionId?: string; articleId?: string }
  ): MindMapData {
    // 查询该字的所有义项
    let definitions = this.storage.getDefinitions().filter((d) => d.character === character)
    
    // 如果指定了范围，过滤义项（只保留在范围内有例句的义项）
    if (scope && (scope.libraryId || scope.collectionId || scope.articleId)) {
      definitions = definitions.filter(def => {
        const links = this.storage.getDefinitionLinksForDefinition(def.id)
        return links.some(link => {
          const sentence = this.storage.getSentenceById(link.sentenceId)
          if (!sentence) return false
          
          const article = this.storage.getArticleById(sentence.articleId)
          if (!article) return false
          
          // 检查文章范围
          if (scope.articleId && article.id !== scope.articleId) return false
          
          const collection = this.storage.getCollectionById(article.collectionId)
          if (!collection) return false
          
          // 检查集范围
          if (scope.collectionId && collection.id !== scope.collectionId) return false
          
          const library = this.storage.getLibraryById(collection.libraryId)
          if (!library) return false
          
          // 检查库范围
          if (scope.libraryId && library.id !== scope.libraryId) return false
          
          return true
        })
      })
    }

    // 预处理：计算每个义项的例句数量并排序，同时过滤范围
    const definitionsWithExamples = definitions
      .map((def) => {
        let links = this.storage.getDefinitionLinksForDefinition(def.id)
        
        // 如果指定了范围，过滤例句
        if (scope && (scope.libraryId || scope.collectionId || scope.articleId)) {
          links = links.filter(link => {
            const sentence = this.storage.getSentenceById(link.sentenceId)
            if (!sentence) return false
            
            const article = this.storage.getArticleById(sentence.articleId)
            if (!article) return false
            
            if (scope.articleId && article.id !== scope.articleId) return false
            
            const collection = this.storage.getCollectionById(article.collectionId)
            if (!collection) return false
            
            if (scope.collectionId && collection.id !== scope.collectionId) return false
            
            const library = this.storage.getLibraryById(collection.libraryId)
            if (!library) return false
            
            if (scope.libraryId && library.id !== scope.libraryId) return false
            
            return true
          })
        }
        
        return {
          ...def,
          links,
        }
      })
      .filter(def => def.links.length > 0)  // 只保留有例句的义项
      .sort((a, b) => b.links.length - a.links.length)

    // 预计算每个例句的尺寸
    const exampleSizesMap = new Map<string, { width: number; height: number }[]>()
    
    definitionsWithExamples.forEach((def) => {
      const sizes: { width: number; height: number }[] = []
      def.links.forEach((link) => {
        const sentence = this.storage.getSentenceById(link.sentenceId)
        if (sentence) {
          sizes.push(this.calculateExampleSize(sentence.text))
        }
      })
      exampleSizesMap.set(def.id, sizes)
    })

    // 计算总高度
    let totalHeight = 0
    const groupHeights: number[] = []
    
    definitionsWithExamples.forEach((def) => {
      const sizes = exampleSizesMap.get(def.id) || []
      const groupHeight = this.calculateGroupHeightWithSizes(sizes)
      groupHeights.push(groupHeight)
      totalHeight += groupHeight
    })
    
    totalHeight += (definitionsWithExamples.length - 1) * LAYOUT_CONFIG.groupSpacing

    // 计算画布大小和中心位置
    const canvasHeight = Math.max(800, totalHeight + 200)
    const centerY = canvasHeight / 2

    // 创建中心节点
    const centerNode: MindMapNode = {
      id: uuidv4(),
      type: 'character',
      content: character,
      position: { x: LAYOUT_CONFIG.centerX, y: centerY },
      style: DEFAULT_STYLES.character,
    }

    const nodes: MindMapNode[] = [centerNode]
    const connections: Connection[] = []

    // 如果没有义项，只返回中心节点
    if (definitionsWithExamples.length === 0) {
      return {
        character,
        nodes,
        connections,
        drawings: [],
        viewport: { zoom: 1.0, offsetX: 0, offsetY: 0 },
        scope,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    // 从顶部开始布局
    let currentY = centerY - totalHeight / 2

    definitionsWithExamples.forEach((definition, defIndex) => {
      const groupHeight = groupHeights[defIndex]
      const exampleCount = definition.links.length

      // 义项节点垂直居中于其组
      const defY = currentY + groupHeight / 2

      // 创建义项节点
      const defNode: MindMapNode = {
        id: uuidv4(),
        type: 'definition',
        content: definition.content,
        position: { x: LAYOUT_CONFIG.definitionLayerX, y: defY },
        style: { ...DEFAULT_STYLES.definition },
        definitionId: definition.id,
      }

      nodes.push(defNode)

      // 创建中心到义项的连接
      connections.push({
        id: uuidv4(),
        fromNodeId: centerNode.id,
        toNodeId: defNode.id,
        style: { ...DEFAULT_CONNECTION_STYLE },
      })

      // 布局所有例句（多列布局，动态尺寸）
      if (exampleCount > 0) {
        const sizes = exampleSizesMap.get(definition.id) || []
        const columns = LAYOUT_CONFIG.exampleColumns
        const rows = Math.ceil(exampleCount / columns)
        
        // 计算每行的高度
        const rowHeights: number[] = []
        for (let row = 0; row < rows; row++) {
          let maxHeight = 0
          for (let col = 0; col < columns; col++) {
            const idx = row * columns + col
            if (idx < sizes.length) {
              maxHeight = Math.max(maxHeight, sizes[idx].height)
            }
          }
          rowHeights.push(maxHeight)
        }
        
        const totalExamplesHeight = rowHeights.reduce((sum, h) => sum + h, 0) + (rows - 1) * LAYOUT_CONFIG.exampleSpacing
        const startY = currentY + (groupHeight - totalExamplesHeight) / 2

        // 显示所有例句（多列）
        let currentRowY = startY
        definition.links.forEach((link, index) => {
          const sentence = this.storage.getSentenceById(link.sentenceId)
          if (!sentence) return

          // 计算行列位置
          const col = index % columns
          const row = Math.floor(index / columns)
          
          // 获取当前例句的尺寸
          const size = sizes[index] || DEFAULT_STYLES.example
          
          // 计算当前行的起始Y（累加前面行的高度）
          let rowStartY = startY
          for (let r = 0; r < row; r++) {
            rowStartY += rowHeights[r] + LAYOUT_CONFIG.exampleSpacing
          }
          
          // 计算位置（使用最大宽度来保持列对齐）
          const maxWidth = 220  // 最大宽度
          const exampleX = LAYOUT_CONFIG.exampleLayerX + col * (maxWidth + LAYOUT_CONFIG.exampleColumnSpacing)
          const exampleY = rowStartY + rowHeights[row] / 2

          // 创建例句节点
          const exampleNode: MindMapNode = {
            id: uuidv4(),
            type: 'example',
            content: sentence.text,
            position: { x: exampleX, y: exampleY },
            style: { 
              ...DEFAULT_STYLES.example,
              width: size.width,
              height: size.height,
            },
            exampleId: sentence.id,
            highlightChar: character,  // 高亮当前查询的字
          }

          nodes.push(exampleNode)

          // 创建义项到例句的连接
          connections.push({
            id: uuidv4(),
            fromNodeId: defNode.id,
            toNodeId: exampleNode.id,
            style: { ...DEFAULT_CONNECTION_STYLE, color: '#ff9800', width: 2 },
          })
        })
      }

      currentY += groupHeight + LAYOUT_CONFIG.groupSpacing
    })

    // 根据内容量调整缩放
    const totalExamples = definitionsWithExamples.reduce((sum, def) => sum + def.links.length, 0)
    const defCount = definitionsWithExamples.length
    
    // 更智能的缩放计算
    let zoom = 1.0
    if (defCount > 30 || totalExamples > 150) {
      zoom = 0.4
    } else if (defCount > 20 || totalExamples > 100) {
      zoom = 0.5
    } else if (defCount > 15 || totalExamples > 60) {
      zoom = 0.6
    } else if (defCount > 10 || totalExamples > 30) {
      zoom = 0.7
    } else if (defCount > 5 || totalExamples > 15) {
      zoom = 0.8
    }

    return {
      character,
      nodes,
      connections,
      drawings: [],
      viewport: { zoom, offsetX: 100, offsetY: 50 },
      scope,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * 保存思维导图
   */
  saveMindMap(data: MindMapData): void {
    data.updatedAt = new Date().toISOString()
    this.mindMaps.set(data.character, data)
    this.saveMindMapsToLocal()
  }

  /**
   * 加载思维导图
   */
  loadMindMap(character: string): MindMapData | null {
    return this.mindMaps.get(character) || null
  }

  /**
   * 从localStorage加载所有思维导图
   */
  private loadMindMaps(): void {
    try {
      const data = localStorage.getItem('mindmaps')
      if (data) {
        const parsed = JSON.parse(data)
        this.mindMaps = new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.error('Failed to load mind maps:', error)
    }
  }

  /**
   * 保存所有思维导图到localStorage
   */
  private saveMindMapsToLocal(): void {
    try {
      const data = Object.fromEntries(this.mindMaps)
      localStorage.setItem('mindmaps', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save mind maps:', error)
    }
  }

  /**
   * 添加自定义节点
   */
  addCustomNode(mindMapData: MindMapData, content: string, position: { x: number; y: number }): MindMapNode {
    const node: MindMapNode = {
      id: uuidv4(),
      type: 'custom',
      content,
      position,
      style: DEFAULT_STYLES.custom,
    }

    mindMapData.nodes.push(node)
    return node
  }

  /**
   * 更新节点位置
   */
  updateNodePosition(mindMapData: MindMapData, nodeId: string, position: { x: number; y: number }): void {
    const node = mindMapData.nodes.find((n) => n.id === nodeId)
    if (node) {
      node.position = position
    }
  }

  /**
   * 更新节点内容
   */
  updateNodeContent(mindMapData: MindMapData, nodeId: string, content: string): void {
    const node = mindMapData.nodes.find((n) => n.id === nodeId)
    if (node) {
      node.content = content
    }
  }

  /**
   * 更新节点样式
   */
  updateNodeStyle(mindMapData: MindMapData, nodeId: string, style: Partial<NodeStyle>): void {
    const node = mindMapData.nodes.find((n) => n.id === nodeId)
    if (node) {
      node.style = { ...node.style, ...style }
    }
  }

  /**
   * 删除节点
   */
  deleteNode(mindMapData: MindMapData, nodeId: string): void {
    mindMapData.nodes = mindMapData.nodes.filter((n) => n.id !== nodeId)
    mindMapData.connections = mindMapData.connections.filter(
      (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
    )
  }

  /**
   * 添加连接线
   */
  addConnection(mindMapData: MindMapData, fromNodeId: string, toNodeId: string): Connection {
    const connection: Connection = {
      id: uuidv4(),
      fromNodeId,
      toNodeId,
      style: DEFAULT_CONNECTION_STYLE,
    }

    mindMapData.connections.push(connection)
    return connection
  }

  /**
   * 删除连接线
   */
  deleteConnection(mindMapData: MindMapData, connectionId: string): void {
    mindMapData.connections = mindMapData.connections.filter((c) => c.id !== connectionId)
  }

  /**
   * 添加手绘路径
   */
  addDrawingPath(
    mindMapData: MindMapData,
    points: { x: number; y: number }[],
    color: string,
    width: number
  ): DrawingPath {
    const path: DrawingPath = {
      id: uuidv4(),
      points,
      color,
      width,
    }

    mindMapData.drawings.push(path)
    return path
  }

  /**
   * 删除手绘路径
   */
  deleteDrawingPath(mindMapData: MindMapData, pathId: string): void {
    mindMapData.drawings = mindMapData.drawings.filter((d) => d.id !== pathId)
  }

  /**
   * 更新视口
   */
  updateViewport(mindMapData: MindMapData, viewport: Partial<MindMapData['viewport']>): void {
    mindMapData.viewport = { ...mindMapData.viewport, ...viewport }
  }
}
