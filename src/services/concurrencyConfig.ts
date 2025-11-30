/**
 * 并发配置管理服务
 * 允许前端动态调整AI请求和短句生成的并发参数
 */

export interface ConcurrencyConfig {
  // AI义项生成并发数
  aiDefinitionConcurrency: number
  // 短句生成并发数
  shortSentenceConcurrency: number
  // 批次间延迟（毫秒）
  batchDelayMs: number
  // 重试延迟（毫秒）
  retryDelayMs: number
  // 模型ID
  modelId: string
  // 是否是思考模型
  isThinkingModel: boolean
}

// 默认配置
const DEFAULT_CONFIG: ConcurrencyConfig = {
  aiDefinitionConcurrency: 30,
  shortSentenceConcurrency: 34,
  batchDelayMs: 100,
  retryDelayMs: 500,
  modelId: 'zai-org/GLM-4.6',
  isThinkingModel: true,
}

// 当前配置（内存中）
let currentConfig: ConcurrencyConfig = { ...DEFAULT_CONFIG }

// 本地存储键
const STORAGE_KEY = 'concurrency_config'

/**
 * 初始化配置（从本地存储加载）
 */
export function initConcurrencyConfig(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      currentConfig = { ...DEFAULT_CONFIG, ...parsed }
      console.log('✅ 并发配置已加载:', currentConfig)
    }
  } catch (error) {
    console.error('❌ 加载并发配置失败:', error)
    currentConfig = { ...DEFAULT_CONFIG }
  }
}

/**
 * 获取当前配置
 */
export function getConcurrencyConfig(): ConcurrencyConfig {
  return { ...currentConfig }
}

/**
 * 更新配置
 */
export function updateConcurrencyConfig(partial: Partial<ConcurrencyConfig>): ConcurrencyConfig {
  // 验证参数范围
  const validated: Partial<ConcurrencyConfig> = {}

  if (partial.aiDefinitionConcurrency !== undefined) {
    validated.aiDefinitionConcurrency = Math.max(1, Math.min(512, partial.aiDefinitionConcurrency))
  }

  if (partial.shortSentenceConcurrency !== undefined) {
    validated.shortSentenceConcurrency = Math.max(1, Math.min(512, partial.shortSentenceConcurrency))
  }

  if (partial.batchDelayMs !== undefined) {
    validated.batchDelayMs = Math.max(0, Math.min(5000, partial.batchDelayMs))
  }

  if (partial.retryDelayMs !== undefined) {
    validated.retryDelayMs = Math.max(0, Math.min(5000, partial.retryDelayMs))
  }

  if (partial.modelId !== undefined) {
    validated.modelId = partial.modelId.trim() || DEFAULT_CONFIG.modelId
  }

  if (partial.isThinkingModel !== undefined) {
    validated.isThinkingModel = Boolean(partial.isThinkingModel)
  }

  // 更新配置
  currentConfig = { ...currentConfig, ...validated }

  // 保存到本地存储
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig))
    console.log('✅ 并发配置已保存:', currentConfig)
  } catch (error) {
    console.error('❌ 保存并发配置失败:', error)
  }

  return { ...currentConfig }
}

/**
 * 重置为默认配置
 */
export function resetConcurrencyConfig(): ConcurrencyConfig {
  currentConfig = { ...DEFAULT_CONFIG }
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('✅ 并发配置已重置为默认值')
  } catch (error) {
    console.error('❌ 重置并发配置失败:', error)
  }
  return { ...currentConfig }
}

/**
 * 获取AI定义并发数
 */
export function getAIDefinitionConcurrency(): number {
  return currentConfig.aiDefinitionConcurrency
}

/**
 * 获取短句生成并发数
 */
export function getShortSentenceConcurrency(): number {
  return currentConfig.shortSentenceConcurrency
}

/**
 * 获取批次间延迟
 */
export function getBatchDelayMs(): number {
  return currentConfig.batchDelayMs
}

/**
 * 获取重试延迟
 */
export function getRetryDelayMs(): number {
  return currentConfig.retryDelayMs
}

/**
 * 获取模型ID
 */
export function getModelId(): string {
  return currentConfig.modelId
}

/**
 * 获取是否是思考模型
 */
export function isThinkingModel(): boolean {
  return currentConfig.isThinkingModel
}
