/**
 * 配置系统集成测试
 * 测试配置服务与其他服务的集成
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { configService } from './configService'
import { initConcurrencyConfig, getConcurrencyConfig, updateConcurrencyConfig } from './concurrencyConfig'

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

describe('配置系统集成测试', () => {
    beforeEach(() => {
        localStorageMock.clear()
        vi.clearAllMocks()
    })

    afterEach(() => {
        localStorageMock.clear()
    })

    describe('配置服务与并发配置集成', () => {
        it('初始化后并发配置应该从统一配置加载', async () => {
            // 初始化配置服务
            await configService.initialize()
            
            // 获取当前激活的配置组并更新其并发配置
            const activeGroup = configService.getActiveConfigGroup()
            if (activeGroup) {
                await configService.updateConfigGroup(activeGroup.id, {
                    ...activeGroup,
                    concurrency: {
                        ...activeGroup.concurrency,
                        aiDefinitionConcurrency: 45,
                        batchDelayMs: 250,
                    }
                })
            }

            // 初始化并发配置
            initConcurrencyConfig()
            const concurrencyConfig = getConcurrencyConfig()

            expect(concurrencyConfig.aiDefinitionConcurrency).toBe(45)
            expect(concurrencyConfig.batchDelayMs).toBe(250)
        })

        it('更新并发配置应该同步到配置组', async () => {
            await configService.initialize()
            initConcurrencyConfig()

            // 通过并发配置服务更新
            updateConcurrencyConfig({
                shortSentenceConcurrency: 60,
            })

            // 检查是否同步到配置组
            await new Promise(resolve => setTimeout(resolve, 100))

            const activeGroup = configService.getActiveConfigGroup()
            expect(activeGroup?.concurrency.shortSentenceConcurrency).toBe(60)
        })
    })

    describe('数据迁移场景测试', () => {
        it('完整的迁移场景：从旧版本升级', async () => {
            // 模拟旧版本的数据
            const oldConcurrencyConfig = {
                aiDefinitionConcurrency: 20,
                shortSentenceConcurrency: 25,
                batchDelayMs: 120,
                retryDelayMs: 550,
            }

            localStorageMock.setItem('concurrency_config', JSON.stringify(oldConcurrencyConfig))
            localStorageMock.setItem('homeBgType', 'image')
            localStorageMock.setItem('homeBgUrl', 'https://example.com/bg.jpg')
            localStorageMock.setItem('homeBgEffect', 'blur')

            // 触发迁移
            await configService.initialize()

            // 验证迁移结果
            const config = configService.getConfig()

            // 并发配置应该被迁移
            expect(config.ai.concurrency.aiDefinitionConcurrency).toBe(20)
            expect(config.ai.concurrency.batchDelayMs).toBe(120)

            // 背景设置应该被迁移
            expect(config.system.backgroundSettings.type).toBe('image')
            expect(config.system.backgroundSettings.url).toBe('https://example.com/bg.jpg')
            expect(config.system.backgroundSettings.effect).toBe('blur')
        })

        it('部分数据迁移：只有并发配置', async () => {
            const oldConcurrencyConfig = {
                aiDefinitionConcurrency: 35,
                shortSentenceConcurrency: 40,
                batchDelayMs: 150,
                retryDelayMs: 600,
            }

            localStorageMock.setItem('concurrency_config', JSON.stringify(oldConcurrencyConfig))

            await configService.initialize()
            const config = configService.getConfig()

            expect(config.ai.concurrency.aiDefinitionConcurrency).toBe(35)
        })

        it('迁移失败时应该使用默认值', async () => {
            // 设置无效的旧数据
            localStorageMock.setItem('concurrency_config', 'invalid json{')

            // 不应该抛出错误
            await expect(configService.initialize()).resolves.not.toThrow()

            const config = configService.getConfig()
            expect(config).toBeDefined()
            expect(config.version).toBeDefined()
        })
    })

    describe('配置持久化测试', () => {
        it('配置应该在页面刷新后保持', async () => {
            // 第一次会话
            await configService.initialize()
            
            // 添加API Key到当前配置组
            const activeGroup = configService.getActiveConfigGroup()
            if (activeGroup) {
                await configService.addApiKeyToGroup(activeGroup.id, 'custom-key')
                await configService.updateConfigGroup(activeGroup.id, {
                    ...activeGroup,
                    concurrency: {
                        ...activeGroup.concurrency,
                        aiDefinitionConcurrency: 55,
                    }
                })
            }

            await configService.markTourPlayed('home')

            // 模拟页面刷新（重新初始化）
            const savedConfig = localStorageMock.getItem('app_config')

            // 清空内存，重新加载
            localStorageMock.clear()
            localStorageMock.setItem('app_config', savedConfig!)
            localStorageMock.setItem('config_migrated_v2', 'true')

            await configService.initialize()

            // 验证数据是否保持
            const config = configService.getConfig()
            const newActiveGroup = configService.getActiveConfigGroup()

            expect(newActiveGroup?.apiKeys).toContain('custom-key')
            expect(config.tourPlayedRecord.home).toBe(true)
        })
    })

    describe('并发场景测试', () => {
        it('多次快速更新应该正确处理', async () => {
            await configService.initialize()

            const activeGroup = configService.getActiveConfigGroup()
            if (activeGroup) {
                // 快速连续更新
                const updates = [
                    configService.updateConfigGroup(activeGroup.id, {
                        ...activeGroup,
                        concurrency: { ...activeGroup.concurrency, aiDefinitionConcurrency: 10 }
                    }),
                    configService.updateConfigGroup(activeGroup.id, {
                        ...activeGroup,
                        concurrency: { ...activeGroup.concurrency, aiDefinitionConcurrency: 20 }
                    }),
                    configService.updateConfigGroup(activeGroup.id, {
                        ...activeGroup,
                        concurrency: { ...activeGroup.concurrency, aiDefinitionConcurrency: 30 }
                    }),
                ]

                await Promise.all(updates)
            }

            const config = configService.getConcurrencyConfig()
            // 最后一次更新应该生效
            expect(config.aiDefinitionConcurrency).toBe(30)
        })

        it('同时更新不同配置项应该正确处理', async () => {
            await configService.initialize()

            const activeGroup = configService.getActiveConfigGroup()
            if (activeGroup) {
                await Promise.all([
                    configService.updateConfigGroup(activeGroup.id, {
                        ...activeGroup,
                        concurrency: { ...activeGroup.concurrency, aiDefinitionConcurrency: 15 }
                    }),
                    configService.markTourPlayed('import'),
                    configService.addApiKeyToGroup(activeGroup.id, 'test-key'),
                ])
            }

            const config = configService.getConfig()
            const newActiveGroup = configService.getActiveConfigGroup()

            expect(newActiveGroup?.concurrency.aiDefinitionConcurrency).toBe(15)
            expect(config.tourPlayedRecord.import).toBe(true)
            expect(newActiveGroup?.apiKeys).toContain('test-key')
        })
    })

    describe('错误恢复测试', () => {
        it('配置数据损坏时应该恢复到默认配置', async () => {
            localStorageMock.setItem('app_config', '{"invalid": json}')

            await configService.initialize()
            const config = configService.getConfig()

            // 应该使用默认配置
            expect(config.version).toBeDefined()
            expect(config.edition).toBeDefined()
        })
    })

    describe('性能测试', () => {
        it('大量API Key不应该影响性能', async () => {
            await configService.initialize()

            const startTime = Date.now()

            const activeGroup = configService.getActiveConfigGroup()
            if (activeGroup) {
                // 添加100个API Key
                for (let i = 0; i < 100; i++) {
                    await configService.addApiKeyToGroup(activeGroup.id, `key-${i}`)
                }
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            // 应该在合理时间内完成
            expect(duration).toBeLessThan(5000) // 5秒

            // 验证所有Key都已添加
            const newActiveGroup = configService.getActiveConfigGroup()
            expect(newActiveGroup?.apiKeys.length).toBeGreaterThanOrEqual(100)
        })

        it('频繁的配置读取应该快速', async () => {
            await configService.initialize()

            const startTime = Date.now()

            // 读取1000次
            for (let i = 0; i < 1000; i++) {
                configService.getConfig()
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            // 读取应该非常快
            expect(duration).toBeLessThan(100) // 100毫秒
        })
    })
})
