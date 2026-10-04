import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useWishlist } from '@/hooks/useWishlist'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useWishlist', () => {
  it('toggles ids and persists across mounts', () => {
    const first = renderHook(() => useWishlist())

    act(() => {
      first.result.current.toggle(7)
    })
    expect(first.result.current.ids.has(7)).toBe(true)

    act(() => {
      first.result.current.toggle(7)
    })
    expect(first.result.current.ids.has(7)).toBe(false)

    act(() => {
      first.result.current.toggle(9)
    })
    first.unmount()

    const second = renderHook(() => useWishlist())
    expect(second.result.current.ids.has(9)).toBe(true)
  })

  it('recovers from corrupt storage', () => {
    window.localStorage.setItem('fashionstore:wishlist', 'hong-json')

    const { result } = renderHook(() => useWishlist())

    expect(result.current.ids.size).toBe(0)
  })
})
