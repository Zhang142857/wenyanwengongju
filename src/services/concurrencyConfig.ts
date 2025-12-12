/**
 * 并发配置管理服务
 * 
 * 现在的实现逻辑是直接从当前激活的 API 配置组中读取并发设置。
 * 不再维护独立的全局并发配置状态。
 */

import { configService } from './configService'
import { ApiConfigGroup } from '@/types/config'

export interface ConcurrencyConfig {
  aiDefinitionConcurrency: number
  shortSentenceConcurrency: number
  batchDelayMs: number
  retryDelayMs: number
}

// 获取当前激活的配置组
function getActiveGroup(): ApiConfigGroup | undefined {
  const group = configService.getActiveConfigGroup()
  return group || undefined
}

/**
 * 初始化配置 (保留向后兼容，但实际上现在是直接读取 ConfigService)
 */
export function initConcurrencyConfig(): void {
  // 这里的初始化逻辑不再需要，因为数据源是 ConfigService
  // 但为了保持接口兼容，留空
}

/**
 * 获取当前配置 (从当前激活的 API 组读取)
 */
export function getConcurrencyConfig(): ConcurrencyConfig {
  const group = getActiveGroup()
  if (group && group.concurrency) {
    return { ...group.concurrency }
  }

  // 如果没有激活组或没有并发配置（不应该发生），返回默认值
  // 从 configService 获取默认配置可能会导致循环依赖或复杂性，
  // 这里简单硬编码一个安全值，或者依赖 configService 的保证
  return {
    aiDefinitionConcurrency: 5,
    shortSentenceConcurrency: 5,
    batchDelayMs: 1000,
    retryDelayMs: 2000
  }
}

/**
 * 更新配置 (更新当前激活的 API 组)
 */
export function updateConcurrencyConfig(partial: Partial<ConcurrencyConfig>): ConcurrencyConfig {
  const group = getActiveGroup()
  if (!group) {
    throw new Error("No active config group found")
  }

  // 验证参数
  const current = group.concurrency || {
    aiDefinitionConcurrency: 30,
    shortSentenceConcurrency: 34,
    batchDelayMs: 100,
    retryDelayMs: 500
  }

  const validated: ConcurrencyConfig = {
    aiDefinitionConcurrency: partial.aiDefinitionConcurrency !== undefined
      ? Math.max(1, Math.min(512, partial.aiDefinitionConcurrency))
      : current.aiDefinitionConcurrency,
    shortSentenceConcurrency: partial.shortSentenceConcurrency !== undefined
      ? Math.max(1, Math.min(512, partial.shortSentenceConcurrency))
      : current.shortSentenceConcurrency,
    batchDelayMs: partial.batchDelayMs !== undefined
      ? Math.max(0, Math.min(5000, partial.batchDelayMs))
      : current.batchDelayMs,
    retryDelayMs: partial.retryDelayMs !== undefined
      ? Math.max(0, Math.min(5000, partial.retryDelayMs))
      : current.retryDelayMs
  }

  // 更新 ConfigService
  // 我们需要一种方法来更新特定组的并发配置
  // 由于 configService 没有直接更新组内并发的方法，我们需要更新整个组
  // 但 configService.updateConfigGroup 需要完整的组信息

  // 我们可以直接修改 configService 中的数据并保存？
  // 或者在 configService 中添加 updateConcurrencyForGroup 方法
  // 暂时假设 configService.updateConfigGroup 可用

  const updatedGroup = {
    ...group,
    concurrency: validated
  }

  configService.updateConfigGroup(group.id, updatedGroup).catch(err => {
    console.error('Failed to update concurrency config:', err)
  })

  return validated
}

/**
 * 获取AI定义并发数
 */
export function getAIDefinitionConcurrency(): number {
  return getConcurrencyConfig().aiDefinitionConcurrency
}

/**
 * 获取短句生成并发数
 */
export function getShortSentenceConcurrency(): number {
  return getConcurrencyConfig().shortSentenceConcurrency
}

/**
 * 获取批次间延迟
 */
export function getBatchDelayMs(): number {
  return getConcurrencyConfig().batchDelayMs
}

/**
 * 获取重试延迟
 */
export function getRetryDelayMs(): number {
  return getConcurrencyConfig().retryDelayMs
}

/**
 * 获取当前配置组是否是思考模型
 */
export function isThinkingModel(): boolean {
  const activeGroup = getActiveGroup()
  return activeGroup?.isThinkingModel || false
}

/**
 * 重置为默认配置 (向后兼容)
 * 实际上现在应该重置当前组的并发配置为默认值
 */
export function resetConcurrencyConfig(): ConcurrencyConfig {
  const defaults = {
    aiDefinitionConcurrency: 30,
    shortSentenceConcurrency: 34,
    batchDelayMs: 100,
    retryDelayMs: 500
  }
  try {
    updateConcurrencyConfig(defaults)
  } catch (e) {
    console.warn("Failed to reset concurrency config:", e)
  }
  return defaults
}
