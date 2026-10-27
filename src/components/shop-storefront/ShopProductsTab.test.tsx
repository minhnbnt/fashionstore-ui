import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import ShopProductsTab from './ShopProductsTab'

vi.mock('@generated/endpoints/shops-catalog/shops-catalog', () => ({
  useGetShopProducts: vi.fn((_shopId: string, params: { q?: string }) => {
    if (params.q === 'nonexistent') {
      return {
        data: {
          status: 200,
          data: {
            items: [],
            total: 0,
            page: 0,
            limit: 12,
            totalPages: 0,
          },
        },
        isLoading: false,
      }
    }
    return {
      data: {
        status: 200,
        data: {
          items: [
            {
              id: 'p-1',
              name: 'Áo Sơ Mi Oxford Cao Cấp',
              variants: [{ price: 320000, compareAtPrice: 450000, defaultVariant: true }],
              images: [{ url: 'https://img.test/oxford.jpg' }],
            },
            {
              id: 'p-2',
              name: 'Quần Jeans Slim Fit Nam',
              variants: [{ price: 490000, compareAtPrice: 590000, defaultVariant: true }],
              images: [{ url: 'https://img.test/jeans.jpg' }],
            },
          ],
          total: 2,
          page: 0,
          limit: 12,
          totalPages: 1,
        },
      },
      isLoading: false,
    }
  }),
  useGetShopCategories: vi.fn(() => ({
    data: {
      status: 200,
      data: [
        { id: 'cat-1', name: 'Áo Sơ Mi', slug: 'ao-so-mi', productCount: 12 },
        { id: 'cat-2', name: 'Quần Nam', slug: 'quan-nam', productCount: 6 },
      ],
    },
    isLoading: false,
  })),
}))

describe('ShopProductsTab', () => {
  it('render danh mục sản phẩm, bộ lọc danh mục và thanh sắp xếp', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          null,
          createElement(ShopProductsTab, {
            shopId: 'shop-uuid-1',
            searchQuery: 'áo sơ mi',
          }),
        ),
      ),
    )

    // Search banner
    expect(html).toContain('Kết quả tìm kiếm cho:')
    expect(html).toContain('áo sơ mi')

    // Category pills
    expect(html).toContain('Tất cả danh mục')
    expect(html).toContain('Áo Sơ Mi')
    expect(html).toContain('12')
    expect(html).toContain('Quần Nam')
    expect(html).toContain('6')

    // Sort buttons
    expect(html).toContain('Mới nhất')
    expect(html).toContain('Bán chạy')
    expect(html).toContain('Giá tăng dần')
    expect(html).toContain('Giá giảm dần')

    // Product items
    expect(html).toContain('Áo Sơ Mi Oxford Cao Cấp')
    expect(html).toContain('320.000')
    expect(html).toContain('Quần Jeans Slim Fit Nam')
    expect(html).toContain('490.000')
  })

  it('render trạng thái rỗng khi không có sản phẩm nào khớp bộ lọc', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          null,
          createElement(ShopProductsTab, {
            shopId: 'shop-uuid-1',
            searchQuery: 'nonexistent',
          }),
        ),
      ),
    )

    expect(html).toContain('Không tìm thấy sản phẩm nào phù hợp')
    expect(html).toContain('Xem tất cả sản phẩm')
  })
})
