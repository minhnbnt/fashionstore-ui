// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import SellerReviewsTab from './SellerReviewsTab'

vi.mock('@/lib/seller/sellerPermissions', () => ({
  useSellerPermissions: () => ({ can: () => true }),
}))

vi.mock('@generated/endpoints/seller-products-inventory/seller-products-inventory', () => ({
  useListProducts: () => ({
    data: {
      status: 200,
      data: [{ id: 'p1', name: 'Áo Thun Oversize' }],
    },
  }),
}))

vi.mock('@generated/endpoints/seller-reviews/seller-reviews', () => ({
  getList3QueryKey: () => ['/api/seller/reviews'],
  getSummaryQueryKey: () => ['/api/seller/reviews/summary'],
  useList3: () => ({
    data: {
      status: 200,
      data: [
        {
          id: 'rev-1',
          productId: 'p1',
          buyerDisplayName: 'K***g',
          variantLabel: 'L · Trắng',
          stars: 5,
          comment: 'Áo mặc cực kỳ thoải mái và mát.',
          imageKeys: ['reviews/khang-1.jpg'],
          tags: ['Chất lượng tốt', 'Size đúng chuẩn'],
          anonymous: true,
          helpfulCount: 4,
          sellerReply: null,
          isReported: false,
          createdAt: '2026-10-20T10:00:00Z',
        },
      ],
    },
  }),
  useSummary: () => ({
    data: {
      status: 200,
      data: {
        reviewCount: 12,
        averageRating: 4.36,
        fiveStarCount: 6,
        fourStarCount: 3,
        threeStarCount: 2,
        twoStarCount: 1,
        oneStarCount: 0,
        withMediaCount: 5,
      },
    },
  }),
  useReply: () => ({ mutate: vi.fn() }),
  useReport: () => ({ mutate: vi.fn() }),
}))

afterEach(() => {
  cleanup()
})

describe('SellerReviewsTab', () => {
  it('hiển thị thống kê thật từ API và chi tiết size, tag, ảnh, ẩn danh, hữu ích của khách', () => {
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <SellerReviewsTab shopId="shop-1" />
      </QueryClientProvider>,
    )

    expect(screen.getByText('4.4')).toBeTruthy()
    expect(screen.getByText('Dựa trên 12 lượt đánh giá')).toBeTruthy()
    expect(screen.getByText('Phân loại: L · Trắng')).toBeTruthy()
    expect(screen.getByText('Ẩn danh')).toBeTruthy()
    expect(screen.getByText('Chất lượng tốt')).toBeTruthy()
    expect(screen.getByText('Size đúng chuẩn')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Trả lời đánh giá này' })).toBeTruthy()
  })
})
