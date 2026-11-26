// @vitest-environment happy-dom
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import AdminPayments from './AdminPayments'

const { mockNotifyWarning, mockNotifyPromise } = vi.hoisted(() => ({
  mockNotifyWarning: vi.fn(),
  mockNotifyPromise: vi.fn(
    (
      promise: Promise<unknown>,
      _messages: { loading: string; success: string; error: (err: unknown) => string },
      _options?: { id?: string },
    ) => promise,
  ),
}))

vi.mock('@generated/endpoints/admin-payments/admin-payments', () => ({
  getListPaymentGatewaysQueryKey: vi.fn(() => ['/api/admin/payment-gateways'] as const),
  getListPaymentTransactionsQueryKey: vi.fn(() => ['/api/admin/payments/transactions'] as const),
  getListAdminWithdrawalsQueryKey: vi.fn(() => ['/api/admin/payments/withdrawals'] as const),
  useListPaymentGateways: vi.fn(),
  useUpdatePaymentGateway: vi.fn(),
  useListPaymentTransactions: vi.fn(),
  useConfirmPaymentTransfer: vi.fn(),
  useMarkTransactionRefunded: vi.fn(),
  useListAdminWithdrawals: vi.fn(),
  useApproveWithdrawal: vi.fn(),
  useRejectWithdrawal: vi.fn(),
}))

vi.mock('@generated/endpoints/banks/banks', () => ({
  getListBanksQueryKey: vi.fn(() => ['/api/public/banks'] as const),
  useListBanks: vi.fn(),
}))

vi.mock('@generated/endpoints/admin-stats/admin-stats', () => ({
  getGetAdminStatsQueryKey: vi.fn(() => ['/api/admin/stats'] as const),
  useGetAdminStats: vi.fn(() => ({
    data: undefined,
    isSuccess: false,
    isPending: false,
    isError: false,
  })),
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: vi.fn(() => ({
    data: {
      user: {
        id: 'admin-1',
        email: 'admin@dhmq.vn',
        app_metadata: { role: 'admin' },
      },
    },
    isLoading: false,
  })),
}))

vi.mock('@/hooks/useAuthMutations', () => ({
  useSignOut: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/components/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />,
}))

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    warning: mockNotifyWarning,
    info: vi.fn(),
    loading: vi.fn(),
    fromError: vi.fn(),
    promise: mockNotifyPromise,
  },
  safeErrorMessage: vi.fn((_err: unknown, _endpoint?: string, fallback?: string) => {
    if (fallback !== undefined) {
      return fallback
    }
    return 'Đã xảy ra lỗi.'
  }),
}))

import {
  useApproveWithdrawal,
  useConfirmPaymentTransfer,
  useListAdminWithdrawals,
  useListPaymentGateways,
  useListPaymentTransactions,
  useMarkTransactionRefunded,
  useRejectWithdrawal,
  useUpdatePaymentGateway,
} from '@generated/endpoints/admin-payments/admin-payments'
import { useListBanks } from '@generated/endpoints/banks/banks'

const MOCK_GATEWAYS = [
  {
    code: 'COD',
    name: 'Thanh toán khi nhận hàng (COD)',
    enabled: true,
    updatedAt: '2026-11-26T08:00:00Z',
  },
  {
    code: 'VIETQR',
    name: 'Chuyển khoản ngân hàng (VietQR)',
    enabled: true,
    bankBin: '970436',
    bankCode: 'VCB',
    bankName: 'Vietcombank',
    accountNumber: '0123456789',
    accountName: 'CONG TY TNHH DHMQ',
    webhookSecretSet: true,
    sandboxMode: true,
    updatedAt: '2026-11-26T08:30:00Z',
  },
]

const MOCK_BANKS = [
  {
    id: 'bank-vcb',
    bin: '970436',
    code: 'VCB',
    shortName: 'Vietcombank',
    name: 'Ngân hàng TMCP Ngoại thương Việt Nam',
  },
  {
    id: 'bank-mb',
    bin: '970422',
    code: 'MB',
    shortName: 'MBBank',
    name: 'Ngân hàng TMCP Quân đội',
  },
]

