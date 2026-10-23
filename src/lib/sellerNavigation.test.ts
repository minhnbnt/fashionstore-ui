import { describe, expect, it } from 'vitest'

import { parseSellerTab, sellerTabParam } from './sellerNavigation'

describe('parseSellerTab', () => {
  it('thieu param mac dinh OVERVIEW', () => {
    expect(parseSellerTab(null)).toBe('OVERVIEW')
  })

  it('nhan tab hop le theo dung chu hoa', () => {
    expect(parseSellerTab('ORDERS')).toBe('ORDERS')
    expect(parseSellerTab('CHAT')).toBe('CHAT')
    expect(parseSellerTab('EDIT_PRODUCT')).toBe('EDIT_PRODUCT')
  })

  it('khong phan biet hoa thuong', () => {
    expect(parseSellerTab('orders')).toBe('ORDERS')
    expect(parseSellerTab('Add_Product')).toBe('ADD_PRODUCT')
    expect(parseSellerTab('edit_product')).toBe('EDIT_PRODUCT')
  })

  it('param khong hop le quay ve OVERVIEW', () => {
    expect(parseSellerTab('trash')).toBe('OVERVIEW')
    expect(parseSellerTab('')).toBe('OVERVIEW')
  })
})

describe('sellerTabParam', () => {
  it('OVERVIEW khong can param', () => {
    expect(sellerTabParam('OVERVIEW')).toBeNull()
  })

  it('tab khac xuong lowercase lam param', () => {
    expect(sellerTabParam('ORDERS')).toBe('orders')
    expect(sellerTabParam('ADD_PRODUCT')).toBe('add_product')
    expect(sellerTabParam('PROFILE')).toBe('profile')
  })

  it('vong tron param <-> tab van ve dung tab', () => {
    expect(parseSellerTab(sellerTabParam('CHAT'))).toBe('CHAT')
    expect(parseSellerTab(sellerTabParam('DECORATION'))).toBe('DECORATION')
  })
})
