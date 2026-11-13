import { createElement } from 'react'

// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { usePinToBottom } from './usePinToBottom'

interface ScrollMetrics {
  scrollHeight: number
  clientHeight: number
  scrollTop: number
}

function setupScrollerMetrics(initial: ScrollMetrics): ScrollMetrics {
  const state: ScrollMetrics = { ...initial }
  const origCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(function (tagName: string) {
    const el = origCreateElement(tagName)
    if (tagName.toLowerCase() === 'div') {
      Object.defineProperty(el, 'scrollHeight', {
        configurable: true,
        get() {
          return state.scrollHeight
        },
      })
      Object.defineProperty(el, 'clientHeight', {
        configurable: true,
        get() {
          return state.clientHeight
        },
      })
      Object.defineProperty(el, 'scrollTop', {
        configurable: true,
        get() {
          return state.scrollTop
        },
        set(value: number) {
          const maxScroll = Math.max(0, state.scrollHeight - state.clientHeight)
          if (maxScroll === 0 && value > 0) {
            state.scrollTop = state.scrollHeight
            return
          }
          state.scrollTop = Math.min(Math.max(0, value), state.scrollHeight)
        },
      })
    }
    return el
  })
  return state
}

interface HarnessProps {
  resetKey: string
  contentKey: number
}

function ScrollHarness({ resetKey, contentKey }: HarnessProps) {
  const { scrollRef, pinNow, handleScroll, handleLoadCapture } = usePinToBottom({
    resetKey,
    contentKey,
  })

  return createElement(
    'section',
    null,
    createElement('button', {
      type: 'button',
      'data-testid': 'pin-btn',
      onClick: pinNow,
    }),
    createElement(
      'div',
      {
        'data-testid': 'scroller',
        ref: scrollRef,
        onScroll: handleScroll,
        onLoadCapture: handleLoadCapture,
      },
      createElement('img', { alt: 'preview', 'data-testid': 'chat-img' }),
    ),
  )
}

afterEach(function () {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('usePinToBottom', function () {
  it('ghim scroll xuống đáy ngay khi mount', function () {
    const metrics = setupScrollerMetrics({
      scrollHeight: 800,
      clientHeight: 300,
      scrollTop: 0,
    })

    render(createElement(ScrollHarness, { resetKey: 'conv-1', contentKey: 1 }))

    expect(metrics.scrollTop).toBe(800)
  })

  it('giữ ở đáy khi nội dung mới làm tăng scrollHeight', function () {
    const metrics = setupScrollerMetrics({
      scrollHeight: 800,
      clientHeight: 300,
      scrollTop: 0,
    })

    const view = render(createElement(ScrollHarness, { resetKey: 'conv-1', contentKey: 1 }))

    metrics.scrollHeight = 1200
    view.rerender(createElement(ScrollHarness, { resetKey: 'conv-1', contentKey: 2 }))

    expect(metrics.scrollTop).toBe(1200)
  })

  it('tạm dừng ghim khi người dùng chủ động cuộn lên xem lịch sử và ghim lại khi gọi pinNow', function () {
    const metrics = setupScrollerMetrics({
      scrollHeight: 800,
      clientHeight: 300,
      scrollTop: 0,
    })

    const view = render(createElement(ScrollHarness, { resetKey: 'conv-1', contentKey: 1 }))
    const scroller = view.getByTestId('scroller')

    metrics.scrollTop = 100
    fireEvent.scroll(scroller)

    metrics.scrollHeight = 1400
    view.rerender(createElement(ScrollHarness, { resetKey: 'conv-1', contentKey: 2 }))

    expect(metrics.scrollTop).toBe(100)

    fireEvent.click(view.getByTestId('pin-btn'))

    expect(metrics.scrollTop).toBe(1400)
  })

  it('ghim lại xuống đáy khi đổi resetKey (chuyển hội thoại)', function () {
    const metrics = setupScrollerMetrics({
      scrollHeight: 800,
      clientHeight: 300,
      scrollTop: 0,
    })

    const view = render(createElement(ScrollHarness, { resetKey: 'conv-1', contentKey: 1 }))
    const scroller = view.getByTestId('scroller')

    metrics.scrollTop = 50
    fireEvent.scroll(scroller)

    metrics.scrollHeight = 950
    view.rerender(createElement(ScrollHarness, { resetKey: 'conv-2', contentKey: 1 }))

    expect(metrics.scrollTop).toBe(950)
  })

  it('tự cuộn xuống đáy khi ảnh trong đoạn chat tải xong (onLoadCapture)', function () {
    const metrics = setupScrollerMetrics({
      scrollHeight: 800,
      clientHeight: 300,
      scrollTop: 0,
    })

    const view = render(createElement(ScrollHarness, { resetKey: 'conv-1', contentKey: 1 }))

    metrics.scrollHeight = 1150
    fireEvent.load(view.getByTestId('chat-img'))

    expect(metrics.scrollTop).toBe(1150)
  })

  it('tự cuộn xuống đáy khi ResizeObserver báo kích thước container hoặc thẻ đổi', function () {
    const callbacks: ResizeObserverCallback[] = []
    class MockResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        callbacks.push(cb)
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver)

    const metrics = setupScrollerMetrics({
      scrollHeight: 800,
      clientHeight: 300,
      scrollTop: 0,
    })

    render(createElement(ScrollHarness, { resetKey: 'conv-1', contentKey: 1 }))
    expect(callbacks.length).toBeGreaterThan(0)

    metrics.scrollHeight = 1500
    act(function () {
      for (const cb of callbacks) {
        cb([], {} as ResizeObserver)
      }
    })

    expect(metrics.scrollTop).toBe(1500)
  })
})
