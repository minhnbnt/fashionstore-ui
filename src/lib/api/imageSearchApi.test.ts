import { getByImageUrl, useByImage } from '@generated/endpoints/search/search'
import { describe, expect, it } from 'vite-plus/test'

describe('API tim anh sinh boi orval', () => {
  it('co hook va tao URL co limit', () => {
    expect(typeof useByImage).toBe('function')
    expect(getByImageUrl({ limit: 20 })).toBe('/api/search/products/by-image?limit=20')
  })
})
