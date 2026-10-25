import { describe, expect, it } from 'vitest'

import { canSeeTab, formatTargetType, getAuditActionBadgeMeta, permissionLabel } from './sellerPermissions'

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

describe('formatTargetType', () => {
  it('Việt hóa các loại đối tượng mục tiêu', () => {
    expect(formatTargetType('PRODUCT')).toBe('Sản phẩm')
    expect(formatTargetType('ORDER')).toBe('Đơn hàng')
    expect(formatTargetType('RETURN')).toBe('Yêu cầu đổi trả')
    expect(formatTargetType('RETURN_REQUEST')).toBe('Yêu cầu đổi trả')
    expect(formatTargetType('ROLE')).toBe('Vai trò')
    expect(formatTargetType('MEMBER')).toBe('Thành viên')
    expect(formatTargetType('SHOP_MEMBER')).toBe('Thành viên')
    expect(formatTargetType('INVITATION')).toBe('Lời mời')
    expect(formatTargetType(null)).toBe('Hệ thống')
    expect(formatTargetType(undefined)).toBe('Hệ thống')
    expect(formatTargetType('OTHER_CUSTOM')).toBe('OTHER_CUSTOM')
  })
})

describe('getAuditActionBadgeMeta', () => {
  it('phân loại đúng 5 nhóm màu sắc và badgeType', () => {
    expect(getAuditActionBadgeMeta('PRODUCT_DELETE').badgeType).toBe('danger')
    expect(getAuditActionBadgeMeta('ORDER_CANCEL').badgeType).toBe('danger')
    expect(getAuditActionBadgeMeta('ORDER_DELIVER').badgeType).toBe('success')
    expect(getAuditActionBadgeMeta('RETURN_APPROVE').badgeType).toBe('success')
    expect(getAuditActionBadgeMeta('PRODUCT_CREATE').badgeType).toBe('info')
    expect(getAuditActionBadgeMeta('UPDATE_ROLE').badgeType).toBe('info')
    expect(getAuditActionBadgeMeta('INVENTORY_ADJUST').badgeType).toBe('warning')
    expect(getAuditActionBadgeMeta('ORDER_CONFIRM').badgeType).toBe('warning')
    expect(getAuditActionBadgeMeta('CHAT_REPLY').badgeType).toBe('neutral')
    expect(getAuditActionBadgeMeta('UNKNOWN_SOMETHING').badgeType).toBe('neutral')
  })
})

