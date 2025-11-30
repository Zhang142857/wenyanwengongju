import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StorageService } from './storage';

describe('Short Sentence Management', () => {
  let storage: StorageService;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.initialize();
  });

  // **Feature: library-system-redesign, Property 8: 短句长度约束**
  describe('Property 8: 短句长度约束', () => {
    it('should only accept short sentences with length 4-15', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          (text) => {
            const result = storage.addShortSentence(text, 'article-id', 'sentence-id');

            if (text.length >= 4 && text.length <= 15) {
              // 应该成功添加
              expect(result).not.toBeNull();
              if (result) {
                expect(result.text).toBe(text);
              }
            } else {
              // 应该被拒绝
              expect(result).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject sentences shorter than 4 characters', () => {
      const result1 = storage.addShortSentence('学', 'article-id', 'sentence-id');
      const result2 = storage.addShortSentence('学而', 'article-id', 'sentence-id');
      const result3 = storage.addShortSentence('学而时', 'article-id', 'sentence-id');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
      expect(storage.getShortSentences().length).toBe(0);
    });

    it('should reject sentences longer than 15 characters', () => {
      const longText = '学而时习之不亦说乎温故而知新可以为师矣';
      const result = storage.addShortSentence(longText, 'article-id', 'sentence-id');

      expect(result).toBeNull();
      expect(storage.getShortSentences().length).toBe(0);
    });

    it('should accept sentences with length 4-15', () => {
      const result1 = storage.addShortSentence('学而时习', 'article-id', 'sentence-id');
      const result2 = storage.addShortSentence('温故而知新可以为师矣', 'article-id', 'sentence-id');

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(storage.getShortSentences().length).toBe(2);
    });
  });

  // **Feature: library-system-redesign, Property 9: 短句关联有效性**
  describe('Property 9: 短句关联有效性', () => {
    it('should maintain valid references to source article and sentence', () => {
      // 创建测试数据
      const library = storage.addLibrary('测试库');
      const collection = storage.addCollection(library.id, '测试集', 0);
      const article = storage.addArticle(collection.id, {
        title: '测试文章',
        content: '学而时习之，不亦说乎。',
        collectionId: collection.id,
      });

      const sentence = article.sentences[0];

      // 添加短句
      const shortSentence = storage.addShortSentence(
        '学而时习之',
        article.id,
        sentence.id
      );

      expect(shortSentence).not.toBeNull();
      if (shortSentence) {
        // 验证关联有效性
        const sourceArticle = storage.getArticle(shortSentence.sourceArticleId);
        const sourceSentence = storage.getSentenceById(shortSentence.sourceSentenceId);

        expect(sourceArticle).not.toBeNull();
        expect(sourceSentence).not.toBeNull();
        expect(sourceArticle?.id).toBe(article.id);
        expect(sourceSentence?.id).toBe(sentence.id);
      }
    });

    it('should handle multiple short sentences from same source', () => {
      const library = storage.addLibrary('测试库');
      const collection = storage.addCollection(library.id, '测试集', 0);
      const article = storage.addArticle(collection.id, {
        title: '测试文章',
        content: '学而时习之，不亦说乎。温故而知新，可以为师矣。',
        collectionId: collection.id,
      });

      const sentence1 = article.sentences[0];
      const sentence2 = article.sentences[1];

      // 从同一文章的不同句子添加短句
      const short1 = storage.addShortSentence('学而时习之', article.id, sentence1.id);
      const short2 = storage.addShortSentence('温故而知新', article.id, sentence2.id);

      expect(short1).not.toBeNull();
      expect(short2).not.toBeNull();

      const shortSentences = storage.getShortSentences();
      expect(shortSentences.length).toBe(2);

      // 验证都指向同一文章
      expect(shortSentences[0].sourceArticleId).toBe(article.id);
      expect(shortSentences[1].sourceArticleId).toBe(article.id);

      // 验证指向不同句子
      expect(shortSentences[0].sourceSentenceId).toBe(sentence1.id);
      expect(shortSentences[1].sourceSentenceId).toBe(sentence2.id);
    });
  });
});
