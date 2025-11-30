import { useState, useEffect } from 'react';
import type { SearchOptions } from '@/types';
import { defaultSearchOptions } from '@/tools/search';

const STORAGE_KEY = 'searchOptions';

/**
 * Custom hook for managing search options with localStorage persistence
 * @returns [searchOptions, setSearchOptions] tuple
 */
export function useSearchOptions(): [SearchOptions, (options: SearchOptions) => void] {
  const [searchOptions, setSearchOptionsState] = useState<SearchOptions>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved) as SearchOptions;
        }
      } catch (error) {
        console.error('Failed to load search options from localStorage:', error);
      }
    }
    return defaultSearchOptions;
  });

  // Save to localStorage when options change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(searchOptions));
      } catch (error) {
        console.error('Failed to save search options to localStorage:', error);
      }
    }
  }, [searchOptions]);

  return [searchOptions, setSearchOptionsState];
}
