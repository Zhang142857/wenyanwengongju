// 统一加权配置服务
// 整合文章、义项、考察字的加权数据

export interface ArticleWeight {
  articleId: string
  articleTitle: string
  collectionId: string
  collectionName: string
  weight: number // 0-100
  included: boolean // 是否包含在考察范围内
}

export interface CharacterWeight {
  char: string
  weight: number // 0-100，重点字的权重
}

export interface UnifiedWeightConfig {
  id: string
  name: string
  note?: string
  
  // 文章加权（考察范围）
  articleWeights: ArticleWeight[]
  
  // 考察字加权
  characterWeights: CharacterWeight[]
  otherCharactersWeight: number // 其他字的权重（0-100），所有重点字+其他字共享100
  
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'exam-unified-weight-configs'
const CURRENT_CONFIG_KEY = 'exam-current-weight-config'

export class UnifiedWeightConfigService {
  private configs: UnifiedWeightConfig[] = []
  private currentConfig: UnifiedWeightConfig | null = null

  constructor() {
    this.load()
  }

  private load() {
    if (typeof window === 'undefined') return
    
    // 加载所有配置
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      try {
        this.configs = JSON.parse(data)
      } catch {
        this.configs = []
      }
    }
    
    // 加载当前配置
    const currentData = localStorage.getItem(CURRENT_CONFIG_KEY)
    if (currentData) {
      try {
        this.currentConfig = JSON.parse(currentData)
      } catch {
        this.currentConfig = null
      }
    }
  }

  private save() {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.configs))
  }

  private saveCurrentConfig() {
    if (typeof window === 'undefined') return
    if (this.currentConfig) {
      localStorage.setItem(CURRENT_CONFIG_KEY, JSON.stringify(this.currentConfig))
    } else {
      localStorage.removeItem(CURRENT_CONFIG_KEY)
    }
  }

  // 获取当前配置
  getCurrentConfig(): UnifiedWeightConfig | null {
    return this.currentConfig
  }

  // 设置当前配置
  setCurrentConfig(config: UnifiedWeightConfig | null) {
    this.currentConfig = config
    this.saveCurrentConfig()
  }

  // 更新当前配置的文章权重
  updateArticleWeights(articleWeights: ArticleWeight[]) {
    if (!this.currentConfig) {
      this.currentConfig = this.createEmptyConfig()
    }
    this.currentConfig.articleWeights = articleWeights
    this.currentConfig.updatedAt = new Date().toISOString()
    this.saveCurrentConfig()
  }

  // 更新当前配置的字符权重
  updateCharacterWeights(characterWeights: CharacterWeight[], otherWeight: number) {
    if (!this.currentConfig) {
      this.currentConfig = this.createEmptyConfig()
    }
    this.currentConfig.characterWeights = characterWeights
    this.currentConfig.otherCharactersWeight = otherWeight
    this.currentConfig.updatedAt = new Date().toISOString()
    this.saveCurrentConfig()
  }

  // 创建空配置
  createEmptyConfig(): UnifiedWeightConfig {
    return {
      id: Date.now().toString(),
      name: '未命名配置',
      articleWeights: [],
      characterWeights: [],
      otherCharactersWeight: 100, // 默认其他字占100%
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  // 获取所有保存的配置
  getAll(): UnifiedWeightConfig[] {
    return [...this.configs]
  }

  // 保存当前配置
  saveConfig(name: string, note?: string): UnifiedWeightConfig {
    if (!this.currentConfig) {
      this.currentConfig = this.createEmptyConfig()
    }
    
    const config: UnifiedWeightConfig = {
      ...this.currentConfig,
      id: Date.now().toString(),
      name,
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    this.configs.push(config)
    this.save()
    return config
  }

  // 加载配置
  loadConfig(id: string): boolean {
    const config = this.configs.find(c => c.id === id)
    if (!config) return false
    
    this.currentConfig = { ...config }
    this.saveCurrentConfig()
    return true
  }

  // 删除配置
  deleteConfig(id: string): boolean {
    const index = this.configs.findIndex(c => c.id === id)
    if (index === -1) return false
    this.configs.splice(index, 1)
    this.save()
    return true
  }

  // 导出配置
  exportConfig(): string {
    return JSON.stringify(this.currentConfig, null, 2)
  }

  // 导入配置
  importConfig(json: string): boolean {
    try {
      const data = JSON.parse(json)
      if (!data.articleWeights || !data.characterWeights) {
        return false
      }
      this.currentConfig = {
        ...this.createEmptyConfig(),
        ...data,
        id: Date.now().toString(),
        updatedAt: new Date().toISOString()
      }
      this.saveCurrentConfig()
      return true
    } catch {
      return false
    }
  }

  // 计算字符的实际选中概率
  // 重点字共享 (100 - otherCharactersWeight) 的权重
  // 其他字共享 otherCharactersWeight 的权重
  calculateCharacterProbability(char: string): number {
    if (!this.currentConfig) return 1

    const { characterWeights, otherCharactersWeight } = this.currentConfig
    const charConfig = characterWeights.find(c => c.char === char)
    
    if (charConfig) {
      // 重点字：在重点字权重池中按权重分配
      const totalCharWeight = characterWeights.reduce((sum, c) => sum + c.weight, 0)
      if (totalCharWeight === 0) return 0
      
      const charShare = charConfig.weight / totalCharWeight
      const priorityPool = 100 - otherCharactersWeight
      return (charShare * priorityPool) / 100
    } else {
      // 其他字：平均分配其他字权重池
      return otherCharactersWeight / 100
    }
  }

  // 获取包含的文章ID列表
  getIncludedArticleIds(): string[] {
    if (!this.currentConfig) return []
    return this.currentConfig.articleWeights
      .filter(a => a.included)
      .map(a => a.articleId)
  }

  // 获取文章权重映射
  getArticleWeightMap(): Map<string, number> {
    const map = new Map<string, number>()
    if (!this.currentConfig) return map
    
    for (const aw of this.currentConfig.articleWeights) {
      if (aw.included) {
        map.set(aw.articleId, aw.weight)
      }
    }
    return map
  }
}

export const unifiedWeightConfigService = new UnifiedWeightConfigService()
