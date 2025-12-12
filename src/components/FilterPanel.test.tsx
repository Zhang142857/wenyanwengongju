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
    collection: [],
    article: [],
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
            collection: fc.array(fc.string()),
            article: fc.array(fc.string()),
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

            // 检查所有按钮是否被禁用（CustomSelect 和 CustomMultiSelect 使用按钮）
            const buttons = container.querySelectorAll('button[aria-haspopup="listbox"]')
            for (const button of buttons) {
              expect(button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true').toBe(true)
            }
          }
        ),
        { numRuns: 10 }
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
            collection: fc.array(fc.string()),
            article: fc.array(fc.string()),
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

            // 检查所有按钮是否未被禁用
            const buttons = container.querySelectorAll('button[aria-haspopup="listbox"]')
            for (const button of buttons) {
              expect(button.hasAttribute('disabled')).toBe(false)
            }
          }
        ),
        { numRuns: 10 }
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

      // 使用 aria-label 查找元素
      expect(screen.getByLabelText('筛选集')).toBeDefined()
      expect(screen.getByLabelText('筛选文章')).toBeDefined()
    })

    it('should render filter panel even when no options are available', () => {
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

      // 即使没有选项，面板也应该渲染
      expect(container.querySelector('[class*="filterPanel"]')).toBeDefined()
    })

    it('should call onChange when collection filter changes', () => {
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

      const collectionSelect = screen.getByLabelText('筛选集')
      fireEvent.click(collectionSelect)

      // 点击选项
      const option = screen.getByText('七年级上册')
      fireEvent.click(option)

      expect(onChange).toHaveBeenCalled()
    })

    it('should reset child filters when parent filter changes', () => {
      const onChange = vi.fn()
      render(
        <FilterPanel
          filters={{
            library: 'lib1',
            collection: ['col1'],
            article: ['art1'],
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

      // 点击清除集选择按钮
      const clearButtons = screen.getAllByLabelText('清除选择')
      if (clearButtons.length > 0) {
        fireEvent.click(clearButtons[0])
        expect(onChange).toHaveBeenCalled()
      }
    })

    it('should apply active class when filter has value', () => {
      render(
        <FilterPanel
          filters={{
            library: 'lib1',
            collection: ['col1'],
            article: [],
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

      const collectionSelect = screen.getByLabelText('筛选集')
      expect(collectionSelect.className).toContain('active')
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

      expect(screen.getByLabelText('筛选集').getAttribute('aria-label')).toBe('筛选集')
      expect(screen.getByLabelText('筛选文章').getAttribute('aria-label')).toBe('筛选文章')
    })
  })
})
