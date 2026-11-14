import { MemoryRouter, Route, Routes } from 'react-router'

// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import OrderDetail from './OrderDetail'

import type { BuyerOrderTimelineResponse } from '@generated/model/buyerOrderTimelineResponse'
import type { OrderResponse } from '@generated/model/orderResponse'
import type { OrderTrackingEventResponse } from '@generated/model/orderTrackingEventResponse'
import type { ReturnRequestResponse } from '@generated/model/returnRequestResponse'
import type { ReviewResponse } from '@generated/model/reviewResponse'

const {
  orderState,
  trackingState,
  timelineState,
  returnsState,
  reviewsState,
  cancelMutate,
  confirmReceiptMutate,
  reorderMutateAsync,
} = vi.hoisted(() => ({
  orderState: { value: null as OrderResponse | null },
  trackingState: { list: [] as OrderTrackingEventResponse[] },
  timelineState: { list: [] as BuyerOrderTimelineResponse[] },
  returnsState: { list: [] as ReturnRequestResponse[] },
  reviewsState: { list: [] as ReviewResponse[] },
  cancelMutate: vi.fn(),
  confirmReceiptMutate: vi.fn(),
  reorderMutateAsync: vi.fn(),
}))

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ status: 'authenticated', user: { id: 'buyer-1' } }),
}))

vi.mock('@generated/endpoints/orders/orders', () => ({
  getMine3QueryKey: () => ['/api/orders/mine'],
  getDetail2QueryKey: (id: string) => [`/api/orders/${id}`],
  getTimeline1QueryKey: (id: string) => [`/api/orders/${id}/timeline`],
  getTracking1QueryKey: (id: string) => [`/api/orders/${id}/tracking`],
  useDetail2: () => {
    let data = undefined
    if (orderState.value !== null) {
      data = { status: 200, data: orderState.value }
    }
    return {
      data,
      isLoading: false,
      isError: false,
    }
  },
  useTracking1: () => ({
    data: { status: 200, data: trackingState.list },
    isLoading: false,
  }),
  useTimeline1: () => ({
    data: { status: 200, data: timelineState.list },
    isLoading: false,
  }),
  useCancel1: () => ({ mutate: cancelMutate, isPending: false }),
  useConfirmReceipt: () => ({ mutate: confirmReceiptMutate, isPending: false }),
}))

vi.mock('@generated/endpoints/buyer-returns/buyer-returns', () => ({
  getMine2QueryKey: () => ['/api/orders/returns/mine'],
  useMine2: () => ({
    data: { status: 200, data: returnsState.list },
    isLoading: false,
  }),
  useCreate2: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@generated/endpoints/reviews/reviews', () => ({
  getMine1QueryKey: () => ['/api/reviews/mine'],
  getListQueryKey: (productId: string) => [`/api/products/${productId}/reviews`],
  useMine1: () => ({
    data: { status: 200, data: reviewsState.list },
    isLoading: false,
  }),
  useCreate: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdate3: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@generated/endpoints/cart/cart', () => ({
  getViewQueryKey: () => ['/api/cart'],
  useReorder: () => ({ mutateAsync: reorderMutateAsync, isPending: false }),
}))

function renderDetail(id = 'o-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/account/orders/${id}`]}>
        <Routes>
          <Route path="/account/orders/:id" element={<OrderDetail />} />
          <Route path="/cart" element={<p>cart-page-target</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  orderState.value = {
    id: 'o-1',
    code: 'ORD-DETAIL-1',
    shopId: 's-1',
    shopName: 'Boutique Ha Noi',
    shopSlug: 'boutique-hn',
    status: 'DELIVERED',
    shippingCarrier: 'GHN',
    trackingCode: 'VN-123',
    shippingName: 'Minh',
    shippingPhone: '0909',
    shippingAddress: 'Ha Noi',
    subtotal: 500000,
    shippingFee: 30000,
    total: 530000,
    returnStatus: 'REQUESTED',
    items: [
      {
        id: 'oi-1',
        productId: 'p-1',
        productName: 'Áo Blazer Đen',
        variantLabel: 'M / Đen',
        quantity: 1,
        unitPrice: 500000,
        lineTotal: 500000,
        productAvailable: true,
      },
    ],
    createdAt: '2026-10-18T08:00:00Z',
    confirmedAt: '2026-10-18T09:00:00Z',
    shippedAt: '2026-10-19T10:00:00Z',
    deliveredAt: '2026-10-20T12:00:00Z',
  }
  trackingState.list = [
    {
      id: 'ev-1',
      statusCode: 'IN_TRANSIT',
      title: 'Đang trung chuyển tại Hà Nội',
      location: 'Kho Cầu Giấy',
      eventTime: '2026-10-19T15:00:00Z',
    },
  ]
  timelineState.list = [
    {
      fromStatus: 'CONFIRMED',
      toStatus: 'SHIPPING',
      actor: 'SELLER',
      createdAt: '2026-10-19T10:00:00Z',
    },
  ]
  returnsState.list = [
    {
      id: 'ret-1',
      orderId: 'o-1',
      reason: 'WRONG_ITEM',
      status: 'REJECTED',
      sellerNote: 'Thiếu video mở hộp',
      createdAt: '2026-10-20T13:00:00Z',
    },
    {
      id: 'ret-2',
      orderId: 'o-1',
      reason: 'DAMAGED',
      status: 'REQUESTED',
      createdAt: '2026-10-21T08:00:00Z',
    },
  ]
  reviewsState.list = []
  cancelMutate.mockReset()
  confirmReceiptMutate.mockReset()
  reorderMutateAsync.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('OrderDetail (1.4.5 + 1.4.6)', () => {
  it('hien thi stepper, hanh trinh van chuyen, lich su doi tra va khoa Da nhan hang khi doi tra mo', () => {
    renderDetail()
    expect(screen.getByText('ORD-DETAIL-1')).toBeTruthy()
    expect(screen.getByText('GHN')).toBeTruthy()
    expect(screen.getByText('VN-123')).toBeTruthy()
    expect(screen.getByText('Đang trung chuyển tại Hà Nội')).toBeTruthy()
    expect(screen.getByText('Bàn giao cho đơn vị vận chuyển')).toBeTruthy()
    expect(screen.getByText(/Thiếu video mở hộp/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Đã nhận hàng' })).toBeNull()
  })

  it('mo khoa Da nhan hang khi doi tra REJECTED', () => {
    if (orderState.value !== null) {
      orderState.value.returnStatus = 'REJECTED'
    }
    returnsState.list = [returnsState.list[0]]
    renderDetail()
    expect(screen.getByRole('button', { name: 'Đã nhận hàng' })).toBeTruthy()
  })

  it('cho phep huy don kem ly do khi don PENDING', async () => {
    const user = userEvent.setup()
    orderState.value = {
      id: 'o-pending',
      code: 'ORD-PENDING-1',
      shopId: 's-1',
      shopName: 'Boutique',
      status: 'PENDING',
      items: [],
      createdAt: '2026-10-20T08:00:00Z',
    }
    returnsState.list = []
    trackingState.list = []
    renderDetail('o-pending')

    await user.click(screen.getByRole('button', { name: 'Hủy đơn hàng' }))
    await user.click(screen.getByRole('button', { name: 'Tìm được giá rẻ hơn' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy đơn' }))
    expect(cancelMutate).toHaveBeenCalledWith(
      { id: 'o-pending', data: { reason: 'FOUND_CHEAPER', note: null } },
      expect.anything(),
    )
  })
})
