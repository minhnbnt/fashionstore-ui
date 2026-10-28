import { MemoryRouter, Route, Routes } from 'react-router'

// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Checkout from './Checkout'

import type { AddressResponse } from '@generated/model/addressResponse'
import type { CartCheckoutRequest } from '@generated/model/cartCheckoutRequest'
import type { CartItemResponse } from '@generated/model/cartItemResponse'

const { checkoutMutate, mockUseList1, state } = vi.hoisted(() => ({
  checkoutMutate:
    vi.fn<
      (
        variables: { data: CartCheckoutRequest },
        options?: { onSuccess: () => void; onError: () => void },
      ) => void
    >(),
  mockUseList1: vi.fn(),
  state: {
    isLoggedIn: true,
    items: [] as CartItemResponse[],
  },
}))

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    isLoggedIn: state.isLoggedIn,
    items: state.items,
    totalQuantity: 0,
    checkout: { mutate: checkoutMutate, isPending: false },
  }),
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({
    data: { user: { email: 'buyer@test.vn' } },
  }),
}))

vi.mock('@generated/endpoints/addresses/addresses', () => ({
  useList1: mockUseList1,
}))

function addresses(): AddressResponse[] {
  return [
    {
      id: 'addr-1',
      recipientName: 'Nguyễn Văn A',
      phoneNumber: '0901112222',
      fullAddress: '123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM',
      label: 'HOME',
      defaultAddress: true,
    },
    {
      id: 'addr-2',
      recipientName: 'Trần Thị B',
      phoneNumber: '0903334444',
      fullAddress: '456 Nguyễn Huệ, P.1, Q.1, TP.HCM',
      label: 'OFFICE',
      defaultAddress: false,
    },
  ]
}

function cartItems(): CartItemResponse[] {
  return [
    {
      variantId: 'v-1',
      productId: 'p-1',
      productName: 'Áo Sơ Mi Lụa',
      variantLabel: 'M / Đen',
      unitPrice: 199000,
      quantity: 2,
    },
    {
      variantId: 'v-2',
      productId: 'p-2',
      productName: 'Quần Jeans',
      variantLabel: 'L / Xanh',
      unitPrice: 350000,
      quantity: 1,
    },
  ]
}

function renderCheckout(initialEntry = '/checkout') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/account/orders" element={<p>orders-page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

beforeEach(() => {
  checkoutMutate.mockReset()
  mockUseList1.mockReset()
  mockUseList1.mockReturnValue({ data: { status: 200, data: addresses() } })
  state.isLoggedIn = true
  state.items = cartItems()
})

