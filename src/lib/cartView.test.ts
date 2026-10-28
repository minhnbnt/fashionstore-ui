import { describe, expect, it } from 'vite-plus/test'

import { classifyPriceChange, groupCartByShop, stockState } from './cartView'

import type { CartItemResponse } from '@generated/model/cartItemResponse'

function item(overrides: Partial<CartItemResponse>): CartItemResponse {
  return { ...overrides }
}

describe('groupCartByShop', () => {
  it('gom san pham theo shop va giu thu tu xuat hien', () => {
    const groups = groupCartByShop([
      item({ variantId: 'v1', shopId: 's1', shopName: 'Shop Mot' }),
      item({ variantId: 'v2', shopId: 's2', shopName: 'Shop Hai' }),
      item({ variantId: 'v3', shopId: 's1', shopName: 'Shop Mot' }),
    ])

    expect(groups.length).toBe(2)
    expect(groups[0]?.shopId).toBe('s1')
    expect(groups[0]?.shopName).toBe('Shop Mot')
    expect(groups[0]?.items.length).toBe(2)
    expect(groups[1]?.shopId).toBe('s2')
    expect(groups[1]?.items.length).toBe(1)
  })

  it('shop thieu thong tin thi ve nhom rong', () => {
    const groups = groupCartByShop([
      item({ variantId: 'v1', shopId: undefined, shopName: undefined }),
    ])

    expect(groups.length).toBe(1)
    expect(groups[0]?.shopId).toBe('')
    expect(groups[0]?.shopName).toBe('')
  })

  it('danh sach rong tra mang rong', () => {
    expect(groupCartByShop([])).toEqual([])
  })
})

describe('classifyPriceChange', () => {
  it('gia giam so voi luc them', () => {
    expect(classifyPriceChange({ priceAtAdded: 100000, unitPrice: 80000 })).toBe('decreased')
  })

  it('gia tang so voi luc them', () => {
    expect(classifyPriceChange({ priceAtAdded: 100000, unitPrice: 120000 })).toBe('increased')
  })

  it('gia khong doi tra null', () => {
    expect(classifyPriceChange({ priceAtAdded: 100000, unitPrice: 100000 })).toBeNull()
  })

  it('thieu gia luc them thi khong co canh bao', () => {
    expect(classifyPriceChange({ priceAtAdded: undefined, unitPrice: 100000 })).toBeNull()
  })

  it('thieu gia hien tai thi khong co canh bao', () => {
    expect(classifyPriceChange({ priceAtAdded: 100000, unitPrice: undefined })).toBeNull()
  })

  it('priceAtAdded bang 0 khong tinh la thay doi', () => {
    expect(classifyPriceChange({ priceAtAdded: 0, unitPrice: 100000 })).toBeNull()
  })
})

describe('stockState', () => {
  it('con hang nhieu', () => {
    expect(stockState({ quantity: 2, stockQuantity: 5 })).toBe('ok')
  })

  it('sap het khi so luong cham ton', () => {
    expect(stockState({ quantity: 5, stockQuantity: 5 })).toBe('low')
  })

  it('qua ton van tinh la sap het', () => {
    expect(stockState({ quantity: 6, stockQuantity: 5 })).toBe('low')
  })

  it('het hang khi ton bang 0', () => {
    expect(stockState({ quantity: 1, stockQuantity: 0 })).toBe('out')
  })

  it('khong biet ton thi coi nhu con hang', () => {
    expect(stockState({ quantity: 3, stockQuantity: undefined })).toBe('ok')
  })
})
