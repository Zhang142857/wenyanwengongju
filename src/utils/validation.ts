import type { ValidationResult } from '@/types';

/**
 * 验证搜索输入
 * @param input 用户输入的搜索字符串
 * @returns 验证结果
 */
export function validateInput(input: string): ValidationResult {
  // 检查是否为空
  if (!input || input.length === 0) {
    return {
      isValid: false,
      errorMessage: '请输入要查询的字符',
    };
  }

  // 检查是否全是空白字符
  if (input.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: '请输入有效的汉字',
    };
  }

  // 输入有效
  return {
    isValid: true,
  };
}

/**
 * 获取第一个有效字符
 * 如果用户输入多个字符，只取第一个
 * @param input 用户输入
 * @returns 第一个有效字符，如果没有则返回空字符串
 */
export function getFirstValidCharacter(input: string): string {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed[0] : '';
}
