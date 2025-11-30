import { describe, it, expect } from 'vitest';
import { validateInput, getFirstValidCharacter } from './validation';

describe('Validation Utils', () => {
  /**
   * Feature: classical-chinese-query, Property 4: 空白输入验证
   * 验证: 需求 1.5
   */
  describe('Property 4: 空白输入验证', () => {
    it('对于空字符串，验证函数必须返回无效结果', () => {
      const result = validateInput('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('对于仅包含空格的字符串，验证函数必须返回无效结果', () => {
      const result = validateInput('   ');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('请输入有效的汉字');
    });

    it('对于仅包含制表符的字符串，验证函数必须返回无效结果', () => {
      const result = validateInput('\t\t');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('请输入有效的汉字');
    });

    it('对于仅包含换行符的字符串，验证函数必须返回无效结果', () => {
      const result = validateInput('\n\n');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('请输入有效的汉字');
    });

    it('对于混合空白字符的字符串，验证函数必须返回无效结果', () => {
      const result = validateInput(' \t\n ');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('请输入有效的汉字');
    });

    it('对于有效的汉字输入，验证函数必须返回有效结果', () => {
      const result = validateInput('学');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('对于前后有空格的有效输入，验证函数必须返回有效结果', () => {
      const result = validateInput('  学  ');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe('getFirstValidCharacter', () => {
    it('应该返回第一个字符', () => {
      expect(getFirstValidCharacter('学而时习之')).toBe('学');
    });

    it('应该忽略前导空格', () => {
      expect(getFirstValidCharacter('  学')).toBe('学');
    });

    it('对于空字符串应该返回空字符串', () => {
      expect(getFirstValidCharacter('')).toBe('');
    });

    it('对于纯空白字符应该返回空字符串', () => {
      expect(getFirstValidCharacter('   ')).toBe('');
    });
  });
});
