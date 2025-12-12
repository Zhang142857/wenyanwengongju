/**
 * 配置类型测试
 */

import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import type { AppConfig, ApiConfig, ConcurrencyConfig } from './config'

describe('配置类型定义', () => {
    describe('DEFAULT_CONFIG', () => {
        it('应该有正确的版本号', () => {
            expect(DEFAULT_CONFIG.version).toBe('1.0.0')
        })

        it('应该有有效的edition类型', () => {
            expect(['community', 'custom', 'enterprise']).toContain(DEFAULT_CONFIG.edition)
        })

        it('应该包含AI配置', () => {
            expect(DEFAULT_CONFIG.ai).toBeDefined()
            expect(DEFAULT_CONFIG.ai.configGroups).toBeInstanceOf(Array)
            expect(DEFAULT_CONFIG.ai.configGroups.length).toBeGreaterThan(0)
            expect(DEFAULT_CONFIG.ai.concurrency).toBeDefined()
        })

        it('应该包含libraries配置', () => {
            expect(DEFAULT_CONFIG.libraries).toBeDefined()
            expect(DEFAULT_CONFIG.libraries.defaultLibraries).toBeInstanceOf(Array)
            expect(DEFAULT_CONFIG.libraries.focusWords).toBeDefined()
            expect(DEFAULT_CONFIG.libraries.keyCharacters).toBeInstanceOf(Array)
        })

        it('应该包含system配置', () => {
            expect(DEFAULT_CONFIG.system).toBeDefined()
            expect(DEFAULT_CONFIG.system.appTitle).toBeDefined()
            expect(typeof DEFAULT_CONFIG.system.enableTour).toBe('boolean')
            expect(typeof DEFAULT_CONFIG.system.hasPlayedTour).toBe('boolean')
            expect(DEFAULT_CONFIG.system.backgroundSettings).toBeDefined()
        })

        it('应该包含features配置', () => {
            expect(DEFAULT_CONFIG.features).toBeDefined()
            expect(typeof DEFAULT_CONFIG.features.enableAIOrganize).toBe('boolean')
            expect(typeof DEFAULT_CONFIG.features.enableExam).toBe('boolean')
            expect(typeof DEFAULT_CONFIG.features.enableRegexGenerator).toBe('boolean')
        })

        it('应该包含tourPlayedRecord', () => {
            expect(DEFAULT_CONFIG.tourPlayedRecord).toBeDefined()
            expect(typeof DEFAULT_CONFIG.tourPlayedRecord.home).toBe('boolean')
            expect(typeof DEFAULT_CONFIG.tourPlayedRecord.import).toBe('boolean')
            expect(typeof DEFAULT_CONFIG.tourPlayedRecord.exam).toBe('boolean')
        })
    })

    describe('ApiConfig类型', () => {
        it('应该接受有效的provider值', () => {
            const validProviders: ApiConfig['provider'][] = [
                'siliconflow',
                'minimax',
                'deepseek',
                'custom',
            ]

            validProviders.forEach(provider => {
                const config: ApiConfig = {
                    provider,
                    baseUrl: 'https://api.example.com',
                    apiKey: 'test-key',
                    model: 'test-model',
                }
                expect(config.provider).toBe(provider)
            })
        })
    })

    describe('ConcurrencyConfig类型', () => {
        it('应该有所有必需的字段', () => {
            const config: ConcurrencyConfig = DEFAULT_CONFIG.ai.concurrency

            expect(typeof config.aiDefinitionConcurrency).toBe('number')
            expect(typeof config.shortSentenceConcurrency).toBe('number')
            expect(typeof config.batchDelayMs).toBe('number')
            expect(typeof config.retryDelayMs).toBe('number')
        })

        it('并发数应该是正数', () => {
            const config = DEFAULT_CONFIG.ai.concurrency

            expect(config.aiDefinitionConcurrency).toBeGreaterThan(0)
            expect(config.shortSentenceConcurrency).toBeGreaterThan(0)
        })

        it('延迟应该是非负数', () => {
            const config = DEFAULT_CONFIG.ai.concurrency

            expect(config.batchDelayMs).toBeGreaterThanOrEqual(0)
            expect(config.retryDelayMs).toBeGreaterThanOrEqual(0)
        })
    })

    describe('AppConfig类型完整性', () => {
        it('应该符合AppConfig接口', () => {
            const config: AppConfig = DEFAULT_CONFIG

            // 验证所有必需字段都存在
            expect(config.version).toBeDefined()
            expect(config.edition).toBeDefined()
            expect(config.ai).toBeDefined()
            expect(config.libraries).toBeDefined()
            expect(config.system).toBeDefined()
            expect(config.features).toBeDefined()
            expect(config.tourPlayedRecord).toBeDefined()
        })

        it('嵌套对象应该完整', () => {
            const config = DEFAULT_CONFIG

            // AI配置
            expect(config.ai.configGroups).toBeDefined()
            expect(config.ai.concurrency).toBeDefined()

            // Libraries配置
            expect(config.libraries.defaultLibraries).toBeDefined()
            expect(config.libraries.focusWords).toBeDefined()
            expect(config.libraries.keyCharacters).toBeDefined()

            // System配置
            expect(config.system.appTitle).toBeDefined()
            expect(config.system.enableTour).toBeDefined()
            expect(config.system.hasPlayedTour).toBeDefined()
            expect(config.system.theme).toBeDefined()
            expect(config.system.backgroundSettings).toBeDefined()

            // Background settings
            expect(config.system.backgroundSettings.type).toBeDefined()
            expect(config.system.backgroundSettings.effect).toBeDefined()
        })

        it('所有教程记录字段都应该存在', () => {
            const tourRecord = DEFAULT_CONFIG.tourPlayedRecord

            const expectedPages = [
                'home',
                'import',
                'organize',
                'aiOrganize',
                'exam',
                'manage',
                'regexGenerator',
                'query',
            ]

            expectedPages.forEach(page => {
                expect(tourRecord).toHaveProperty(page)
                expect(typeof (tourRecord as any)[page]).toBe('boolean')
            })
        })
    })

    describe('默认值合理性', () => {
        it('focusWords应该包含常见重点字', () => {
            const focusWords = DEFAULT_CONFIG.libraries.focusWords

            // 检查是否包含一些常见的重点字
            expect(focusWords).toContain('之')
            expect(focusWords).toContain('而')
            expect(focusWords).toContain('以')
            expect(focusWords).toContain('于')
            expect(focusWords.length).toBeGreaterThan(50)
        })

        it('默认主题应该是gradient', () => {
            expect(DEFAULT_CONFIG.system.theme).toBe('gradient')
        })

        it('默认应该启用教程', () => {
            expect(DEFAULT_CONFIG.system.enableTour).toBe(true)
        })

        it('默认应该启用所有功能', () => {
            const features = DEFAULT_CONFIG.features

            expect(features.enableAIOrganize).toBe(true)
            expect(features.enableExam).toBe(true)
            expect(features.enableRegexGenerator).toBe(true)
            expect(features.enableImport).toBe(true)
            expect(features.enableManage).toBe(true)
        })

        it('默认所有教程都未播放', () => {
            const tourRecord = DEFAULT_CONFIG.tourPlayedRecord

            Object.values(tourRecord).forEach(played => {
                expect(played).toBe(false)
            })
        })
    })

    describe('类型约束测试', () => {
        it('edition应该只接受特定值', () => {
            const validEditions: AppConfig['edition'][] = ['community', 'custom', 'enterprise']

            validEditions.forEach(edition => {
                const config: AppConfig = {
                    ...DEFAULT_CONFIG,
                    edition,
                }
                expect(config.edition).toBe(edition)
            })
        })

        it('backgroundSettings.type应该只接受特定值', () => {
            const validTypes: ('gradient' | 'image' | 'video')[] = ['gradient', 'image', 'video']

            validTypes.forEach(type => {
                const config: AppConfig = {
                    ...DEFAULT_CONFIG,
                    system: {
                        ...DEFAULT_CONFIG.system,
                        backgroundSettings: {
                            ...DEFAULT_CONFIG.system.backgroundSettings,
                            type,
                        },
                    },
                }
                expect(config.system.backgroundSettings.type).toBe(type)
            })
        })

        it('backgroundSettings.effect应该只接受特定值', () => {
            const validEffects: ('none' | 'blur' | 'brightness' | 'grayscale')[] = [
                'none',
                'blur',
                'brightness',
                'grayscale',
            ]

            validEffects.forEach(effect => {
                const config: AppConfig = {
                    ...DEFAULT_CONFIG,
                    system: {
                        ...DEFAULT_CONFIG.system,
                        backgroundSettings: {
                            ...DEFAULT_CONFIG.system.backgroundSettings,
                            effect,
                        },
                    },
                }
                expect(config.system.backgroundSettings.effect).toBe(effect)
            })
        })
    })

    describe('配置JSON序列化', () => {
        it('应该能正确序列化为JSON', () => {
            const json = JSON.stringify(DEFAULT_CONFIG)
            expect(() => JSON.parse(json)).not.toThrow()
        })

        it('序列化后应该能还原', () => {
            const json = JSON.stringify(DEFAULT_CONFIG)
            const parsed = JSON.parse(json)

            expect(parsed.version).toBe(DEFAULT_CONFIG.version)
            expect(parsed.edition).toBe(DEFAULT_CONFIG.edition)
            expect(parsed.ai.concurrency.aiDefinitionConcurrency).toBe(
                DEFAULT_CONFIG.ai.concurrency.aiDefinitionConcurrency
            )
        })
    })
})
