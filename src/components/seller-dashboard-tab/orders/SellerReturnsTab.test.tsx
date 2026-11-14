import { MemoryRouter, Route, Routes } from 'react-router'

// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import SellerReturnsTab from './SellerReturnsTab'

vi.mock('@generated/endpoints/seller-orders/seller-orders', () => ({
  getList5QueryKey: () => ['/api/seller/orders'],
  useList5: () => ({
    data: {
      status: 200,
      data: [
        {
          id: 'order-1',
          code: 'ORD-111',
          status: 'DELIVERED',
          shippingName: 'An',
        },
        {
          id: 'order-2',
          code: 'ORD-222',
          status: 'DELIVERED',
          shippingName: 'Bình',
        },
      ],
    },
    isLoading: false,
  }),
}))

vi.mock('@generated/endpoints/seller-returns/seller-returns', () => ({
  getList4QueryKey: () => ['/api/seller/returns'],
  useList4: () => ({
    data: {
      status: 200,
      data: [
        {
          id: 'ret-1',
          orderId: 'order-1',
          orderCode: 'ORD-111',
          orderStatus: 'DELIVERED',
          reason: 'DAMAGED',
          description: 'Áo bị rách',
          evidence: [
            { url: 'https://s3.test/returns/photo-1.jpg' },
            { url: 'https://s3.test/returns/video-1.mp4' },
          ],
          status: 'REQUESTED',
          createdAt: '2026-10-20T09:00:00Z',
        },
        {
          id: 'ret-2',
          orderId: 'order-2',
          orderCode: 'ORD-222',
          orderStatus: 'DELIVERED',
          reason: 'WRONG_ITEM',
          description: 'Sai size',
          evidence: [],
          status: 'APPROVED',
          createdAt: '2026-10-19T09:00:00Z',
        },
      ],
    },
    isLoading: false,
  }),
  useApprove: () => ({ mutate: vi.fn(), isPending: false }),
  useReject: () => ({ mutate: vi.fn(), isPending: false }),
  useComplete: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useShopPermissions', () => ({
  useShopPermissions: () => ({ permissions: [], isOwner: true }),
}))

afterEach(() => {
  cleanup()
})

describe('SellerReturnsTab sync & media', () => {
  it('loc theo ?orderId= tu URL, hien trang thai don dong bo va toan bo anh + video bang chung', () => {
    const client = new QueryClient()
    const { container } = render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/shop?tab=returns&orderId=order-1']}>
          <Routes>
            <Route path="/shop" element={<SellerReturnsTab shopId="shop-1" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText(/ORD-111/)).toBeTruthy()
    expect(screen.queryByText(/ORD-222/)).toBeNull()
    expect(screen.getByRole('button', { name: /Xem tất cả/i })).toBeTruthy()
    expect(screen.getByText(/Hoàn thành/)).toBeTruthy()
    expect(container.querySelectorAll('img').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelectorAll('video').length).toBeGreaterThanOrEqual(1)
  })
})
