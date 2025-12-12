// 权重状态管理 Store 测试
// 使用 fast-check 进行属性测试

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useWeightStore } from './weightStore';
import { UnifiedWeightConfig, ArticleWeight, CharacterWeight } from '../types/weight';

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

// 生成权重总和不超过100的 CharacterWeight 数组
const validCharacterWeightsArb = fc.array(characterWeightArb, { minLength: 0, maxLength: 5 })
  .map(weights => {
    let total = 0;
    const uniqueChars = new Set<string>();
    return weights.filter(w => {
      if (uniqueChars.has(w.char)) return false;
      uniqueChars.add(w.char);
      const maxAllowed = Math.max(0, 100 - total);
      const adjustedWeight = Math.min(w.weight, maxAllowed);
      total += adjustedWeight;
      return true;
    }).map(w => {
      const maxAllowed = Math.max(0, 100 - (total - w.weight));
      return { ...w, weight: Math.min(w.weight, maxAllowed) };
    });
  });

// 生成有效的 UnifiedWeightConfig
const validConfigArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  note: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  articleWeights: fc.array(articleWeightArb, { minLength: 1, maxLength: 5 }).map(articles => 
    articles.map((a, i) => ({ ...a, order: i }))
  ),
  characterWeights: validCharacterWeightsArb,
  otherCharactersWeight: fc.integer({ min: 0, max: 100 }),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString()),
}).map(config => {
  // 确保 otherCharactersWeight 与 characterWeights 一致
  const totalCharWeight = config.characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
  return {
    ...config,
    otherCharactersWeight: Math.max(0, 100 - totalCharWeight),
  };
});


