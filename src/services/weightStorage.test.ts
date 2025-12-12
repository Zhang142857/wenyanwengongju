import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  serializeWeightConfig,
  deserializeWeightConfig,
  createDefaultWeightConfig,
} from './weightStorage';
import { UnifiedWeightConfig, ArticleWeight, CharacterWeight } from '../types/weight';

// 生成有效的 ArticleWeight
const articleWeightArb = fc.record({
  articleId: fc.uuid(),
  articleTitle: fc.string({ minLength: 1, maxLength: 50 }),
  collectionId: fc.uuid(),
  collectionName: fc.string({ minLength: 1, maxLength: 50 }),
  weight: fc.integer({ min: 0, max: 100 }),
  included: fc.boolean(),
  order: fc.integer({ min: 0, max: 1000 }),
});

// 生成有效的 CharacterWeight
const characterWeightArb = fc.record({
  char: fc.string({ minLength: 1, maxLength: 1 }),
  weight: fc.integer({ min: 0, max: 100 }),
});

// 生成有效的 UnifiedWeightConfig
const unifiedWeightConfigArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  note: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  articleWeights: fc.array(articleWeightArb, { minLength: 0, maxLength: 10 }),
  characterWeights: fc.array(characterWeightArb, { minLength: 0, maxLength: 10 }),
  otherCharactersWeight: fc.integer({ min: 0, max: 100 }),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString()),
});

describe('WeightStorage', () => {
  // **Feature: exam-upgrade, Property 4: 权重配置序列化Round-Trip**
  // **Validates: Requirements 2.4, 2.5, 7.3, 7.4**
  describe('Property 4: 权重配置序列化Round-Trip', () => {
    it('序列化后反序列化应得到与原配置相等的配置对象', () => {
      fc.assert(
        fc.property(unifiedWeightConfigArb, (config) => {
          // 序列化
          const serialized = serializeWeightConfig(config);
          
          // 反序列化
          const deserialized = deserializeWeightConfig(serialized);
          
          // 验证基本字段
          expect(deserialized.id).toBe(config.id);
          expect(deserialized.name).toBe(config.name);
          expect(deserialized.note).toBe(config.note);
          expect(deserialized.otherCharactersWeight).toBe(config.otherCharactersWeight);
          expect(deserialized.createdAt).toBe(config.createdAt);
          expect(deserialized.updatedAt).toBe(config.updatedAt);
          
          // 验证文章权重数组
          expect(deserialized.articleWeights.length).toBe(config.articleWeights.length);
          for (let i = 0; i < config.articleWeights.length; i++) {
            expect(deserialized.articleWeights[i].articleId).toBe(config.articleWeights[i].articleId);
            expect(deserialized.articleWeights[i].articleTitle).toBe(config.articleWeights[i].articleTitle);
            expect(deserialized.articleWeights[i].collectionId).toBe(config.articleWeights[i].collectionId);
            expect(deserialized.articleWeights[i].collectionName).toBe(config.articleWeights[i].collectionName);
            expect(deserialized.articleWeights[i].weight).toBe(config.articleWeights[i].weight);
            expect(deserialized.articleWeights[i].included).toBe(config.articleWeights[i].included);
            expect(deserialized.articleWeights[i].order).toBe(config.articleWeights[i].order);
          }
          
          // 验证重点字权重数组
          expect(deserialized.characterWeights.length).toBe(config.characterWeights.length);
          for (let i = 0; i < config.characterWeights.length; i++) {
            expect(deserialized.characterWeights[i].char).toBe(config.characterWeights[i].char);
            expect(deserialized.characterWeights[i].weight).toBe(config.characterWeights[i].weight);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('多次序列化/反序列化应保持一致性', () => {
      fc.assert(
        fc.property(unifiedWeightConfigArb, (config) => {
          // 第一次 round-trip
          const serialized1 = serializeWeightConfig(config);
          const deserialized1 = deserializeWeightConfig(serialized1);
          
          // 第二次 round-trip
          const serialized2 = serializeWeightConfig(deserialized1);
          const deserialized2 = deserializeWeightConfig(serialized2);
          
          // 两次反序列化的结果应该相同
          expect(serialized1).toBe(serialized2);
          expect(deserialized1.id).toBe(deserialized2.id);
          expect(deserialized1.name).toBe(deserialized2.name);
        }),
        { numRuns: 100 }
      );
    });

    it('序列化结果应为有效的JSON字符串', () => {
      fc.assert(
        fc.property(unifiedWeightConfigArb, (config) => {
          const serialized = serializeWeightConfig(config);
          
          // 应该能被JSON.parse解析
          expect(() => JSON.parse(serialized)).not.toThrow();
          
          // 解析后应该是对象
          const parsed = JSON.parse(serialized);
          expect(typeof parsed).toBe('object');
          expect(parsed).not.toBeNull();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('deserializeWeightConfig validation', () => {
    it('应拒绝缺少id的配置', () => {
      const invalidJson = JSON.stringify({
        name: 'test',
        articleWeights: [],
        characterWeights: [],
        otherCharactersWeight: 100,
      });
      
      expect(() => deserializeWeightConfig(invalidJson)).toThrow('missing or invalid id');
    });

    it('应拒绝缺少name的配置', () => {
      const invalidJson = JSON.stringify({
        id: 'test-id',
        articleWeights: [],
        characterWeights: [],
        otherCharactersWeight: 100,
      });
      
      expect(() => deserializeWeightConfig(invalidJson)).toThrow('missing or invalid name');
    });

    it('应拒绝无效的articleWeights', () => {
      const invalidJson = JSON.stringify({
        id: 'test-id',
        name: 'test',
        articleWeights: 'not-an-array',
        characterWeights: [],
        otherCharactersWeight: 100,
      });
      
      expect(() => deserializeWeightConfig(invalidJson)).toThrow('missing or invalid articleWeights');
    });

    it('应拒绝无效的characterWeights', () => {
      const invalidJson = JSON.stringify({
        id: 'test-id',
        name: 'test',
        articleWeights: [],
        characterWeights: 'not-an-array',
        otherCharactersWeight: 100,
      });
      
      expect(() => deserializeWeightConfig(invalidJson)).toThrow('missing or invalid characterWeights');
    });

    it('应拒绝无效的otherCharactersWeight', () => {
      const invalidJson = JSON.stringify({
        id: 'test-id',
        name: 'test',
        articleWeights: [],
        characterWeights: [],
        otherCharactersWeight: 'not-a-number',
      });
      
      expect(() => deserializeWeightConfig(invalidJson)).toThrow('missing or invalid otherCharactersWeight');
    });
  });

  describe('createDefaultWeightConfig', () => {
    it('应创建有效的默认配置', () => {
      const config = createDefaultWeightConfig();
      
      expect(config.id).toBeDefined();
      expect(config.name).toBe('默认配置');
      expect(config.articleWeights).toEqual([]);
      expect(config.characterWeights).toEqual([]);
      expect(config.otherCharactersWeight).toBe(100);
      expect(config.createdAt).toBeDefined();
      expect(config.updatedAt).toBeDefined();
    });

    it('每次调用应生成不同的ID', () => {
      const config1 = createDefaultWeightConfig();
      const config2 = createDefaultWeightConfig();
      
      expect(config1.id).not.toBe(config2.id);
    });
  });
});
