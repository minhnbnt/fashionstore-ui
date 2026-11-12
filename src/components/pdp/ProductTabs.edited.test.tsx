// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import ProductTabs from './ProductTabs'

vi.mock('@generated/endpoints/reviews/reviews', () => ({
  useList: () => ({
    data: {
      status: 200,
      data: [
        {
          id: 'rev-edited',
          productId: 'p1',
          buyerDisplayName: 'Minh Nguyễn',
          stars: 5,
          comment: 'Đã sửa nhận xét sau 1 tuần mặc',
          edited: true,
          editedAt: '2026-10-20T09:00:00Z',
          createdAt: '2026-10-18T09:00:00Z',
        },
        {
          id: 'rev-fresh',
          productId: 'p1',
          buyerDisplayName: 'Lan Anh',
          stars: 4,
          comment: 'Vải mát',
          edited: false,
          createdAt: '2026-10-18T08:00:00Z',
        },
      ],
    },
    isLoading: false,
  }),
}))

afterEach(() => {
  cleanup()
})

describe('ProductTabs edited review indicator', () => {
  it('hien thi huy hieu Da chinh sua chi cho review da sua va khong co nut xoa', () => {
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <ProductTabs product={{ id: 'p1', description: 'Mô tả' }} />
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Đánh giá/i }))

    expect(screen.getAllByText('Đã chỉnh sửa')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Xóa/i })).toBeNull()
  })
})
