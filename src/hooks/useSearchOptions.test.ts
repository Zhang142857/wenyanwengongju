import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchOptions } from './useSearchOptions';
import type { SearchOptions } from '@/types';
import * as fc from 'fast-check';

describe('useSearchOptions', () => {
  // Mock localStorage
  let localStorageMock: { [key: string]: string } = {};

  beforeEach(() => {
    localStorageMock = {};
    global.localStorage = {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      },
      length: Object.keys(localStorageMock).length,
      key: (index: number) => Object.keys(localStorageMock)[index] || null,
    };
  });

  afterEach(() => {
    localStorageMock = {};
  });

  /**
   * Feature: advanced-search-filters, Property 19: Preferences persistence across sessions
   * Validates: Requirements 6.5
   */
  describe('Property 19: Preferences persistence across sessions', () => {
    it('should restore search options from localStorage on mount', () => {
      fc.assert(
        fc.property(
          fc.record({
            mode: fc.constantFrom('normal', 'regex', 'inverse') as fc.Arbitrary<'normal' | 'regex' | 'inverse'>,
            caseSensitive: fc.boolean(),
            wholeWord: fc.boolean(),
            fuzzyMatch: fc.boolean(),
            fuzzyTolerance: fc.double({ min: 0, max: 1 }),
          }),
          (options: SearchOptions) => {
            // Setup: Save options to localStorage
            localStorage.setItem('searchOptions', JSON.stringify(options));

            // Execute: Mount hook
            const { result } = renderHook(() => useSearchOptions());

            // Verify: Options should be loaded from localStorage
            expect(result.current[0]).toEqual(options);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist options to localStorage when changed', () => {
      fc.assert(
        fc.property(
          fc.record({
            mode: fc.constantFrom('normal', 'regex', 'inverse') as fc.Arbitrary<'normal' | 'regex' | 'inverse'>,
            caseSensitive: fc.boolean(),
            wholeWord: fc.boolean(),
            fuzzyMatch: fc.boolean(),
            fuzzyTolerance: fc.double({ min: 0, max: 1 }),
          }),
          (options: SearchOptions) => {
            // Setup: Mount hook
            const { result } = renderHook(() => useSearchOptions());

            // Execute: Update options
            act(() => {
              result.current[1](options);
            });

            // Verify: Options should be saved to localStorage
            const saved = localStorage.getItem('searchOptions');
            expect(saved).not.toBeNull();
            expect(JSON.parse(saved!)).toEqual(options);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use default options if localStorage is empty', () => {
      const { result } = renderHook(() => useSearchOptions());

      expect(result.current[0]).toEqual({
        mode: 'normal',
        caseSensitive: false,
        wholeWord: false,
        fuzzyMatch: false,
        fuzzyTolerance: 0.8,
      });
    });

    it('should handle localStorage errors gracefully', () => {
      // Setup: Make localStorage throw errors
      global.localStorage = {
        getItem: () => {
          throw new Error('localStorage error');
        },
        setItem: () => {
          throw new Error('localStorage error');
        },
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      };

      // Should not crash
      const { result } = renderHook(() => useSearchOptions());

      // Should use default options
      expect(result.current[0]).toEqual({
        mode: 'normal',
        caseSensitive: false,
        wholeWord: false,
        fuzzyMatch: false,
        fuzzyTolerance: 0.8,
      });
    });
  });

  describe('Unit Tests', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useSearchOptions());

      expect(result.current[0].mode).toBe('normal');
      expect(result.current[0].caseSensitive).toBe(false);
      expect(result.current[0].wholeWord).toBe(false);
      expect(result.current[0].fuzzyMatch).toBe(false);
      expect(result.current[0].fuzzyTolerance).toBe(0.8);
    });

    it('should update options when setter is called', () => {
      const { result } = renderHook(() => useSearchOptions());

      const newOptions: SearchOptions = {
        mode: 'regex',
        caseSensitive: true,
        wholeWord: true,
        fuzzyMatch: false,
        fuzzyTolerance: 0.9,
      };

      act(() => {
        result.current[1](newOptions);
      });

      expect(result.current[0]).toEqual(newOptions);
    });

    it('should persist partial updates', () => {
      const { result } = renderHook(() => useSearchOptions());

      act(() => {
        result.current[1]({
          ...result.current[0],
          mode: 'inverse',
        });
      });

      expect(result.current[0].mode).toBe('inverse');
      expect(result.current[0].caseSensitive).toBe(false); // Other fields unchanged
    });
  });
});
