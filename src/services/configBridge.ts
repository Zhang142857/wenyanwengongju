/**
 * 配置桥接服务
 * 
 * 连接前端和 Electron 主进程的配置管理器
 * 在 Electron 环境下使用主进程的配置系统
 * 在浏览器环境下回退到 localStorage
 */

import type { AppConfig } from '@/types/config'
import { DEFAULT_CONFIG } from '@/types/config'

// 检查是否在 Electron 环境
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

// 配置变化回调类型
type ConfigChangeCallback = (config: AppConfig) => void

class ConfigBridge {
  private listeners: Set<ConfigChangeCallback> = new Set()
  private cachedConfig: AppConfig | null = null
  private initialized = false

  async initialize(): Promise<AppConfig> {
    if (this.initialized && this.cachedConfig) {
      return this.cachedConfig
    }

    try {
      if (isElectron) {
        const config = await (window as any).electronAPI.getAppConfig()
        if (config) {
          this.cachedConfig = this.migrateConfig(config)
        } else {
          this.cachedConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
        }
        this.setupConfigChangeListener()
      } else {
        const stored = localStorage.getItem('app_config')
        if (stored) {
          this.cachedConfig = this.migrateConfig(JSON.parse(stored))
        } else {
          this.cachedConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
        }
      }

      this.initialized = true
      return this.cachedConfig!
    } catch (error) {
      console.error('初始化配置失败:', error)
      this.cachedConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
      this.initialized = true
      return this.cachedConfig!
    }
  }

  async getConfig(): Promise<AppConfig> {
    if (!this.initialized) {
      return this.initialize()
    }
    return this.cachedConfig!
  }

  async saveConfig(config: AppConfig): Promise<boolean> {
    try {
      this.cachedConfig = config

      if (isElectron) {
        const result = await (window as any).electronAPI.saveAppConfig(config)
        return result
      } else {
        localStorage.setItem('app_config', JSON.stringify(config, null, 2))
        return true
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      return false
    }
  }

  async updateConfig(partial: Partial<AppConfig>): Promise<boolean> {
    const current = await this.getConfig()
    const updated = this.mergeConfig(current, partial)
    return this.saveConfig(updated)
  }

  async getLibraries(): Promise<any> {
    try {
      if (isElectron) {
        const libraries = await (window as any).electronAPI.getLibraries()
        return libraries || this.getDefaultLibraries()
      } else {
        const stored = localStorage.getItem('classical-chinese-data')
        return stored ? JSON.parse(stored) : this.getDefaultLibraries()
      }
    } catch (error) {
      console.error('获取库数据失败:', error)
      return this.getDefaultLibraries()
    }
  }

  async saveLibraries(libraries: any): Promise<boolean> {
    try {
      if (isElectron) {
        const result = await (window as any).electronAPI.saveLibraries(libraries)
        localStorage.setItem('classical-chinese-data', JSON.stringify(libraries))
        return result
      } else {
        localStorage.setItem('classical-chinese-data', JSON.stringify(libraries))
        return true
      }
    } catch (error) {
      console.error('保存库数据失败:', error)
      return false
    }
  }

  async getDirectoryInfo(): Promise<{
    root: string
    config: string
    temp: string
    cache: string
    backgrounds: string
  } | null> {
    if (isElectron) {
      try {
        return await (window as any).electronAPI.getConfigDirectories()
      } catch (error) {
        return null
      }
    }
    return null
  }

  async openConfigDirectory(): Promise<boolean> {
    if (isElectron) {
      try {
        return await (window as any).electronAPI.openConfigDirectory()
      } catch (error) {
        return false
      }
    }
    return false
  }

  async clearCache(): Promise<boolean> {
    if (isElectron) {
      try {
        return await (window as any).electronAPI.clearCache()
      } catch (error) {
        return false
      }
    }
    return false
  }

  onChange(callback: ConfigChangeCallback): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private setupConfigChangeListener() {
    if (isElectron) {
      (window as any).electronAPI.onConfigChange((data: { filename: string; config: AppConfig }) => {
        if (data.filename === 'app-config.json') {
          this.cachedConfig = this.migrateConfig(data.config)
          this.notifyListeners()
        }
      })
    }
  }

  private notifyListeners() {
    if (this.cachedConfig) {
      for (const callback of this.listeners) {
        try {
          callback(this.cachedConfig)
        } catch (error) {
          console.error('配置变化回调错误:', error)
        }
      }
    }
  }

  private migrateConfig(oldConfig: any): AppConfig {
    const newConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG))

