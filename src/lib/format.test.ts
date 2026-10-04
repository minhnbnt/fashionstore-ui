import { describe, expect, it, vi } from 'vitest'

import { formatVnd, resolveImageUrl } from '@/lib/format'

describe('formatVnd', () => {
  it('formats integer VND with vi-VN grouping and ₫ suffix', () => {
    expect(formatVnd(1200000)).toBe('1.200.000 ₫')
  })

  it('formats zero', () => {
    expect(formatVnd(0)).toBe('0 ₫')
  })

  it('rounds fractional input instead of printing decimals', () => {
    expect(formatVnd(19999.6)).toBe('20.000 ₫')
  })
})

describe('resolveImageUrl', () => {
  it('returns null for null key', () => {
    expect(resolveImageUrl(null)).toBeNull()
  })

  it('prefixes object keys with the assets base URL', () => {
    vi.stubEnv('VITE_ASSETS_URL', 'http://fashionstore.web.garage.localhost:3902')
    expect(resolveImageUrl('abc/def.png')).toBe(
      'http://fashionstore.web.garage.localhost:3902/abc/def.png',
    )
  })

  it('passes absolute URLs through untouched', () => {
    vi.stubEnv('VITE_ASSETS_URL', 'http://fashionstore.web.garage.localhost:3902')
    expect(resolveImageUrl('https://images.pexels.com/photos/8307669/pexels-photo-8307669.jpeg')).toBe(
      'https://images.pexels.com/photos/8307669/pexels-photo-8307669.jpeg',
    )
  })
})
