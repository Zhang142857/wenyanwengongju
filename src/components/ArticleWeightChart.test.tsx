// 文章权重图表组件测试
// 使用 fast-check 进行属性测试

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { useWeightStore } from '../stores/weightStore';
import { ArticleWeight, UnifiedWeightConfig } from '../types/weight';

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

// 生成有效的 UnifiedWeightConfig
const validConfigArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  note: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  articleWeights: fc.array(articleWeightArb, { minLength: 1, maxLength: 10 }).map(articles => 
    articles.map((a, i) => ({ ...a, order: i }))
  ),
  characterWeights: fc.constant([]),
  otherCharactersWeight: fc.constant(100),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString()),
});

describe('ArticleWeightChart', () => {
  beforeEach(() => {
    // 重置 store 状态
    useWeightStore.setState({
      currentConfig: null,
      initialized: false,
    });
  });

  // **Feature: exam-upgrade, Property 2: 权重更新一致性**
  // **Validates: Requirements 1.3, 1.4, 1.5**
  describe('Property 2: 权重更新一致性', () => {
    it('更新文章权重后，该文章的权重应等于设置的新值', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          fc.integer({ min: 0, max: 100 }),
          (config, newWeight) => {
            // 加载初始配置
            useWeightStore.getState().loadConfig(config as UnifiedWeightConfig);
            
            const initialConfig = useWeightStore.getState().currentConfig;
            if (initialConfig && initialConfig.articleWeights.length > 0) {
              const targetArticle = initialConfig.articleWeights[0];
              
              // 更新文章权重
              useWeightStore.getState().setArticleWeight(targetArticle.articleId, newWeight);
              
              // 验证权重已更新
              const updatedConfig = useWeightStore.getState().currentConfig;
              const updatedArticle = updatedConfig!.articleWeights.find(
                a => a.articleId === targetArticle.articleId
              );
              
              expect(updatedArticle!.weight).toBe(newWeight);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('更新文章权重后，其他文章的权重应保持不变', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          fc.integer({ min: 0, max: 100 }),
          (config, newWeight) => {
            // 加载初始配置
            useWeightStore.getState().loadConfig(config as UnifiedWeightConfig);
            
            const initialConfig = useWeightStore.getState().currentConfig;
            if (initialConfig && initialConfig.articleWeights.length > 1) {
              const targetArticle = initialConfig.articleWeights[0];
              const otherArticles = initialConfig.articleWeights.slice(1);
              const originalWeights = otherArticles.map(a => ({ id: a.articleId, weight: a.weight }));
              
              // 更新目标文章权重
              useWeightStore.getState().setArticleWeight(targetArticle.articleId, newWeight);
              
              // 验证其他文章权重未变
              const updatedConfig = useWeightStore.getState().currentConfig;
              originalWeights.forEach(({ id, weight }) => {
                const article = updatedConfig!.articleWeights.find(a => a.articleId === id);
                expect(article!.weight).toBe(weight);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('添加新文章后，应在图表中显示新节点', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          articleWeightArb,
          (config, newArticle) => {
            // 加载初始配置
            useWeightStore.getState().loadConfig(config as UnifiedWeightConfig);
            
            const initialCount = useWeightStore.getState().currentConfig!.articleWeights.length;
            
            // 添加新文章（确保ID不重复）
            const uniqueArticle = { ...newArticle, articleId: `new-${Date.now()}-${Math.random()}` };
            useWeightStore.getState().addArticle(uniqueArticle);
            
            // 验证文章已添加
            const updatedConfig = useWeightStore.getState().currentConfig;
            expect(updatedConfig!.articleWeights.length).toBe(initialCount + 1);
            
            const addedArticle = updatedConfig!.articleWeights.find(
              a => a.articleId === uniqueArticle.articleId
            );
            expect(addedArticle).toBeDefined();
            expect(addedArticle!.weight).toBe(uniqueArticle.weight);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


  // **Feature: exam-upgrade, Property 1: 拖拽范围选择正确性**
  // **Validates: Requirements 1.2**
  describe('Property 1: 拖拽范围选择正确性', () => {
    it('拖拽选择后，范围内的文章应被包含，范围外的不被包含', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          fc.integer({ min: 0, max: 9 }),
          fc.integer({ min: 0, max: 9 }),
          (config, startIndex, endIndex) => {
            // 加载初始配置
            useWeightStore.getState().loadConfig(config as UnifiedWeightConfig);
            
            const initialConfig = useWeightStore.getState().currentConfig;
            if (initialConfig && initialConfig.articleWeights.length > 0) {
              const maxIndex = initialConfig.articleWeights.length - 1;
              const clampedStart = Math.min(startIndex, maxIndex);
              const clampedEnd = Math.min(endIndex, maxIndex);
              const minIdx = Math.min(clampedStart, clampedEnd);
              const maxIdx = Math.max(clampedStart, clampedEnd);
              
              // 执行范围选择
              useWeightStore.getState().setArticleRange(clampedStart, clampedEnd);
              
              // 验证范围内的文章被包含
              const updatedConfig = useWeightStore.getState().currentConfig;
              updatedConfig!.articleWeights.forEach((article, index) => {
                const shouldBeIncluded = index >= minIdx && index <= maxIdx;
                expect(article.included).toBe(shouldBeIncluded);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('范围选择应正确处理起始和结束索引的顺序', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          fc.integer({ min: 0, max: 9 }),
          fc.integer({ min: 0, max: 9 }),
          (config, idx1, idx2) => {
            // 加载初始配置
            useWeightStore.getState().loadConfig(config as UnifiedWeightConfig);
            
            const initialConfig = useWeightStore.getState().currentConfig;
            if (initialConfig && initialConfig.articleWeights.length > 0) {
              const maxIndex = initialConfig.articleWeights.length - 1;
              const start = Math.min(idx1, maxIndex);
              const end = Math.min(idx2, maxIndex);
              
              // 无论起始和结束的顺序如何，结果应该相同
              useWeightStore.getState().setArticleRange(start, end);
              const result1 = useWeightStore.getState().currentConfig!.articleWeights.map(a => a.included);
              
              useWeightStore.getState().loadConfig(config as UnifiedWeightConfig);
              useWeightStore.getState().setArticleRange(end, start);
              const result2 = useWeightStore.getState().currentConfig!.articleWeights.map(a => a.included);
              
              expect(result1).toEqual(result2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
