import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vite-plus/test'

import MyShopsTab from './MyShopsTab'

import type { SellerShopMembershipResponse } from '@generated/model/sellerShopMembershipResponse'

vi.mock('@generated/endpoints/seller-staff-roles/seller-staff-roles', () => ({
  getGetMyShopsQueryKey: vi.fn(() => ['getMyShops']),
  useGetMyShops: vi.fn(),
}))

vi.mock('@generated/endpoints/shops/shops', () => ({
  useResubmitShop: vi.fn(),
}))

import { useGetMyShops } from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import { useResubmitShop } from '@generated/endpoints/shops/shops'

function renderWithProviders(ui: React.ReactElement): string {
  const queryClient = new QueryClient()
  return renderToString(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, null, ui),
    ),
  )
}

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

    const html = renderWithProviders(createElement(MyShopsTab, { onOpenRegisterModal: vi.fn() }))

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

    const html = renderWithProviders(createElement(MyShopsTab, { onOpenRegisterModal: vi.fn() }))

    expect(html).toContain('Bạn chưa tham gia gian hàng nào')
  })

  it('shop REJECTED hiển thị nút nộp lại hồ sơ duyệt, shop APPROVED thì không', () => {
    const mockShops: SellerShopMembershipResponse[] = [
      {
        shopId: 'shop-rejected-1',
        shopName: 'Shop Bị Từ Chối',
        shopSlug: 'shop-bi-tu-choi',
        logoKey: undefined,
        bannerKey: undefined,
        shopStatus: 'REJECTED',
        role: 'OWNER',
        roleId: undefined,
        roleName: 'Chủ gian hàng',
        memberStatus: 'ACTIVE',
        joinedAt: '2026-10-01T00:00:00Z',
        permissions: ['ALL'],
      },
    ]

    vi.mocked(useGetMyShops).mockReturnValue({
      data: { status: 200, data: mockShops },
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetMyShops>)
    vi.mocked(useResubmitShop).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useResubmitShop>)

    const html = renderWithProviders(createElement(MyShopsTab, { onOpenRegisterModal: vi.fn() }))

    expect(html).toContain('Hồ sơ mở shop bị từ chối')
    expect(html).toContain('Nộp lại hồ sơ duyệt')
  })

  it('shop APPROVED không hiển thị nút nộp lại hồ sơ duyệt', () => {
    const mockShops: SellerShopMembershipResponse[] = [
      {
        shopId: 'shop-ok-1',
        shopName: 'Shop OK',
        shopSlug: 'shop-ok',
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
    ]

    vi.mocked(useGetMyShops).mockReturnValue({
      data: { status: 200, data: mockShops },
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetMyShops>)
    vi.mocked(useResubmitShop).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useResubmitShop>)

    const html = renderWithProviders(createElement(MyShopsTab, { onOpenRegisterModal: vi.fn() }))

    expect(html).not.toContain('Nộp lại hồ sơ duyệt')
  })
})
