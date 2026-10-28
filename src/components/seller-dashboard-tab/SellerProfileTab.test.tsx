import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vite-plus/test'

import { SellerProfileTab } from './SellerProfileTab'

import type { ShopProfileData } from '@/types/seller'

vi.mock('@generated/endpoints/shops/shops', () => ({
  getMineQueryKey: vi.fn(() => ['getMine']),
  useUpdateProfile: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useUpdate2: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

describe('SellerProfileTab', () => {
  const sampleProfile: ShopProfileData = {
    shopName: 'nét Concept',
    slug: 'net-concept',
    bio: 'Thời trang thiết kế hiện đại',
    logoUrl: 'shops/logo-1.jpg',
    bannerUrl: 'shops/banner-1.jpg',
    contactName: 'Minh Hoàng',
    phone: '0901234567',
    pickupAddress: '123 Phố Huế, Hà Nội',
    city: 'Hà Nội',
    daysToShip: 2,
    businessType: 'INDIVIDUAL',
    taxOrIdNumber: '0123456789',
    isVerified: true,
    bankName: 'Techcombank',
    bankAccount: '1903123456789',
    bankHolder: 'NGUYEN VAN A',
    workingHours: '08:30 - 21:30',
    returnPolicy: 'Hỗ trợ đổi size trong vòng 7 ngày',
  }

  it('render đầy đủ các trường và giới hạn DTS chỉ từ 1-3 ngày', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          null,
          createElement(SellerProfileTab, {
            shopId: 'shop-uuid-123',
            profile: sampleProfile,
          }),
        ),
      ),
    )

    // Kiểm tra tên shop và slug
    expect(html).toContain('net-concept')
    expect(html).toContain('nét Concept')

    // Kiểm tra chính sách đổi trả
    expect(html).toContain('Chính sách đổi trả riêng của Shop')
    expect(html).toContain('Hỗ trợ đổi size trong vòng 7 ngày')

    // Giới hạn DTS chỉ 1, 2, 3 ngày (không còn option 7 ngày đặt trước)
    expect(html).toContain('1 ngày (Giao hàng hỏa tốc / Chuẩn bị ngay trong ngày)')
    expect(html).toContain('2 ngày (Tiêu chuẩn sàn nét)')
    expect(html).toContain('3 ngày (Mức tối đa cho phép)')
    expect(html).not.toContain('7 ngày (Hàng đặt trước')
  })
})
