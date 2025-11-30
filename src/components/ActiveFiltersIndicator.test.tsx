import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import ActiveFiltersIndicator from './ActiveFiltersIndicator'
import { defaultSearchOptions } from '@/tools/search'

describe('ActiveFiltersIndicator', () => {
  const defaultFilters = { library: '', collection: '', article: '', definition: '' }

  it('should display correct count of active filters', () => {
    const { container } = render(
      <ActiveFiltersIndicator
        filters={{ library: 'lib1', collection: 'col1', article: '', definition: '' }}
        options={defaultSearchOptions}
        onClearFilter={vi.fn()}
        onClearAll={vi.fn()}
      />
    )
    
    expect(container.textContent).toContain('2 个筛选')
  })

  it('should not render when no filters are active', () => {
    const { container } = render(
      <ActiveFiltersIndicator
        filters={defaultFilters}
        options={defaultSearchOptions}
        onClearFilter={vi.fn()}
        onClearAll={vi.fn()}
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should call onClearAll when clear all button is clicked', () => {
    const onClearAll = vi.fn()
    const { getByText } = render(
      <ActiveFiltersIndicator
        filters={{ library: 'lib1', collection: 'col1', article: '', definition: '' }}
        options={defaultSearchOptions}
        onClearFilter={vi.fn()}
        onClearAll={onClearAll}
      />
    )
    
    getByText('清除全部').click()
    expect(onClearAll).toHaveBeenCalled()
  })
})
