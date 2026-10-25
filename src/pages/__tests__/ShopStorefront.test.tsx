import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import ShopStorefront from '../ShopStorefront'

import type { ShopResponse } from '@generated/model/shopResponse'

vi.mock('@generated/endpoints/shops/shops', () => ({
  useBySlug: vi.fn(() => ({
    data: {
      status: 200,
      data: {
        id: 'shop-uuid-1',
        name: 'Thời Trang Thiết Kế Nét',
        slug: 'net-design',
        description: 'Thương hiệu thời trang cao cấp.',
        status: 'APPROVED',
        sellerType: 'BUSINESS',
        rating: 4.9,
        ratingCount: 350,
        followerCount: 1250,
        processingDays: 2,
        address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
        returnPolicy: 'Hỗ trợ đổi trả miễn phí trong 15 ngày với mọi lý do.',
        logoKey: 'shops/logo.jpg',
        bannerKey: 'shops/banner.jpg',
      } as ShopResponse,
    },
    isLoading: false,
    isPending: false,
    isError: false,
  })),
  useFollow: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUnfollow: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@generated/endpoints/shops-decoration/shops-decoration', () => ({
  useGetPublishedLayout: vi.fn(() => ({
    data: {
      status: 200,
      data: {
        id: 'deco-1',
        shopId: 'shop-uuid-1',
        layout: JSON.stringify([
          {
            id: 'b-1',
            type: 'BANNER_SLIDER',
            title: 'Khuyến Mãi Mùa Hè',
            enabled: true,
            banners: [
              { id: 's-1', imageKey: 'b1.jpg', title: 'Ưu Đãi 50%', linkUrl: '/search?q=sale' },
            ],
          },
          {
            id: 'b-2',
            type: 'PRODUCT_COLLECTION',
            title: 'Hàng Mới Về',
            enabled: true,
            collectionType: 'NEW_ARRIVALS',
            itemLimit: 4,
            displayStyle: 'GRID',
          },
        ]),
      },
    },
    isLoading: false,
  })),
}))

describe('ShopStorefront Customer Page', () => {
  it('render đầy đủ header gian hàng, banner slider và danh mục bộ sưu tập nổi bật', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ['/shops/net-design'] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: '/shops/:slug',
              element: createElement(ShopStorefront),
            }),
          ),
        ),
      ),
    )

    // Tên gian hàng & slug
    expect(html).toContain('Thời Trang Thiết Kế Nét')
    expect(html).toContain('@net-design')

    // Badge nét Mall
    expect(html).toContain('nét Mall')

    // Thống kê shop
    expect(html).toContain('4.9')
    expect(html).toContain('1250')
    expect(html).toContain('Chuẩn bị hàng: 2 ngày')

    // Tab điều hướng
    expect(html).toContain('Trang Chủ Gian Hàng')
    expect(html).toContain('Tất Cả Sản Phẩm')
    expect(html).toContain('Hồ Sơ &amp; Chính Sách')

    // Nội dung trang trí đã xuất bản
    expect(html).toContain('Ưu Đãi 50%')
    expect(html).toContain('Hàng Mới Về')
  })
})
