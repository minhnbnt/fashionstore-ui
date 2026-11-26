import { MemoryRouter, Route, Routes } from 'react-router'

// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import VietQrPayment from './VietQrPayment'

import type { SimulateVietQrRequest } from '@generated/model/simulateVietQrRequest'
import type { VietQrSessionResponse } from '@generated/model/vietQrSessionResponse'

const { sessionState, mockUseGetVietQrSession, simulateMutate, mockNotifySuccess } = vi.hoisted(
  () => ({
    sessionState: {
      value: null as VietQrSessionResponse | null,
      isLoading: false,
      isError: false,
    },
    mockUseGetVietQrSession: vi.fn(),
    simulateMutate: vi.fn<
      (
        variables: { txnRef: string; data?: SimulateVietQrRequest },
        options?: {
          onSuccess?: (res: { status: 200; data: VietQrSessionResponse; headers: Headers }) => void
          onError?: (err: unknown) => void
        },
      ) => void
    >(),
    mockNotifySuccess: vi.fn(),
  }),
)

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: mockNotifySuccess,
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    fromError: vi.fn(),
  },
}))

vi.mock('@generated/endpoints/payments-vietqr/payments-vietqr', () => ({
  getGetVietQrSessionQueryKey: (txnRef: string) => [`/api/payments/vietqr/${txnRef}`],
  useGetVietQrSession: mockUseGetVietQrSession,
  useSimulateVietQrTransfer: () => ({
    mutate: simulateMutate,
    isPending: false,
  }),
}))

vi.mock('@generated/endpoints/orders/orders', () => ({
  getMine3QueryKey: () => ['/api/orders/mine'],
}))

function sampleSession(overrides: Partial<VietQrSessionResponse> = {}): VietQrSessionResponse {
  return {
    transactionId: 'tx-1',
    txnRef: 'DHMQ9988776655',
    status: 'PENDING',
    amount: 748000,
    receivedAmount: 0,
    bankBin: '970422',
    bankCode: 'MB',
    bankName: 'Ngân hàng TMCP Quân Đội (MB Bank)',
    accountNumber: '0123456789',
    accountName: 'CONG TY TNHH THOI TRANG DHMQ',
    qrImageUrl:
      'https://img.vietqr.io/image/970422-0123456789-compact2.png?amount=748000&addInfo=DHMQ9988776655',
    expiresAt: '2026-11-26T12:15:00Z',
    sandboxMode: false,
    orders: [
      {
        orderId: 'o-1',
        orderCode: 'ORD-QR-01',
        shopId: 'shop-1',
        shopName: 'Shop Alpha',
        total: 748000,
        orderStatus: 'AWAITING_PAYMENT',
        paymentStatus: 'UNPAID',
      },
    ],
    ...overrides,
  }
}

function renderVietQrPayment(txnRef = 'DHMQ9988776655') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/payment/qr/${txnRef}`]}>
        <Routes>
          <Route path="/payment/qr/:txnRef" element={<VietQrPayment />} />
          <Route path="/account/orders" element={<p>orders-page-target</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  sessionState.value = sampleSession()
  sessionState.isLoading = false
  sessionState.isError = false
  simulateMutate.mockReset()
  mockNotifySuccess.mockReset()
  mockUseGetVietQrSession.mockReset()
  mockUseGetVietQrSession.mockImplementation(() => {
    let data = undefined
    if (sessionState.value !== null) {
      data = { status: 200, data: sessionState.value }
    }
    return {
      data,
      isLoading: sessionState.isLoading,
      isError: sessionState.isError,
    }
  })
})

afterEach(() => {
  cleanup()
})

describe('VietQrPayment (/payment/qr/:txnRef)', () => {
  it('hiển thị ảnh QR, thông tin tài khoản nhận tiền, số tiền, nội dung chuyển khoản và danh sách đơn hàng', () => {
    renderVietQrPayment()

    const qrImg = screen.getByRole('img', { name: 'Mã VietQR thanh toán' }) as HTMLImageElement
    expect(qrImg.src).toContain('img.vietqr.io')
    expect(screen.getByText('Ngân hàng TMCP Quân Đội (MB Bank)')).toBeTruthy()
    expect(screen.getByText('CONG TY TNHH THOI TRANG DHMQ')).toBeTruthy()
    expect(screen.getByText('0123456789')).toBeTruthy()
    expect(screen.getAllByText('DHMQ9988776655').length).toBeGreaterThan(0)
    expect(screen.getAllByText('748.000 ₫').length).toBeGreaterThan(0)
    expect(screen.getByText('ORD-QR-01')).toBeTruthy()
    expect(screen.getByText('Shop Alpha')).toBeTruthy()
    expect(screen.queryByText('Công cụ Demo Sandbox')).toBeNull()
  })

  it('khi sandboxMode === true hiển thị Công cụ Demo Sandbox, bấm giả lập đủ tiền gọi simulateVietQrTransfer và hiện Thanh toán thành công!', async () => {
    const user = userEvent.setup()
    sessionState.value = sampleSession({ sandboxMode: true })
    simulateMutate.mockImplementation((_variables, options) => {
      options?.onSuccess?.({
        status: 200,
        data: sampleSession({
          sandboxMode: true,
          status: 'SUCCESS',
          receivedAmount: 748000,
          paidAt: '2026-11-26T12:05:00Z',
        }),
        headers: new Headers(),
      })
    })

    renderVietQrPayment()

    expect(screen.getByText('Công cụ Demo Sandbox')).toBeTruthy()
    const fullBtn = screen.getByRole('button', {
      name: 'Giả lập ngân hàng báo đã nhận đủ tiền',
    })
    expect(screen.getByRole('button', { name: 'Giả lập chuyển thiếu tiền (50%)' })).toBeTruthy()

    await user.click(fullBtn)

    expect(simulateMutate).toHaveBeenCalledTimes(1)
    expect(simulateMutate.mock.calls[0]?.[0]).toEqual({
      txnRef: 'DHMQ9988776655',
      data: { amount: 748000 },
    })
    expect(screen.getByText('Thanh toán thành công!')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Xem đơn hàng của tôi' }).getAttribute('href')).toBe(
      '/account/orders',
    )
  })

  it('bấm giả lập chuyển thiếu tiền (50%) gọi simulateVietQrTransfer với 50% số tiền và hiện cảnh báo UNDERPAID', async () => {
    const user = userEvent.setup()
    sessionState.value = sampleSession({ sandboxMode: true })
    simulateMutate.mockImplementation((_variables, options) => {
      options?.onSuccess?.({
        status: 200,
        data: sampleSession({
          sandboxMode: true,
          status: 'UNDERPAID',
          receivedAmount: 374000,
          refundStatus: 'PENDING',
          refundAmount: 374000,
        }),
        headers: new Headers(),
      })
    })

    renderVietQrPayment()

    await user.click(screen.getByRole('button', { name: 'Giả lập chuyển thiếu tiền (50%)' }))

    expect(simulateMutate).toHaveBeenCalledTimes(1)
    expect(simulateMutate.mock.calls[0]?.[0]).toEqual({
      txnRef: 'DHMQ9988776655',
      data: { amount: 374000 },
    })
    expect(screen.getByText(/Hệ thống ghi nhận bạn đã chuyển thiếu tiền/i)).toBeTruthy()
    expect(screen.getAllByText(/374\.000 ₫/).length).toBeGreaterThan(0)
  })
})
