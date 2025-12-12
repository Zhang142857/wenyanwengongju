// AI权重调整服务测试
// 使用 fast-check 进行属性测试

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  AIWeightService,
  AIWeightRequest,
  AIWeightResult,
  AIWeightSuggestion,
  validateAIWeightRequest,
} from './aiWeightService';
import { ArticleWeight, CharacterWeight } from '../types/weight';

// 辅助函数：生成有效的 ArticleWeight
const articleWeightArb = fc.record({
  articleId: fc.uuid(),
  articleTitle: fc.string({ minLength: 1, maxLength: 20 }),
  collectionId: fc.uuid(),
  collectionName: fc.string({ minLength: 1, maxLength: 20 }),
  weight: fc.integer({ min: 0, max: 100 }),
  included: fc.boolean(),
  order: fc.integer({ min: 0, max: 100 }),
});

// 辅助函数：生成有效的 CharacterWeight
const characterWeightArb = fc.record({
  char: fc.string({ minLength: 1, maxLength: 1 }),
  weight: fc.integer({ min: 0, max: 100 }),
});

describe('AIWeightService', () => {
  // **Feature: exam-upgrade, Property 5: AI请求参数完整性**
  // **Validates: Requirements 3.1, 3.2**
  describe('Property 5: AI请求参数完整性', () => {
    it('单个调整请求必须包含目标ID', () => {
      fc.assert(
        fc.property(
          fc.array(articleWeightArb, { minLength: 1, maxLength: 5 }),
          (articleWeights) => {
            const request: AIWeightRequest = {
              type: 'single',
              // 故意不提供 targetId
              context: {
                articleWeights,
              },
            };

            const validation = validateAIWeightRequest(request);
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('单个调整时必须指定目标ID');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('批量调整请求不需要目标ID', () => {
      fc.assert(
        fc.property(
          fc.array(articleWeightArb, { minLength: 1, maxLength: 5 }),
          (articleWeights) => {
            const request: AIWeightRequest = {
              type: 'batch',
              context: {
                articleWeights,
              },
            };

            const validation = validateAIWeightRequest(request);
            expect(validation.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('请求必须包含上下文信息', () => {
      const request: AIWeightRequest = {
        type: 'batch',
        context: {
          articleWeights: [],
          characterWeights: [],
        },
      };

      const validation = validateAIWeightRequest(request);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('上下文中必须包含文章权重或重点字权重数据');
    });

    it('有效请求应通过验证', () => {
      fc.assert(
        fc.property(
          fc.array(articleWeightArb, { minLength: 1, maxLength: 5 }),
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          (articleWeights, requirement) => {
            const request: AIWeightRequest = {
              type: 'batch',
              context: {
                articleWeights,
              },
              requirement,
            };

            const validation = validateAIWeightRequest(request);
            expect(validation.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // **Feature: exam-upgrade, Property 6: AI结果应用正确性**
  // **Validates: Requirements 3.3, 3.4**
  describe('Property 6: AI结果应用正确性', () => {
    it('应用建议后，对应选项的权重应更新为建议值', () => {
      fc.assert(
        fc.property(
          fc.array(articleWeightArb, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 0, max: 100 }),
          (articleWeights, newWeight) => {
            const service = new AIWeightService();
            
            if (articleWeights.length === 0) return;
            
            const targetArticle = articleWeights[0];
            const suggestions: AIWeightSuggestion[] = [{
              id: targetArticle.articleId,
              currentWeight: targetArticle.weight,
              suggestedWeight: newWeight,
              reason: 'Test reason',
            }];

            const result = service.applysuggestions(suggestions, articleWeights);
            
            const updatedArticle = result.articleWeights?.find(
              a => a.articleId === targetArticle.articleId
            );
            expect(updatedArticle?.weight).toBe(newWeight);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('未涉及的选项权重应保持不变', () => {
      fc.assert(
        fc.property(
          fc.array(articleWeightArb, { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 0, max: 100 }),
          (articleWeights, newWeight) => {
            const service = new AIWeightService();
            
            if (articleWeights.length < 2) return;
            
            const targetArticle = articleWeights[0];
            const otherArticles = articleWeights.slice(1);
            const originalWeights = otherArticles.map(a => ({ id: a.articleId, weight: a.weight }));
            
            const suggestions: AIWeightSuggestion[] = [{
              id: targetArticle.articleId,
              currentWeight: targetArticle.weight,
              suggestedWeight: newWeight,
              reason: 'Test reason',
            }];

            const result = service.applysuggestions(suggestions, articleWeights);
            
            // 验证其他文章权重未变
            originalWeights.forEach(({ id, weight }) => {
              const article = result.articleWeights?.find(a => a.articleId === id);
              expect(article?.weight).toBe(weight);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: exam-upgrade, Property 7: AI错误处理保持原值**
  // **Validates: Requirements 3.5**
  describe('Property 7: AI错误处理保持原值', () => {
    it('请求失败时，所有权重值应保持不变', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(articleWeightArb, { minLength: 1, maxLength: 5 }),
          async (articleWeights) => {
            const service = new AIWeightService(); // 未配置API，会失败
            
            const originalWeights = articleWeights.map(a => ({ id: a.articleId, weight: a.weight }));
            
            const request: AIWeightRequest = {
              type: 'batch',
              context: {
                articleWeights,
              },
            };

            const result = await service.adjustWeight(request);
            
            // 请求应该失败（因为未配置API）
            expect(result.success).toBe(false);
            
            // 原始权重应保持不变
            originalWeights.forEach(({ id, weight }) => {
              const article = articleWeights.find(a => a.articleId === id);
              expect(article?.weight).toBe(weight);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('验证失败时应返回错误信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(articleWeightArb, { minLength: 1, maxLength: 5 }),
          async (articleWeights) => {
            const service = new AIWeightService();
            
            // 创建无效请求（单个调整但没有targetId）
            const request: AIWeightRequest = {
              type: 'single',
              context: {
                articleWeights,
              },
            };

            const result = await service.adjustWeight(request);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('单个调整时必须指定目标ID');
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
