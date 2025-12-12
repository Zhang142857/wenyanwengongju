/**
 * 配置服务测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { configService } from './configService'
import { DEFAULT_CONFIG } from '@/types/config'
import type { ApiConfig } from '@/types/config'

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {}

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString()
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        clear: () => {
            store = {}
        },
    }
})()

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
})

describe('ConfigService', () => {
    beforeEach(() => {
        localStorageMock.clear()
        vi.clearAllMocks()
    })

    afterEach(() => {
        localStorageMock.clear()
    })

    describe('初始化和加载', () => {
        it('应该初始化为默认配置', async () => {
            await configService.initialize()
            const config = configService.getConfig()

            expect(config.version).toBe(DEFAULT_CONFIG.version)
            expect(config.edition).toBe(DEFAULT_CONFIG.edition)
        })

        it('应该从localStorage加载已保存的配置', async () => {
            const customConfig = {
                ...DEFAULT_CONFIG,
                edition: 'custom' as const,
                system: {
                    ...DEFAULT_CONFIG.system,
                    appTitle: '自定义标题',
                },
            }

            localStorageMock.setItem('app_config', JSON.stringify(customConfig))

            await configService.initialize()
            const config = configService.getConfig()

            expect(config.edition).toBe('custom')
            expect(config.system.appTitle).toBe('自定义标题')
        })

        it('加载失败时应该降级到默认配置', async () => {
            localStorageMock.setItem('app_config', 'invalid json{')

            await configService.initialize()
            const config = configService.getConfig()

            expect(config.version).toBe(DEFAULT_CONFIG.version)
        })
    })

    describe('配置保存', () => {
        it('应该能保存配置到localStorage', async () => {
            await configService.initialize()
            await configService.updateConfig({
                system: {
                    ...DEFAULT_CONFIG.system,
                    appTitle: '新标题',
                },
            })

            const saved = localStorageMock.getItem('app_config')
            expect(saved).toBeTruthy()

            const parsed = JSON.parse(saved!)
            expect(parsed.system.appTitle).toBe('新标题')
        })
    })

    describe('API配置管理', () => {
        beforeEach(async () => {
            await configService.initialize()
        })

        it('应该能获取所有API配置', () => {
            const apiConfigs = configService.getAIConfig()
            expect(Array.isArray(apiConfigs)).toBe(true)
        })

        it('应该能添加API配置', async () => {
            const newConfig: ApiConfig = {
                provider: 'custom',
                baseUrl: 'https://api.example.com/v1',
                apiKey: 'sk-test-key',
                model: 'test-model',
            }

            const initialCount = configService.getAIConfig().length
            await configService.addApiConfig(newConfig)
            const updatedCount = configService.getAIConfig().length

            expect(updatedCount).toBe(initialCount + 1)

            const configs = configService.getAIConfig()
            const addedConfig = configs[configs.length - 1]
            expect(addedConfig.apiKey).toBe('sk-test-key')
        })

        it('应该能更新API配置', async () => {
            // 新的配置结构使用 configGroups，updateApiConfig 只更新 apiKey
            const configs = configService.getAIConfig()
            if (configs.length === 0) {
                await configService.addApiConfig({
                    provider: 'siliconflow',
                    baseUrl: 'https://api.siliconflow.cn/v1',
                    apiKey: 'test-key',
                    model: 'test-model',
                })
            }

            const updatedConfig: ApiConfig = {
                provider: 'deepseek',
                baseUrl: 'https://api.deepseek.com/v1',
                apiKey: 'updated-key',
                model: 'updated-model',
            }

            await configService.updateApiConfig(0, updatedConfig)
            const configs2 = configService.getAIConfig()

            // 新结构中 updateApiConfig 只更新 apiKey
            expect(configs2[0].apiKey).toBe('updated-key')
        })

        it('应该能删除API配置', async () => {
            await configService.addApiConfig({
                provider: 'siliconflow',
                baseUrl: 'https://api.siliconflow.cn/v1',
                apiKey: 'test-key',
                model: 'test-model',
            })

            const initialCount = configService.getAIConfig().length
            await configService.deleteApiConfig(initialCount - 1)
            const updatedCount = configService.getAIConfig().length

            expect(updatedCount).toBe(initialCount - 1)
        })
    })

    describe('并发配置管理', () => {
        beforeEach(async () => {
            await configService.initialize()
        })

        it('应该能获取并发配置', () => {
            const concurrency = configService.getConcurrencyConfig()

            expect(concurrency.aiDefinitionConcurrency).toBeGreaterThan(0)
            expect(concurrency.shortSentenceConcurrency).toBeGreaterThan(0)
            expect(concurrency.batchDelayMs).toBeGreaterThanOrEqual(0)
        })

        it('应该能更新并发配置', async () => {
            await configService.updateConcurrencyConfig({
                aiDefinitionConcurrency: 50,
                batchDelayMs: 200,
            })

            const config = configService.getConcurrencyConfig()
            expect(config.aiDefinitionConcurrency).toBe(50)
            expect(config.batchDelayMs).toBe(200)
        })
    })

    describe('教程播放记录', () => {
        beforeEach(async () => {
            await configService.initialize()
        })

        it('初始状态下所有教程都未播放', () => {
            expect(configService.hasTourPlayed('home')).toBe(false)
            expect(configService.hasTourPlayed('import')).toBe(false)
            expect(configService.hasTourPlayed('exam')).toBe(false)
        })

        it('应该能标记教程已播放', async () => {
            await configService.markTourPlayed('home')
            expect(configService.hasTourPlayed('home')).toBe(true)
            expect(configService.hasTourPlayed('import')).toBe(false)
        })

        it('应该能重置教程记录', async () => {
            await configService.markTourPlayed('home')
            await configService.markTourPlayed('import')

            await configService.resetTourRecord()

            expect(configService.hasTourPlayed('home')).toBe(false)
            expect(configService.hasTourPlayed('import')).toBe(false)
        })
    })

    describe('配置导入导出', () => {
        beforeEach(async () => {
            await configService.initialize()
        })

        it('应该能导出配置为JSON', () => {
            const exported = configService.exportConfig()

            expect(typeof exported).toBe('string')
            expect(() => JSON.parse(exported)).not.toThrow()

            const parsed = JSON.parse(exported)
            expect(parsed.version).toBeDefined()
            expect(parsed.edition).toBeDefined()
        })

        it('应该能导入有效的配置', async () => {
            const customConfig = {
                ...DEFAULT_CONFIG,
                edition: 'enterprise' as const,
                system: {
                    ...DEFAULT_CONFIG.system,
                    appTitle: '企业版',
                },
            }

            await configService.importConfig(JSON.stringify(customConfig))
            const config = configService.getConfig()

            expect(config.edition).toBe('enterprise')
            expect(config.system.appTitle).toBe('企业版')
        })

        it('导入无效配置应该抛出错误', async () => {
            await expect(
                configService.importConfig('invalid json{')
            ).rejects.toThrow()
        })
    })

    describe('重置配置', () => {
        it('应该能重置为默认配置', async () => {
            await configService.initialize()

            // 先修改配置
            await configService.updateConfig({
                edition: 'custom',
                system: {
                    ...DEFAULT_CONFIG.system,
                    appTitle: '自定义标题',
                },
            })

            // 重置
            await configService.resetToDefault()
            const config = configService.getConfig()

            expect(config.edition).toBe(DEFAULT_CONFIG.edition)
            expect(config.system.appTitle).toBe(DEFAULT_CONFIG.system.appTitle)
        })
    })

    describe('数据迁移', () => {
        it('应该能从localStorage迁移并发配置', async () => {
            const oldConcurrencyConfig = {
                aiDefinitionConcurrency: 25,
                shortSentenceConcurrency: 30,
                batchDelayMs: 150,
                retryDelayMs: 600,
            }

            localStorageMock.setItem('concurrency_config', JSON.stringify(oldConcurrencyConfig))

            await configService.initialize()
            const config = configService.getConfig()

            expect(config.ai.concurrency.aiDefinitionConcurrency).toBe(25)
            expect(config.ai.concurrency.batchDelayMs).toBe(150)
        })

        it('应该能从localStorage迁移背景设置', async () => {
            localStorageMock.setItem('homeBgType', 'image')
            localStorageMock.setItem('homeBgUrl', 'https://example.com/bg.jpg')
            localStorageMock.setItem('homeBgEffect', 'blur')

            await configService.initialize()
            const config = configService.getConfig()

            expect(config.system.backgroundSettings.type).toBe('image')
            expect(config.system.backgroundSettings.url).toBe('https://example.com/bg.jpg')
            expect(config.system.backgroundSettings.effect).toBe('blur')
        })

        it('迁移后应该设置迁移标记', async () => {
            localStorageMock.setItem('homeBgType', 'gradient')

            await configService.initialize()

            // 新版本使用 config_migrated_v2 作为迁移标记
            const migrationFlag = localStorageMock.getItem('config_migrated_v2')
            expect(migrationFlag).toBe('true')
        })

        it('已迁移后不应该重复迁移', async () => {
            localStorageMock.setItem('config_migrated_v2', 'true')
            localStorageMock.setItem('homeBgType', 'image')

            // 设置一个不同的配置
            const customConfig = {
                ...DEFAULT_CONFIG,
                system: {
                    ...DEFAULT_CONFIG.system,
                    backgroundSettings: {
                        type: 'video' as const,
                        effect: 'none' as const,
                    },
                },
            }
            localStorageMock.setItem('app_config', JSON.stringify(customConfig))

            await configService.initialize()
            const config = configService.getConfig()

            // 应该保持现有配置，不被迁移覆盖
            expect(config.system.backgroundSettings.type).toBe('video')
        })
    })

    describe('配置合并', () => {
        it('应该能正确合并部分配置', async () => {
            await configService.initialize()

            const originalEdition = configService.getConfig().edition

            await configService.updateConfig({
                system: {
                    ...DEFAULT_CONFIG.system,
                    appTitle: '新标题',
                },
            })

            const config = configService.getConfig()

            // 应该更新指定的字段
            expect(config.system.appTitle).toBe('新标题')
            // 应该保留其他字段
            expect(config.edition).toBe(originalEdition)
            expect(config.version).toBe(DEFAULT_CONFIG.version)
        })

        it('深层嵌套配置应该正确合并', async () => {
            await configService.initialize()

            await configService.updateConcurrencyConfig({
                aiDefinitionConcurrency: 100,
            })

            const config = configService.getConfig()

            // 应该更新指定的字段
            expect(config.ai.concurrency.aiDefinitionConcurrency).toBe(100)
            // 应该保留其他字段
            expect(config.ai.concurrency.batchDelayMs).toBeDefined()
        })
    })

    describe('边界条件测试', () => {
        it('应该处理空API配置列表', async () => {
            await configService.initialize()

            // 清空所有API配置
            const configs = configService.getAIConfig()
            for (let i = configs.length - 1; i >= 0; i--) {
                await configService.deleteApiConfig(i)
            }

            const emptyConfigs = configService.getAIConfig()
            expect(emptyConfigs.length).toBe(0)
        })

        it('应该处理无效的索引', async () => {
            await configService.initialize()

            // 尝试更新不存在的索引
            await configService.updateApiConfig(999, {
                provider: 'custom',
                baseUrl: 'test',
                apiKey: 'test',
                model: 'test',
            })

            // 不应该崩溃，配置应该保持不变
            const config = configService.getConfig()
            expect(config).toBeDefined()
        })

        it('应该处理负数索引', async () => {
            await configService.initialize()

            await configService.deleteApiConfig(-1)

            // 不应该崩溃
            const config = configService.getConfig()
            expect(config).toBeDefined()
        })
    })

    describe('配置监听器', () => {
        it('应该能注册配置变化监听器', async () => {
            await configService.initialize()

            let callCount = 0
            const unsubscribe = configService.onChange(() => {
                callCount++
            })

            await configService.updateConfig({
                system: {
                    ...DEFAULT_CONFIG.system,
                    appTitle: '测试标题',
                },
            })

            expect(callCount).toBeGreaterThan(0)
            unsubscribe()
        })

        it('取消订阅后不应该收到通知', async () => {
            await configService.initialize()

            let callCount = 0
            const unsubscribe = configService.onChange(() => {
                callCount++
            })

            unsubscribe()

            await configService.updateConfig({
                system: {
                    ...DEFAULT_CONFIG.system,
                    appTitle: '测试标题2',
                },
            })

            expect(callCount).toBe(0)
        })
    })
})
