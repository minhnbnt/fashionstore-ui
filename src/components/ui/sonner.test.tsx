// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import type { ToasterProps } from 'sonner'

const capturedProps = vi.hoisted(function () {
  return {
    latest: null as ToasterProps | null,
  }
})

const themeState = vi.hoisted(function () {
  return {
    theme: 'light' as 'light' | 'dark',
  }
})

vi.mock('@/hooks/useTheme', function () {
  return {
    useTheme: function () {
      return { theme: themeState.theme, toggle: vi.fn() }
    },
  }
})

vi.mock('sonner', function () {
  return {
    Toaster: function MockToaster(props: ToasterProps) {
      capturedProps.latest = props
      return (
        <div
          data-testid="app-toaster"
          data-theme={props.theme}
          data-position={props.position}
          data-close-button={String(props.closeButton === true)}
        />
      )
    },
  }
})

import {
  TOAST_DESKTOP_OFFSET,
  TOAST_GAP,
  TOAST_MOBILE_OFFSET,
  TOAST_POSITION,
  TOAST_VISIBLE_LIMIT,
} from '@/lib/notifications/config'

import { AppToaster } from './sonner'

describe('AppToaster', () => {
  beforeEach(function () {
    capturedProps.latest = null
    themeState.theme = 'light'
  })

  afterEach(function () {
    cleanup()
  })

  it('render với cấu hình top-right, closeButton và light theme', function () {
    render(<AppToaster />)

    const el = screen.getByTestId('app-toaster')
    expect(el.getAttribute('data-position')).toBe('top-right')
    expect(el.getAttribute('data-close-button')).toBe('true')
    expect(el.getAttribute('data-theme')).toBe('light')

    expect(capturedProps.latest?.position).toBe(TOAST_POSITION)
    expect(capturedProps.latest?.visibleToasts).toBe(TOAST_VISIBLE_LIMIT)
    expect(capturedProps.latest?.gap).toBe(TOAST_GAP)
    expect(capturedProps.latest?.offset).toEqual(TOAST_DESKTOP_OFFSET)
    expect(capturedProps.latest?.mobileOffset).toEqual(TOAST_MOBILE_OFFSET)
    expect(capturedProps.latest?.richColors).toBe(false)
    expect(capturedProps.latest?.icons?.success).toBeDefined()
    expect(capturedProps.latest?.icons?.error).toBeDefined()
    expect(capturedProps.latest?.icons?.warning).toBeDefined()
    expect(capturedProps.latest?.icons?.info).toBeDefined()
    expect(capturedProps.latest?.icons?.loading).toBeDefined()
  })

  it('đồng bộ dark theme từ useTheme và tuân thủ token design system', function () {
    themeState.theme = 'dark'
    render(<AppToaster />)

    const el = screen.getByTestId('app-toaster')
    expect(el.getAttribute('data-theme')).toBe('dark')

    const toastClass = capturedProps.latest?.toastOptions?.classNames?.toast ?? ''
    expect(toastClass).toContain('dark:bg-[#0a0f1e]/95')
    expect(toastClass).toContain('rounded-2xl')
    expect(toastClass).not.toContain('dark:bg-zinc-800')
    expect(toastClass).not.toContain('dark:border-zinc-700')
  })
})
