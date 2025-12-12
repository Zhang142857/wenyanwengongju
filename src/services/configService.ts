/**
 * 统一配置管理服务
 */

import type { AppConfig, ApiConfig, ApiConfigGroup } from '@/types/config'
import { DEFAULT_CONFIG } from '@/types/config'
import { configBridge } from './configBridge'

const CONFIG_STORAGE_KEY = 'app_config'
const MIGRATION_FLAG_KEY = 'config_migrated_v3'

class ConfigService {
    private config: AppConfig
    private listeners: Set<(config: AppConfig) => void> = new Set()
    private currentKeyIndex: number = 0
    private initialized: boolean = false

    constructor() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
    }

    async initialize(): Promise<void> {
        if (this.initialized) return

        try {
            this.config = await configBridge.initialize()
            const migrated = localStorage.getItem(MIGRATION_FLAG_KEY)
            if (!migrated) {
                await this.migrateFromLocalStorage()
                localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
            }

            configBridge.onChange((newConfig) => {
                this.config = newConfig
                this.notifyListeners()
            })

            this.initialized = true
        } catch (error) {
            console.error('配置服务初始化失败:', error)
            this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
            this.initialized = true
        }
    }

    private migrateConfig(oldConfig: any): AppConfig {
        const newConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
        if (oldConfig.version) newConfig.version = oldConfig.version
        if (oldConfig.edition) newConfig.edition = oldConfig.edition
        if (oldConfig.ai) {
            if (oldConfig.ai.configGroups?.length > 0) {
                newConfig.ai.configGroups = oldConfig.ai.configGroups
                newConfig.ai.activeGroupId = oldConfig.ai.activeGroupId || oldConfig.ai.configGroups[0].id
            }
            if (oldConfig.ai.concurrency) {
                newConfig.ai.concurrency = { ...newConfig.ai.concurrency, ...oldConfig.ai.concurrency }
            }
        }
        if (oldConfig.libraries) newConfig.libraries = { ...newConfig.libraries, ...oldConfig.libraries }
        if (oldConfig.system) {
            newConfig.system = { ...newConfig.system, ...oldConfig.system }
            if (oldConfig.system.backgroundSettings) {
                newConfig.system.backgroundSettings = { ...newConfig.system.backgroundSettings, ...oldConfig.system.backgroundSettings }
            }
        }
        if (oldConfig.features) newConfig.features = { ...newConfig.features, ...oldConfig.features }
        if (oldConfig.tourPlayedRecord) newConfig.tourPlayedRecord = { ...newConfig.tourPlayedRecord, ...oldConfig.tourPlayedRecord }
        return newConfig
    }

    private async migrateFromLocalStorage(): Promise<void> {
        const concurrencyConfig = localStorage.getItem('concurrency_config')
        if (concurrencyConfig) {
            try {
                const parsed = JSON.parse(concurrencyConfig)
                this.config.ai.concurrency = { ...this.config.ai.concurrency, ...parsed }
            } catch (error) {}
        }
        const bgType = localStorage.getItem('homeBgType')
        const bgUrl = localStorage.getItem('homeBgUrl')
        const bgEffect = localStorage.getItem('homeBgEffect')
        if (bgType) this.config.system.backgroundSettings.type = bgType as any
        if (bgUrl) this.config.system.backgroundSettings.url = bgUrl
        if (bgEffect) this.config.system.backgroundSettings.effect = bgEffect as any
    }

    async load(): Promise<AppConfig> {
        try {
            this.config = await configBridge.getConfig()
        } catch (error) {
            const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
            if (stored) this.config = this.migrateConfig(JSON.parse(stored))
        }
        return this.config
    }

    async save(): Promise<void> {
        try {
            const success = await configBridge.saveConfig(this.config)
            if (success) {
                localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config, null, 2))
                this.notifyListeners()
            }
        } catch (error) {
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config, null, 2))
            this.notifyListeners()
        }
    }

    getConfig(): AppConfig {
        return JSON.parse(JSON.stringify(this.config))
    }

    async updateConfig(partial: Partial<AppConfig>): Promise<void> {
        this.config = this.mergeConfig(this.config, partial)
        await this.save()
    }

    getConfigGroups(): ApiConfigGroup[] {
        return [...this.config.ai.configGroups]
    }

    getActiveConfigGroup(): ApiConfigGroup | null {
        return this.config.ai.configGroups.find(g => g.id === this.config.ai.activeGroupId) || null
    }

    async setActiveConfigGroup(groupId: string): Promise<void> {
        if (this.config.ai.configGroups.some(g => g.id === groupId)) {
            this.config.ai.activeGroupId = groupId
            this.currentKeyIndex = 0
            await this.save()
        }
    }

    async addConfigGroup(group: Omit<ApiConfigGroup, 'id'>): Promise<string> {
        const id = `group-${Date.now()}`
        this.config.ai.configGroups.push({ ...group, id })
        await this.save()
        return id
    }

    async updateConfigGroup(groupId: string, updates: Partial<ApiConfigGroup>): Promise<void> {
        const index = this.config.ai.configGroups.findIndex(g => g.id === groupId)
        if (index >= 0) {
            this.config.ai.configGroups[index] = { ...this.config.ai.configGroups[index], ...updates, id: groupId }
            await this.save()
        }
    }

    async deleteConfigGroup(groupId: string): Promise<void> {
        const index = this.config.ai.configGroups.findIndex(g => g.id === groupId)
        if (index >= 0) {
            this.config.ai.configGroups.splice(index, 1)
            if (this.config.ai.activeGroupId === groupId && this.config.ai.configGroups.length > 0) {
                this.config.ai.activeGroupId = this.config.ai.configGroups[0].id
            }
            await this.save()
        }
    }

    async addApiKeyToGroup(groupId: string, apiKey: string): Promise<void> {
        const group = this.config.ai.configGroups.find(g => g.id === groupId)
        if (group && !group.apiKeys.includes(apiKey)) {
            group.apiKeys.push(apiKey)
            await this.save()
        }
    }

    async removeApiKeyFromGroup(groupId: string, apiKeyIndex: number): Promise<void> {
        const group = this.config.ai.configGroups.find(g => g.id === groupId)
        if (group && apiKeyIndex >= 0 && apiKeyIndex < group.apiKeys.length) {
            group.apiKeys.splice(apiKeyIndex, 1)
            await this.save()
        }
    }

    getNextApiConfig(): { baseUrl: string; apiKey: string; model: string; provider: string } | null {
        const activeGroup = this.getActiveConfigGroup()
        if (!activeGroup || activeGroup.apiKeys.length === 0) return null
        const apiKey = activeGroup.apiKeys[this.currentKeyIndex % activeGroup.apiKeys.length]
        this.currentKeyIndex = (this.currentKeyIndex + 1) % activeGroup.apiKeys.length
        return { baseUrl: activeGroup.baseUrl, apiKey, model: activeGroup.model, provider: activeGroup.provider }
    }

    getApiKeyCount(): number {
        const activeGroup = this.getActiveConfigGroup()
        return activeGroup?.apiKeys.length || 0
    }

    getAIConfig(): ApiConfig[] {
        const activeGroup = this.getActiveConfigGroup()
        if (!activeGroup) return []
        return activeGroup.apiKeys.map(apiKey => ({
            provider: activeGroup.provider,
            baseUrl: activeGroup.baseUrl,
            apiKey,
            model: activeGroup.model,
        }))
    }

    async addApiConfig(apiConfig: ApiConfig): Promise<void> {
        const activeGroup = this.getActiveConfigGroup()
        if (activeGroup) {
            await this.addApiKeyToGroup(activeGroup.id, apiConfig.apiKey)
        } else {
            await this.addConfigGroup({
                name: '默认配置',
                provider: apiConfig.provider,
                baseUrl: apiConfig.baseUrl,
                apiKeys: [apiConfig.apiKey],
                model: apiConfig.model,
                isThinkingModel: false,
                concurrency: { aiDefinitionConcurrency: 30, shortSentenceConcurrency: 34, batchDelayMs: 100, retryDelayMs: 500 }
            })
        }
    }

    async updateApiConfig(index: number, apiConfig: ApiConfig): Promise<void> {
        const activeGroup = this.getActiveConfigGroup()
        if (activeGroup && index >= 0 && index < activeGroup.apiKeys.length) {
            activeGroup.apiKeys[index] = apiConfig.apiKey
            await this.save()
        }
    }

    async deleteApiConfig(index: number): Promise<void> {
        const activeGroup = this.getActiveConfigGroup()
        if (activeGroup) await this.removeApiKeyFromGroup(activeGroup.id, index)
    }

    getConcurrencyConfig() {
        return { ...this.config.ai.concurrency }
    }

    async updateConcurrencyConfig(concurrency: Partial<typeof this.config.ai.concurrency>): Promise<void> {
        this.config.ai.concurrency = { ...this.config.ai.concurrency, ...concurrency }
        await this.save()
    }

    getAutoFilterConfig() {
        return this.config.system.autoFilter || { enabled: true, defaultLibraryId: '' }
    }

    async updateAutoFilterConfig(autoFilter: Partial<typeof this.config.system.autoFilter>): Promise<void> {
        this.config.system.autoFilter = { ...this.config.system.autoFilter, ...autoFilter }
        await this.save()
    }

    async markTourPlayed(page: keyof typeof this.config.tourPlayedRecord): Promise<void> {
        this.config.tourPlayedRecord[page] = true
        await this.save()
    }

    hasTourPlayed(page: keyof typeof this.config.tourPlayedRecord): boolean {
        return this.config.tourPlayedRecord[page] || false
    }

    async resetTourRecord(): Promise<void> {
        Object.keys(this.config.tourPlayedRecord).forEach((key) => {
            (this.config.tourPlayedRecord as any)[key] = false
        })
        await this.save()
    }

    exportConfig(): string {
        return JSON.stringify(this.config, null, 2)
    }

    exportFullData(): string {
        const storageData = localStorage.getItem('classical-chinese-data')
        return JSON.stringify({ config: this.config, libraries: storageData ? JSON.parse(storageData) : null, exportedAt: new Date().toISOString() }, null, 2)
    }

    async importConfig(jsonString: string): Promise<void> {
        try {
            const imported = JSON.parse(jsonString)
            this.config = this.migrateConfig(imported)
            await this.save()
        } catch (error) {
            throw new Error('配置文件格式不正确')
        }
    }

    async importFullData(jsonString: string): Promise<{ configImported: boolean; librariesImported: boolean }> {
        try {
            const imported = JSON.parse(jsonString)
            const result = { configImported: false, librariesImported: false }
            if (imported.config && imported.libraries) {
                this.config = this.migrateConfig(imported.config)
                await this.save()
                result.configImported = true
                if (imported.libraries) {
                    localStorage.setItem('classical-chinese-data', JSON.stringify(imported.libraries))
                    result.librariesImported = true
                }
            } else {
                this.config = this.migrateConfig(imported)
                await this.save()
                result.configImported = true
            }
            return result
        } catch (error) {
            throw new Error('数据文件格式不正确')
        }
    }

    async resetToDefault(): Promise<void> {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
        await this.save()
    }

    async getDirectoryInfo() {
        return configBridge.getDirectoryInfo()
    }

    async openConfigDirectory(): Promise<boolean> {
        return configBridge.openConfigDirectory()
    }

    async clearCache(): Promise<boolean> {
        return configBridge.clearCache()
    }

    isElectronEnvironment(): boolean {
        return configBridge.isElectronEnvironment()
    }

    onChange(listener: (config: AppConfig) => void): () => void {
        this.listeners.add(listener)
        return () => { this.listeners.delete(listener) }
    }

    private notifyListeners(): void {
        this.listeners.forEach((listener) => { listener(this.config) })
    }

    private mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
        return {
            ...base,
            ...override,
            ai: { ...base.ai, ...(override.ai || {}), configGroups: override.ai?.configGroups || base.ai.configGroups, concurrency: { ...base.ai.concurrency, ...(override.ai?.concurrency || {}) } },
            libraries: { ...base.libraries, ...(override.libraries || {}) },
            system: { ...base.system, ...(override.system || {}), backgroundSettings: { ...base.system.backgroundSettings, ...(override.system?.backgroundSettings || {}) } },
            features: { ...base.features, ...(override.features || {}) },
            tourPlayedRecord: { ...base.tourPlayedRecord, ...(override.tourPlayedRecord || {}) },
        }
    }
}

export const configService = new ConfigService()
export type { AppConfig }
