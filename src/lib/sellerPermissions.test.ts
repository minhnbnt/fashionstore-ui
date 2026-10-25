import { describe, expect, it } from 'vitest'

import { canSeeTab, permissionLabel } from './sellerPermissions'

describe('canSeeTab', () => {
  it('owner thấy tất cả các tab', () => {
    const tabs = [
      'OVERVIEW',
      'PRODUCTS',
      'ADD_PRODUCT',
      'INVENTORY',
      'ORDERS',
      'RETURNS',
      'REVENUE',
      'REVIEWS',
      'DECORATION',
      'STAFF',
      'PROFILE',
    ] as const

    for (const tab of tabs) {
      expect(canSeeTab(tab, [], true)).toBe(true)
    }
  })

  it('staff chỉ ORDER_READ thấy ORDERS, không thấy REVENUE và STAFF', () => {
    const permissions = ['ORDER_READ']
    expect(canSeeTab('ORDERS', permissions, false)).toBe(true)
    expect(canSeeTab('REVENUE', permissions, false)).toBe(false)
    expect(canSeeTab('STAFF', permissions, false)).toBe(false)
  })

  it('staff có PRODUCT_WRITE thấy PRODUCTS và ADD_PRODUCT', () => {
    const permissions = ['PRODUCT_WRITE']
    expect(canSeeTab('PRODUCTS', permissions, false)).toBe(true)
    expect(canSeeTab('ADD_PRODUCT', permissions, false)).toBe(true)
    expect(canSeeTab('REVENUE', permissions, false)).toBe(false)
  })

  it('staff có INVENTORY_READ thấy INVENTORY', () => {
    const permissions = ['INVENTORY_READ']
    expect(canSeeTab('INVENTORY', permissions, false)).toBe(true)
    expect(canSeeTab('ADD_PRODUCT', permissions, false)).toBe(false)
  })

  it('staff không có quyền gì không được thấy OVERVIEW hay PROFILE', () => {
    expect(canSeeTab('OVERVIEW', [], false)).toBe(false)
    expect(canSeeTab('PROFILE', [], false)).toBe(false)
    expect(canSeeTab('PRODUCTS', [], false)).toBe(false)
    expect(canSeeTab('ORDERS', [], false)).toBe(false)
    expect(canSeeTab('REVENUE', [], false)).toBe(false)
    expect(canSeeTab('STAFF', [], false)).toBe(false)
  })

  it('staff chỉ được thấy OVERVIEW khi có REVENUE_READ', () => {
    expect(canSeeTab('OVERVIEW', ['REVENUE_READ'], false)).toBe(true)
    expect(canSeeTab('OVERVIEW', ['PRODUCT_READ'], false)).toBe(false)
  })

  it('chỉ OWNER mới được thấy PROFILE, staff dù có quyền gì cũng không thấy PROFILE', () => {
    expect(canSeeTab('PROFILE', [], true)).toBe(true)
    expect(canSeeTab('PROFILE', ['PRODUCT_WRITE', 'REVENUE_READ', 'ORDER_PROCESS'], false)).toBe(false)
  })
})

describe('permissionLabel', () => {
  it('trả về nhãn tiếng Việt cho các quyền phổ biến', () => {
    expect(permissionLabel('ORDER_READ')).toBe('Xem đơn hàng')
    expect(permissionLabel('PRODUCT_WRITE')).toBe('Quản lý sản phẩm')
    expect(permissionLabel('REVENUE_WITHDRAW')).toBe('Yêu cầu rút tiền')
    expect(permissionLabel('CHANGE_MEMBER_ROLE')).toBe('Đổi vai trò nhân viên')
    expect(permissionLabel('UNKNOWN_ACTION')).toBe('UNKNOWN_ACTION')
  })
})
