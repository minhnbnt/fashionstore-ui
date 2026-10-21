import { useState } from 'react'
import { useNavigate } from 'react-router'

import {
  ArrowsLeftRight,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Truck,
} from '@phosphor-icons/react'

import { priceInfo } from '@/lib/apiAdapters'
import { calculateDiscountPercent, formatVnd } from '@/lib/format'
import { findVariant, isOptionAvailable } from '@/lib/variants'

import { useCart } from '../../hooks/useCart'
import { useWishlist } from '../../hooks/useWishlist'

import type { ProductResponse } from '@generated/model/productResponse'

function optionClass(selected: boolean, available: boolean): string {
  if (selected) {
    return 'rounded-full bg-indigo-900 px-4 py-2 text-sm font-bold text-white shadow-md'
  }
  if (available === false) {
    return 'cursor-not-allowed rounded-full border border-dashed border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-400 line-through dark:border-white/10 dark:text-zinc-600'
  }
  return 'rounded-full border border-sky-100 px-4 py-2 text-sm font-bold transition hover:border-sky-300 dark:border-white/10 dark:hover:border-white/30'
}

function unavailableTitle(available: boolean): string | undefined {
  if (available) {
    return undefined
  }
  return 'Hết hàng với lựa chọn hiện tại'
}

export default function ProductInfo(props: { product: ProductResponse }) {
  const p = props.product
  const info = priceInfo(p)
  const variants = p.variants ?? []
  const cart = useCart()
  const wishlist = useWishlist()
  const navigate = useNavigate()

  const [color, setColor] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [toast, setToast] = useState<string | null>(null)

  const isFav = wishlist.isFavorited(p.id)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(function () {
      setToast(null)
    }, 2500)
  }

  const match = findVariant(variants, size, color)
  const needsColor = info.colors.length > 0 && color === null
  const needsSize = info.sizes.length > 0 && size === null

  function pickColor(c: string) {
    if (color === c) {
      setColor(null)
      return
    }
    setColor(c)
    setQty(1)
  }

  function pickSize(s: string) {
    if (size === s) {
      setSize(null)
      return
    }
    setSize(s)
    setQty(1)
  }

  function requireSelection(): boolean {
    if (needsColor || needsSize) {
      showToast('Vui lòng chọn đầy đủ màu sắc và kích cỡ')
      return false
    }
    return true
  }

  const price = match?.price ?? info.minPrice
  const compareAt = match?.compareAtPrice ?? info.maxCompareAt
  const stock = match?.stockQuantity ?? info.totalStock
  const discount = calculateDiscountPercent(price, compareAt)

  function dec() {
    if (qty > 1) {
      setQty(qty - 1)
    }
  }

  function inc() {
    if (qty < stock) {
      setQty(qty + 1)
    }
  }

  function handleAddToCart() {
    if (!cart.isLoggedIn) {
      void navigate('/login')
      return
    }
    if (requireSelection() === false) {
      return
    }
    if (match === undefined || match.id === undefined) {
      showToast('Biến thể này hiện không khả dụng')
      return
    }
    cart.addItem.mutate(
      { data: { variantId: match.id, quantity: qty } },
      {
        onSuccess: function () {
          showToast(`Đã thêm ${qty} sản phẩm vào giỏ hàng thành công!`)
        },
        onError: function () {
          showToast('Không thể thêm vào giỏ. Vui lòng kiểm tra lại tồn kho.')
        },
      },
    )
  }

  function handleBuyNow() {
    if (!cart.isLoggedIn) {
      void navigate('/login')
      return
    }
    if (requireSelection() === false) {
      return
    }
    if (match === undefined || match.id === undefined) {
      showToast('Biến thể này hiện không khả dụng')
      return
    }
    cart.addItem.mutate(
      { data: { variantId: match.id, quantity: qty } },
      {
        onSuccess: function () {
          void navigate('/checkout')
        },
        onError: function () {
          showToast('Không thể mua ngay. Vui lòng kiểm tra lại tồn kho.')
        },
      },
    )
  }

  function handleWishlistToggle() {
    if (!wishlist.isLoggedIn) {
      void navigate('/login')
      return
    }
    if (p.id !== undefined) {
      wishlist.toggle.mutate(
        { data: { productId: p.id } },
        {
          onSuccess: function () {
            if (isFav) {
              showToast('Đã xóa khỏi danh sách yêu thích')
            }
            if (!isFav) {
              showToast('Đã lưu vào danh sách yêu thích')
            }
          },
        },
      )
    }
  }

  if (info.totalStock === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
        <p className="mt-3 inline-block rounded-full bg-red-100 px-4 py-1 text-sm font-bold text-red-600 dark:bg-red-500/20 dark:text-red-300">
          Tạm thời hết hàng
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Toast */}
      {toast !== null && (
        <div className="glass fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-bold shadow-2xl">
          {toast}
        </div>
      )}

      {/* Tên sản phẩm & Huy hiệu */}
      <div className="flex items-start gap-2">
        <span className="mt-1 flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-2.5 py-0.5 text-xs font-extrabold text-white">
          <Star size={11} weight="fill" />
          Yêu thích+
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
      </div>

      {/* Đánh giá & Số lượng bán */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
        <div className="flex items-center gap-1 text-amber-500">
          <Star size={16} weight="fill" />
          <span className="font-extrabold text-zinc-900 dark:text-white">
            {p.averageRating ?? '4.9'}
          </span>
        </div>
        <span className="text-zinc-300 dark:text-zinc-600">|</span>
        <span>{p.reviewCount ?? 0} Đánh giá</span>
        <span className="text-zinc-300 dark:text-zinc-600">|</span>
        <span className="font-semibold text-zinc-700 dark:text-zinc-200">Đã bán 120+</span>
      </div>

      {/* Khung Giá Shopee */}
      <div className="mt-4 rounded-3xl border border-sky-100 bg-sky-50/50 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-extrabold text-blue-700 dark:text-sky-300">
            {price !== null && price !== undefined && formatVnd(price)}
            {(price === null || price === undefined) && 'Liên hệ'}
          </span>
          {compareAt !== null && compareAt !== undefined && compareAt > (price ?? 0) && (
            <span className="text-base text-zinc-400 line-through dark:text-zinc-500">
              {formatVnd(compareAt)}
            </span>
          )}
          {discount > 0 && (
            <span className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-2.5 py-0.5 text-xs font-extrabold text-white">
              -{discount}% GIẢM
            </span>
          )}
        </div>
      </div>

      {/* Mô tả ngắn */}
      {p.description !== undefined && (
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {p.description}
        </p>
      )}

      {/* Chọn màu sắc */}
      {info.colors.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Màu sắc{' '}
            {color !== null && (
              <span className="font-extrabold text-zinc-900 dark:text-white">: {color}</span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {info.colors.map(function (c) {
              const selected = color === c
              const available = isOptionAvailable(variants, 'color', c, size)
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={selected}
                  disabled={available === false && selected === false}
                  title={unavailableTitle(available)}
                  onClick={function () {
                    pickColor(c)
                  }}
                  className={optionClass(selected, available)}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Chọn kích cỡ */}
      {info.sizes.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Kích cỡ{' '}
            {size !== null && (
              <span className="font-extrabold text-zinc-900 dark:text-white">: {size}</span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {info.sizes.map(function (s) {
              const selected = size === s
              const available = isOptionAvailable(variants, 'size', s, color)
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selected}
                  disabled={available === false && selected === false}
                  title={unavailableTitle(available)}
                  onClick={function () {
                    pickSize(s)
                  }}
                  className={optionClass(selected, available)}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Số lượng */}
      <div className="mt-5 flex items-center gap-4">
        <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Số lượng</span>
        <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-zinc-800">
          <button
            type="button"
            aria-label="Giảm"
            onClick={dec}
            className="rounded-full p-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-8 text-center text-sm font-extrabold">{qty}</span>
          <button
            type="button"
            aria-label="Tăng"
            onClick={inc}
            className="rounded-full p-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-xs text-zinc-500">Còn {stock} sản phẩm</span>
      </div>

      {/* Bộ nút Hành động */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={cart.addItem.isPending}
          className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-60"
        >
          <ShoppingBag size={18} weight="fill" />
          <span>Thêm vào Giỏ Hàng</span>
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={cart.addItem.isPending}
          className="flex flex-1 items-center justify-center rounded-full border-2 border-indigo-900 bg-indigo-950 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-900 disabled:opacity-60 dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-200"
        >
          Mua Ngay
        </button>

        <button
          type="button"
          onClick={handleWishlistToggle}
          aria-label="Yêu thích"
          className="glass flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition hover:scale-105"
        >
          {isFav && <Heart size={20} weight="fill" className="text-rose-500" />}
          {!isFav && <Heart size={20} weight="bold" className="text-zinc-700 dark:text-zinc-200" />}
        </button>
      </div>

      {/* Cam kết dịch vụ Shopee */}
      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-sky-100 pt-5 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-300">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-blue-700 dark:text-sky-300" />
          <span>Vận chuyển COD toàn quốc</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowsLeftRight size={18} className="text-indigo-700 dark:text-indigo-300" />
          <span>Đổi trả 30 ngày miễn phí</span>
        </div>
      </div>
    </div>
  )
}
