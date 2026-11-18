import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router'

// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import Cart from './Cart'

import type { CartItemResponse } from '@generated/model/cartItemResponse'

const {
  updateQuantityMutate,
  removeItemMutate,
  clearCartMutate,
  wishlistToggleMutate,
  isFavorited,
  mockNotifySuccess,
  mockNotifyFromError,
  state,
} = vi.hoisted(() => ({
  updateQuantityMutate:
    vi.fn<
      (
        variables: { variantId: string; data: { quantity: number } },
        options?: { onError?: (err: unknown) => void },
      ) => void
    >(),
  removeItemMutate:
    vi.fn<
      (
        variables: { variantId: string },
        options?: { onSuccess?: () => void; onError?: (err: unknown) => void },
      ) => void
    >(),
  clearCartMutate:
    vi.fn<
      (
        variables?: undefined,
        options?: { onSuccess?: () => void; onError?: (err: unknown) => void },
      ) => void
    >(),
  wishlistToggleMutate:
    vi.fn<
      (
        variables: { data: { productId: string } },
        options?: { onSuccess: () => void; onError: (err?: unknown) => void },
      ) => void
    >(),
  isFavorited: vi.fn<(productId: string | undefined) => boolean>(),
  mockNotifySuccess: vi.fn(),
  mockNotifyFromError: vi.fn(),
  state: { items: [] as CartItemResponse[], totalQuantity: 0 },
}))

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: mockNotifySuccess,
    fromError: mockNotifyFromError,
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// useCart là chồng hook session + query + 4 mutation — mock module thay vì bọc provider
vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    isLoggedIn: true,
    isLoading: false,
    isError: false,
    error: null,
    items: state.items,
    totalQuantity: state.totalQuantity,
    updateQuantity: { mutate: updateQuantityMutate, isPending: false, isError: false, error: null },
    removeItem: { mutate: removeItemMutate, isPending: false },
    clearCart: { mutate: clearCartMutate, isPending: false },
  }),
}))

vi.mock('@/hooks/useWishlist', () => ({
  useWishlist: () => ({
    isLoggedIn: true,
    isFavorited,
    toggle: { mutate: wishlistToggleMutate, isPending: false },
  }),
}))

// 2 shop, 3 món: giá giảm (v-1), sắp hết (v-2 qty = stock), hết hàng (v-3)
function cartItems(): CartItemResponse[] {
  return [
    {
      variantId: 'v-1',
      productId: 'p-1',
      shopId: 'shop-1',
      shopName: 'Áo Trắng Store',
      productName: 'Áo Sơ Mi Lụa',
      imageUrl: null,
      variantLabel: 'M / Đen',
      sku: 'SKU-1',
      unitPrice: 199000,
      priceAtAdded: 249000,
      quantity: 2,
      stockQuantity: 5,
    },
    {
      variantId: 'v-2',
      productId: 'p-2',
      shopId: 'shop-1',
      shopName: 'Áo Trắng Store',
      productName: 'Quần Jeans',
      imageUrl: null,
      variantLabel: 'L / Xanh',
      sku: 'SKU-2',
      unitPrice: 350000,
      priceAtAdded: 350000,
      quantity: 1,
      stockQuantity: 1,
    },
    {
      variantId: 'v-3',
      productId: 'p-3',
      shopId: 'shop-2',
      shopName: 'Giày Depot',
      productName: 'Sneaker Base',
      imageUrl: null,
      variantLabel: '42 / Trắng',
      sku: 'SKU-3',
      unitPrice: 890000,
      priceAtAdded: 890000,
      quantity: 1,
      stockQuantity: 0,
    },
  ]
}

function setCart(items: CartItemResponse[]) {
  state.items = items
  state.totalQuantity = 0
  for (const item of items) {
    state.totalQuantity += item.quantity ?? 0
  }
}

function CheckoutProbe() {
  const [searchParams] = useSearchParams()
  return <p>checkout-page:{searchParams.get('variantIds') ?? ''}</p>
}

