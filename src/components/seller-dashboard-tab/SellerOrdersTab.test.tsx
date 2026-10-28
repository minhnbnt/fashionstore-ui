import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vite-plus/test'

import SellerOrdersTab from './SellerOrdersTab'

import type { OrderResponse } from '@generated/model/orderResponse'

const mockOrders: OrderResponse[] = [
  {
    id: 'order-1',
    code: 'ORD-AAA111',
    shopId: 'shop-1',
    buyerId: 'buyer-1',
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    paymentMethod: 'COD',
    subtotal: 100000,
    shippingFee: 20000,
    total: 120000,
    shippingName: 'Nguyen Van A',
    shippingPhone: '0901234567',
    shippingAddress: '123 Le Loi, TP.HCM',
    createdAt: '2026-10-26T10:00:00Z',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        variantId: 'var-1',
        productName: 'Ao Polo Nam Phong Cach',
        variantLabel: 'Trang / L',
        sku: 'POLO-WHT-L',
        unitPrice: 100000,
        quantity: 1,
        lineTotal: 100000,
      },
    ],
  },
  {
    id: 'order-2',
    code: 'ORD-BBB222',
    shopId: 'shop-1',
    buyerId: 'buyer-2',
    status: 'CONFIRMED',
    paymentStatus: 'UNPAID',
    paymentMethod: 'COD',
    subtotal: 250000,
    shippingFee: 30000,
    total: 280000,
    shippingName: 'Tran Thi B',
    shippingPhone: '0907654321',
    shippingAddress: '456 Tran Phu, Da Nang',
    createdAt: '2026-10-26T11:00:00Z',
    items: [
      {
        id: 'item-2',
        productId: 'prod-2',
        variantId: 'var-2',
        productName: 'Quan Jean Nu Slimfit',
        variantLabel: 'Xanh / M',
        sku: 'JEAN-BLU-M',
        unitPrice: 250000,
        quantity: 1,
        lineTotal: 250000,
      },
    ],
  },
]

vi.mock('@generated/endpoints/seller-orders/seller-orders', () => ({
  getList5QueryKey: vi.fn(() => ['list5']),
  useList5: vi.fn(() => ({
    data: { status: 200, data: mockOrders },
    isLoading: false,
  })),
  useConfirm: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useBulkConfirm: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useShip: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeliver: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCancel: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useTimeline: vi.fn(() => ({ data: { status: 200, data: [] }, isLoading: false })),
}))

vi.mock('@generated/endpoints/seller-returns/seller-returns', () => ({
  useList4: vi.fn(() => ({
    data: { status: 200, data: [] },
    isLoading: false,
  })),
}))

vi.mock('@generated/endpoints/seller-products-inventory/seller-products-inventory', () => ({
  getInventoryQueryKey: vi.fn(() => ['inventory']),
}))

vi.mock('@/lib/sellerPermissions', () => ({
  useSellerPermissions: vi.fn(() => ({
    can: () => true,
    isOwner: true,
  })),
}))

describe('SellerOrdersTab', () => {
  it('rendersAllOrdersAndStatusTabsWhenNoOrderId', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ['/shop?tab=orders'] },
          createElement(SellerOrdersTab, { shopId: 'shop-1' }),
        ),
      ),
    )

    expect(html).toContain('Quản lý Đơn hàng')
    expect(html).toContain('Tất cả')
    expect(html).toContain('Chờ xác nhận')
    expect(html).toContain('Đang chuẩn bị')
    expect(html).toContain('Đã giao cho ĐVVC')
    expect(html).toContain('Hoàn thành')
    expect(html).toContain('Đã hủy')
    expect(html).toContain('Đổi trả')
    expect(html).toContain('ORD-AAA111')
    expect(html).toContain('Ao Polo Nam Phong Cach')
    expect(html).toContain('ORD-BBB222')
    expect(html).toContain('Quan Jean Nu Slimfit')
  })

  it('rendersOnlySingleOrderAndNoOtherOrdersWhenOrderIdProvided', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ['/shop?tab=orders&orderId=order-1'] },
          createElement(SellerOrdersTab, { shopId: 'shop-1' }),
        ),
      ),
    )

    expect(html).toContain('Chi tiết đơn hàng')
    expect(html).toContain('Tất cả đơn hàng')
    expect(html).toContain('ORD-AAA111')
    expect(html).toContain('Ao Polo Nam Phong Cach')
    expect(html).not.toContain('ORD-BBB222')
    expect(html).not.toContain('Quan Jean Nu Slimfit')
    expect(html).not.toContain('Đang chuẩn bị')
  })

  it('rendersSlaCountdownBadgeForPendingOrder', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ['/shop?tab=orders&status=PENDING'] },
          createElement(SellerOrdersTab, { shopId: 'shop-1' }),
        ),
      ),
    )

    expect(html).toContain('ORD-AAA111')
    // Sla countdown badge is rendered (either "Còn..." or "Đã quá hạn")
    expect(html).toMatch(/(Còn|Đã quá hạn)/)
  })
})
