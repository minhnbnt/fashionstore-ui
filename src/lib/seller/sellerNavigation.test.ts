import { describe, expect, it } from 'vite-plus/test'

import { getFirstAllowedTab, parseSellerTab, sellerTabParam } from './sellerNavigation'

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
    expect(parseSellerTab(sellerTabParam('STATS_REVENUE'))).toBe('STATS_REVENUE')
    expect(parseSellerTab(sellerTabParam('STATS_PRODUCTS'))).toBe('STATS_PRODUCTS')
    expect(parseSellerTab(sellerTabParam('STATS_CUSTOMERS'))).toBe('STATS_CUSTOMERS')
  })
})

describe('getFirstAllowedTab', () => {
  it('owner luon duoc mac dinh OVERVIEW', () => {
    expect(getFirstAllowedTab([], true)).toBe('OVERVIEW')
  })

  it('staff co REVENUE_READ duoc vao OVERVIEW', () => {
    expect(getFirstAllowedTab(['REVENUE_READ'], false)).toBe('OVERVIEW')
  })

  it('staff chi co CHAT_ACCESS thi auto-nav sang CHAT', () => {
    expect(getFirstAllowedTab(['CHAT_ACCESS'], false)).toBe('CHAT')
  })

  it('staff co ORDER_READ thi auto-nav sang ORDERS', () => {
    expect(getFirstAllowedTab(['ORDER_READ'], false)).toBe('ORDERS')
  })

  it('staff khong co quyen gi tra ve null', () => {
    expect(getFirstAllowedTab([], false)).toBeNull()
  })
})
