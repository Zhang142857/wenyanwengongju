// 重点字权重编辑组件测试
// 使用 fast-check 进行属性测试

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useWeightStore } from '../stores/weightStore';
import { CharacterWeight, UnifiedWeightConfig } from '../types/weight';
import { calculateOtherCharactersWeight } from '../services/weightCalculator';

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
      return true;
    }).map(w => {
      const maxAllowed = Math.max(0, 100 - total);
      const adjustedWeight = Math.min(w.weight, maxAllowed);
      total += adjustedWeight;
      return { ...w, weight: adjustedWeight };
    });
  });

// 生成有效的 UnifiedWeightConfig
const validConfigArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  note: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  articleWeights: fc.constant([{
    articleId: 'test-article',
    articleTitle: 'Test',
    collectionId: 'test-collection',
    collectionName: 'Test Collection',
    weight: 50,
    included: true,
    order: 0,
  }]),
  characterWeights: validCharacterWeightsArb,
  otherCharactersWeight: fc.integer({ min: 0, max: 100 }),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString()),
}).map(config => {
  const totalCharWeight = config.characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
  return {
    ...config,
    otherCharactersWeight: Math.max(0, 100 - totalCharWeight),
  };
});

describe('CharacterWeightEditor', () => {
  beforeEach(() => {
    useWeightStore.setState({
      currentConfig: null,
      initialized: false,
    });
  });

  // **Feature: exam-upgrade, Property 12: 权重显示完整性**
  // **Validates: Requirements 6.2, 6.3**
  describe('Property 12: 权重显示完整性', () => {
    it('显示的信息应包含每项的百分比值', () => {
      fc.assert(
        fc.property(validConfigArb, (config) => {
          useWeightStore.getState().loadConfig(config as UnifiedWeightConfig);
          
          const currentConfig = useWeightStore.getState().currentConfig;
          expect(currentConfig).not.toBeNull();
          
          // 验证每个重点字都有权重值
          currentConfig!.characterWeights.forEach(cw => {
            expect(typeof cw.weight).toBe('number');
            expect(cw.weight).toBeGreaterThanOrEqual(0);
            expect(cw.weight).toBeLessThanOrEqual(100);
          });
          
          // 验证其他字权重存在
          expect(typeof currentConfig!.otherCharactersWeight).toBe('number');
          expect(currentConfig!.otherCharactersWeight).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it('所有百分比之和应等于100%（通过统一计算模型）', () => {
      fc.assert(
        fc.property(validConfigArb, (config) => {
          useWeightStore.getState().loadConfig(config as UnifiedWeightConfig);
          
          const currentConfig = useWeightStore.getState().currentConfig;
          expect(currentConfig).not.toBeNull();
          
          const totalCharWeight = currentConfig!.characterWeights.reduce(
            (sum, cw) => sum + cw.weight, 0
          );
          const totalWeight = totalCharWeight + currentConfig!.otherCharactersWeight;
          
          // 由于使用统一计算模型，总和应为100
          expect(totalWeight).toBe(100);
        }),
        { numRuns: 100 }
      );
    });

    it('修改重点字权重后，其他字权重应自动更新以保持总和为100%', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (newWeight) => {
            // 创建一个简单的配置，只有一个重点字
            const config: UnifiedWeightConfig = {
              id: 'test-id',
              name: 'test',
              articleWeights: [{
                articleId: 'test-article',
                articleTitle: 'Test',
                collectionId: 'test-collection',
                collectionName: 'Test Collection',
                weight: 50,
                included: true,
                order: 0,
              }],
              characterWeights: [{ char: '测', weight: 30 }],
              otherCharactersWeight: 70,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            useWeightStore.getState().loadConfig(config);
            
            // 修改权重
            useWeightStore.getState().setCharacterWeight('测', newWeight);
            
            // 验证总和仍为100
            const updatedConfig = useWeightStore.getState().currentConfig;
            const totalCharWeight = updatedConfig!.characterWeights.reduce(
              (sum, cw) => sum + cw.weight, 0
            );
            const totalWeight = totalCharWeight + updatedConfig!.otherCharactersWeight;
            
            expect(totalWeight).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('添加新重点字后，其他字权重应自动减少', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (newWeight) => {
            // 创建一个简单的配置
            const config: UnifiedWeightConfig = {
              id: 'test-id',
              name: 'test',
              articleWeights: [{
                articleId: 'test-article',
                articleTitle: 'Test',
                collectionId: 'test-collection',
                collectionName: 'Test Collection',
                weight: 50,
                included: true,
                order: 0,
              }],
              characterWeights: [{ char: '测', weight: 30 }],
              otherCharactersWeight: 70,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            useWeightStore.getState().loadConfig(config);
            
            const initialOtherWeight = useWeightStore.getState().currentConfig!.otherCharactersWeight;
            
            // 添加新重点字
            useWeightStore.getState().addCharacter('新', newWeight);
            
            const updatedConfig = useWeightStore.getState().currentConfig;
            
            // 验证总和仍为100
            const totalCharWeight = updatedConfig!.characterWeights.reduce(
              (sum, cw) => sum + cw.weight, 0
            );
            const totalWeight = totalCharWeight + updatedConfig!.otherCharactersWeight;
            
            expect(totalWeight).toBe(100);
            
            // 验证其他字权重减少了
            expect(updatedConfig!.otherCharactersWeight).toBeLessThan(initialOtherWeight);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
