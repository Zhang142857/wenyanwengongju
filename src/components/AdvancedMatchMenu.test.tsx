import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdvancedMatchMenu from './AdvancedMatchMenu'
import { defaultSearchOptions } from '@/tools/search'

describe('AdvancedMatchMenu', () => {
  describe('Property 14: Advanced menu toggle', () => {
    it('should toggle menu visibility on button click', () => {
      const { container } = render(
        <AdvancedMatchMenu
          options={defaultSearchOptions}
          onOptionsChange={vi.fn()}
        />
      )

      const button = screen.getByLabelText('高级匹配选项')
      
      // Initially closed
      expect(container.querySelector(`.menuPanel`)).toBeNull()
      
      // Click to open
      fireEvent.click(button)
      expect(container.querySelector('[class*="menuPanel"]')).toBeTruthy()
      
      // Click to close
      fireEvent.click(button)
      expect(container.querySelector('[class*="menuPanel"]')).toBeNull()
    })
  })

  describe('Property 16: Advanced menu state persistence', () => {
    it('should preserve options when menu is toggled', () => {
      const options = { ...defaultSearchOptions, mode: 'regex' as const }
      const onOptionsChange = vi.fn()
      
      const { rerender } = render(
        <AdvancedMatchMenu options={options} onOptionsChange={onOptionsChange} />
      )

      const button = screen.getByLabelText('高级匹配选项')
      
      // Open menu
      fireEvent.click(button)
      
      // Close menu
      fireEvent.click(button)
      
      // Reopen - options should still be regex
      fireEvent.click(button)
      
      const regexRadio = screen.getByLabelText('正则表达式') as HTMLInputElement
      expect(regexRadio.checked).toBe(true)
    })
  })

  describe('Unit Tests', () => {
    it('should render toggle button', () => {
      render(
        <AdvancedMatchMenu
          options={defaultSearchOptions}
          onOptionsChange={vi.fn()}
        />
      )

      expect(screen.getByLabelText('高级匹配选项')).toBeDefined()
    })

    it('should call onOptionsChange when mode changes', () => {
      const onOptionsChange = vi.fn()
      render(
        <AdvancedMatchMenu
          options={defaultSearchOptions}
          onOptionsChange={onOptionsChange}
        />
      )

      const button = screen.getByLabelText('高级匹配选项')
      fireEvent.click(button)

      const regexRadio = screen.getByLabelText('正则表达式')
      fireEvent.click(regexRadio)

      expect(onOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'regex' })
      )
    })

    it('should render all matching options', () => {
      render(
        <AdvancedMatchMenu
          options={defaultSearchOptions}
          onOptionsChange={vi.fn()}
        />
      )

      const button = screen.getByLabelText('高级匹配选项')
      fireEvent.click(button)

      expect(screen.getByText('普通匹配')).toBeDefined()
      expect(screen.getByText('正则表达式')).toBeDefined()
      expect(screen.getByText('反向匹配')).toBeDefined()
      expect(screen.getByText('区分大小写')).toBeDefined()
      expect(screen.getByText('全词匹配')).toBeDefined()
      expect(screen.getByText('模糊匹配')).toBeDefined()
    })
  })
})
