// 出题生成器权重系统测试
// 使用 fast-check 进行属性测试

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { CharacterWeight } from '../../types/weight';
import { calculateQuestionDistribution, selectCharacterByWeight } from '../weightCalculator';

// 辅助函数：生成有效的 CharacterWeight
const characterWeightArb = fc.record({
  char: fc.string({ minLength: 1, maxLength: 1 }),
  weight: fc.integer({ min: 0, max: 100 }),
});

// 生成权重总和不超过100的 CharacterWeight 数组
const validCharacterWeightsArb = fc.array(characterWeightArb, { minLength: 1, maxLength: 5 })
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

describe('ExamGenerator Weight System', () => {
  // **Feature: exam-upgrade, Property 10: 题目分配比例**
  // **Validates: Requirements 5.1, 5.2, 5.3**
  describe('Property 10: 题目分配比例', () => {
    it('题目分配总数应等于请求的题目数', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          validCharacterWeightsArb,
          (totalQuestions, characterWeights) => {
            const totalCharWeight = characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
            const otherWeight = Math.max(0, 100 - totalCharWeight);
            
            const distribution = calculateQuestionDistribution(
              totalQuestions,
              characterWeights,
              otherWeight
            );
            
            expect(distribution.priorityCount + distribution.otherCount).toBe(totalQuestions);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('分配比例应接近权重比例', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          validCharacterWeightsArb,
          (totalQuestions, characterWeights) => {
            const totalCharWeight = characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
            const otherWeight = Math.max(0, 100 - totalCharWeight);
            const totalWeight = totalCharWeight + otherWeight;
            
            if (totalWeight === 0) return; // 跳过无效情况
            
            const distribution = calculateQuestionDistribution(
              totalQuestions,
              characterWeights,
              otherWeight
            );
            
            // 计算期望比例
            const expectedPriorityRatio = totalCharWeight / totalWeight;
            const actualPriorityRatio = distribution.priorityCount / totalQuestions;
            
            // 允许一定误差（由于四舍五入）
            const tolerance = 1 / totalQuestions + 0.01;
            expect(Math.abs(actualPriorityRatio - expectedPriorityRatio)).toBeLessThanOrEqual(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('分配结果应为非负数', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          validCharacterWeightsArb,
          (totalQuestions, characterWeights) => {
            const totalCharWeight = characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
            const otherWeight = Math.max(0, 100 - totalCharWeight);
            
            const distribution = calculateQuestionDistribution(
              totalQuestions,
              characterWeights,
              otherWeight
            );
            
            expect(distribution.priorityCount).toBeGreaterThanOrEqual(0);
            expect(distribution.otherCount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // **Feature: exam-upgrade, Property 9: 仅重点字出题**
  // **Validates: Requirements 4.4**
  describe('Property 9: 仅重点字出题', () => {
    it('当其他字权重为0时，selectCharacterByWeight应只返回重点字', () => {
      fc.assert(
        fc.property(
          validCharacterWeightsArb.filter(weights => weights.length > 0 && weights.some(w => w.weight > 0)),
          (characterWeights) => {
            // 确保有权重大于0的重点字
            const validWeights = characterWeights.filter(w => w.weight > 0);
            if (validWeights.length === 0) return;
            
            const priorityChars = validWeights.map(w => w.char);
            const otherChars = ['其', '他', '字', '符'];
            
            // 运行多次确保只返回重点字
            for (let i = 0; i < 20; i++) {
              const selected = selectCharacterByWeight(validWeights, 0, otherChars);
              if (selected !== null) {
                expect(priorityChars).toContain(selected);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('当所有重点字权重为0时，应返回其他字', () => {
      const zeroWeights: CharacterWeight[] = [
        { char: '测', weight: 0 },
        { char: '试', weight: 0 },
      ];
      const otherChars = ['其', '他'];
      
      // 运行多次
      for (let i = 0; i < 20; i++) {
        const selected = selectCharacterByWeight(zeroWeights, 100, otherChars);
        if (selected !== null) {
          expect(otherChars).toContain(selected);
        }
      }
    });
  });

  // **Feature: exam-upgrade, Property 11: 数据不足错误处理**
  // **Validates: Requirements 5.4**
  describe('Property 11: 数据不足错误处理', () => {
    it('当总权重为0时，selectCharacterByWeight应返回null', () => {
      const result = selectCharacterByWeight([], 0, []);
      expect(result).toBeNull();
    });

    it('当其他字权重为0且没有可用其他字时，应只从重点字中选择', () => {
      fc.assert(
        fc.property(
          validCharacterWeightsArb.filter(weights => weights.length > 0 && weights.some(w => w.weight > 0)),
          (characterWeights) => {
            const validWeights = characterWeights.filter(w => w.weight > 0);
            if (validWeights.length === 0) return;
            
            const priorityChars = validWeights.map(w => w.char);
            
            // 其他字权重为0，且没有可用其他字
            for (let i = 0; i < 10; i++) {
              const selected = selectCharacterByWeight(validWeights, 0, []);
              if (selected !== null) {
                expect(priorityChars).toContain(selected);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
