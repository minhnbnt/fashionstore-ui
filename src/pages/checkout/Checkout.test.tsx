import { MemoryRouter, Route, Routes } from 'react-router'

// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import Checkout from './Checkout'

import type { AddressResponse } from '@generated/model/addressResponse'
import type { CartCheckoutRequest } from '@generated/model/cartCheckoutRequest'
import type { CartItemResponse } from '@generated/model/cartItemResponse'
import type { CheckoutPreviewResponse } from '@generated/model/checkoutPreviewResponse'
import type { ShopCheckoutPreview } from '@generated/model/shopCheckoutPreview'

const {
  checkoutMutate,
  mockUseList1,
  mockUseCheckoutPreview,
  mockNotifySuccess,
  mockNotifyWarning,
  mockNotifyFromError,
  state,
} = vi.hoisted(() => ({
  checkoutMutate:
    vi.fn<
      (
        variables: { data: CartCheckoutRequest },
        options?: { onSuccess: () => void; onError: (err?: unknown) => void },
      ) => void
    >(),
  mockUseList1: vi.fn(),
  mockUseCheckoutPreview: vi.fn(),
  mockNotifySuccess: vi.fn(),
  mockNotifyWarning: vi.fn(),
  mockNotifyFromError: vi.fn(),
  state: {
    isLoggedIn: true,
    items: [] as CartItemResponse[],
  },
}))

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: mockNotifySuccess,
    warning: mockNotifyWarning,
    fromError: mockNotifyFromError,
    error: vi.fn(),
    info: vi.fn(),
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

vi.mock('@/hooks/useCheckoutPreview', () => ({
  useCheckoutPreview: mockUseCheckoutPreview,
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({
    data: { user: { email: 'buyer@test.vn' } },
  }),
}))

vi.mock('@generated/endpoints/addresses/addresses', () => ({
  useList: mockUseList1,
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
      shopId: 'shop-a',
      shopName: 'Shop A',
      productName: 'Áo Sơ Mi Lụa',
      variantLabel: 'M / Đen',
      unitPrice: 199000,
      quantity: 2,
    },
    {
      variantId: 'v-2',
      productId: 'p-2',
      shopId: 'shop-a',
      shopName: 'Shop A',
      productName: 'Quần Jeans',
      variantLabel: 'L / Xanh',
      unitPrice: 350000,
      quantity: 1,
    },
  ]
}

function shopQuote(
  shopId: string,
  subtotal: number,
  shippingFee: number,
  amountToFreeShip: number,
): ShopCheckoutPreview {
  return {
    shopId,
    itemCount: 1,
    subtotal,
    shippingFee,
    originalShippingFee: 30000,
    freeShipApplied: shippingFee === 0,
    amountToFreeShip,
    total: subtotal + shippingFee,
  }
}

function previewOf(shops: ShopCheckoutPreview[]): CheckoutPreviewResponse {
  let subtotal = 0
  let shippingFee = 0
  for (const shop of shops) {
    subtotal += shop.subtotal ?? 0
    shippingFee += shop.shippingFee ?? 0
  }
  return { shops, subtotal, shippingFee, total: subtotal + shippingFee }
}

