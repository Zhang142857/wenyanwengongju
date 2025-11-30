import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storage';
import { findSentencesWithKeyCharacters, deduplicateCharacterSentencePairs } from './aiOrganize';

describe('AI Organize Service', () => {
  let storage: StorageService;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.initialize();
  });

  // **Feature: library-system-redesign, Property 15: 重点字覆盖完整性**
  describe('Property 15: 重点字覆盖完整性', () => {
    it('should find all sentences containing key characters', () => {
      const library = storage.addLibrary('测试库');
      const collection = storage.addCollection(library.id, '测试集', 0);
      
      storage.addArticle(collection.id, {
        title: '文章1',
        content: '学而时习之，不亦说乎。温故而知新，可以为师矣。',
        collectionId: collection.id,
      });

      storage.addArticle(collection.id, {
        title: '文章2',
        content: '三人行，必有我师焉。择其善者从之，其不善者改之。',
        collectionId: collection.id,
      });

      const keyChars = ['而', '之'];
      const pairs = findSentencesWithKeyCharacters(storage, keyChars);

      // 验证：找到所有包含"而"的句子
      const erPairs = pairs.filter(p => p.character === '而');
      expect(erPairs.length).toBeGreaterThan(0);

      // 验证：找到所有包含"之"的句子
      const zhiPairs = pairs.filter(p => p.character === '之');
      expect(zhiPairs.length).toBeGreaterThan(0);

      // 验证：每个pair都包含对应的字
      for (const pair of pairs) {
        expect(pair.sentence).toContain(pair.character);
      }
    });

    it('should handle empty key characters list', () => {
      const library = storage.addLibrary('测试库');
      const collection = storage.addCollection(library.id, '测试集', 0);
      
      storage.addArticle(collection.id, {
        title: '文章',
        content: '学而时习之。',
        collectionId: collection.id,
      });

      const pairs = findSentencesWithKeyCharacters(storage, []);
      expect(pairs.length).toBe(0);
    });
  });

  // **Feature: library-system-redesign, Property 16: 去重逻辑正确性**
  describe('Property 16: 去重逻辑正确性', () => {
    it('should not include already processed pairs', () => {
      const allPairs = [
        { sentence: '学而时习之', character: '而', sentenceId: 's1' },
        { sentence: '学而时习之', character: '之', sentenceId: 's1' },
        { sentence: '温故而知新', character: '而', sentenceId: 's2' },
        { sentence: '温故而知新', character: '知', sentenceId: 's2' },
      ];

      const processedPairs = [
        { sentence: '学而时习之', character: '而', sentenceId: 's1' },
        { sentence: '温故而知新', character: '而', sentenceId: 's2' },
      ];

      const newPairs = deduplicateCharacterSentencePairs(allPairs, processedPairs);

      // 验证：已处理的pair不应该出现在结果中
      expect(newPairs.length).toBe(2);
      expect(newPairs.find(p => p.character === '而')).toBeUndefined();
      
      // 验证：未处理的pair应该在结果中
      expect(newPairs.find(p => p.character === '之')).toBeDefined();
      expect(newPairs.find(p => p.character === '知')).toBeDefined();
    });

    it('should return all pairs when nothing is processed', () => {
      const allPairs = [
        { sentence: '学而时习之', character: '而', sentenceId: 's1' },
        { sentence: '学而时习之', character: '之', sentenceId: 's1' },
      ];

      const newPairs = deduplicateCharacterSentencePairs(allPairs, []);
      expect(newPairs.length).toBe(allPairs.length);
    });

    it('should return empty when all pairs are processed', () => {
      const allPairs = [
        { sentence: '学而时习之', character: '而', sentenceId: 's1' },
      ];

      const newPairs = deduplicateCharacterSentencePairs(allPairs, allPairs);
      expect(newPairs.length).toBe(0);
    });
  });
});
