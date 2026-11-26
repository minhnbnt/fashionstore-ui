// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import SellerVouchersTab from './SellerVouchersTab'

import type { SellerVoucherDetailResponse, SellerVoucherResponse } from '@generated/model'

const {
  canMock,
  isOwnerMock,
  useListSellerVouchersMock,
  useGetSellerVoucherMock,
  createSellerVoucherMutateMock,
  updateSellerVoucherMutateMock,
  toggleSellerVoucherActiveMutateMock,
  deleteSellerVoucherMutateMock,
  useAllShopProductsMock,
  notifySuccessMock,
  notifyErrorMock,
  notifyFromErrorMock,
} = vi.hoisted(() => ({
  canMock: vi.fn<(perm: string) => boolean>(() => true),
  isOwnerMock: vi.fn<() => boolean>(() => true),
  useListSellerVouchersMock: vi.fn(),
  useGetSellerVoucherMock: vi.fn(),
  createSellerVoucherMutateMock: vi.fn(),
  updateSellerVoucherMutateMock: vi.fn(),
  toggleSellerVoucherActiveMutateMock: vi.fn(),
  deleteSellerVoucherMutateMock: vi.fn(),
  useAllShopProductsMock: vi.fn(),
  notifySuccessMock: vi.fn(),
  notifyErrorMock: vi.fn(),
  notifyFromErrorMock: vi.fn(),
}))

vi.mock('@/lib/seller/sellerPermissions', () => ({
  useSellerPermissions: () => ({
    isOwner: isOwnerMock(),
    permissions: ['VOUCHER_READ', 'VOUCHER_WRITE'],
    can: (perm: string) => canMock(perm),
    isLoading: false,
  }),
}))

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: notifySuccessMock,
    error: notifyErrorMock,
    fromError: notifyFromErrorMock,
  },
}))

vi.mock('@/hooks/useAllShopProducts', () => ({
  useAllShopProducts: (shopId: string, enabled: boolean) => useAllShopProductsMock(shopId, enabled),
}))

vi.mock('@generated/endpoints/seller-vouchers/seller-vouchers', () => ({
  getListSellerVouchersQueryKey: (shopId: string, params?: unknown) => [
    `/api/seller/shops/${shopId}/vouchers`,
    params,
  ],
  getGetSellerVoucherQueryKey: (shopId: string, voucherId: string) => [
    `/api/seller/shops/${shopId}/vouchers/${voucherId}`,
  ],
  useListSellerVouchers: (shopId: string, params?: unknown, options?: unknown) =>
    useListSellerVouchersMock(shopId, params, options),
  useGetSellerVoucher: (shopId: string, voucherId: string, options?: unknown) =>
    useGetSellerVoucherMock(shopId, voucherId, options),
  useCreateSellerVoucher: (opts?: {
    mutation?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void },
    ) => {
      createSellerVoucherMutateMock(vars, callOpts)
      callOpts?.onSuccess?.({ status: 201, data: {} })
      opts?.mutation?.onSuccess?.({ status: 201, data: {} })
    },
  }),
  useUpdateSellerVoucher: (opts?: {
    mutation?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void },
    ) => {
      updateSellerVoucherMutateMock(vars, callOpts)
      callOpts?.onSuccess?.({ status: 200, data: {} })
      opts?.mutation?.onSuccess?.({ status: 200, data: {} })
    },
  }),
  useToggleSellerVoucherActive: (opts?: {
    mutation?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void },
    ) => {
      toggleSellerVoucherActiveMutateMock(vars, callOpts)
      callOpts?.onSuccess?.({ status: 200, data: {} })
      opts?.mutation?.onSuccess?.({ status: 200, data: {} })
    },
  }),
  useDeleteSellerVoucher: (opts?: {
    mutation?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void },
    ) => {
      deleteSellerVoucherMutateMock(vars, callOpts)
      callOpts?.onSuccess?.({ status: 204, data: undefined })
      opts?.mutation?.onSuccess?.({ status: 204, data: undefined })
    },
  }),
}))

