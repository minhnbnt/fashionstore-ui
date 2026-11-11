// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import ProductTabs from './ProductTabs'

import type { ReviewResponse } from '@generated/model/reviewResponse'

const { mockUseList } = vi.hoisted(() => ({ mockUseList: vi.fn() }))

vi.mock('@generated/endpoints/reviews/reviews', () => ({
  useList: mockUseList,
}))

function mockReviews(reviews: ReviewResponse[]) {
  mockUseList.mockReturnValue({
    data: { status: 200, data: reviews },
    isPending: false,
    isError: false,
    error: null,
  })
}

function reviews() {
  return [
    {
      id: 'r-1',
      buyerDisplayName: 'Trâm',
      stars: 5,
      comment: 'Áo đẹp, vải mát',
      createdAt: '2026-10-20T10:00:00Z',
    },
    {
      id: 'r-2',
      buyerDisplayName: 'Hải',
      stars: 4,
      comment: 'Giao hàng nhanh',
      createdAt: '2026-10-21T08:30:00Z',
    },
  ]
}

function renderTabs() {
  return render(
    <ProductTabs
      product={{ id: 'p-1', name: 'Áo Sơ Mi Lụa', description: 'Áo sơ mi lụa tơ tằm' }}
    />,
  )
}

afterEach(cleanup)

describe('ProductTabs — chuyển tab và danh sách đánh giá (DOM)', () => {
  it('mặc định mở tab Mô tả, số đánh giá trên nút lấy từ API', () => {
    mockReviews(reviews())
    renderTabs()

    expect(screen.getByText('Áo sơ mi lụa tơ tằm')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Đánh giá (2)' })).toBeTruthy()
    // Nội dung tab Đánh giá chưa hiện
    expect(screen.queryByText('“Áo đẹp, vải mát”')).toBeNull()
  })

  it('click Đánh giá → hiện tổng quan điểm và danh sách review', async () => {
    mockReviews(reviews())
    const user = userEvent.setup()
    renderTabs()

    await user.click(screen.getByRole('button', { name: 'Đánh giá (2)' }))

    // Tổng quan: điểm trung bình 4.5, đếm 2
    expect(screen.getByText('4.5')).toBeTruthy()
    expect(screen.getByText('2 đánh giá')).toBeTruthy()
    // Từng review render tên + nội dung
    expect(screen.getByText('Trâm')).toBeTruthy()
    expect(screen.getByText('“Áo đẹp, vải mát”')).toBeTruthy()
    expect(screen.getByText('Hải')).toBeTruthy()
    expect(screen.getByText('“Giao hàng nhanh”')).toBeTruthy()
  })

  it('chưa có đánh giá nào → mở tab hiện thông báo rỗng', async () => {
    mockReviews([])
    const user = userEvent.setup()
    renderTabs()

    await user.click(screen.getByRole('button', { name: 'Đánh giá (0)' }))

    expect(screen.getByText('Chưa có đánh giá nào cho sản phẩm này.')).toBeTruthy()
  })
})
