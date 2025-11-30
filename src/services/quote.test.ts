import { describe, it, expect, beforeEach } from 'vitest';
import { QuoteService } from './quote';
import type { Quote } from '@/types';

describe('QuoteService', () => {
  let quoteService: QuoteService;
  let testQuotes: Quote[];

  beforeEach(() => {
    testQuotes = [
      { id: '1', text: '学而不思则罔，思而不学则殆。', author: '孔子' },
      { id: '2', text: '知之为知之，不知为不知，是知也。', author: '孔子' },
      { id: '3', text: '三人行，必有我师焉。', author: '孔子' },
      { id: '4', text: '己所不欲，勿施于人。', author: '孔子' },
      { id: '5', text: '温故而知新，可以为师矣。', author: '孔子' },
    ];
    quoteService = new QuoteService(testQuotes);
  });

  /**
   * Feature: classical-chinese-query, Property 6: 每日名言来源有效性
   * 验证: 需求 3.4
   */
  describe('Property 6: 每日名言来源有效性', () => {
    it('随机获取的名言必须存在于名言库中', () => {
      for (let i = 0; i < 20; i++) {
        const quote = quoteService.getRandomQuote();
        
        expect(quote).not.toBeNull();
        expect(testQuotes.some(q => q.id === quote!.id)).toBe(true);
      }
    });

    it('按日期获取的名言必须存在于名言库中', () => {
      // 测试多个不同日期
      const dates = [
        new Date('2024-01-01'),
        new Date('2024-06-15'),
        new Date('2024-12-31'),
        new Date('2025-03-20'),
      ];

      for (const date of dates) {
        const quote = quoteService.getQuoteByDate(date);
        
        expect(quote).not.toBeNull();
        expect(testQuotes.some(q => q.id === quote!.id)).toBe(true);
      }
    });

    it('同一天多次获取应该返回相同的名言', () => {
      const date = new Date('2024-11-28');
      
      const quote1 = quoteService.getQuoteByDate(date);
      const quote2 = quoteService.getQuoteByDate(date);
      const quote3 = quoteService.getQuoteByDate(date);

      expect(quote1).not.toBeNull();
      expect(quote2).not.toBeNull();
      expect(quote3).not.toBeNull();
      
      expect(quote1!.id).toBe(quote2!.id);
      expect(quote2!.id).toBe(quote3!.id);
    });

    it('不同日期应该可能返回不同的名言', () => {
      const quotes = new Set<string>();
      
      // 测试100个不同日期
      for (let i = 0; i < 100; i++) {
        const date = new Date(2024, 0, i + 1);
        const quote = quoteService.getQuoteByDate(date);
        
        if (quote) {
          quotes.add(quote.id);
        }
      }

      // 应该至少有2个不同的名言（除非名言库只有1条）
      if (testQuotes.length > 1) {
        expect(quotes.size).toBeGreaterThan(1);
      }
    });
  });

  describe('QuoteService - Unit Tests', () => {
    it('应该能够获取所有名言', () => {
      const allQuotes = quoteService.getAllQuotes();
      expect(allQuotes.length).toBe(5);
    });

    it('应该能够添加新名言', () => {
      const newQuote: Quote = {
        id: '6',
        text: '学无止境。',
        author: '荀子',
      };

      quoteService.addQuote(newQuote);
      const allQuotes = quoteService.getAllQuotes();
      
      expect(allQuotes.length).toBe(6);
      expect(allQuotes[5]).toEqual(newQuote);
    });

    it('应该能够根据ID获取名言', () => {
      const quote = quoteService.getQuoteById('1');
      
      expect(quote).not.toBeNull();
      expect(quote!.text).toBe('学而不思则罔，思而不学则殆。');
    });

    it('获取不存在的ID应该返回null', () => {
      const quote = quoteService.getQuoteById('999');
      expect(quote).toBeNull();
    });

    it('空名言库应该返回null', () => {
      const emptyService = new QuoteService([]);
      
      expect(emptyService.getRandomQuote()).toBeNull();
      expect(emptyService.getQuoteByDate()).toBeNull();
    });

    it('应该能够设置新的名言列表', () => {
      const newQuotes: Quote[] = [
        { id: '10', text: '新名言1', author: '作者1' },
        { id: '11', text: '新名言2', author: '作者2' },
      ];

      quoteService.setQuotes(newQuotes);
      const allQuotes = quoteService.getAllQuotes();
      
      expect(allQuotes.length).toBe(2);
      expect(allQuotes[0].id).toBe('10');
    });
  });
});