const mockVouchers: SellerVoucherResponse[] = [
  {
    id: 'v-ongoing',
    shopId: 'shop-1',
    code: 'SUMMER15',
    name: 'Ưu đãi hè rực rỡ',
    description: 'Giảm 15% tối đa 50k',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    maxDiscountAmount: 50000,
    minOrderSubtotal: 200000,
    productScope: 'ALL_PRODUCTS',
    visibility: 'PUBLIC',
    usageLimit: 100,
    usedCount: 5,
    perBuyerLimit: 2,
    startsAt: '2026-11-20T00:00:00Z',
    endsAt: '2026-12-20T00:00:00Z',
    active: true,
    status: 'ONGOING',
    productCount: 0,
  },
  {
    id: 'v-upcoming',
    shopId: 'shop-1',
    code: 'UPCOMING30K',
    name: 'Mừng lương về',
    description: 'Giảm 30k cho đơn từ 150k',
    discountType: 'FIXED_AMOUNT',
    discountValue: 30000,
    maxDiscountAmount: null,
    minOrderSubtotal: 150000,
    productScope: 'SPECIFIC_PRODUCTS',
    visibility: 'PRIVATE',
    usageLimit: 50,
    usedCount: 0,
    perBuyerLimit: 1,
    startsAt: '2026-12-01T00:00:00Z',
    endsAt: '2026-12-10T00:00:00Z',
    active: true,
    status: 'UPCOMING',
    productCount: 3,
  },
  {
    id: 'v-paused',
    shopId: 'shop-1',
    code: 'PAUSED20K',
    name: 'Voucher tạm ngưng',
    description: '',
    discountType: 'FIXED_AMOUNT',
    discountValue: 20000,
    maxDiscountAmount: null,
    minOrderSubtotal: 100000,
    productScope: 'ALL_PRODUCTS',
    visibility: 'PUBLIC',
    usageLimit: 40,
    usedCount: 0,
    perBuyerLimit: 1,
    startsAt: '2026-11-10T00:00:00Z',
    endsAt: '2026-12-10T00:00:00Z',
    active: false,
    status: 'PAUSED',
    productCount: 0,
  },
  {
    id: 'v-depleted',
    shopId: 'shop-1',
    code: 'FULL100',
    name: 'Flash sale hết lượt',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxDiscountAmount: null,
    minOrderSubtotal: 0,
    productScope: 'ALL_PRODUCTS',
    visibility: 'PUBLIC',
    usageLimit: 20,
    usedCount: 20,
    perBuyerLimit: 1,
    startsAt: '2026-11-10T00:00:00Z',
    endsAt: '2026-12-10T00:00:00Z',
    active: true,
    status: 'DEPLETED',
    productCount: 0,
  },
  {
    id: 'v-expired',
    shopId: 'shop-1',
    code: 'OLD10K',
    name: 'Khuyến mãi tháng trước',
    description: '',
    discountType: 'FIXED_AMOUNT',
    discountValue: 10000,
    maxDiscountAmount: null,
    minOrderSubtotal: 50000,
    productScope: 'ALL_PRODUCTS',
    visibility: 'PUBLIC',
    usageLimit: 30,
    usedCount: 12,
    perBuyerLimit: 1,
    startsAt: '2026-10-01T00:00:00Z',
    endsAt: '2026-10-31T00:00:00Z',
    active: true,
    status: 'EXPIRED',
    productCount: 0,
  },
]

const mockUsedVoucherDetail: SellerVoucherDetailResponse = {
  id: 'v-ongoing',
  shopId: 'shop-1',
  code: 'SUMMER15',
  name: 'Ưu đãi hè rực rỡ',
  description: 'Giảm 15% tối đa 50k',
  discountType: 'PERCENTAGE',
  discountValue: 15,
  maxDiscountAmount: 50000,
  minOrderSubtotal: 200000,
  productScope: 'ALL_PRODUCTS',
  visibility: 'PUBLIC',
  usageLimit: 100,
  usedCount: 5,
  perBuyerLimit: 2,
  startsAt: '2026-11-20T00:00:00Z',
  endsAt: '2026-12-20T00:00:00Z',
  active: true,
  status: 'ONGOING',
  productIds: [],
  products: [],
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SellerVouchersTab shopId="shop-1" />
    </QueryClientProvider>,
  )
}

