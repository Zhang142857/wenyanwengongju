import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StorageService } from './storage';

describe('Definition Management', () => {
  let storage: StorageService;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.initialize();
  });

  // **Feature: library-system-redesign, Property 4: 义项添加一致性**
  describe('Property 4: 义项添加一致性', () => {
    it('should add definition and create proper links', () => {
      // 创建测试数据
      const library = storage.addLibrary('测试库');
      const collection = storage.addCollection(library.id, '测试集', 0);
      const article = storage.addArticle(collection.id, {
        title: '测试文章',
        content: '学而时习之，不亦说乎。',
        collectionId: collection.id,
      });

      const sentence = article.sentences[0];
      const definition = storage.addDefinition('而', '连词，表顺承');

      // 添加关联
      const link = storage.addCharacterDefinitionLink(
        definition.id,
        sentence.id,
        1 // "而"在句子中的位置
      );

      // 验证义项存在
      const definitions = storage.getDefinitions();
      expect(definitions).toContainEqual(definition);

      // 验证关联存在
      const links = storage.getDefinitionLinksForDefinition(definition.id);
      expect(links).toContainEqual(link);
      expect(links[0].sentenceId).toBe(sentence.id);
    });
  });

  // **Feature: library-system-redesign, Property 5: 义项去重正确性**
  describe('Property 5: 义项去重正确性', () => {
    it('should not create duplicate definitions', () => {
      const library = storage.addLibrary('测试库');
      const collection = storage.addCollection(library.id, '测试集', 0);
      const article = storage.addArticle(collection.id, {
        title: '测试文章',
        content: '学而时习之。温故而知新。',
        collectionId: collection.id,
      });

      const sentence1 = article.sentences[0];
      const sentence2 = article.sentences[1];

      // 第一次添加义项
      const def1 = storage.addDefinitionOrGetExisting('而', '连词，表顺承');
      storage.addCharacterDefinitionLink(def1.id, sentence1.id, 1);

      const countBefore = storage.getDefinitions().length;

      // 第二次添加相同义项
      const def2 = storage.addDefinitionOrGetExisting('而', '连词，表顺承');
      storage.addCharacterDefinitionLink(def2.id, sentence2.id, 2);

      const countAfter = storage.getDefinitions().length;

      // 验证：义项总数不变
      expect(countAfter).toBe(countBefore);

      // 验证：返回的是同一个义项
      expect(def1.id).toBe(def2.id);

      // 验证：两个句子都关联到同一个义项
      const links = storage.getDefinitionLinksForDefinition(def1.id);
      expect(links.length).toBe(2);
    });

    it('should create different definitions for different content', () => {
      const def1 = storage.addDefinitionOrGetExisting('而', '连词，表顺承');
      const def2 = storage.addDefinitionOrGetExisting('而', '连词，表转折');

      expect(def1.id).not.toBe(def2.id);
      expect(storage.getDefinitions().length).toBe(2);
    });
  });

  // **Feature: library-system-redesign, Property 6: 义项合并完整性**
  describe('Property 6: 义项合并完整性', () => {
    it('should move all links when merging definitions', () => {
      const library = storage.addLibrary('测试库');
      const collection = storage.addCollection(library.id, '测试集', 0);
      const article = storage.addArticle(collection.id, {
        title: '测试文章',
        content: '学而时习之。温故而知新。人不知而不愠。',
        collectionId: collection.id,
      });

      // 创建两个重复的义项
      const def1 = storage.addDefinition('而', '连词');
      const def2 = storage.addDefinition('而', '连词，表顺承');

      // 为两个义项添加例句
      storage.addCharacterDefinitionLink(def1.id, article.sentences[0].id, 1);
      storage.addCharacterDefinitionLink(def1.id, article.sentences[1].id, 2);
      storage.addCharacterDefinitionLink(def2.id, article.sentences[2].id, 3);

      const totalLinksBefore = storage.getCharacterDefinitionLinks().length;
      const def1LinksBefore = storage.getDefinitionLinksForDefinition(def1.id).length;
      const def2LinksBefore = storage.getDefinitionLinksForDefinition(def2.id).length;

      // 合并义项：将 def2 合并到 def1
      const success = storage.mergeDefinitions(def1.id, def2.id);
      expect(success).toBe(true);

      // 验证：总例句数不变
      const totalLinksAfter = storage.getCharacterDefinitionLinks().length;
      expect(totalLinksAfter).toBe(totalLinksBefore);

      // 验证：def1 现在有所有例句
      const def1LinksAfter = storage.getDefinitionLinksForDefinition(def1.id).length;
      expect(def1LinksAfter).toBe(def1LinksBefore + def2LinksBefore);

      // 验证：def2 已被删除
      const def2After = storage.getDefinitionById(def2.id);
      expect(def2After).toBeNull();

      // 验证：义项总数减少1
      const definitionsAfter = storage.getDefinitions();
      expect(definitionsAfter.length).toBe(1);
    });

    it('should handle merging with no links', () => {
      const def1 = storage.addDefinition('之', '代词');
      const def2 = storage.addDefinition('之', '代词，指代');

      const success = storage.mergeDefinitions(def1.id, def2.id);
      expect(success).toBe(true);

      expect(storage.getDefinitionById(def2.id)).toBeNull();
      expect(storage.getDefinitions().length).toBe(1);
    });

    it('should return false for invalid definition IDs', () => {
      const def1 = storage.addDefinition('之', '代词');
      const success = storage.mergeDefinitions(def1.id, 'invalid-id');
      expect(success).toBe(false);
    });
  });
});
