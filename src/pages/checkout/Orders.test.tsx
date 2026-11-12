import { MemoryRouter, Route, Routes } from 'react-router'

// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import Orders from './Orders'

import type { OrderResponse } from '@generated/model/orderResponse'
import type { ReturnRequestResponse } from '@generated/model/returnRequestResponse'
import type { ReviewResponse } from '@generated/model/reviewResponse'

const {
  ordersState,
  returnsState,
  reviewsState,
  confirmReceiptMutate,
  cancelMutate,
  reorderMutateAsync,
  createReviewMutate,
  updateReviewMutate,
  createReturnMutate,
} = vi.hoisted(() => ({
  ordersState: { list: [] as OrderResponse[] },
  returnsState: { list: [] as ReturnRequestResponse[] },
  reviewsState: { list: [] as ReviewResponse[] },
  confirmReceiptMutate: vi.fn(),
  cancelMutate: vi.fn(),
  reorderMutateAsync: vi.fn(),
  createReviewMutate: vi.fn(),
  updateReviewMutate: vi.fn(),
  createReturnMutate: vi.fn(),
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({ data: { user: { id: 'buyer-1' } }, isPending: false }),
}))

vi.mock('@generated/endpoints/orders/orders', () => ({
  getMine3QueryKey: () => ['/api/orders/mine'],
  getDetail2QueryKey: (id: string) => [`/api/orders/${id}`],
  getTimeline1QueryKey: (id: string) => [`/api/orders/${id}/timeline`],
  useMine3: () => ({
    data: { status: 200, data: ordersState.list },
    isLoading: false,
    isError: false,
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
  useCreate2: () => ({ mutate: createReturnMutate, isPending: false }),
}))

vi.mock('@generated/endpoints/reviews/reviews', () => ({
  getMine1QueryKey: () => ['/api/reviews/mine'],
  getListQueryKey: (productId: string) => [`/api/products/${productId}/reviews`],
  useMine1: () => ({
    data: { status: 200, data: reviewsState.list },
    isLoading: false,
  }),
  useCreate: () => ({ mutate: createReviewMutate, isPending: false }),
  useUpdate3: () => ({ mutate: updateReviewMutate, isPending: false }),
}))

vi.mock('@generated/endpoints/cart/cart', () => ({
  getViewQueryKey: () => ['/api/cart'],
  useReorder: () => ({ mutateAsync: reorderMutateAsync, isPending: false }),
}))

function sampleOrders(): OrderResponse[] {
  return [
    {
      id: 'o-pending',
      code: 'ORD-PENDING',
      shopId: 's1',
      shopName: 'Shop Alpha',
      status: 'PENDING',
      total: 250000,
      items: [
        { id: 'i1', productId: 'p1', productName: 'Áo Khoác Dù', quantity: 1, unitPrice: 250000 },
      ],
      createdAt: '2026-10-18T08:00:00Z',
    },
    {
      id: 'o-delivered-locked',
      code: 'ORD-LOCKED',
      shopId: 's1',
      shopName: 'Shop Alpha',
      status: 'DELIVERED',
      returnStatus: 'REQUESTED',
      total: 400000,
      items: [
        { id: 'i2', productId: 'p2', productName: 'Váy Lụa Đỏ', quantity: 1, unitPrice: 400000 },
      ],
      createdAt: '2026-10-17T08:00:00Z',
      deliveredAt: '2026-10-19T08:00:00Z',
    },
    {
      id: 'o-delivered-rejected',
      code: 'ORD-UNLOCKED',
      shopId: 's1',
      shopName: 'Shop Alpha',
      status: 'DELIVERED',
      returnStatus: 'REJECTED',
      total: 320000,
      items: [
        { id: 'i3', productId: 'p3', productName: 'Quần Kaki', quantity: 1, unitPrice: 320000 },
      ],
      createdAt: '2026-10-16T08:00:00Z',
      deliveredAt: '2026-10-18T08:00:00Z',
    },
  ]
}

function renderOrders(initialPath = '/account/orders') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/account/orders" element={<Orders />} />
          <Route path="/cart" element={<p>cart-page-target</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  ordersState.list = sampleOrders()
  returnsState.list = [
    {
      id: 'ret-old',
      orderId: 'o-delivered-locked',
      orderCode: 'ORD-LOCKED',
      orderStatus: 'DELIVERED',
      status: 'REJECTED',
      reason: 'OTHER',
      createdAt: '2026-10-19T09:00:00Z',
    },
    {
      id: 'ret-new',
      orderId: 'o-delivered-locked',
      orderCode: 'ORD-LOCKED',
      orderStatus: 'DELIVERED',
      status: 'REQUESTED',
      reason: 'DAMAGED',
      createdAt: '2026-10-20T09:00:00Z',
    },
    {
      id: 'ret-3',
      orderId: 'o-delivered-rejected',
      orderCode: 'ORD-UNLOCKED',
      orderStatus: 'DELIVERED',
      status: 'REJECTED',
      reason: 'DAMAGED',
      createdAt: '2026-10-19T12:00:00Z',
    },
  ]
  reviewsState.list = [
    {
      id: 'rev-2',
      productId: 'p2',
      stars: 5,
      comment: 'Đẹp',
      edited: false,
    },
  ]
  confirmReceiptMutate.mockReset()
  cancelMutate.mockReset()
  reorderMutateAsync.mockReset()
  createReviewMutate.mockReset()
  updateReviewMutate.mockReset()
  createReturnMutate.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('Orders page (1.4.5 + 1.4.6)', () => {
  it('hien thi du 7 tab dong bo voi shop va tim kiem theo ma don hoac ten san pham', async () => {
    const user = userEvent.setup()
    renderOrders()

    for (const label of [
      'Tất cả',
      'Chờ xác nhận',
      'Đang chuẩn bị',
      'Đang giao',
      'Hoàn thành',
      'Đã hủy',
      'Đổi trả',
    ]) {
      expect(screen.getAllByRole('button', { name: new RegExp(label) }).length).toBeGreaterThan(0)
    }

    const searchInput = screen.getByPlaceholderText(/Tìm theo mã đơn hoặc tên sản phẩm/i)
    await user.type(searchInput, 'Váy Lụa Đỏ')
    expect(screen.getByText('ORD-LOCKED')).toBeTruthy()
    expect(screen.queryByText('ORD-PENDING')).toBeNull()
  })

  it('o tab Doi tra gop toi da 1 the moi don va hien trang thai song song', async () => {
    const user = userEvent.setup()
    renderOrders()

    await user.click(screen.getByRole('button', { name: /Đổi trả/ }))
    const lockedCodes = screen.getAllByText('ORD-LOCKED')
    expect(lockedCodes).toHaveLength(1)
    expect(screen.getAllByText('Đang yêu cầu đổi trả').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hoàn thành').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /Hoàn thành/ }))
    expect(screen.getByText('ORD-LOCKED')).toBeTruthy()
    expect(screen.getByText('ORD-UNLOCKED')).toBeTruthy()
  })

  it('khoa Da nhan hang khi doi tra REQUESTED va mo lai khi REJECTED', () => {
    renderOrders('/account/orders?tab=DELIVERED')
    const receiptButtons = screen.getAllByRole('button', { name: 'Đã nhận hàng' })
    expect(receiptButtons).toHaveLength(1)
    expect(screen.getByText(/đang có yêu cầu đổi trả/i)).toBeTruthy()
  })

  it('chuyen /cart ngay khi Mua lai thanh cong 100%, mo modal khi co mon thieu hang', async () => {
    const user = userEvent.setup()
    reorderMutateAsync.mockResolvedValueOnce({
      status: 200,
      data: {
        totalRequestedItems: 1,
        addedCount: 1,
        adjustedCount: 0,
        skippedCount: 0,
        adjustedItems: [],
        skippedItems: [],
      },
    })
    renderOrders('/account/orders?tab=DELIVERED')

    const buyAgainButtons = screen.getAllByRole('button', { name: 'Mua lại' })
    await user.click(buyAgainButtons[0])
    expect(screen.getByText('cart-page-target')).toBeTruthy()
  })

  it('hien ReorderResultModal khi Mua lai co san pham bi bo qua', async () => {
    const user = userEvent.setup()
    reorderMutateAsync.mockResolvedValueOnce({
      status: 200,
      data: {
        totalRequestedItems: 1,
        addedCount: 0,
        adjustedCount: 0,
        skippedCount: 1,
        adjustedItems: [],
        skippedItems: [
          {
            productName: 'Váy Lụa Đỏ',
            variantLabel: 'M',
            reason: 'OUT_OF_STOCK',
            requestedQuantity: 1,
            addedQuantity: 0,
          },
        ],
      },
    })
    renderOrders('/account/orders?tab=DELIVERED')
    const buyAgainButtons = screen.getAllByRole('button', { name: 'Mua lại' })
    await user.click(buyAgainButtons[0])
    expect(screen.getByText(/Kết quả mua lại đơn hàng/i)).toBeTruthy()
  })
})
