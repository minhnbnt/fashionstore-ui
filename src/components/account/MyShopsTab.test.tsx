import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { describe, expect, it, vi } from 'vitest'

import MyShopsTab from './MyShopsTab'

import type { SellerShopMembershipResponse } from '@generated/model/sellerShopMembershipResponse'

vi.mock('@generated/endpoints/seller-staff-roles/seller-staff-roles', () => ({
  useGetMyShops: vi.fn(),
}))

import { useGetMyShops } from '@generated/endpoints/seller-staff-roles/seller-staff-roles'

describe('MyShopsTab', () => {
  it('hiển thị danh sách gian hàng với vai trò OWNER và STAFF', () => {
    const mockShops: SellerShopMembershipResponse[] = [
      {
        shopId: 'shop-uuid-1',
        shopName: 'Nét Boutique',
        shopSlug: 'net-boutique',
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
        shopName: 'Thời Trang GenZ',
        shopSlug: 'thoi-trang-genz',
        logoKey: undefined,
        bannerKey: undefined,
        shopStatus: 'APPROVED',
        role: 'STAFF',
        roleId: 'role-uuid-1',
        roleName: 'Kho vận (Warehouse)',
        memberStatus: 'ACTIVE',
        joinedAt: '2026-10-15T00:00:00Z',
        permissions: ['INVENTORY_READ', 'INVENTORY_WRITE'],
      },
    ]

    vi.mocked(useGetMyShops).mockReturnValue({
      data: { status: 200, data: mockShops },
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetMyShops>)

    const html = renderToString(
      createElement(
        MemoryRouter,
        null,
        createElement(MyShopsTab, { onOpenRegisterModal: vi.fn() }),
      ),
    )

    expect(html).toContain('Nét Boutique')
    expect(html).toContain('Thời Trang GenZ')
    expect(html).toContain('Chủ gian hàng')
    expect(html).toContain('Kho vận (Warehouse)')
    expect(html).toContain('/shop?shopId=shop-uuid-1')
    expect(html).toContain('/shop?shopId=shop-uuid-2')
  })

  it('hiển thị trạng thái rỗng khi chưa tham gia shop nào', () => {
    vi.mocked(useGetMyShops).mockReturnValue({
      data: { status: 200, data: [] },
      isLoading: false,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetMyShops>)

    const html = renderToString(
      createElement(
        MemoryRouter,
        null,
        createElement(MyShopsTab, { onOpenRegisterModal: vi.fn() }),
      ),
    )

    expect(html).toContain('Bạn chưa tham gia gian hàng nào')
  })
})
