import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { PdpShopCard } from './PdpShopCard'

vi.mock('@generated/endpoints/shops/shops', () => ({
  useBySlug: vi.fn((_slug: string) => ({
    data: {
      status: 200,
      data: {
        id: 'shop-uuid-1',
        name: 'nét Concept Studio',
        slug: 'net-concept',
        rating: 4.9,
        ratingCount: 128,
        followerCount: 3500,
        processingDays: 2,
        isTrusted: true,
        sellerType: 'BRAND',
      },
    },
    isLoading: false,
  })),
}))

describe('PdpShopCard', () => {
  it('render đầy đủ thông tin gian hàng, chứng nhận uy tín, số ngày chuẩn bị hàng và nút Xem Shop', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          null,
          createElement(PdpShopCard, {
            shopId: 'shop-uuid-1',
          }),
        ),
      ),
    )

    // Tên shop & liên kết trang shop
    expect(html).toContain('nét Concept Studio')
    expect(html).toContain('href="/shops/net-concept"')

    // Badge uy tín & thương hiệu
    expect(html).toContain('Thương hiệu')
    expect(html).toContain('Shop uy tín được xác thực')

    // Rating & người theo dõi & thời gian chuẩn bị hàng
    expect(html).toContain('4.9')
    expect(html).toContain('128')
    expect(html).toContain('Chuẩn bị hàng:')
    expect(html).toContain('2')
    expect(html).toContain('ngày')

    // Nút hành động
    expect(html).toContain('Xem Shop')
    expect(html).toContain('Chat ngay')
  })
})
