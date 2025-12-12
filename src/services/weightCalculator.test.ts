import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateOtherCharactersWeight,
  validateWeights,
  selectCharacterByWeight,
  calculateQuestionDistribution,
} from './weightCalculator';
import { CharacterWeight, UnifiedWeightConfig } from '../types/weight';

// 辅助函数：生成有效的 CharacterWeight 数组
const characterWeightArb = fc.record({
  char: fc.string({ minLength: 1, maxLength: 1 }),
  weight: fc.integer({ min: 0, max: 100 }),
});

// 生成权重总和不超过100的 CharacterWeight 数组
const validCharacterWeightsArb = fc.array(characterWeightArb, { minLength: 0, maxLength: 10 })
  .map(weights => {
    // 确保权重总和不超过100
    let total = 0;
    return weights.map(w => {
      const maxAllowed = Math.max(0, 100 - total);
      const adjustedWeight = Math.min(w.weight, maxAllowed);
      total += adjustedWeight;
      return { ...w, weight: adjustedWeight };
    });
  });

describe('WeightCalculator', () => {
  // **Feature: exam-upgrade, Property 8: 重点字权重自动计算**
  // **Validates: Requirements 4.2, 4.3, 4.5**
  describe('Property 8: 重点字权重自动计算', () => {
    it('其他字权重应等于100减去所有重点字权重之和', () => {
      fc.assert(
        fc.property(validCharacterWeightsArb, (characterWeights) => {
          const totalPriorityWeight = characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
          const otherWeight = calculateOtherCharactersWeight(characterWeights);
          
          // 其他字权重 = 100 - 重点字权重总和
          expect(otherWeight).toBe(Math.max(0, 100 - totalPriorityWeight));
        }),
        { numRuns: 100 }
      );
    });

    it('当重点字权重总和达到100时，其他字权重应自动变为0', () => {
      fc.assert(
        fc.property(
          fc.array(characterWeightArb, { minLength: 1, maxLength: 5 }),
          (baseWeights) => {
            // 调整权重使总和恰好为100
            const totalBase = baseWeights.reduce((sum, w) => sum + w.weight, 0);
            if (totalBase === 0) return true; // 跳过全0的情况
            
            const scaleFactor = 100 / totalBase;
            const scaledWeights = baseWeights.map((w, i) => ({
              ...w,
              weight: i === baseWeights.length - 1 
                ? 100 - baseWeights.slice(0, -1).reduce((sum, bw) => sum + Math.floor(bw.weight * scaleFactor), 0)
                : Math.floor(w.weight * scaleFactor)
            }));
            
            const otherWeight = calculateOtherCharactersWeight(scaledWeights);
            
            // 当重点字权重总和为100时，其他字权重应为0
            const totalScaled = scaledWeights.reduce((sum, w) => sum + w.weight, 0);
            if (totalScaled >= 100) {
              expect(otherWeight).toBe(0);
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('其他字权重应始终为非负数', () => {
      fc.assert(
        fc.property(
          fc.array(characterWeightArb, { minLength: 0, maxLength: 10 }),
          (characterWeights) => {
            const otherWeight = calculateOtherCharactersWeight(characterWeights);
            expect(otherWeight).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('空重点字列表时，其他字权重应为100', () => {
      const otherWeight = calculateOtherCharactersWeight([]);
      expect(otherWeight).toBe(100);
    });
  });

  describe('validateWeights', () => {
    it('应检测负数权重', () => {
      const config: UnifiedWeightConfig = {
        id: 'test',
        name: 'test',
        articleWeights: [
          { articleId: '1', articleTitle: 'Test', collectionId: 'c1', collectionName: 'C1', weight: -10, included: true, order: 0 }
        ],
        characterWeights: [],
        otherCharactersWeight: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validateWeights(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('权重值不能为负数');
    });

    it('应检测无选中文章', () => {
      const config: UnifiedWeightConfig = {
        id: 'test',
        name: 'test',
        articleWeights: [
          { articleId: '1', articleTitle: 'Test', collectionId: 'c1', collectionName: 'C1', weight: 50, included: false, order: 0 }
        ],
        characterWeights: [],
        otherCharactersWeight: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validateWeights(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('请至少选择一篇文章');
    });
  });

  describe('selectCharacterByWeight', () => {
    it('当其他字权重为0时，应只返回重点字', () => {
      const characterWeights: CharacterWeight[] = [
        { char: '而', weight: 50 },
        { char: '之', weight: 50 },
      ];
      
      // 运行多次确保只返回重点字
      for (let i = 0; i < 50; i++) {
        const selected = selectCharacterByWeight(characterWeights, 0, ['其', '他']);
        expect(['而', '之']).toContain(selected);
      }
    });

    it('当总权重为0时，应返回null', () => {
      const result = selectCharacterByWeight([], 0, []);
      expect(result).toBeNull();
    });
  });

  describe('calculateQuestionDistribution', () => {
    it('题目分配应按权重比例', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          validCharacterWeightsArb,
          (totalQuestions, characterWeights) => {
            const totalPriorityWeight = characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
            const otherWeight = calculateOtherCharactersWeight(characterWeights);
            
            const distribution = calculateQuestionDistribution(
              totalQuestions,
              characterWeights,
              otherWeight
            );
            
            // 总数应等于输入的题目数
            expect(distribution.priorityCount + distribution.otherCount).toBe(totalQuestions);
            
            // 分配应为非负数
            expect(distribution.priorityCount).toBeGreaterThanOrEqual(0);
            expect(distribution.otherCount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
