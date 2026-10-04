import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Product } from '@/lib/api'
import { useCart } from '@/hooks/useCart'

const SHIRT: Product = {
  id: 1,
  name: 'Áo sơ mi lụa trắng',
  description: null,
  price: 890000,
  imageKey: 'mock/ao.jpg',
  createdAt: '2026-10-04T00:00:00Z',
  updatedAt: '2026-10-04T00:00:00Z',
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('useCart', () => {
  it('starts empty and adds a line', () => {
    const { result } = renderHook(() => useCart())

    expect(result.current.count).toBe(0)
    expect(result.current.total).toBe(0)

    act(() => {
      result.current.add(SHIRT, 2)
    })

    expect(result.current.count).toBe(2)
    expect(result.current.total).toBe(1780000)
  })

  it('accumulates quantity and drops lines at zero', () => {
    const { result } = renderHook(() => useCart())

    act(() => {
      result.current.add(SHIRT, 1)
    })
    act(() => {
      result.current.add(SHIRT, 1)
    })
    expect(result.current.count).toBe(2)

    act(() => {
      result.current.setQty(1, 0)
    })
    expect(result.current.lines).toHaveLength(0)
  })

  it('persists across mounts', () => {
    const first = renderHook(() => useCart())
    act(() => {
      first.result.current.add(SHIRT, 1)
    })
    first.unmount()

    const second = renderHook(() => useCart())
    expect(second.result.current.count).toBe(1)
  })

  it('recovers from corrupt storage', () => {
    window.localStorage.setItem('fashionstore:cart', 'khong-phai-json')

    const { result } = renderHook(() => useCart())

    expect(result.current.lines).toHaveLength(0)
  })
})