function mockPreview(preview: CheckoutPreviewResponse) {
  mockUseCheckoutPreview.mockReturnValue({ preview, isLoading: false, isError: false })
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
  mockNotifySuccess.mockReset()
  mockNotifyWarning.mockReset()
  mockNotifyFromError.mockReset()
  mockUseList1.mockReturnValue({ data: { status: 200, data: addresses() } })
  mockUseCheckoutPreview.mockReset()
  mockPreview(previewOf([shopQuote('shop-a', 748000, 0, 0)]))
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

  it('render đầy đủ: món hàng, địa chỉ mặc định, phí ship lấy từ server (miễn phí)', () => {
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
    expect(mockUseCheckoutPreview).toHaveBeenCalledWith([], true)
    // Server báo đơn shop A được freeship: dòng phí của shop, thẻ vận chuyển, bảng tổng
    expect(screen.getAllByText('Miễn phí')).toHaveLength(3)
    expect(screen.getAllByText('748.000 ₫')).toHaveLength(2)
  })

  it('?variantIds= lọc đúng món, xin server xem trước đúng phần được chọn', () => {
    mockPreview(previewOf([shopQuote('shop-a', 350000, 30000, 150000)]))
    renderCheckout('/checkout?variantIds=v-2')

    expect(screen.getByText('Sản Phẩm Đặt Mua (1)')).toBeTruthy()
    expect(screen.getByText('Quần Jeans')).toBeTruthy()
    expect(screen.queryByText('Áo Sơ Mi Lụa')).toBeNull()
    expect(mockUseCheckoutPreview).toHaveBeenCalledWith(['v-2'], true)
    // Phí 30.000 ở dòng shop, thẻ vận chuyển, bảng tổng; tổng 380.000 theo server
    expect(screen.getAllByText('30.000 ₫')).toHaveLength(3)
    expect(screen.getByText('380.000 ₫')).toBeTruthy()
    expect(screen.getByText('150.000 ₫')).toBeTruthy()
  })

  it('giỏ nhiều shop → mỗi shop một phí ship, tổng phí cộng dồn theo server', () => {
    const [first, second] = cartItems()
    state.items = [
      { ...first, shopId: 'shop-a', shopName: 'Shop A' },
      { ...second, shopId: 'shop-b', shopName: 'Shop B' },
    ]
    mockPreview(
      previewOf([
        shopQuote('shop-a', 398000, 30000, 102000),
        shopQuote('shop-b', 350000, 30000, 150000),
      ]),
    )
    renderCheckout()

    expect(screen.getByText('Shop A')).toBeTruthy()
    expect(screen.getByText('Shop B')).toBeTruthy()
    // 30.000 ở 2 dòng shop; tổng phí 60.000 ở thẻ vận chuyển và bảng tổng
    expect(screen.getAllByText('30.000 ₫')).toHaveLength(2)
    expect(screen.getAllByText('60.000 ₫')).toHaveLength(2)
    expect(screen.getByText('808.000 ₫')).toBeTruthy()
  })

  it('đang tính phí ship → khoá nút đặt hàng', () => {
    mockUseCheckoutPreview.mockReturnValue({ preview: null, isLoading: true, isError: false })
    renderCheckout()

    expect(screen.getAllByText('Đang tính…').length).toBeGreaterThan(0)
    const placeOrder = screen.getByRole('button', { name: 'Đặt Hàng (COD)' }) as HTMLButtonElement
    expect(placeOrder.disabled).toBe(true)
  })

  it('không tính được phí ship → báo lỗi và khoá nút đặt hàng', () => {
    mockUseCheckoutPreview.mockReturnValue({ preview: null, isLoading: false, isError: true })
    renderCheckout()

    expect(screen.getByText('Không tính được phí vận chuyển. Vui lòng tải lại trang.')).toBeTruthy()
    const placeOrder = screen.getByRole('button', { name: 'Đặt Hàng (COD)' }) as HTMLButtonElement
    expect(placeOrder.disabled).toBe(true)
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
    })
    expect(mockNotifySuccess).toHaveBeenCalledWith(
      'Đặt hàng thành công',
      'Đơn hàng của bạn đã được tiếp nhận.',
    )
    expect(screen.getByText('orders-page')).toBeTruthy()
  })

  it('đặt hàng lỗi → gọi notify.fromError xin thử lại', async () => {
    const err = new Error('order-failed')
    checkoutMutate.mockImplementation((_variables, options) => {
      options?.onError(err)
    })
    const user = userEvent.setup()
    renderCheckout()

    await user.click(screen.getByRole('button', { name: 'Đặt Hàng (COD)' }))

    expect(mockNotifyFromError).toHaveBeenCalledWith(
      err,
      'checkout',
      'Không thể hoàn tất đặt hàng. Vui lòng thử lại.',
    )
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
    })
  })
})
