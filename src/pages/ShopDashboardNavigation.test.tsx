import { describe, expect, it } from 'vitest'

import { getFirstAllowedTab, sellerTabParam } from '@/lib/sellerNavigation'
import { canSeeTab } from '@/lib/sellerPermissions'

import type { SellerShopMembershipResponse } from '@generated/model/sellerShopMembershipResponse'

describe('ShopDashboard Smart Auto-Navigation and Shop Resolution', () => {
  it('nhân viên chỉ có quyền CHAT_ACCESS tự động chuyển hướng sang tab chat', () => {
    const permissions = ['CHAT_ACCESS']
    const isOwner = false

    // OVERVIEW bị chặn vì không có REVENUE_READ
    expect(canSeeTab('OVERVIEW', permissions, isOwner)).toBe(false)
    // CHAT được phép
    expect(canSeeTab('CHAT', permissions, isOwner)).toBe(true)

    // Hàm auto-nav tìm tab được phép đầu tiên
    const firstAllowed = getFirstAllowedTab(permissions, isOwner)
    expect(firstAllowed).toBe('CHAT')
    expect(sellerTabParam(firstAllowed!)).toBe('chat')
  })

  it('nhân viên có ORDER_READ và ORDER_PROCESS tự động chuyển hướng sang tab orders', () => {
    const permissions = ['ORDER_READ', 'ORDER_PROCESS']
    const isOwner = false

    expect(canSeeTab('OVERVIEW', permissions, isOwner)).toBe(false)
    expect(canSeeTab('ORDERS', permissions, isOwner)).toBe(true)

    const firstAllowed = getFirstAllowedTab(permissions, isOwner)
    expect(firstAllowed).toBe('ORDERS')
    expect(sellerTabParam(firstAllowed!)).toBe('orders')
  })

  it('chủ gian hàng OWNER luôn được vào tab OVERVIEW mặc định', () => {
    const firstAllowed = getFirstAllowedTab([], true)
    expect(firstAllowed).toBe('OVERVIEW')
    expect(sellerTabParam(firstAllowed!)).toBeNull()
  })

  it('nhân viên không có quyền gì trả về null để hiển thị màn hình thông báo', () => {
    const firstAllowed = getFirstAllowedTab([], false)
    expect(firstAllowed).toBeNull()
  })

  it('chọn đúng shop theo param shopId từ danh sách đa gian hàng', () => {
    const mockMemberships: SellerShopMembershipResponse[] = [
      {
        shopId: 'shop-uuid-1',
        shopName: 'Shop Chủ Sở Hữu',
        shopSlug: 'shop-chu-so-huu',
        logoKey: undefined,
        bannerKey: undefined,
        shopStatus: 'APPROVED',
        role: 'OWNER',
        roleId: undefined,
        roleName: 'Chủ gian hàng',
        memberStatus: 'ACTIVE',
        joinedAt: '2026-10-01T00:00:00Z',
        permissions: ['ALL'],
      },
      {
        shopId: 'shop-uuid-2',
        shopName: 'Shop Nhân Viên Vận Hành',
        shopSlug: 'shop-nhan-vien',
        logoKey: undefined,
        bannerKey: undefined,
        shopStatus: 'APPROVED',
        role: 'STAFF',
        roleId: 'role-123',
        roleName: 'Kho vận (Warehouse)',
        memberStatus: 'ACTIVE',
        joinedAt: '2026-10-15T00:00:00Z',
        permissions: ['INVENTORY_READ', 'INVENTORY_WRITE'],
      },
    ]

    function resolveShop(paramId: string | null, list: SellerShopMembershipResponse[]) {
      if (paramId !== null && paramId !== '') {
        for (const s of list) {
          if (s.shopId === paramId) {
            return s
          }
        }
      }
      if (list.length > 0) {
        return list[0]
      }
      return null
    }

    // Khi có param shop-uuid-2
    const selected1 = resolveShop('shop-uuid-2', mockMemberships)
    expect(selected1?.shopName).toBe('Shop Nhân Viên Vận Hành')
    expect(selected1?.role).toBe('STAFF')

    // Khi không có param -> fallback shop đầu tiên
    const selected2 = resolveShop(null, mockMemberships)
    expect(selected2?.shopName).toBe('Shop Chủ Sở Hữu')
    expect(selected2?.role).toBe('OWNER')
  })
})
