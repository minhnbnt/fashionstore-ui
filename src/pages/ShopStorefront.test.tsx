import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import ShopStorefront from './ShopStorefront'

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

vi.mock('@generated/endpoints/shops-catalog/shops-catalog', () => ({
  useGetShopProducts: vi.fn(() => ({
    data: {
      status: 200,
      data: {
        items: [
          {
            id: 'prod-1',
            name: 'Áo Phông Cao Cấp',
            variants: [{ price: 199000, compareAtPrice: 299000, defaultVariant: true }],
            images: [{ url: 'https://img.test/p1.jpg' }],
          },
        ],
        total: 1,
        page: 0,
        limit: 12,
        totalPages: 1,
      },
    },
    isLoading: false,
  })),
  useGetShopCategories: vi.fn(() => ({
    data: {
      status: 200,
      data: [
        { id: 'cat-1', name: 'Áo Nam', slug: 'ao-nam', productCount: 15 },
        { id: 'cat-2', name: 'Quần Nam', slug: 'quan-nam', productCount: 8 },
      ],
    },
    isLoading: false,
  })),
}))

describe('ShopStorefront Customer Page', () => {
  it('render đầy đủ header gian hàng, banner slider, thanh tìm kiếm nội bộ và bộ sưu tập sản phẩm thật', () => {
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
    expect(html).toContain('Chuẩn bị hàng:')
    expect(html).toContain('2')

    // Tab điều hướng & ô tìm kiếm nội bộ shop
    expect(html).toContain('Trang Chủ Gian Hàng')
    expect(html).toContain('Tất Cả Sản Phẩm')
    expect(html).toContain('Hồ Sơ &amp; Chính Sách')
    expect(html).toContain('Tìm trong Shop này...')

    // Nội dung trang trí đã xuất bản
    expect(html).toContain('Ưu Đãi 50%')
    expect(html).toContain('Hàng Mới Về')

    // Sản phẩm thật từ API catalog
    expect(html).toContain('Áo Phông Cao Cấp')
    expect(html).toContain('199.000')
    expect(html).toContain('33')
    expect(html).toContain('%')
  })
})
