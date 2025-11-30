import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterPanel, { type FilterState } from './FilterPanel'
import type { Library, Collection, Article, Definition } from '@/types'
import * as fc from 'fast-check'

describe('FilterPanel', () => {
  const mockLibraries: Library[] = [
    {
      id: 'lib1',
      name: '文言文库',
      collections: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ]

  const mockCollections: Collection[] = [
    {
      id: 'col1',
      name: '七年级上册',
      libraryId: 'lib1',
      articles: [],
      order: 1,
    },
  ]

  const mockArticles: Article[] = [
    {
      id: 'art1',
      title: '论语十则',
      content: '子曰：学而时习之',
      collectionId: 'col1',
      sentences: [],
    },
  ]

  const mockDefinitions: Definition[] = [
    {
      id: 'def1',
      character: '学',
      content: '学习',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ]

  const defaultFilters: FilterState = {
    library: '',
    collection: '',
    article: '',
    definition: '',
  }

  /**
   * Feature: advanced-search-filters, Property 1: Filter disabled state before search
   * Validates: Requirements 1.2
   */
  describe('Property 1: Filter disabled state before search', () => {
    it('should have disabled attribute on all filter dropdowns when disabled prop is true', () => {
      fc.assert(
        fc.property(
          fc.record({
            library: fc.string(),
            collection: fc.string(),
            article: fc.string(),
            definition: fc.string(),
          }),
          (filters: FilterState) => {
            const { container } = render(
              <FilterPanel
                filters={filters}
                availableOptions={{
                  libraries: mockLibraries,
                  collections: mockCollections,
                  articles: mockArticles,
                  definitions: mockDefinitions,
                }}
                disabled={true}
                onChange={vi.fn()}
              />
            )

            const selects = container.querySelectorAll('select')
            for (const select of selects) {
              expect(select.hasAttribute('disabled')).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: advanced-search-filters, Property 2: Filter enabled state after search
   * Validates: Requirements 1.3
   */
  describe('Property 2: Filter enabled state after search', () => {
    it('should not have disabled attribute on filter dropdowns when disabled prop is false', () => {
      fc.assert(
        fc.property(
          fc.record({
            library: fc.string(),
            collection: fc.string(),
            article: fc.string(),
            definition: fc.string(),
          }),
          (filters: FilterState) => {
            const { container } = render(
              <FilterPanel
                filters={filters}
                availableOptions={{
                  libraries: mockLibraries,
                  collections: mockCollections,
                  articles: mockArticles,
                  definitions: mockDefinitions,
                }}
                disabled={false}
                onChange={vi.fn()}
              />
            )

            const selects = container.querySelectorAll('select')
            for (const select of selects) {
              expect(select.hasAttribute('disabled')).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Unit Tests', () => {
    it('should render all filter dropdowns when options are available', () => {
      render(
        <FilterPanel
          filters={defaultFilters}
          availableOptions={{
            libraries: mockLibraries,
            collections: mockCollections,
            articles: mockArticles,
            definitions: mockDefinitions,
          }}
          disabled={false}
          onChange={vi.fn()}
        />
      )

      expect(screen.getByLabelText('筛选库')).toBeDefined()
      expect(screen.getByLabelText('筛选集')).toBeDefined()
      expect(screen.getByLabelText('筛选文章')).toBeDefined()
      expect(screen.getByLabelText('筛选义项')).toBeDefined()
    })

    it('should not render dropdowns when no options are available', () => {
      const { container } = render(
        <FilterPanel
          filters={defaultFilters}
          availableOptions={{
            libraries: [],
            collections: [],
            articles: [],
            definitions: [],
          }}
          disabled={false}
          onChange={vi.fn()}
        />
      )

      const selects = container.querySelectorAll('select')
      expect(selects.length).toBe(0)
    })

    it('should call onChange when library filter changes', () => {
      const onChange = vi.fn()
      render(
        <FilterPanel
          filters={defaultFilters}
          availableOptions={{
            libraries: mockLibraries,
            collections: mockCollections,
            articles: mockArticles,
            definitions: mockDefinitions,
          }}
          disabled={false}
          onChange={onChange}
        />
      )

      const librarySelect = screen.getByLabelText('筛选库')
      librarySelect.dispatchEvent(
        new Event('change', { bubbles: true })
      )

      expect(onChange).toHaveBeenCalled()
    })

    it('should reset child filters when parent filter changes', () => {
      const onChange = vi.fn()
      render(
        <FilterPanel
          filters={{
            library: 'lib1',
            collection: 'col1',
            article: 'art1',
            definition: '',
          }}
          availableOptions={{
            libraries: mockLibraries,
            collections: mockCollections,
            articles: mockArticles,
            definitions: mockDefinitions,
          }}
          disabled={false}
          onChange={onChange}
        />
      )

      const librarySelect = screen.getByLabelText('筛选库') as HTMLSelectElement
      fireEvent.change(librarySelect, { target: { value: 'lib2' } })

      // Verify onChange was called
      expect(onChange).toHaveBeenCalled()
      
      // Verify the call resets child filters
      const call = onChange.mock.calls[0][0]
      expect(call.collection).toBe('')
      expect(call.article).toBe('')
    })

    it('should apply active class when filter has value', () => {
      const { container } = render(
        <FilterPanel
          filters={{
            library: 'lib1',
            collection: '',
            article: '',
            definition: '',
          }}
          availableOptions={{
            libraries: mockLibraries,
            collections: mockCollections,
            articles: mockArticles,
            definitions: mockDefinitions,
          }}
          disabled={false}
          onChange={vi.fn()}
        />
      )

      const librarySelect = screen.getByLabelText('筛选库')
      expect(librarySelect.className).toContain('active')
    })

    it('should have proper ARIA labels for accessibility', () => {
      render(
        <FilterPanel
          filters={defaultFilters}
          availableOptions={{
            libraries: mockLibraries,
            collections: mockCollections,
            articles: mockArticles,
            definitions: mockDefinitions,
          }}
          disabled={false}
          onChange={vi.fn()}
        />
      )

      expect(screen.getByLabelText('筛选库').getAttribute('aria-label')).toBe('筛选库')
      expect(screen.getByLabelText('筛选集').getAttribute('aria-label')).toBe('筛选集')
      expect(screen.getByLabelText('筛选文章').getAttribute('aria-label')).toBe('筛选文章')
      expect(screen.getByLabelText('筛选义项').getAttribute('aria-label')).toBe('筛选义项')
    })
  })
})
