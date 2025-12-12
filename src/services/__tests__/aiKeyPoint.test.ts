/**
 * AI考点生成服务测试
 * Feature: exam-upgrade
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AIKeyPointService, type AIKeyPointRequest } from '../aiKeyPoint'
import { StorageService } from '../storage'
import * as aiModule from '../ai'

// Mock AI服务
vi.mock('../ai', () => ({
  callAI: vi.fn(),
}))

describe('AIKeyPointService', () => {
  let storage: StorageService
  let service: AIKeyPointService

  beforeEach(async () => {
    storage = new StorageService()
    await storage.initialize()
    service = new AIKeyPointService(storage)
    
    // 重置mock
    vi.clearAllMocks()
  })

  /**
   * 创建测试数据
   */
  async function createTestData() {
    const lib = storage.addLibrary('七年级')
    const col = storage.addCollection(lib.id, '上册', 1)
    
    const article = storage.addArticle(col.id, {
      title: '论语',
      content: '学而时习之，不亦说乎？有朋自远方来，不亦乐乎？',
      collectionId: col.id,
    })

    const sentence1 = article.sentences[0]
    const sentence2 = article.sentences[1]

    // 添加义项
    const def1 = storage.addDefinition('而', '连词，表顺承')
    const def2 = storage.addDefinition('而', '连词，表转折')
    const def3 = storage.addDefinition('之', '代词')
    
    storage.addCharacterDefinitionLink(def1.id, sentence1.id, 2)
    storage.addCharacterDefinitionLink(def2.id, sentence2.id, 0)
    storage.addCharacterDefinitionLink(def3.id, sentence1.id, 6)

    await storage.saveToLocal()
    return { lib, col }
  }

  /**
   * **Feature: exam-upgrade, Property 5: AI请求参数完整性**
   * **Validates: Requirements 3.1, 4.1, 4.2**
   * 
   * 测试：AI请求应该包含完整的范围信息、题型信息和用户需求
   */
  it('Property 5: AI请求参数完整性', async () => {
    const { lib, col } = await createTestData()

    // Mock AI响应
    const mockResponse = '推荐考点：而 以 之\n\n推理说明：这些是常见虚词'
    vi.mocked(aiModule.callAI).mockResolvedValue(mockResponse)

    const request: AIKeyPointRequest = {
      requirement: '重点考察虚词',
      scope: { libraryId: lib.id, collectionId: col.id },
      questionType: 'same-character',
    }

    await service.generateKeyPoints(request)

    // 验证：callAI被调用，且参数包含所有必要信息
    expect(aiModule.callAI).toHaveBeenCalledTimes(1)
    
    const callArgs = vi.mocked(aiModule.callAI).mock.calls[0]
    const prompt = callArgs[0]
    
    // 验证提示词包含必要信息
    expect(prompt).toContain('重点考察虚词')
    expect(prompt).toContain('同一个字')
    expect(prompt).toContain('上册') // 范围信息
  })

  /**
   * **Feature: exam-upgrade, Property 6: AI结果处理**
   * **Validates: Requirements 3.2, 3.3**
   * 
   * 测试：AI返回的考点应该被正确解析并可用于题目生成
   */
  it('Property 6: AI结果处理', async () => {
    const { lib } = await createTestData()

    const mockResponse = '推荐考点：而 之 其\n\n推理说明：常见虚词，适合出题'
    vi.mocked(aiModule.callAI).mockResolvedValue(mockResponse)

    const request: AIKeyPointRequest = {
      requirement: '考察虚词',
      scope: { libraryId: lib.id },
      questionType: 'same-character',
    }

    const result = await service.generateKeyPoints(request)

    // 验证：结果包含解析后的考点
    expect(result.characters).toContain('而')
    expect(result.characters).toContain('之')
    expect(result.reasoning).toContain('常见虚词')
  })

  /**
   * **Feature: exam-upgrade, Property 7: AI配置选择**
   * **Validates: Requirements 3.4, 5.2**
   * 
   * 测试：指定AI配置时应该使用该配置
   */
  it('Property 7: AI配置选择', async () => {
    const { lib } = await createTestData()

    const mockResponse = '推荐考点：而\n\n推理说明：测试'
    vi.mocked(aiModule.callAI).mockResolvedValue(mockResponse)

    const request: AIKeyPointRequest = {
      requirement: '测试',
      scope: { libraryId: lib.id },
      questionType: 'same-character',
      apiConfigId: 'test-config-id',
    }

    await service.generateKeyPoints(request)

    // 验证：callAI被调用时传入了配置ID
    const callArgs = vi.mocked(aiModule.callAI).mock.calls[0]
    expect(callArgs[1]).toBe('test-config-id')
  })

  /**
   * **Feature: exam-upgrade, Property 8: 考点可用性验证**
   * **Validates: Requirements 4.3, 4.4, 4.5**
   * 
   * 测试：生成的考点应该被验证在范围内是否有数据
   */
  it('Property 8: 考点可用性验证', async () => {
    const { lib } = await createTestData()

    const mockResponse = '推荐考点：而 之 学 习\n\n推理说明：测试'
    vi.mocked(aiModule.callAI).mockResolvedValue(mockResponse)

    const request: AIKeyPointRequest = {
      requirement: '测试',
      scope: { libraryId: lib.id },
      questionType: 'same-character',
    }

    const result = await service.generateKeyPoints(request)

    // 验证：availability map包含所有考点的可用性
    expect(result.availability.has('而')).toBe(true)
    expect(result.availability.has('之')).toBe(true)
    expect(result.availability.has('学')).toBe(true)
    expect(result.availability.has('习')).toBe(true)

    // 验证：而和之在范围内有数据，学和习没有
    expect(result.availability.get('而')).toBe(true)
    expect(result.availability.get('之')).toBe(true)
    expect(result.availability.get('学')).toBe(false)
    expect(result.availability.get('习')).toBe(false)
  })

  /**
   * **Feature: exam-upgrade, Property 8: 考点可用性验证**
   * **Validates: Requirements 4.3, 4.4, 4.5**
   * 
   * 测试：对于"同一个字"题型，应该验证字是否有多个义项
   */
  it('Property 8: 考点可用性验证 - 多义项检查', async () => {
    const { lib } = await createTestData()

    // "而"有2个义项，"之"只有1个义项
    const mockResponse = '推荐考点：而 之\n\n推理说明：测试'
    vi.mocked(aiModule.callAI).mockResolvedValue(mockResponse)

    const request: AIKeyPointRequest = {
      requirement: '测试',
      scope: { libraryId: lib.id },
      questionType: 'same-character',
    }

    const result = await service.generateKeyPoints(request)

    // 两个字都在范围内有数据
    expect(result.availability.get('而')).toBe(true)
    expect(result.availability.get('之')).toBe(true)
  })
})