function renderCart(items: CartItemResponse[] = cartItems()) {
  setCart(items)
  return render(
    <MemoryRouter initialEntries={['/cart']}>
      <Routes>
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<CheckoutProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

function summary() {
  const aside = screen.getByText('Tóm tắt').closest('aside')
  if (aside === null) {
    throw new Error('không tìm thấy aside tóm tắt')
  }
  return within(aside as HTMLElement)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  updateQuantityMutate.mockReset()
  removeItemMutate.mockReset()
  clearCartMutate.mockReset()
  wishlistToggleMutate.mockReset()
  isFavorited.mockReset().mockReturnValue(false)
  mockNotifySuccess.mockReset()
  mockNotifyFromError.mockReset()
})

describe('Cart — chọn món, tổng tiền và thanh toán (DOM)', () => {
  it('render nhóm theo shop, tổng phần chọn, giá giảm, món hết hàng không chọn được', () => {
    renderCart()

    expect(screen.getByText('Áo Trắng Store')).toBeTruthy()
    expect(screen.getByText('Giày Depot')).toBeTruthy()
    // Tạm tính: 2×199.000 + 350.000, món hết hàng không tính vào phần chọn
    expect(summary().getByText('748.000 ₫')).toBeTruthy()
    expect(summary().getByText('3 sản phẩm')).toBeTruthy()
    expect(summary().getByRole('button', { name: 'Thanh toán (2)' })).toBeTruthy()
    expect(screen.getByText('Chọn tất cả (2)')).toBeTruthy()
    // Giá giảm so với lúc thêm giỏ
    expect(screen.getByText('Giá đã giảm từ 249.000 ₫ xuống 199.000 ₫')).toBeTruthy()
    // Sắp hết: qty chạm stock
    expect(screen.getByText('Chỉ còn 1 sản phẩm')).toBeTruthy()
    // Hết hàng: checkbox khoá + đè "HẾT HÀNG"
    const outCheckbox = screen.getByRole('checkbox', {
      name: 'Chọn Sneaker Base',
    }) as HTMLInputElement
    expect(outCheckbox.disabled).toBe(true)
    expect(screen.getByText('HẾT HÀNG')).toBeTruthy()
  })

  it('bỏ chọn một món → tổng giảm đúng, thanh toán điều hướng kèm variantIds còn chọn', async () => {
    const user = userEvent.setup()
    renderCart()

    await user.click(screen.getByRole('checkbox', { name: 'Chọn Áo Sơ Mi Lụa' }))

    expect(summary().getByText('350.000 ₫')).toBeTruthy()
    expect(summary().getByText('1 sản phẩm')).toBeTruthy()
    await user.click(summary().getByRole('button', { name: 'Thanh toán (1)' }))

    expect(screen.getByText('checkout-page:v-2')).toBeTruthy()
  })

  it('bỏ chọn tất cả qua "Chọn tất cả" → tạm tính về 0, không thanh toán được', async () => {
    const user = userEvent.setup()
    renderCart()

    await user.click(screen.getByRole('checkbox', { name: 'Chọn tất cả (2)' }))

    expect(summary().getByText('0 ₫')).toBeTruthy()
    const checkoutButton = summary().getByRole('button', {
      name: 'Thanh toán (0)',
    }) as HTMLButtonElement
    expect(checkoutButton.disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Xoá đã chọn' }).hasAttribute('disabled')).toBe(true)
  })

  it('tăng/giảm số lượng gọi updateQuantity đúng variant; chặn biên qty 1 và qty = stock', async () => {
    const user = userEvent.setup()
    renderCart()

    const plus = screen.getAllByRole('button', { name: 'Tăng số lượng' })
    const minus = screen.getAllByRole('button', { name: 'Giảm số lượng' })
    // v-1: qty 2 / stock 5 — cả hai chiều bấm được
    expect((plus[0] as HTMLButtonElement).disabled).toBe(false)
    expect((minus[0] as HTMLButtonElement).disabled).toBe(false)
    // v-2: qty 1 = stock 1 — giảm bị chặn (qty 1), tăng bị chặn (chạm stock)
    expect((plus[1] as HTMLButtonElement).disabled).toBe(true)
    expect((minus[1] as HTMLButtonElement).disabled).toBe(true)
    // v-3: hết hàng — khoá cả hai
    expect((plus[2] as HTMLButtonElement).disabled).toBe(true)

    await user.click(minus[0] as HTMLButtonElement)
    expect(updateQuantityMutate).toHaveBeenCalledWith(
      { variantId: 'v-1', data: { quantity: 1 } },
      expect.any(Object),
    )
    await user.click(plus[0] as HTMLButtonElement)
    expect(updateQuantityMutate).toHaveBeenCalledWith(
      { variantId: 'v-1', data: { quantity: 3 } },
      expect.any(Object),
    )
  })

  it('xoá sản phẩm → removeItem mutate đúng variantId', async () => {
    const user = userEvent.setup()
    renderCart()

    await user.click(
      screen.getAllByRole('button', { name: 'Xoá sản phẩm' })[0] as HTMLButtonElement,
    )

    expect(removeItemMutate).toHaveBeenCalledTimes(1)
    expect(removeItemMutate).toHaveBeenCalledWith({ variantId: 'v-1' }, expect.any(Object))
  })

  it('chưa yêu thích → chuyển sang Yêu thích trước, thành công thì xoá khỏi giỏ', async () => {
    wishlistToggleMutate.mockImplementation((_variables, options) => {
      options?.onSuccess()
    })
    const user = userEvent.setup()
    renderCart()

    await user.click(
      screen.getAllByRole('button', { name: 'Chuyển sang Yêu thích' })[0] as HTMLButtonElement,
    )

    expect(wishlistToggleMutate).toHaveBeenCalledTimes(1)
    expect(wishlistToggleMutate.mock.calls[0]?.[0]).toEqual({ data: { productId: 'p-1' } })
    expect(removeItemMutate).toHaveBeenCalledWith({ variantId: 'v-1' }, expect.any(Object))
  })

  it('đã yêu thích sẵn → xoá khỏi giỏ luôn, không gọi toggle', async () => {
    isFavorited.mockReturnValue(true)
    const user = userEvent.setup()
    renderCart()

    await user.click(
      screen.getAllByRole('button', { name: 'Chuyển sang Yêu thích' })[0] as HTMLButtonElement,
    )

    expect(wishlistToggleMutate).not.toHaveBeenCalled()
    expect(removeItemMutate).toHaveBeenCalledWith({ variantId: 'v-1' }, expect.any(Object))
  })

  it('chuyển wishlist lỗi → gọi notify.fromError, giữ món trong giỏ', async () => {
    const err = new Error('wishlist-failed')
    wishlistToggleMutate.mockImplementation((_variables, options) => {
      options?.onError(err)
    })
    const user = userEvent.setup()
    renderCart()

    await user.click(
      screen.getAllByRole('button', { name: 'Chuyển sang Yêu thích' })[0] as HTMLButtonElement,
    )

    expect(mockNotifyFromError).toHaveBeenCalledWith(
      err,
      'wishlist',
      'Không thể chuyển sản phẩm sang Yêu thích. Vui lòng thử lại.',
    )
    expect(removeItemMutate).not.toHaveBeenCalled()
  })

  it('xoá giỏ phải qua ConfirmDialog; huỷ dialog thì không xoá', async () => {
    const user = userEvent.setup()
    renderCart()

    await user.click(screen.getByRole('button', { name: 'Xoá giỏ' }))
    expect(screen.getByText('Xoá toàn bộ giỏ hàng?')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(clearCartMutate).not.toHaveBeenCalled()
    expect(screen.queryByText('Xoá toàn bộ giỏ hàng?')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Xoá giỏ' }))
    await user.click(screen.getByRole('button', { name: 'Xoá tất cả' }))
    expect(clearCartMutate).toHaveBeenCalledTimes(1)
  })

  it('xoá đã chọn → mở ConfirmDialog, xác nhận thì remove từng món đang chọn (bỏ qua món hết hàng)', async () => {
    const user = userEvent.setup()
    renderCart()

    await user.click(screen.getByRole('button', { name: 'Xoá đã chọn' }))
    expect(screen.getByText('Xoá 2 sản phẩm đã chọn?')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Xác nhận xoá' }))

    expect(removeItemMutate).toHaveBeenCalledTimes(2)
    const removedIds = removeItemMutate.mock.calls.map((call) => call[0]?.variantId)
    expect(removedIds).toEqual(['v-1', 'v-2'])
  })

  it('thanh tiến độ miễn phí vận chuyển: đạt 500k hiện chúc mừng, dưới 500k hiện số tiền còn thiếu', async () => {
    const user = userEvent.setup()
    renderCart()

    // Mặc định 748.000 ₫ ≥ 500.000 ₫
    expect(summary().getByText('Đã đạt miễn phí vận chuyển!')).toBeTruthy()

    // Bỏ chọn Áo Sơ Mi Lụa → còn 350.000 ₫ (thiếu 150.000 ₫)
    await user.click(screen.getByRole('checkbox', { name: 'Chọn Áo Sơ Mi Lụa' }))
    expect(summary().getByText('150.000 ₫')).toBeTruthy()
  })

  it('giỏ rỗng → empty state kèm link đi mua sắm', () => {
    renderCart([])

    expect(screen.getByText('Giỏ đang trống')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Đi mua sắm' }).getAttribute('href')).toBe('/search')
  })
})
