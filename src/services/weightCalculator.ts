// 权重计算器服务
// 实现统一的权重计算模型，确保各组件间数据一致性

import {
  CharacterWeight,
  UnifiedWeightConfig,
  WeightValidationResult,
  QuestionDistribution,
} from '../types/weight';

/**
 * 计算"其他字"的剩余权重
 * 当重点字权重总和小于100%时，将剩余权重分配给"其他字"项
 * 当重点字权重总和等于100%时，自动将"其他字"权重设为0
 * 
 * @param characterWeights 重点字权重列表
 * @returns 其他字的权重值 (0-100)
 */
export function calculateOtherCharactersWeight(characterWeights: CharacterWeight[]): number {
  const totalPriorityWeight = characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
  const otherWeight = Math.max(0, 100 - totalPriorityWeight);
  return otherWeight;
}

/**
 * 验证权重配置的有效性
 * 
 * @param config 统一权重配置
 * @returns 验证结果，包含是否有效、警告和错误信息
 */
export function validateWeights(config: UnifiedWeightConfig): WeightValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 验证文章权重
  const includedArticles = config.articleWeights.filter(a => a.included);
  if (includedArticles.length === 0) {
    errors.push('请至少选择一篇文章');
  }

  // 检查文章权重是否有负数
  const negativeArticleWeights = config.articleWeights.filter(a => a.weight < 0);
  if (negativeArticleWeights.length > 0) {
    errors.push('权重值不能为负数');
  }

  // 验证重点字权重
  const totalCharacterWeight = config.characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
  const totalWeight = totalCharacterWeight + config.otherCharactersWeight;

  // 检查重点字权重是否有负数
  const negativeCharWeights = config.characterWeights.filter(cw => cw.weight < 0);
  if (negativeCharWeights.length > 0) {
    errors.push('权重值不能为负数');
  }

  // 检查其他字权重是否为负数
  if (config.otherCharactersWeight < 0) {
    errors.push('权重值不能为负数');
  }

  // 检查权重总和
  if (totalWeight > 100) {
    warnings.push('权重总和超过100%，请调整各项权重');
  } else if (totalWeight < 100 && config.characterWeights.length > 0) {
    warnings.push(`权重总和为${totalWeight}%，未达到100%`);
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * 根据权重随机选择字符
 * 重点字按其权重比例选择，其他字在其权重范围内均匀随机选择
 * 
 * @param characterWeights 重点字权重列表
 * @param otherCharactersWeight 其他字的权重
 * @param availableOtherChars 可用的其他字列表（非重点字）
 * @returns 选中的字符，如果无法选择则返回null
 */
export function selectCharacterByWeight(
  characterWeights: CharacterWeight[],
  otherCharactersWeight: number,
  availableOtherChars: string[]
): string | null {
  const totalPriorityWeight = characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
  const totalWeight = totalPriorityWeight + otherCharactersWeight;

  if (totalWeight <= 0) {
    return null;
  }

  // 生成随机数
  const random = Math.random() * totalWeight;

  // 检查是否落在重点字范围内
  let cumulative = 0;
  for (const cw of characterWeights) {
    cumulative += cw.weight;
    if (random < cumulative) {
      return cw.char;
    }
  }

  // 落在其他字范围内，均匀随机选择
  if (availableOtherChars.length > 0 && otherCharactersWeight > 0) {
    const randomIndex = Math.floor(Math.random() * availableOtherChars.length);
    return availableOtherChars[randomIndex];
  }

  return null;
}

/**
 * 计算题目分配
 * 根据重点字权重和其他字权重的比例分配题目数量
 * 
 * @param totalQuestions 总题目数量
 * @param characterWeights 重点字权重列表
 * @param otherCharactersWeight 其他字的权重
 * @returns 题目分配结果
 */
export function calculateQuestionDistribution(
  totalQuestions: number,
  characterWeights: CharacterWeight[],
  otherCharactersWeight: number
): QuestionDistribution {
  const totalPriorityWeight = characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
  const totalWeight = totalPriorityWeight + otherCharactersWeight;

  if (totalWeight <= 0) {
    return { priorityCount: 0, otherCount: 0 };
  }

  // 按权重比例计算分配
  const priorityRatio = totalPriorityWeight / totalWeight;
  const priorityCount = Math.round(totalQuestions * priorityRatio);
  const otherCount = totalQuestions - priorityCount;

  return {
    priorityCount,
    otherCount,
  };
}

/**
 * 权重计算器类
 * 提供统一的权重计算接口
 */
export class WeightCalculator {
  calculateOtherCharactersWeight = calculateOtherCharactersWeight;
  validateWeights = validateWeights;
  selectCharacterByWeight = selectCharacterByWeight;
  calculateQuestionDistribution = calculateQuestionDistribution;
}

// 导出默认实例
export const weightCalculator = new WeightCalculator();