describe('Checkout — đặt hàng COD (DOM)', () => {
  it('chưa đăng nhập → chặn bằng màn hình yêu cầu đăng nhập', () => {
    state.isLoggedIn = false
    renderCheckout()

    expect(screen.getByText('Vui lòng đăng nhập để tiến hành đặt hàng.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Đăng Nhập Ngay' }).getAttribute('href')).toBe('/login')
  })

  it('không có món nào để thanh toán → màn hình rỗng kèm link về giỏ', () => {
    state.items = []
    renderCheckout()

    expect(screen.getByText('Không có sản phẩm để thanh toán')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Về Giỏ Hàng' }).getAttribute('href')).toBe('/cart')
  })

  it('render đầy đủ: món hàng, địa chỉ mặc định, miễn phí ship khi đạt 500k', () => {
    renderCheckout()

    expect(screen.getByText('Thanh Toán')).toBeTruthy()
    expect(screen.getByText('Sản Phẩm Đặt Mua (2)')).toBeTruthy()
    expect(screen.getByText('Áo Sơ Mi Lụa')).toBeTruthy()
    expect(screen.getByText('M / Đen × 2')).toBeTruthy()
    // Địa chỉ mặc định được chọn sẵn
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy()
    expect(screen.getByText('0901112222')).toBeTruthy()
    expect(screen.getByText('Nhà riêng')).toBeTruthy()
    expect(screen.getByText('Mặc định')).toBeTruthy()
    expect(screen.getByText('123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM')).toBeTruthy()
    // 748.000 ≥ 500.000 → miễn phí ship; tổng tiền hàng và tổng thanh toán đều 748.000
    expect(screen.getAllByText('Miễn phí')).toHaveLength(2)
    expect(screen.getAllByText('748.000 ₫')).toHaveLength(2)
  })

  it('?variantIds= lọc đúng món, phí ship tính trên phần được chọn', () => {
    renderCheckout('/checkout?variantIds=v-2')

    expect(screen.getByText('Sản Phẩm Đặt Mua (1)')).toBeTruthy()
    expect(screen.getByText('Quần Jeans')).toBeTruthy()
    expect(screen.queryByText('Áo Sơ Mi Lụa')).toBeNull()
    // 350.000 < 500.000 → phí 30.000, tổng 380.000
    expect(screen.getAllByText('30.000 ₫')).toHaveLength(2)
    expect(screen.getByText('380.000 ₫')).toBeTruthy()
  })

  it('đặt hàng thành công → payload đúng thông tin giao hàng, điều hướng sang đơn hàng', async () => {
    checkoutMutate.mockImplementation((_variables, options) => {
      options?.onSuccess()
    })
    const user = userEvent.setup()
    renderCheckout()

    await user.click(screen.getByRole('button', { name: 'Đặt Hàng (COD)' }))

    expect(checkoutMutate).toHaveBeenCalledTimes(1)
    const payload = checkoutMutate.mock.calls[0]?.[0]?.data
    expect(payload).toEqual({
      shippingName: 'Nguyễn Văn A',
      shippingPhone: '0901112222',
      shippingAddress: '123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM',
      shippingFee: 0,
    })
    expect(screen.getByText('orders-page')).toBeTruthy()
  })

  it('đặt hàng lỗi → hiện toast xin thử lại', async () => {
    checkoutMutate.mockImplementation((_variables, options) => {
      options?.onError()
    })
    const user = userEvent.setup()
    renderCheckout()

    await user.click(screen.getByRole('button', { name: 'Đặt Hàng (COD)' }))

    expect(screen.getByText('Không thể hoàn tất đặt hàng. Vui lòng thử lại.')).toBeTruthy()
  })

  it('chưa có địa chỉ nào → nút đặt hàng khoá, hiện khối nhắc thêm địa chỉ', () => {
    mockUseList1.mockReturnValue({ data: { status: 200, data: [] } })
    renderCheckout()

    expect(screen.getByText('Bạn chưa có địa chỉ nhận hàng nào trong sổ địa chỉ.')).toBeTruthy()
    const placeOrder = screen.getByRole('button', { name: 'Đặt Hàng (COD)' }) as HTMLButtonElement
    expect(placeOrder.disabled).toBe(true)
  })

  it('Thay Đổi → picker địa chỉ → chọn địa chỉ khác thì khối hiển thị đổi theo', async () => {
    const user = userEvent.setup()
    renderCheckout()

    await user.click(screen.getByRole('button', { name: 'Thay Đổi' }))
    expect(screen.getByText('Chọn Địa Chỉ Nhận Hàng')).toBeTruthy()

    await user.click(screen.getByText('Trần Thị B'))

    expect(screen.queryByText('Chọn Địa Chỉ Nhận Hàng')).toBeNull()
    expect(screen.getByText('Trần Thị B')).toBeTruthy()
    expect(screen.getByText('Công ty')).toBeTruthy()
    // Địa chỉ mới chọn không phải mặc định → badge biến mất
    expect(screen.queryByText('Mặc định')).toBeNull()
  })

  it('địa chỉ thiếu tên/SĐT/địa chỉ → dùng email tài khoản, SĐT và địa chỉ mặc định dự phòng', async () => {
    mockUseList1.mockReturnValue({
      data: { status: 200, data: [{ id: 'addr-3', defaultAddress: true }] },
    })
    checkoutMutate.mockImplementation((_variables, options) => {
      options?.onSuccess()
    })
    const user = userEvent.setup()
    renderCheckout()

    expect(screen.getByText('buyer@test.vn')).toBeTruthy()
    expect(screen.getByText('Chưa có SĐT')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Đặt Hàng (COD)' }))

    const payload = checkoutMutate.mock.calls[0]?.[0]?.data
    expect(payload).toEqual({
      shippingName: 'buyer@test.vn',
      shippingPhone: '0900000000',
      shippingAddress: 'Địa chỉ giao hàng mặc định',
      shippingFee: 0,
    })
  })
})
