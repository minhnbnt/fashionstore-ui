import { describe, expect, it } from 'vitest'

import type { Product } from '@/lib/api'
import { categoryOf, isBestseller, isNew } from '@/lib/catalog'

function sample(name: string, createdAt: string): Product {
  return {
    id: 1,
    name,
    description: null,
    price: 100000,
    imageKey: null,
    createdAt,
    updatedAt: createdAt,
  }
}

describe('categoryOf', () => {
  it('maps ao khoac before ao', () => {
    expect(categoryOf(sample('Áo khoác trench', '2026-10-04T00:00:00Z'))).toBe('khoac')
  })

  it('maps vay and dam to the same category', () => {
    expect(categoryOf(sample('Váy midi đen', '2026-10-04T00:00:00Z'))).toBe('vay-dam')
    expect(categoryOf(sample('Đầm maxi hoa', '2026-10-04T00:00:00Z'))).toBe('vay-dam')
  })

  it('falls back to khac for unknown names', () => {
    expect(categoryOf(sample('Mũ lưỡi trai', '2026-10-04T00:00:00Z'))).toBe('khac')
  })
})

describe('isNew', () => {
  it('is true within 30 days', () => {
    const product = sample('Áo mới', '2026-10-04T00:00:00Z')
    expect(isNew(product, new Date('2026-10-20T00:00:00Z'))).toBe(true)
  })

  it('is false after 30 days', () => {
    const product = sample('Áo cũ', '2026-08-01T00:00:00Z')
    expect(isNew(product, new Date('2026-10-20T00:00:00Z'))).toBe(false)
  })
})

describe('isBestseller', () => {
  it('flags the curated ids only', () => {
    const hot = sample('Váy midi đen', '2026-10-04T00:00:00Z')
    hot.id = 2
    expect(isBestseller(hot)).toBe(true)
    const cold = sample('Quần âu vải lụa', '2026-10-04T00:00:00Z')
    cold.id = 4
    expect(isBestseller(cold)).toBe(false)
  })
})
