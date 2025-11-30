import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import * as fc from 'fast-check'
import { SidebarProvider, useSidebar } from './SidebarContext'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

describe('SidebarContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SidebarProvider>{children}</SidebarProvider>
  )

  /**
   * Feature: definition-mind-map, Property 1: 侧边栏状态切换一致性
   * 验证: 需求 1.1, 1.2, 1.4
   */
  describe('Property 1: 侧边栏状态切换一致性', () => {
    it('对于任意侧边栏状态，点击切换按钮后状态必须改变', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialState) => {
          // 设置初始状态
          localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(initialState))

          const { result, unmount } = renderHook(() => useSidebar(), { wrapper })

          // 验证初始状态
          expect(result.current.collapsed).toBe(initialState)

          // 切换状态
          act(() => {
            result.current.toggleCollapsed()
          })

          // 验证状态已改变
          expect(result.current.collapsed).toBe(!initialState)

          // 再次切换
          act(() => {
            result.current.toggleCollapsed()
          })

          // 验证状态又改变回来
          expect(result.current.collapsed).toBe(initialState)

          unmount()
          localStorage.clear()
        }),
        { numRuns: 100 }
      )
    })

    it('切换状态后，localStorage中的值必须同步更新', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialState) => {
          localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(initialState))

          const { result, unmount } = renderHook(() => useSidebar(), { wrapper })

          act(() => {
            result.current.toggleCollapsed()
          })

          // 验证localStorage已更新
          const storedValue = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
          expect(storedValue).toBe(String(!initialState))

          unmount()
          localStorage.clear()
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: definition-mind-map, Property 2: 侧边栏状态持久化
   * 验证: 需求 1.5
   */
  describe('Property 2: 侧边栏状态持久化', () => {
    it('对于任意侧边栏状态，设置后刷新页面，状态必须保持不变', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (targetState) => {
          // 第一次渲染：设置状态
          const { result: result1, unmount: unmount1 } = renderHook(() => useSidebar(), { wrapper })

          act(() => {
            result1.current.setCollapsed(targetState)
          })

          expect(result1.current.collapsed).toBe(targetState)
          unmount1()

          // 等待一下确保localStorage已更新
          await new Promise(resolve => setTimeout(resolve, 0))

          // 模拟页面刷新：第二次渲染
          const { result: result2, unmount: unmount2 } = renderHook(() => useSidebar(), { wrapper })

          // 等待useEffect执行
          await new Promise(resolve => setTimeout(resolve, 0))

          // 验证状态已从localStorage恢复
          expect(result2.current.collapsed).toBe(targetState)

          unmount2()
          localStorage.clear()
        }),
        { numRuns: 100 }
      )
    })

    it('对于任意切换序列，最终状态必须持久化', () => {
      fc.assert(
        fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), (toggleSequence) => {
          const { result, unmount } = renderHook(() => useSidebar(), { wrapper })

          // 执行一系列切换操作
          let expectedState = false
          for (const shouldToggle of toggleSequence) {
            if (shouldToggle) {
              act(() => {
                result.current.toggleCollapsed()
              })
              expectedState = !expectedState
            }
          }

          expect(result.current.collapsed).toBe(expectedState)
          unmount()

          // 模拟页面刷新
          const { result: result2, unmount: unmount2 } = renderHook(() => useSidebar(), { wrapper })

          // 验证最终状态已持久化
          expect(result2.current.collapsed).toBe(expectedState)

          unmount2()
          localStorage.clear()
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Unit Tests', () => {
    it('初始状态应该是展开的（false）', () => {
      const { result, unmount } = renderHook(() => useSidebar(), { wrapper })
      expect(result.current.collapsed).toBe(false)
      unmount()
    })

    it('setCollapsed应该直接设置状态', () => {
      const { result, unmount } = renderHook(() => useSidebar(), { wrapper })

      act(() => {
        result.current.setCollapsed(true)
      })

      expect(result.current.collapsed).toBe(true)

      act(() => {
        result.current.setCollapsed(false)
      })

      expect(result.current.collapsed).toBe(false)

      unmount()
    })

    it('toggleCollapsed应该切换状态', () => {
      const { result, unmount } = renderHook(() => useSidebar(), { wrapper })

      expect(result.current.collapsed).toBe(false)

      act(() => {
        result.current.toggleCollapsed()
      })

      expect(result.current.collapsed).toBe(true)

      act(() => {
        result.current.toggleCollapsed()
      })

      expect(result.current.collapsed).toBe(false)

      unmount()
    })
  })
})
