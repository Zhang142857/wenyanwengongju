import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StorageService } from './storage';
import type { Definition, CharacterDefinitionLink } from '@/types';

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
  });

  // **Feature: library-system-redesign, Property 7: 序列化往返一致性**
  describe('Property 7: 序列化往返一致性', () => {
    it('should maintain data integrity through serialize/deserialize cycle', () => {
      fc.assert(
        fc.property(
          fc.record({
            libraries: fc.array(fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              collections: fc.array(fc.record({
                id: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                libraryId: fc.uuid(),
                articles: fc.array(fc.record({
                  id: fc.uuid(),
                  title: fc.string({ minLength: 1, maxLength: 100 }),
                  content: fc.string({ minLength: 1, maxLength: 500 }),
                  collectionId: fc.uuid(),
                  sentences: fc.array(fc.record({
                    id: fc.uuid(),
                    text: fc.string({ minLength: 1, maxLength: 100 }),
                    articleId: fc.uuid(),
                    index: fc.nat(),
                  })),
                })),
                order: fc.nat(),
              })),
              createdAt: fc.date().map(d => d.toISOString()),
              updatedAt: fc.date().map(d => d.toISOString()),
            })),
            quotes: fc.array(fc.record({
              id: fc.uuid(),
              text: fc.string({ minLength: 1, maxLength: 200 }),
              author: fc.string({ minLength: 1, maxLength: 50 }),
            })),
            definitions: fc.array(fc.record({
              id: fc.uuid(),
              character: fc.string({ minLength: 1, maxLength: 1 }),
              content: fc.string({ minLength: 2, maxLength: 20 }),
              createdAt: fc.date().map(d => d.toISOString()),
              updatedAt: fc.date().map(d => d.toISOString()),
            })),
            translations: fc.array(fc.record({
              id: fc.uuid(),
              originalText: fc.string({ minLength: 1, maxLength: 100 }),
              translatedText: fc.string({ minLength: 1, maxLength: 200 }),
              createdAt: fc.date().map(d => d.toISOString()),
              updatedAt: fc.date().map(d => d.toISOString()),
            })),
            characterDefinitionLinks: fc.array(fc.record({
              id: fc.uuid(),
              definitionId: fc.uuid(),
              sentenceId: fc.uuid(),
              characterPosition: fc.nat({ max: 100 }),
            })),
            sentenceTranslationLinks: fc.array(fc.record({
              id: fc.uuid(),
              translationId: fc.uuid(),
              sentenceId: fc.uuid(),
              startPosition: fc.nat({ max: 100 }),
              endPosition: fc.nat({ max: 100 }),
            })),
            shortSentences: fc.array(fc.record({
              id: fc.uuid(),
              text: fc.string({ minLength: 4, maxLength: 15 }),
              sourceArticleId: fc.uuid(),
              sourceSentenceId: fc.uuid(),
              createdAt: fc.date().map(d => d.toISOString()),
            })),
            keyCharacters: fc.array(fc.string({ minLength: 1, maxLength: 1 })),
          }),
          (data) => {
            // 序列化
            const serialized = JSON.stringify(data);
            
            // 反序列化
            storage.deserialize(serialized);
            
            // 再次序列化
            const reserialized = storage.serialize();
            
            // 验证往返一致性
            expect(JSON.parse(reserialized)).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle backward compatibility with missing keyCharacters field', () => {
      const dataWithoutKeyChars = {
        libraries: [],
        quotes: [],
        definitions: [],
        translations: [],
        characterDefinitionLinks: [],
        sentenceTranslationLinks: [],
        shortSentences: [],
      };

      const serialized = JSON.stringify(dataWithoutKeyChars);
      storage.deserialize(serialized);

      const keyChars = storage.getKeyCharacters();
      expect(keyChars).toEqual([]);
    });
  });

  describe('Key Characters Management', () => {
    it('should add key character', () => {
      storage.addKeyCharacter('而');
      expect(storage.getKeyCharacters()).toContain('而');
    });

    it('should not add duplicate key character', () => {
      storage.addKeyCharacter('而');
      storage.addKeyCharacter('而');
      expect(storage.getKeyCharacters().filter(c => c === '而').length).toBe(1);
    });

    it('should remove key character', () => {
      storage.addKeyCharacter('而');
      storage.addKeyCharacter('以');
      storage.removeKeyCharacter('而');
      expect(storage.getKeyCharacters()).not.toContain('而');
      expect(storage.getKeyCharacters()).toContain('以');
    });
  });
});
