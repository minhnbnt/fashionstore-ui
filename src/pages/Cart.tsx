import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash,
  Truck,
} from '@phosphor-icons/react'

import { formatVnd } from '@/lib/format'

import { useCart } from '../hooks/useCart'

export default function Cart() {
  const cart = useCart()
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(function () {
      setToast(null)
    }, 2500)
  }

  function handleToggleItem(variantId: string | undefined) {
    if (variantId === undefined) {
      return
    }
    setSelectedIds(function (prev) {
      if (prev.includes(variantId)) {
        return prev.filter(function (id) {
          return id !== variantId
        })
      }
      return [...prev, variantId]
    })
  }

  function handleToggleAll() {
    if (selectedIds.length === cart.items.length) {
      setSelectedIds([])
      return
    }
    const allIds: string[] = []
    for (const item of cart.items) {
      if (item.variantId !== undefined) {
        allIds.push(item.variantId)
      }
    }
    setSelectedIds(allIds)
  }

  function handleUpdateQty(variantId: string | undefined, newQty: number) {
    if (variantId === undefined || newQty < 1) {
      return
    }
    cart.updateQuantity.mutate(
      { variantId, data: { quantity: newQty } },
      {
        onError: function () {
          showToast('Không thể cập nhật số lượng. Vui lòng kiểm tra lại tồn kho.')
        },
      },
    )
  }

  function handleRemoveItem(variantId: string | undefined) {
    if (variantId === undefined) {
      return
    }
    cart.removeItem.mutate(
      { variantId },
      {
        onSuccess: function () {
          setSelectedIds(function (prev) {
            return prev.filter(function (id) {
              return id !== variantId
            })
          })
          showToast('Đã xóa sản phẩm khỏi giỏ hàng')
        },
      },
    )
  }

  function handleClearAllSelected() {
    if (selectedIds.length === 0) {
      return
    }
    for (const id of selectedIds) {
      cart.removeItem.mutate({ variantId: id })
    }
    setSelectedIds([])
    showToast('Đã xóa các sản phẩm được chọn')
  }

  function handleProceedToCheckout() {
    if (selectedIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán')
      return
    }
    void navigate('/checkout')
  }

  // Tính tổng tiền các món được chọn
  let selectedTotal = 0
  let selectedCount = 0
  for (const item of cart.items) {
    if (item.variantId !== undefined && selectedIds.includes(item.variantId)) {
      const q = item.quantity ?? 1
      const price = item.unitPrice ?? 0
      selectedTotal += price * q
      selectedCount += q
    }
  }

  const isAllSelected = cart.items.length > 0 && selectedIds.length === cart.items.length

  if (!cart.isLoggedIn) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-24 text-center">
        <div className="mx-auto max-w-md rounded-3xl border border-sky-100 bg-white/80 p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
          <ShoppingBag size={48} className="mx-auto text-blue-600 dark:text-sky-300" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Giỏ Hàng Của Bạn</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Vui lòng đăng nhập để xem các sản phẩm đã thêm vào giỏ.
          </p>
          <Link
            to="/login"
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold shadow-lg shadow-blue-500/20"
          >
            <span>Đăng Nhập Ngay</span>
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </main>
    )
  }

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-24 text-center">
        <div className="mx-auto max-w-md rounded-3xl border border-sky-100 bg-white/80 p-10 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-50 text-blue-600 dark:bg-white/10 dark:text-sky-300">
            <ShoppingBag size={38} weight="fill" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            Giỏ hàng của bạn còn trống
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Hãy khám phá hàng ngàn sản phẩm thời trang chính hãng và săn deal Flash Sale ngay hôm
            nay!
          </p>
          <Link
            to="/"
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold shadow-lg shadow-blue-500/20"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Tiếp Tục Mua Sắm</span>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-32">
      {toast !== null && (
        <div className="glass fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-bold shadow-2xl">
          {toast}
        </div>
      )}

      {/* Breadcrumb & Tiêu đề */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Giỏ Hàng{' '}
            <span className="text-base text-zinc-400">({cart.totalQuantity} sản phẩm)</span>
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Kiểm tra các mặt hàng đã chọn trước khi tiến hành thanh toán
          </p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300"
        >
          <ArrowLeft size={14} weight="bold" />
          <span>Tiếp tục mua hàng</span>
        </Link>
      </div>

      {/* Thông báo Freeship Shopee */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-300">
        <Truck size={20} weight="bold" className="shrink-0 text-emerald-600" />
        <span>
          Đơn hàng từ <strong>500.000 ₫</strong> được miễn phí vận chuyển toàn quốc!
        </span>
      </div>

      {/* Bảng Giỏ Hàng Chuẩn Shopee */}
      <div className="dark:bg-zinc-850 mt-6 overflow-hidden rounded-3xl border border-sky-100 bg-white/90 shadow-sm dark:border-white/10">
        {/* Table Header */}
        <div className="hidden grid-cols-12 items-center gap-4 border-b border-sky-100 bg-sky-50/70 px-6 py-3.5 text-xs font-bold text-zinc-600 sm:grid dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
          <div className="col-span-5 flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all-top"
              checked={isAllSelected}
              onChange={handleToggleAll}
              className="h-4 w-4 cursor-pointer rounded accent-blue-600"
            />
            <label htmlFor="select-all-top" className="cursor-pointer">
              Sản Phẩm ({cart.items.length})
            </label>
          </div>
          <div className="col-span-2 text-center">Đơn Giá</div>
          <div className="col-span-2 text-center">Số Lượng</div>
          <div className="col-span-2 text-center">Số Tiền</div>
          <div className="col-span-1 text-center">Thao Tác</div>
        </div>

        {/* Danh Sách Món Hàng */}
        <div className="divide-y divide-sky-100 dark:divide-white/10">
          {cart.items.map(function (item) {
            const isSelected = item.variantId !== undefined && selectedIds.includes(item.variantId)
            const unitPrice = item.unitPrice ?? 0
            const quantity = item.quantity ?? 1
            const lineTotal = unitPrice * quantity

            return (
              <div
                key={item.variantId}
                className="grid grid-cols-1 items-center gap-4 px-4 py-4 sm:grid-cols-12 sm:px-6"
              >
                {/* Cột 1: Checkbox & Tên sản phẩm */}
                <div className="col-span-5 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={function () {
                      handleToggleItem(item.variantId)
                    }}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded accent-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                      {item.productName}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                        {item.variantLabel}
                      </span>
                      {item.sku !== undefined && (
                        <span className="text-[11px] text-zinc-400">SKU: {item.sku}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cột 2: Đơn giá */}
                <div className="col-span-2 text-left sm:text-center">
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                    {formatVnd(unitPrice)}
                  </span>
                </div>

                {/* Cột 3: Tăng giảm số lượng */}
                <div className="col-span-2 flex items-center justify-start sm:justify-center">
                  <div className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-2 py-1 dark:border-white/15 dark:bg-zinc-800">
                    <button
                      type="button"
                      aria-label="Giảm"
                      disabled={cart.updateQuantity.isPending}
                      onClick={function () {
                        handleUpdateQty(item.variantId, quantity - 1)
                      }}
                      className="rounded-full p-1 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="min-w-6 text-center text-xs font-extrabold">{quantity}</span>
                    <button
                      type="button"
                      aria-label="Tăng"
                      disabled={cart.updateQuantity.isPending}
                      onClick={function () {
                        handleUpdateQty(item.variantId, quantity + 1)
                      }}
                      className="rounded-full p-1 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Cột 4: Thành tiền */}
                <div className="col-span-2 text-left sm:text-center">
                  <span className="text-sm font-extrabold text-blue-700 dark:text-sky-300">
                    {formatVnd(lineTotal)}
                  </span>
                </div>

                {/* Cột 5: Xóa */}
                <div className="col-span-1 flex justify-end sm:justify-center">
                  <button
                    type="button"
                    aria-label="Xóa"
                    onClick={function () {
                      handleRemoveItem(item.variantId)
                    }}
                    className="rounded-full p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Thanh Thanh Toán Cố Định Dưới Đáy (Sticky Checkout Bar Shopee) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-200/80 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold sm:text-sm">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleAll}
                className="h-4 w-4 cursor-pointer rounded accent-blue-600"
              />
              <span>Chọn Tất Cả ({cart.items.length})</span>
            </label>
            <button
              type="button"
              onClick={handleClearAllSelected}
              disabled={selectedIds.length === 0}
              className="text-xs font-medium text-zinc-500 hover:text-red-600 disabled:opacity-40"
            >
              Xóa mục đã chọn
            </button>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-xs text-zinc-500">Tổng thanh toán ({selectedCount} sản phẩm):</p>
              <p className="text-lg font-extrabold text-blue-700 sm:text-2xl dark:text-sky-300">
                {formatVnd(selectedTotal)}
              </p>
            </div>

            <button
              type="button"
              id="btn-cart-checkout"
              onClick={handleProceedToCheckout}
              disabled={selectedIds.length === 0}
              className="btn-primary flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <span>Mua Hàng</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