describe('SellerVouchersTab', () => {
  beforeEach(() => {
    canMock.mockReturnValue(true)
    isOwnerMock.mockReturnValue(true)
    useListSellerVouchersMock.mockReturnValue({
      data: {
        status: 200,
        data: {
          items: mockVouchers,
          page: 0,
          size: 20,
          total: mockVouchers.length,
        },
      },
      isPending: false,
      isFetching: false,
      isError: false,
    })
    useGetSellerVoucherMock.mockReturnValue({
      data: {
        status: 200,
        data: mockUsedVoucherDetail,
      },
      isPending: false,
      isFetching: false,
    })
    useAllShopProductsMock.mockReturnValue({
      data: [
        { id: 'prod-1', name: 'Áo sơ mi lụa', minPrice: 250000 },
        { id: 'prod-2', name: 'Quần tây ống suông', minPrice: 350000 },
      ],
      isPending: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders voucher list with status badges, discount summary, usage progress, and visibility badges', () => {
    renderTab()

    // Status badges (also appear in filter tabs, so check at least 1 in rows/cards)
    expect(screen.getAllByText('Đang diễn ra').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Sắp diễn ra').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Tạm dừng').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Hết lượt').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Đã kết thúc').length).toBeGreaterThanOrEqual(2)

    // Filter tabs display voucher counts
    expect(screen.getByRole('button', { name: /Tất cả\s*5/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Đang diễn ra\s*1/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Sắp diễn ra\s*1/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Tạm dừng\s*1/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Hết lượt\s*1/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Đã kết thúc\s*1/i })).toBeTruthy()

    // Discount summaries
    expect(screen.getByText('15% · Tối đa 50.000 ₫')).toBeTruthy()
    expect(screen.getByText('30.000 ₫')).toBeTruthy()

    // Usage progress
    expect(screen.getByText('5 / 100')).toBeTruthy()
    expect(screen.getByText('0 / 50')).toBeTruthy()

    // Visibility badges
    expect(screen.getAllByText('Công khai').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mã ẩn').length).toBeGreaterThan(0)
  })

  it('opens VoucherFormModal on clicking "Tạo mã giảm giá" and calls useCreateSellerVoucher on save', async () => {
    renderTab()

    const createBtn = screen.getByRole('button', { name: 'Tạo mã giảm giá' })
    fireEvent.click(createBtn)

    expect(screen.getByRole('dialog')).toBeTruthy()

    const codeInput = screen.getByLabelText('Mã giảm giá') as HTMLInputElement
    const nameInput = screen.getByLabelText('Tên chương trình')
    const discountValueInput = screen.getByLabelText(/^Mức giảm/)

    // Test "Tạo mã ngẫu nhiên" button generates 8-char alphanumeric code
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã ngẫu nhiên' }))
    expect(codeInput.value).toMatch(/^[A-Z0-9]{8}$/)

    // Override with specific code
    fireEvent.change(codeInput, { target: { value: 'tet2027' } })
    fireEvent.change(nameInput, { target: { value: 'Khuyến mãi Tết 2027' } })
    fireEvent.change(discountValueInput, { target: { value: '50000' } })
    expect((discountValueInput as HTMLInputElement).value).toBe('50.000')

    const saveBtn = screen.getByRole('button', { name: 'Lưu mã giảm giá' })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(createSellerVoucherMutateMock).toHaveBeenCalledTimes(1)
    })

    const callArg = createSellerVoucherMutateMock.mock.calls[0]?.[0] as {
      shopId: string
      data: { code: string; name: string; discountValue: number }
    }
    expect(callArg.shopId).toBe('shop-1')
    expect(callArg.data.code).toBe('TET2027')
    expect(callArg.data.name).toBe('Khuyến mãi Tết 2027')
    expect(callArg.data.discountValue).toBe(50000)
  })

  it('hides/disables Delete button when usedCount > 0 and locks core fields in Edit modal while keeping allowed fields editable', () => {
    renderTab()

    // SUMMER15 has usedCount = 5 -> delete button for SUMMER15 is hidden or disabled
    const deleteUsedBtn = screen.queryByRole('button', { name: 'Xóa mã SUMMER15' })
    if (deleteUsedBtn !== null) {
      expect((deleteUsedBtn as HTMLButtonElement).disabled).toBe(true)
    } else {
      expect(deleteUsedBtn).toBeNull()
    }

    // UPCOMING30K has usedCount = 0 -> delete button is available and enabled
    const deleteUnusedBtn = screen.getByRole('button', { name: 'Xóa mã UPCOMING30K' })
    expect((deleteUnusedBtn as HTMLButtonElement).disabled).toBe(false)

    // Open Edit modal for SUMMER15 (usedCount = 5)
    const editUsedBtn = screen.getByRole('button', { name: 'Chỉnh sửa mã SUMMER15' })
    fireEvent.click(editUsedBtn)

    expect(screen.getByRole('dialog')).toBeTruthy()
    // Info notice explaining why core fields are locked
    expect(screen.getByText(/đã có lượt sử dụng/i)).toBeTruthy()

    // Core fields are disabled
    const codeInput = screen.getByLabelText('Mã giảm giá') as HTMLInputElement
    const discountTypeSelect = screen.getByLabelText('Loại giảm giá') as HTMLSelectElement
    const discountValueInput = screen.getByLabelText(/^Mức giảm/) as HTMLInputElement
    const maxDiscountInput = screen.getByLabelText('Giảm tối đa (₫)') as HTMLInputElement
    const minOrderInput = screen.getByLabelText('Đơn hàng tối thiểu (₫)') as HTMLInputElement
    const productScopeSelect = screen.getByLabelText('Phạm vi sản phẩm') as HTMLSelectElement

    expect(codeInput.disabled).toBe(true)
    expect(discountTypeSelect.disabled).toBe(true)
    expect(discountValueInput.disabled).toBe(true)
    expect(maxDiscountInput.disabled).toBe(true)
    expect(minOrderInput.disabled).toBe(true)
    expect(productScopeSelect.disabled).toBe(true)
    expect(maxDiscountInput.value).toBe('50.000')
    expect(minOrderInput.value).toBe('200.000')

    // Editable fields remain enabled
    const nameInput = screen.getByLabelText('Tên chương trình') as HTMLInputElement
    const descriptionInput = screen.getByLabelText('Mô tả chương trình') as HTMLTextAreaElement
    const visibilitySelect = screen.getByLabelText('Chế độ hiển thị') as HTMLSelectElement
    const usageLimitInput = screen.getByLabelText('Tổng lượt sử dụng tối đa') as HTMLInputElement
    const perBuyerLimitInput = screen.getByLabelText(
      'Giới hạn lượt dùng mỗi khách',
    ) as HTMLInputElement
    const endsAtInput = screen.getByLabelText('Thời gian kết thúc') as HTMLInputElement
    const activeCheckbox = screen.getByLabelText('Kích hoạt mã giảm giá ngay') as HTMLInputElement

    expect(nameInput.disabled).toBe(false)
    expect(descriptionInput.disabled).toBe(false)
    expect(visibilitySelect.disabled).toBe(false)
    expect(usageLimitInput.disabled).toBe(false)
    expect(perBuyerLimitInput.disabled).toBe(false)
    expect(endsAtInput.disabled).toBe(false)
    expect(activeCheckbox.disabled).toBe(false)
  })

  it('toggles voucher active status and deletes unused voucher after ConfirmDialog confirmation', () => {
    renderTab()

    // Toggle active on SUMMER15 (currently active = true)
    const pauseBtn = screen.getByRole('button', { name: 'Tạm dừng mã SUMMER15' })
    fireEvent.click(pauseBtn)

    expect(toggleSellerVoucherActiveMutateMock).toHaveBeenCalledWith(
      {
        shopId: 'shop-1',
        voucherId: 'v-ongoing',
        data: { active: false },
      },
      undefined,
    )

    // Delete unused voucher UPCOMING30K (usedCount = 0)
    const deleteUnusedBtn = screen.getByRole('button', { name: 'Xóa mã UPCOMING30K' })
    fireEvent.click(deleteUnusedBtn)

    // ConfirmDialog opens
    expect(screen.getByText('Xóa mã giảm giá')).toBeTruthy()
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Xóa mã' })
    fireEvent.click(confirmDeleteBtn)

    expect(deleteSellerVoucherMutateMock).toHaveBeenCalledWith(
      {
        shopId: 'shop-1',
        voucherId: 'v-upcoming',
      },
      undefined,
    )
  })
})