describe('WeightStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useWeightStore.setState({
      currentConfig: null,
      initialized: false,
    });
  });

  // **Feature: exam-upgrade, Property 3: 双向数据同步**
  // **Validates: Requirements 2.2, 2.3**
  describe('Property 3: 双向数据同步', () => {
    it('任意权重修改操作后，store 中的数据应该反映修改', () => {
      fc.assert(
        fc.property(validConfigArb, fc.integer({ min: 0, max: 100 }), (config, newWeight) => {
          // 加载初始配置
          useWeightStore.getState().loadConfig(config);
          
          // 获取初始状态
          const initialConfig = useWeightStore.getState().currentConfig;
          expect(initialConfig).not.toBeNull();
          
          if (initialConfig && initialConfig.articleWeights.length > 0) {
            const targetArticle = initialConfig.articleWeights[0];
            
            // 修改文章权重
            useWeightStore.getState().setArticleWeight(targetArticle.articleId, newWeight);
            
            // 验证修改已同步
            const updatedConfig = useWeightStore.getState().currentConfig;
            expect(updatedConfig).not.toBeNull();
            
            const updatedArticle = updatedConfig!.articleWeights.find(
              a => a.articleId === targetArticle.articleId
            );
            expect(updatedArticle).toBeDefined();
            expect(updatedArticle!.weight).toBe(Math.max(0, Math.min(100, newWeight)));
          }
        }),
        { numRuns: 100 }
      );
    });

    it('修改重点字权重后，其他字权重应自动更新', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          fc.string({ minLength: 1, maxLength: 1 }),
          fc.integer({ min: 0, max: 50 }),
          (config, newChar, newWeight) => {
            // 加载初始配置
            useWeightStore.getState().loadConfig(config);
            
            // 添加新的重点字
            useWeightStore.getState().addCharacter(newChar, newWeight);
            
            // 获取更新后的配置
            const updatedConfig = useWeightStore.getState().currentConfig;
            expect(updatedConfig).not.toBeNull();
            
            // 验证其他字权重已自动计算
            const totalCharWeight = updatedConfig!.characterWeights.reduce(
              (sum, cw) => sum + cw.weight, 0
            );
            const expectedOtherWeight = Math.max(0, 100 - totalCharWeight);
            expect(updatedConfig!.otherCharactersWeight).toBe(expectedOtherWeight);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('文章包含状态修改后应正确同步', () => {
      fc.assert(
        fc.property(validConfigArb, fc.boolean(), (config, newIncluded) => {
          // 加载初始配置
          useWeightStore.getState().loadConfig(config);
          
          const initialConfig = useWeightStore.getState().currentConfig;
          if (initialConfig && initialConfig.articleWeights.length > 0) {
            const targetArticle = initialConfig.articleWeights[0];
            
            // 修改文章包含状态
            useWeightStore.getState().setArticleIncluded(targetArticle.articleId, newIncluded);
            
            // 验证修改已同步
            const updatedConfig = useWeightStore.getState().currentConfig;
            const updatedArticle = updatedConfig!.articleWeights.find(
              a => a.articleId === targetArticle.articleId
            );
            expect(updatedArticle!.included).toBe(newIncluded);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('拖拽范围选择后应正确更新所有文章的包含状态', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          fc.integer({ min: 0, max: 4 }),
          fc.integer({ min: 0, max: 4 }),
          (config, startIndex, endIndex) => {
            // 加载初始配置
            useWeightStore.getState().loadConfig(config);
            
            const initialConfig = useWeightStore.getState().currentConfig;
            if (initialConfig && initialConfig.articleWeights.length > 0) {
              const maxIndex = initialConfig.articleWeights.length - 1;
              const clampedStart = Math.min(startIndex, maxIndex);
              const clampedEnd = Math.min(endIndex, maxIndex);
              const minIdx = Math.min(clampedStart, clampedEnd);
              const maxIdx = Math.max(clampedStart, clampedEnd);
              
              // 执行范围选择
              useWeightStore.getState().setArticleRange(clampedStart, clampedEnd);
              
              // 验证范围内的文章被包含，范围外的不被包含
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
  });
});


  // **Feature: exam-upgrade, Property 13: 统一权重计算模型**
  // **Validates: Requirements 7.1**
  describe('Property 13: 统一权重计算模型', () => {
    it('任意权重修改操作后，系统应通过统一计算模型重新计算所有相关权重', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          fc.string({ minLength: 1, maxLength: 1 }),
          fc.integer({ min: 0, max: 50 }),
          (config, newChar, newWeight) => {
            // 加载初始配置
            useWeightStore.getState().loadConfig(config);
            
            // 添加新的重点字
            useWeightStore.getState().addCharacter(newChar, newWeight);
            
            // 获取更新后的配置
            const updatedConfig = useWeightStore.getState().currentConfig;
            expect(updatedConfig).not.toBeNull();
            
            // 验证统一计算模型：其他字权重 = 100 - 所有重点字权重之和
            const totalCharWeight = updatedConfig!.characterWeights.reduce(
              (sum, cw) => sum + cw.weight, 0
            );
            const expectedOtherWeight = Math.max(0, 100 - totalCharWeight);
            
            // 验证计算结果一致性
            expect(updatedConfig!.otherCharactersWeight).toBe(expectedOtherWeight);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('修改重点字权重后，其他字权重应通过统一模型重新计算', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          fc.integer({ min: 0, max: 100 }),
          (config, newWeight) => {
            // 确保配置中有重点字
            if (config.characterWeights.length === 0) {
              config.characterWeights = [{ char: '测', weight: 30 }];
              config.otherCharactersWeight = 70;
            }
            
            // 加载初始配置
            useWeightStore.getState().loadConfig(config);
            
            const initialConfig = useWeightStore.getState().currentConfig;
            if (initialConfig && initialConfig.characterWeights.length > 0) {
              const targetChar = initialConfig.characterWeights[0].char;
              
              // 修改重点字权重
              useWeightStore.getState().setCharacterWeight(targetChar, newWeight);
              
              // 获取更新后的配置
              const updatedConfig = useWeightStore.getState().currentConfig;
              expect(updatedConfig).not.toBeNull();
              
              // 验证统一计算模型
              const totalCharWeight = updatedConfig!.characterWeights.reduce(
                (sum, cw) => sum + cw.weight, 0
              );
              const expectedOtherWeight = Math.max(0, 100 - totalCharWeight);
              
              expect(updatedConfig!.otherCharactersWeight).toBe(expectedOtherWeight);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('移除重点字后，其他字权重应通过统一模型重新计算', () => {
      fc.assert(
        fc.property(validConfigArb, (config) => {
          // 确保配置中有重点字
          if (config.characterWeights.length === 0) {
            config.characterWeights = [
              { char: '测', weight: 30 },
              { char: '试', weight: 20 },
            ];
            config.otherCharactersWeight = 50;
          }
          
          // 加载初始配置
          useWeightStore.getState().loadConfig(config);
          
          const initialConfig = useWeightStore.getState().currentConfig;
          if (initialConfig && initialConfig.characterWeights.length > 0) {
            const targetChar = initialConfig.characterWeights[0].char;
            
            // 移除重点字
            useWeightStore.getState().removeCharacter(targetChar);
            
            // 获取更新后的配置
            const updatedConfig = useWeightStore.getState().currentConfig;
            expect(updatedConfig).not.toBeNull();
            
            // 验证统一计算模型
            const totalCharWeight = updatedConfig!.characterWeights.reduce(
              (sum, cw) => sum + cw.weight, 0
            );
            const expectedOtherWeight = Math.max(0, 100 - totalCharWeight);
            
            expect(updatedConfig!.otherCharactersWeight).toBe(expectedOtherWeight);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('所有权重操作后，权重总和应保持一致性', () => {
      fc.assert(
        fc.property(
          validConfigArb,
          fc.array(
            fc.oneof(
              fc.record({ type: fc.constant('add'), char: fc.string({ minLength: 1, maxLength: 1 }), weight: fc.integer({ min: 0, max: 30 }) }),
              fc.record({ type: fc.constant('remove'), char: fc.string({ minLength: 1, maxLength: 1 }) }),
              fc.record({ type: fc.constant('update'), char: fc.string({ minLength: 1, maxLength: 1 }), weight: fc.integer({ min: 0, max: 30 }) })
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (config, operations) => {
            // 加载初始配置
            useWeightStore.getState().loadConfig(config);
            
            // 执行一系列操作
            for (const op of operations) {
              if (op.type === 'add' && 'weight' in op) {
                useWeightStore.getState().addCharacter(op.char, op.weight);
              } else if (op.type === 'remove') {
                useWeightStore.getState().removeCharacter(op.char);
              } else if (op.type === 'update' && 'weight' in op) {
                useWeightStore.getState().setCharacterWeight(op.char, op.weight);
              }
            }
            
            // 获取最终配置
            const finalConfig = useWeightStore.getState().currentConfig;
            expect(finalConfig).not.toBeNull();
            
            // 验证统一计算模型：其他字权重应正确计算
            const totalCharWeight = finalConfig!.characterWeights.reduce(
              (sum, cw) => sum + cw.weight, 0
            );
            const expectedOtherWeight = Math.max(0, 100 - totalCharWeight);
            
            expect(finalConfig!.otherCharactersWeight).toBe(expectedOtherWeight);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