const MOCK_TRANSACTIONS = [
  {
    id: 'tx-1',
    buyerId: 'buyer-1',
    buyerEmail: 'khach1@dhmq.vn',
    provider: 'VIETQR',
    txnRef: 'DHMQ261126ABCD',
    amount: 450000,
    receivedAmount: 450000,
    status: 'SUCCESS',
    bankCode: 'VCB',
    accountNumber: '0123456789',
    paidAt: '2026-11-26T09:05:00Z',
    refundStatus: 'NONE',
    refundAmount: 0,
    orders: [
      {
        orderId: 'ord-1',
        orderCode: 'DH-101',
        shopName: 'Atelier Saigon',
        total: 450000,
        orderStatus: 'PENDING',
        paymentStatus: 'PAID',
      },
    ],
    createdAt: '2026-11-26T09:00:00Z',
  },
  {
    id: 'tx-2',
    buyerId: 'buyer-2',
    buyerEmail: 'khach2@dhmq.vn',
    provider: 'VIETQR',
    txnRef: 'DHMQ261126RFND',
    amount: 600000,
    receivedAmount: 600000,
    status: 'SUCCESS',
    bankCode: 'VCB',
    accountNumber: '0123456789',
    paidAt: '2026-11-26T09:20:00Z',
    refundStatus: 'PENDING',
    refundAmount: 600000,
    refundReason: 'Đơn hàng #DH-102 bị hủy sau khi đã thanh toán',
    orders: [
      {
        orderId: 'ord-2',
        orderCode: 'DH-102',
        shopName: 'Maison Hanoi',
        total: 600000,
        orderStatus: 'CANCELLED',
        paymentStatus: 'REFUND_PENDING',
      },
    ],
    createdAt: '2026-11-26T09:15:00Z',
  },
  {
    id: 'tx-3',
    buyerId: 'buyer-3',
    buyerEmail: 'khach3@dhmq.vn',
    provider: 'VIETQR',
    txnRef: 'DHMQ261126PEND',
    amount: 500000,
    receivedAmount: 0,
    status: 'PENDING',
    bankCode: 'VCB',
    accountNumber: '0123456789',
    refundStatus: 'NONE',
    refundAmount: 0,
    orders: [
      {
        orderId: 'ord-3',
        orderCode: 'DH-103',
        shopName: 'Atelier Saigon',
        total: 500000,
        orderStatus: 'AWAITING_PAYMENT',
        paymentStatus: 'UNPAID',
      },
    ],
    createdAt: '2026-11-26T09:30:00Z',
  },
]

