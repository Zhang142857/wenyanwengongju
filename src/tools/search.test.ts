import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SearchTool, highlightCharacter } from './search';
import { StorageService } from '@/services/storage';
import type { Library, Collection, Article, Sentence } from '@/types';

describe('SearchTool', () => {
  let storage: StorageService;
  let searchTool: SearchTool;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.initialize();
    searchTool = new SearchTool(storage);
  });

  // **Feature: library-system-redesign, Property 1: 搜索完整性**
  describe('Property 1: 搜索完整性', () => {
    it('should return all and only sentences containing the target character', () => {
      // 使用具体的测试用例而不是完全随机生成
      const library = storage.addLibrary('测试库');
      const collection = storage.addCollection(library.id, '测试集', 0);
      
      // 添加包含"而"字的文章
      const article1 = storage.addArticle(collection.id, {
        title: '文章1',
        content: '学而时习之，不亦说乎。温故而知新，可以为师矣。',
        collectionId: collection.id,
      });

      // 添加不包含"而"字的文章
      const article2 = storage.addArticle(collection.id, {
        title: '文章2',
        content: '三人行，必有我师焉。择其善者从之，其不善者改之。',
        collectionId: collection.id,
      });

      // 搜索"而"字
      const results = searchTool.searchByCharacter('而');

      // 验证：所有返回的句子都包含"而"字
      for (const result of results) {
        expect(result.sentence.text).toContain('而');
      }

      // 验证：应该找到2个句子（article1中的两个句子）
      expect(results.length).toBe(2);

      // 验证：不应该包含article2的句子
      for (const result of results) {
        expect(result.article.id).toBe(article1.id);
      }
    });

    it('should return empty array when character not found', () => {
      const library = storage.addLibrary('测试库');
      const collection = storage.addCollection(library.id, '测试集', 0);
      
      storage.addArticle(collection.id, {
        title: '文章',
        content: '学习时习之，不亦说乎。',
        collectionId: collection.id,
      });

      const results = searchTool.searchByCharacter('而');
      expect(results.length).toBe(0);
    });
  });

  // **Feature: library-system-redesign, Property 2: 筛选条件正确性**
  describe('Property 2: 筛选条件正确性', () => {
    it('should only return sentences matching the scope filter', () => {
      // 创建多个库和集
      const lib1 = storage.addLibrary('库1');
      const lib2 = storage.addLibrary('库2');
      const col1 = storage.addCollection(lib1.id, '集1', 0);
      const col2 = storage.addCollection(lib2.id, '集2', 0);

      storage.addArticle(col1.id, {
        title: '文章1',
        content: '而今而后，吾知免夫。',
        collectionId: col1.id,
      });

      storage.addArticle(col2.id, {
        title: '文章2',
        content: '学而时习之，不亦说乎。',
        collectionId: col2.id,
      });

      // 测试库筛选
      const resultsLib1 = searchTool.searchByCharacter('而', { libraryIds: [lib1.id] });
      for (const result of resultsLib1) {
        expect(result.library.id).toBe(lib1.id);
      }

      // 测试集筛选
      const resultsCol2 = searchTool.searchByCharacter('而', { collectionIds: [col2.id] });
      for (const result of resultsCol2) {
        expect(result.collection.id).toBe(col2.id);
      }
    });
  });

  // **Feature: library-system-redesign, Property 3: 高亮位置准确性**
  describe('Property 3: 高亮位置准确性', () => {
    it('should highlight all occurrences of the target character', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1 }),
          fc.string({ minLength: 5, maxLength: 30 }),
          (targetChar, text) => {
            // 找到所有匹配位置
            const positions: number[] = [];
            let index = text.indexOf(targetChar);
            while (index !== -1) {
              positions.push(index);
              index = text.indexOf(targetChar, index + 1);
            }

            // 高亮
            const highlighted = highlightCharacter(text, positions);

            // 验证：高亮数量应该等于匹配位置数量
            const markCount = (highlighted.match(/<mark>/g) || []).length;
            expect(markCount).toBe(positions.length);

            // 验证：每个位置都被正确高亮
            if (positions.length > 0) {
              expect(highlighted).toContain('<mark>');
              expect(highlighted).toContain('</mark>');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty positions array', () => {
      const text = '学而时习之';
      const highlighted = highlightCharacter(text, []);
      expect(highlighted).toBe(text);
    });

    it('should handle regex matches with lengths', () => {
      const text = '学而时习之，不亦说乎';
      const positions = [0, 6]; // "学" 和 "不"
      const lengths = [1, 1];
      const highlighted = highlightCharacter(text, positions, lengths);
      
      expect(highlighted).toContain('<mark>学</mark>');
      expect(highlighted).toContain('<mark>不</mark>');
    });
  });
});
