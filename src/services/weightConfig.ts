// 权重配置服务

import type { CharacterWeight } from './examGenerator'

export interface WeightConfig {
  id: string
  name: string
  note?: string
  characters: CharacterWeight[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'exam-weight-configs'

export class WeightConfigService {
  private configs: WeightConfig[] = []

  constructor() {
    this.load()
  }

  private load() {
    if (typeof window === 'undefined') return
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      try {
        this.configs = JSON.parse(data)
      } catch {
        this.configs = []
      }
    }
  }

  private save() {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.configs))
  }

  getAll(): WeightConfig[] {
    return [...this.configs]
  }

  getById(id: string): WeightConfig | undefined {
    return this.configs.find(c => c.id === id)
  }

  create(name: string, characters: CharacterWeight[], note?: string): WeightConfig {
    const config: WeightConfig = {
      id: Date.now().toString(),
      name,
      note,
      characters,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.configs.push(config)
    this.save()
    return config
  }

  update(id: string, updates: Partial<Omit<WeightConfig, 'id' | 'createdAt'>>): WeightConfig | null {
    const index = this.configs.findIndex(c => c.id === id)
    if (index === -1) return null
    
    this.configs[index] = {
      ...this.configs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    this.save()
    return this.configs[index]
  }

  delete(id: string): boolean {
    const index = this.configs.findIndex(c => c.id === id)
    if (index === -1) return false
    this.configs.splice(index, 1)
    this.save()
    return true
  }

  exportToJSON(config: WeightConfig): string {
    return JSON.stringify(config, null, 2)
  }

  importFromJSON(json: string): WeightConfig | null {
    try {
      const data = JSON.parse(json)
      if (!data.name || !Array.isArray(data.characters)) {
        return null
      }
      // 验证characters格式
      const validChars = data.characters.every((c: any) => 
        typeof c.char === 'string' && 
        typeof c.weight === 'number' &&
        c.weight >= 0 && c.weight <= 100
      )
      if (!validChars) return null
      
      return this.create(data.name, data.characters, data.note)
    } catch {
      return null
    }
  }
}

export const weightConfigService = new WeightConfigService()
