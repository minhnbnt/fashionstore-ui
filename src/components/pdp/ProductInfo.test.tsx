import { MemoryRouter } from 'react-router'

// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import ProductInfo from './ProductInfo'

import type { ProductResponse } from '@generated/model/productResponse'

const { addItemMutate, mockNotifySuccess, mockNotifyWarning, mockNotifyInfo, mockNotifyFromError } =
  vi.hoisted(() => ({
    addItemMutate:
      vi.fn<
        (
          variables: unknown,
          options: { onSuccess: () => void; onError: (err: unknown) => void },
        ) => void
      >(),
    mockNotifySuccess: vi.fn(),
    mockNotifyWarning: vi.fn(),
    mockNotifyInfo: vi.fn(),
    mockNotifyFromError: vi.fn(),
  }))

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: mockNotifySuccess,
    warning: mockNotifyWarning,
    info: mockNotifyInfo,
    fromError: mockNotifyFromError,
    error: vi.fn(),
  },
}))

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    isLoggedIn: true,
    addItem: { mutate: addItemMutate, isPending: false },
  }),
}))

vi.mock('@/hooks/useWishlist', () => ({
  useWishlist: () => ({
    isLoggedIn: true,
    isFavorited: () => false,
    toggle: { mutate: vi.fn(), isPending: false },
  }),
}))

// ProductInfo giờ render ReportProductButton — mock session (chưa đăng nhập) + endpoint report
vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({ data: null }),
}))

vi.mock('@generated/endpoints/product-reports/product-reports', () => ({
  useReportProduct: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}))

function makeProduct(overrides?: Partial<ProductResponse>): ProductResponse {
  return {
    id: 'p-1',
    name: 'Áo Sơ Mi Lụa',
    description: 'Áo sơ mi lụa tơ tằm thêu tay',
    variants: [
      { id: 'v-1', color: 'Đen', size: 'M', price: 199000, stockQuantity: 5 },
      { id: 'v-2', color: 'Đen', size: 'L', price: 210000, stockQuantity: 3 },
      { id: 'v-3', color: 'Trắng', size: 'M', price: 199000, stockQuantity: 0 },
    ],
    ...overrides,
  }
}

function renderInfo(product: ProductResponse) {
  return render(
    <MemoryRouter>
      <ProductInfo product={product} />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

beforeEach(() => {
  addItemMutate.mockReset()
  mockNotifySuccess.mockReset()
  mockNotifyWarning.mockReset()
  mockNotifyInfo.mockReset()
  mockNotifyFromError.mockReset()
})

describe('ProductInfo — chọn variant và thêm giỏ (DOM)', () => {
  it('chọn đủ màu + size rồi thêm giỏ → addItem nhận đúng variantId + quantity, gọi notify.success', async () => {
    addItemMutate.mockImplementation((_variables, options) => {
      options.onSuccess()
    })
    const user = userEvent.setup()
    renderInfo(makeProduct())

    await user.click(screen.getByRole('button', { name: 'Đen' }))
    await user.click(screen.getByRole('button', { name: 'M' }))
    await user.click(screen.getByRole('button', { name: 'Tăng' }))
    await user.click(screen.getByRole('button', { name: 'Thêm giỏ' }))

    expect(addItemMutate).toHaveBeenCalledTimes(1)
    const variables = addItemMutate.mock.calls[0]?.[0]
    expect(variables).toEqual({ data: { variantId: 'v-1', quantity: 2 } })
    expect(mockNotifySuccess).toHaveBeenCalledWith('Đã thêm vào giỏ hàng', '2 × Áo Sơ Mi Lụa')
  })

  it('thiếu lựa chọn variant → gọi notify.warning, không gọi addItem', async () => {
    const user = userEvent.setup()
    renderInfo(makeProduct())

    await user.click(screen.getByRole('button', { name: 'Thêm giỏ' }))

    expect(mockNotifyWarning).toHaveBeenCalledWith('Vui lòng chọn màu sắc và kích cỡ')
    expect(addItemMutate).not.toHaveBeenCalled()
  })

  it('thêm giỏ lỗi → gọi notify.fromError', async () => {
    const err = new Error('boom')
    addItemMutate.mockImplementation((_variables, options) => {
      options.onError(err)
    })
    const user = userEvent.setup()
    renderInfo(makeProduct())

    await user.click(screen.getByRole('button', { name: 'Đen' }))
    await user.click(screen.getByRole('button', { name: 'M' }))
    await user.click(screen.getByRole('button', { name: 'Thêm giỏ' }))

    expect(mockNotifyFromError).toHaveBeenCalledWith(err, 'cart', 'Không thêm được vào giỏ hàng')
  })

  it('màu hết hàng → nút disabled kèm chú thích', () => {
    renderInfo(makeProduct())

    const white = screen.getByRole('button', { name: 'Trắng' }) as HTMLButtonElement
    expect(white.disabled).toBe(true)
    expect(white.getAttribute('title')).toBe('Hết hàng với lựa chọn hiện tại')
  })

  it('sản phẩm hết hàng hoàn toàn → hiện Hết hàng, không có nút thêm giỏ', () => {
    renderInfo(
      makeProduct({
        variants: [{ id: 'v-9', color: 'Đen', size: 'M', price: 199000, stockQuantity: 0 }],
      }),
    )

    expect(screen.getByText('Hết hàng')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Thêm giỏ' })).toBeNull()
  })
})