    if (oldConfig.version) newConfig.version = oldConfig.version
    if (oldConfig.edition) newConfig.edition = oldConfig.edition

    if (oldConfig.ai) {
      if (oldConfig.ai.configGroups && oldConfig.ai.configGroups.length > 0) {
        newConfig.ai.configGroups = oldConfig.ai.configGroups
        newConfig.ai.activeGroupId = oldConfig.ai.activeGroupId || oldConfig.ai.configGroups[0].id
      } else if (oldConfig.ai.apiConfigs && oldConfig.ai.apiConfigs.length > 0) {
        const apiKeys = oldConfig.ai.apiConfigs.map((c: any) => c.apiKey).filter(Boolean)
        const firstConfig = oldConfig.ai.apiConfigs[0]

        newConfig.ai.configGroups = [{
          id: 'migrated-config',
          name: '迁移的配置',
          description: '从旧版本迁移的API配置',
          provider: firstConfig.provider || 'siliconflow',
          baseUrl: firstConfig.baseUrl || 'https://api.siliconflow.cn/v1',
          apiKeys: apiKeys.length > 0 ? apiKeys : DEFAULT_CONFIG.ai.configGroups[0].apiKeys,
          model: firstConfig.model || 'inclusionAI/Ling-flash-2.0',
          isThinkingModel: false,
          concurrency: {
            aiDefinitionConcurrency: 30,
            shortSentenceConcurrency: 34,
            batchDelayMs: 100,
            retryDelayMs: 500,
          }
        }]
        newConfig.ai.activeGroupId = 'migrated-config'
      }

      if (oldConfig.ai.concurrency) {
        newConfig.ai.concurrency = { ...newConfig.ai.concurrency, ...oldConfig.ai.concurrency }
      }
    }

    if (oldConfig.libraries) {
      newConfig.libraries = { ...newConfig.libraries, ...oldConfig.libraries }
    }
    if (oldConfig.system) {
      newConfig.system = { ...newConfig.system, ...oldConfig.system }
      if (oldConfig.system.backgroundSettings) {
        newConfig.system.backgroundSettings = {
          ...newConfig.system.backgroundSettings,
          ...oldConfig.system.backgroundSettings,
        }
      }
      if (!newConfig.system.autoFilter) {
        newConfig.system.autoFilter = { enabled: true, defaultLibraryId: '' }
      }
    }
    if (oldConfig.features) {
      newConfig.features = { ...newConfig.features, ...oldConfig.features }
    }
    if (oldConfig.tourPlayedRecord) {
      newConfig.tourPlayedRecord = { ...newConfig.tourPlayedRecord, ...oldConfig.tourPlayedRecord }
    }

    return newConfig
  }

  private mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
    return {
      ...base,
      ...override,
      ai: {
        ...base.ai,
        ...(override.ai || {}),
        configGroups: override.ai?.configGroups || base.ai.configGroups,
        concurrency: {
          ...base.ai.concurrency,
          ...(override.ai?.concurrency || {}),
        },
      },
      libraries: {
        ...base.libraries,
        ...(override.libraries || {}),
      },
      system: {
        ...base.system,
        ...(override.system || {}),
        backgroundSettings: {
          ...base.system.backgroundSettings,
          ...(override.system?.backgroundSettings || {}),
        },
      },
      features: {
        ...base.features,
        ...(override.features || {}),
      },
      tourPlayedRecord: {
        ...base.tourPlayedRecord,
        ...(override.tourPlayedRecord || {}),
      },
    }
  }

  private getDefaultLibraries() {
    return {
      libraries: [],
      quotes: [],
      definitions: [],
      translations: [],
      characterDefinitionLinks: [],
      sentenceTranslationLinks: [],
      shortSentences: [],
      keyCharacters: [],
    }
  }

  isElectronEnvironment(): boolean {
    return isElectron
  }
}

export const configBridge = new ConfigBridge()