const MOCK_WITHDRAWALS = [
  {
    id: 'wd-1',
    shopId: 'shop-1',
    shopName: 'Atelier Saigon',
    amount: 2500000,
    bankName: 'Vietcombank',
    bankAccount: '9988776655',
    bankHolder: 'NGUYEN VAN A',
    status: 'REQUESTED',
    createdAt: '2026-11-26T10:00:00Z',
  },
  {
    id: 'wd-2',
    shopId: 'shop-2',
    shopName: 'Maison Hanoi',
    amount: 1200000,
    bankName: 'MBBank',
    bankAccount: '1122334455',
    bankHolder: 'TRAN THI B',
    status: 'COMPLETED',
    createdAt: '2026-11-25T15:00:00Z',
    processedAt: '2026-11-25T16:00:00Z',
  },
]

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/payments']}>
        <AdminPayments />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminPayments', () => {
  const updateGatewayMutateAsync = vi.fn()
  const confirmTransferMutateAsync = vi.fn()
  const markRefundedMutateAsync = vi.fn()
  const approveWithdrawalMutateAsync = vi.fn()
  const rejectWithdrawalMutateAsync = vi.fn()

  beforeEach(function () {
    vi.clearAllMocks()

    updateGatewayMutateAsync.mockResolvedValue({
      status: 200,
      data: MOCK_GATEWAYS[1],
    })
    confirmTransferMutateAsync.mockResolvedValue({
      status: 200,
      data: {
        ...MOCK_TRANSACTIONS[2],
        status: 'SUCCESS',
        receivedAmount: 500000,
      },
    })
    markRefundedMutateAsync.mockResolvedValue({
      status: 200,
      data: {
        ...MOCK_TRANSACTIONS[1],
        refundStatus: 'REFUNDED',
      },
    })
    approveWithdrawalMutateAsync.mockResolvedValue({
      status: 200,
      data: {
        ...MOCK_WITHDRAWALS[0],
        status: 'COMPLETED',
      },
    })
    rejectWithdrawalMutateAsync.mockResolvedValue({
      status: 200,
      data: {
        ...MOCK_WITHDRAWALS[0],
        status: 'REJECTED',
      },
    })

    vi.mocked(useListPaymentGateways).mockReturnValue({
      data: {
        status: 200,
        data: MOCK_GATEWAYS,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useListPaymentGateways>)

    vi.mocked(useListBanks).mockReturnValue({
      data: {
        status: 200,
        data: MOCK_BANKS,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useListBanks>)

    vi.mocked(useUpdatePaymentGateway).mockReturnValue({
      mutateAsync: updateGatewayMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdatePaymentGateway>)

    vi.mocked(useListPaymentTransactions).mockReturnValue({
      data: {
        status: 200,
        data: {
          items: MOCK_TRANSACTIONS,
          total: MOCK_TRANSACTIONS.length,
          page: 0,
          size: 15,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useListPaymentTransactions>)

    vi.mocked(useConfirmPaymentTransfer).mockReturnValue({
      mutateAsync: confirmTransferMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useConfirmPaymentTransfer>)

    vi.mocked(useMarkTransactionRefunded).mockReturnValue({
      mutateAsync: markRefundedMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useMarkTransactionRefunded>)

    vi.mocked(useListAdminWithdrawals).mockReturnValue({
      data: {
        status: 200,
        data: {
          items: MOCK_WITHDRAWALS,
          total: MOCK_WITHDRAWALS.length,
          page: 0,
          size: 15,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useListAdminWithdrawals>)

    vi.mocked(useApproveWithdrawal).mockReturnValue({
      mutateAsync: approveWithdrawalMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useApproveWithdrawal>)

    vi.mocked(useRejectWithdrawal).mockReturnValue({
      mutateAsync: rejectWithdrawalMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRejectWithdrawal>)
  })

  afterEach(function () {
    cleanup()
  })

  it('hiển thị cấu hình COD và VIETQR trên tab Cổng thanh toán và gọi updatePaymentGateway khi lưu', async function () {
    renderPage()

    expect(screen.getByText('Thanh toán khi nhận hàng (COD)')).toBeTruthy()
    expect(screen.getByText('Chuyển khoản ngân hàng (VietQR)')).toBeTruthy()

    const bankSelect = screen.getByLabelText('Ngân hàng nhận tiền (NAPAS)') as HTMLSelectElement
    const accountNumberInput = screen.getByLabelText('Số tài khoản nhận tiền') as HTMLInputElement
    const accountNameInput = screen.getByLabelText('Tên chủ tài khoản') as HTMLInputElement
    const webhookSecretInput = screen.getByLabelText('Webhook Secret') as HTMLInputElement
    const sandboxSwitch = screen.getByRole('switch', { name: 'Chế độ Demo Sandbox' })

    expect(bankSelect.value).toBe('970436')
    expect(accountNumberInput.value).toBe('0123456789')
    expect(accountNameInput.value).toBe('CONG TY TNHH DHMQ')
    expect(webhookSecretInput.placeholder).toBe('Đã thiết lập — để trống nếu giữ nguyên')
    expect(sandboxSwitch.getAttribute('aria-checked')).toBe('true')

    fireEvent.change(bankSelect, { target: { value: '970422' } })
    fireEvent.change(accountNumberInput, { target: { value: '9999888877' } })
    fireEvent.change(accountNameInput, { target: { value: 'CONG TY CP DHMQ' } })
    fireEvent.change(webhookSecretInput, { target: { value: 'secret-2026' } })
    fireEvent.click(sandboxSwitch)

    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình VietQR' }))

    await waitFor(function () {
      expect(updateGatewayMutateAsync).toHaveBeenCalledTimes(1)
    })

    expect(updateGatewayMutateAsync).toHaveBeenCalledWith({
      code: 'VIETQR',
      data: {
        enabled: true,
        bankBin: '970422',
        accountNumber: '9999888877',
        accountName: 'CONG TY CP DHMQ',
        webhookSecret: 'secret-2026',
        sandboxMode: false,
      },
    })
  })

  it('hiển thị danh sách giao dịch, hỗ trợ Admin xác nhận nhận tiền VietQR và đánh dấu hoàn tiền', async function () {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Giao dịch & Hoàn tiền' }))

    expect(screen.getAllByText('DHMQ261126ABCD').length).toBeGreaterThan(0)
    expect(screen.getAllByText('DHMQ261126RFND').length).toBeGreaterThan(0)
    expect(screen.getAllByText('DHMQ261126PEND').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Đơn hàng #DH-102 bị hủy sau khi đã thanh toán').length,
    ).toBeGreaterThan(0)

    const needRefundBtn = screen.getByRole('button', { name: /Cần hoàn tiền/i })
    fireEvent.click(needRefundBtn)

    expect(useListPaymentTransactions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        refundStatus: 'PENDING',
        page: 0,
      }),
    )

    const markRefundBtns = screen.getAllByRole('button', { name: 'Đánh dấu đã hoàn tiền' })
    expect(markRefundBtns.length).toBeGreaterThan(0)
    fireEvent.click(markRefundBtns[0])

    expect(screen.getByRole('heading', { name: 'Xác nhận đã hoàn tiền cho khách' })).toBeTruthy()

    const noteTextarea = screen.getByLabelText('Ghi chú đối soát hoàn tiền')
    fireEvent.change(noteTextarea, { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đã hoàn tiền' }))

    expect(mockNotifyWarning).toHaveBeenCalled()
    expect(markRefundedMutateAsync).not.toHaveBeenCalled()

    fireEvent.change(noteTextarea, {
      target: { value: 'Đã chuyển khoản hoàn tiền qua Vietcombank mã GD 889900' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đã hoàn tiền' }))

    await waitFor(function () {
      expect(markRefundedMutateAsync).toHaveBeenCalledTimes(1)
    })

    expect(markRefundedMutateAsync).toHaveBeenCalledWith({
      id: 'tx-2',
      data: {
        note: 'Đã chuyển khoản hoàn tiền qua Vietcombank mã GD 889900',
      },
    })

    const confirmTransferBtns = screen.getAllByRole('button', { name: 'Xác nhận nhận tiền' })
    expect(confirmTransferBtns.length).toBeGreaterThan(0)
    fireEvent.click(confirmTransferBtns[0])

    expect(
      screen.getByRole('heading', { name: 'Xác nhận nhận tiền chuyển khoản VietQR' }),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Giả lập chuyển thiếu 50%/i }))
    const amountInput = screen.getByLabelText('Số tiền thực nhận (VNĐ)') as HTMLInputElement
    expect(amountInput.value).toBe('250000')

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đã nhận tiền' }))

    await waitFor(function () {
      expect(confirmTransferMutateAsync).toHaveBeenCalledWith({
        id: 'tx-3',
        data: { amount: 250000 },
      })
    })
  })

  it('hiển thị danh sách yêu cầu rút tiền của Shop và hỗ trợ Duyệt đã chuyển khoản hoặc Từ chối', async function () {
    renderPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Yêu cầu rút tiền Shop' }))

    expect(screen.getAllByText('Atelier Saigon').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Maison Hanoi').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/9988776655/).length).toBeGreaterThan(0)

    const approveBtns = screen.getAllByRole('button', { name: 'Duyệt đã chuyển khoản' })
    expect(approveBtns.length).toBeGreaterThan(0)
    fireEvent.click(approveBtns[0])

    await waitFor(function () {
      expect(approveWithdrawalMutateAsync).toHaveBeenCalledWith({ id: 'wd-1' })
    })

    const rejectBtns = screen.getAllByRole('button', { name: 'Từ chối' })
    expect(rejectBtns.length).toBeGreaterThan(0)
    fireEvent.click(rejectBtns[0])

    await waitFor(function () {
      expect(rejectWithdrawalMutateAsync).toHaveBeenCalledWith({ id: 'wd-1' })
    })
  })
})
