import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vite-plus/test'

import { SellerDecorationTab } from './SellerDecorationTab'

vi.mock('@generated/endpoints/seller-decoration/seller-decoration', () => ({
  getGetDecorationQueryKey: vi.fn(() => ['getDecoration']),
  useGetDecoration: vi.fn(() => ({
    data: {
      status: 200,
      data: {
        draft: JSON.stringify([
          {
            id: 'b-slider-1',
            type: 'BANNER_SLIDER',
            title: 'Slider Chào Hè',
            enabled: true,
            banners: [{ id: 's1', imageKey: 'b1.jpg', title: 'Giảm 50%', linkUrl: '/search' }],
          },
          {
            id: 'b-col-1',
            type: 'PRODUCT_COLLECTION',
            title: 'Hàng Mới Về',
            enabled: true,
            collectionType: 'NEW_ARRIVALS',
            itemLimit: 8,
            displayStyle: 'GRID',
          },
        ]),
      },
    },
    isLoading: false,
  })),
  useSaveDraft: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  usePublish: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDiscardDraft: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@/lib/sellerPermissions', () => ({
  useSellerPermissions: vi.fn(() => ({
    can: () => true,
    isOwner: true,
  })),
}))

describe('SellerDecorationTab', () => {
  it('render giao diện studio trang trí với Banner Slider và Bộ sưu tập nổi bật', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          null,
          createElement(SellerDecorationTab, {
            shopId: 'shop-uuid-1',
            shopName: 'nét Concept Studio',
          }),
        ),
      ),
    )

    // Tiêu đề studio
    expect(html).toContain('Trang Trí Gian Hàng (Store Decoration)')
    expect(html).toContain('Lưu nháp')
    expect(html).toContain('Áp dụng gian hàng')

    // Hiển thị các khối module mở rộng
    expect(html).toContain('Slider Chào Hè')
    expect(html).toContain('Hàng Mới Về')

    // Kiểm tra tính năng kéo thả (Drag and Drop)
    expect(html).toContain('draggable="true"')
    expect(html).toContain('Kéo thả để sắp xếp vị trí')

    // Bỏ module voucher
    expect(html).not.toContain('VOUCHER_CAROUSEL')
  })
})
