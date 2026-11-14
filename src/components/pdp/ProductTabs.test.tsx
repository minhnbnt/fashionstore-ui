// @vitest-environment happy-dom
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import ProductTabs from './ProductTabs'

import type { ReviewResponse } from '@generated/model/reviewResponse'
import type { ReviewSummaryResponse } from '@generated/model/reviewSummaryResponse'

const { mockUseList1, mockUseSummary2, mockToggleHelpfulMutate, mockSessionState } = vi.hoisted(
  () => ({
    mockUseList1: vi.fn(),
    mockUseSummary2: vi.fn(),
    mockToggleHelpfulMutate: vi.fn(),
    mockSessionState: { loggedIn: true },
  }),
)

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => {
    if (mockSessionState.loggedIn) {
      return { data: { user: { id: 'u-1' } }, isPending: false }
    }
    return { data: null, isPending: false }
  },
}))

vi.mock('@generated/endpoints/reviews/reviews', () => ({
  getList1QueryKey: (productId: string) => [`/api/products/${productId}/reviews`],
  useList1: mockUseList1,
  useSummary2: mockUseSummary2,
  useToggleHelpful: () => ({ mutate: mockToggleHelpfulMutate, isPending: false }),
}))

function mockReviews(reviews: ReviewResponse[], summary?: ReviewSummaryResponse) {
  mockUseList1.mockReturnValue({
    data: { status: 200, data: reviews },
    isPending: false,
    isError: false,
    error: null,
  })
  mockUseSummary2.mockReturnValue({
    data: summary ? { status: 200, data: summary } : undefined,
    isPending: false,
    isError: false,
    error: null,
  })
}

function sampleReviews(): ReviewResponse[] {
  return [
    {
      id: 'r-1',
      productId: 'p-1',
      buyerDisplayName: 'T***m',
      variantLabel: 'M · Đen',
      stars: 5,
      comment: 'Áo đẹp, vải mát và đường may rất chắc chắn.',
      imageKeys: ['reviews/r1.jpg'],
      tags: ['Chất lượng tốt', 'Size đúng chuẩn'],
      anonymous: true,
      mine: false,
      helpfulCount: 6,
      helpfulByMe: false,
      sellerReply: 'Cảm ơn bạn đã ủng hộ shop nhé!',
      repliedAt: '2026-10-21T10:00:00Z',
      createdAt: '2026-10-20T10:00:00Z',
    },
    {
      id: 'r-2',
      productId: 'p-1',
      buyerDisplayName: 'Hải',
      stars: 4,
      comment: 'Giao hàng nhanh, đóng gói rất cẩn thận.',
      tags: ['Giao hàng nhanh'],
      mine: true,
      helpfulCount: 1,
      helpfulByMe: false,
      createdAt: '2026-10-21T08:30:00Z',
    },
  ]
}

function renderTabs() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProductTabs
          product={{ id: 'p-1', name: 'Áo Sơ Mi Lụa', description: 'Áo sơ mi lụa tơ tằm' }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockSessionState.loggedIn = true
})

describe('ProductTabs — xem danh gia, highlight huu ich va tương tác (DOM)', () => {
  it('mặc định mở tab Mô tả, số đánh giá trên nút lấy từ summary API', () => {
    mockReviews(sampleReviews(), {
      reviewCount: 2,
      averageRating: 4.5,
      fiveStarCount: 1,
      fourStarCount: 1,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
      withMediaCount: 1,
    })
    renderTabs()

    expect(screen.getByText('Áo sơ mi lụa tơ tằm')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Đánh giá (2)' })).toBeTruthy()
    expect(screen.queryByText(/Áo đẹp, vải mát/)).toBeNull()
  })

  it('click Đánh giá → hiện summary 1 chữ số thập phân, badge Hữu ích nhất, phân loại hàng, tag, phản hồi shop và nút Hữu ích', async () => {
    mockReviews(sampleReviews(), {
      reviewCount: 2,
      averageRating: 4.56,
      fiveStarCount: 1,
      fourStarCount: 1,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
      withMediaCount: 1,
    })
    const user = userEvent.setup()
    renderTabs()

    await user.click(screen.getByRole('button', { name: 'Đánh giá (2)' }))

    expect(screen.getByText('4.6')).toBeTruthy()
    expect(screen.getByText('2 đánh giá')).toBeTruthy()
    expect(screen.getByText('M · Đen')).toBeTruthy()
    expect(screen.getByText('Chất lượng tốt')).toBeTruthy()
    expect(screen.getByText('Phản hồi của Shop')).toBeTruthy()
    expect(screen.getByText('Cảm ơn bạn đã ủng hộ shop nhé!')).toBeTruthy()
    // Chỉ review đứng đầu có helpfulCount cao nhất > 0 mới mang badge nổi bật Hữu ích nhất (ngoài nút sort)
    expect(screen.getAllByText('Hữu ích nhất').length).toBeGreaterThanOrEqual(2)

    const helpfulBtns = screen.getAllByRole('button', { name: /Hữu ích \(\d+\)/ })
    expect((helpfulBtns[0] as HTMLButtonElement).disabled).toBe(false)
    expect((helpfulBtns[1] as HTMLButtonElement).disabled).toBe(true)

    await user.click(helpfulBtns[0])
    expect(mockToggleHelpfulMutate).toHaveBeenCalledWith({ reviewId: 'r-1' }, expect.any(Object))
  })

  it('chưa có đánh giá nào → mở tab hiện thông báo rỗng', async () => {
    mockReviews([], {
      reviewCount: 0,
      averageRating: null,
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
      withMediaCount: 0,
    })
    const user = userEvent.setup()
    renderTabs()

    await user.click(screen.getByRole('button', { name: 'Đánh giá (0)' }))

    expect(screen.getByText('Chưa có đánh giá nào phù hợp cho sản phẩm này.')).toBeTruthy()
  })
})
