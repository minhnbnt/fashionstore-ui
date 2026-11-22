// @vitest-environment happy-dom
import { createElement } from 'react'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import { useTheme } from './useTheme'

function ThemeConsumer(props: { id: string }) {
  const { theme, toggle } = useTheme()
  return createElement(
    'div',
    null,
    createElement('span', { 'data-testid': `theme-${props.id}` }, theme),
    createElement(
      'button',
      {
        type: 'button',
        'data-testid': `toggle-${props.id}`,
        onClick: toggle,
      },
      'Toggle',
    ),
  )
}

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('đồng bộ ngay lập tức giữa nhiều component đang mount khi gọi toggle()', () => {
    render(
      createElement(
        'div',
        null,
        createElement(ThemeConsumer, { id: 'header' }),
        createElement(ThemeConsumer, { id: 'toaster' }),
      ),
    )

    expect(screen.getByTestId('theme-header').textContent).toBe('light')
    expect(screen.getByTestId('theme-toaster').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    fireEvent.click(screen.getByTestId('toggle-header'))

    expect(screen.getByTestId('theme-header').textContent).toBe('dark')
    expect(screen.getByTestId('theme-toaster').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('dhmq:theme')).toBe('dark')

    fireEvent.click(screen.getByTestId('toggle-toaster'))

    expect(screen.getByTestId('theme-header').textContent).toBe('light')
    expect(screen.getByTestId('theme-toaster').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem('dhmq:theme')).toBe('light')
  })

  it('đọc fallback từ khóa cũ net:theme khi chưa có dhmq:theme và bật class .dark', () => {
    window.localStorage.setItem('net:theme', 'dark')

    render(createElement(ThemeConsumer, { id: 'legacy' }))

    expect(screen.getByTestId('theme-legacy').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    fireEvent.click(screen.getByTestId('toggle-legacy'))

    expect(screen.getByTestId('theme-legacy').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem('dhmq:theme')).toBe('light')
  })

  it('ưu tiên dhmq:theme hơn khóa cũ net:theme và phản ứng với storage event', () => {
    window.localStorage.setItem('net:theme', 'dark')
    window.localStorage.setItem('dhmq:theme', 'light')

    render(createElement(ThemeConsumer, { id: 'sync' }))

    expect(screen.getByTestId('theme-sync').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    window.localStorage.setItem('dhmq:theme', 'dark')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'dhmq:theme', newValue: 'dark' }))
    })

    expect(screen.getByTestId('theme-sync').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
