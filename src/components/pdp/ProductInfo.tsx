import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Minus, Plus, ShoppingBag, Sparkle, Star } from '@phosphor-icons/react'

import { priceInfo } from '@/lib/api/apiAdapters'
import { formatVnd, priceLabel } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { findVariant, isOptionAvailable } from '@/lib/shop/variants'
import { badgeToneClass, cn, FOCUS_RING_CLASS, secondaryButtonClass } from '@/lib/ui/styles'

import { useCart } from '../../hooks/useCart'
import WishlistButton from '../WishlistButton'
import ReportProductButton from './ReportProductButton'

import type { ProductResponse } from '@generated/model/productResponse'

function optionClass(selected: boolean, available: boolean): string {
  if (selected) {
    return cn(
      'btn-primary cursor-pointer rounded-full px-4 py-2 text-sm font-bold shadow-xs',
      FOCUS_RING_CLASS,
    )
  }
  if (available === false) {
    return 'cursor-not-allowed rounded-full border border-dashed border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-400 line-through dark:border-white/10 dark:text-zinc-600'
  }
  return cn(
    'cursor-pointer rounded-full border border-zinc-300 bg-white/80 px-4 py-2 text-sm font-bold text-[#17203a] transition hover:border-blue-600 dark:border-white/15 dark:bg-white/5 dark:text-[#e2e8f0] dark:hover:border-sky-400',
    FOCUS_RING_CLASS,
  )
}

function unavailableTitle(available: boolean): string | undefined {
  if (available) {
    return undefined
  }
  return 'Hết hàng với lựa chọn hiện tại'
}

function discountPercentOf(
  price: number | null | undefined,
  compareAt: number | null | undefined,
): number | null {
  if (price === null || price === undefined || compareAt === null || compareAt === undefined) {
    return null
  }
  if (compareAt <= price || compareAt <= 0) {
    return null
  }
  const pct = Math.round(((compareAt - price) / compareAt) * 100)
  if (pct <= 0) {
    return null
  }
  return pct
}

export default function ProductInfo(props: { product: ProductResponse }) {
  const p = props.product
  const cart = useCart()
  const { isLoggedIn, addItem } = cart
  const cartItems = cart.items ?? []
  const updateQuantity = cart.updateQuantity
  const navigate = useNavigate()
  const info = priceInfo(p)
  const variants = p.variants ?? []

  let initialColor: string | null = null
  if (info.colors.length === 1) {
    const onlyColor = info.colors[0]
    if (onlyColor !== undefined && isOptionAvailable(variants, 'color', onlyColor, null)) {
      initialColor = onlyColor
    }
  }
  let initialSize: string | null = null
  if (info.sizes.length === 1) {
    const onlySize = info.sizes[0]
    if (onlySize !== undefined && isOptionAvailable(variants, 'size', onlySize, initialColor)) {
      initialSize = onlySize
    }
  }

  const [color, setColor] = useState<string | null>(initialColor)
  const [size, setSize] = useState<string | null>(initialSize)
  const [qty, setQty] = useState(1)
  const [selectionError, setSelectionError] = useState(false)
  const [pendingAction, setPendingAction] = useState<'cart' | 'buyNow' | null>(null)

  const match = findVariant(variants, size, color)
  const needsColor = info.colors.length > 0 && color === null
  const needsSize = info.sizes.length > 0 && size === null
  const hasFullSelection = needsColor === false && needsSize === false

  function pickColor(c: string) {
    setSelectionError(false)
    if (color === c) {
      setColor(null)
      return
    }
    setColor(c)
    setQty(1)
  }

  function pickSize(s: string) {
    setSelectionError(false)
    if (size === s) {
      setSize(null)
      return
    }
    setSize(s)
    setQty(1)
  }

  function missingSelectionMessage(): string {
    if (needsColor && needsSize) {
      return 'Vui lòng chọn màu sắc và kích cỡ'
    }
    if (needsColor) {
      return 'Vui lòng chọn màu sắc'
    }
    return 'Vui lòng chọn kích cỡ'
  }

  function requireSelection(): boolean {
    if (needsColor || needsSize) {
      setSelectionError(true)
      notify.warning(missingSelectionMessage())
      return false
    }
    setSelectionError(false)
    return true
  }

  let exactMatch = match
  if (hasFullSelection === false) {
    exactMatch = undefined
  }
  const price = match?.price ?? info.minPrice
  const compareAt = match?.compareAtPrice ?? info.maxCompareAt
  const discountPct = discountPercentOf(price, compareAt)
  const stock = exactMatch?.stockQuantity ?? info.totalStock

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

  const isBusy = pendingAction !== null || addItem.isPending || updateQuantity?.isPending === true

  function addToCart() {
    if (requireSelection() === false) {
      return
    }
    if (isLoggedIn === false) {
      notify.info('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng')
      void navigate('/login', { state: { from: '/product/' + (p.id ?? '') } })
      return
    }
    if (match === undefined || match.id === undefined) {
      setSelectionError(true)
      notify.warning('Vui lòng chọn màu sắc và kích cỡ')
      return
    }
    if ((match.stockQuantity ?? 0) <= 0) {
      notify.warning('Biến thể này hiện đã hết hàng')
      return
    }
    setPendingAction('cart')
    addItem.mutate(
      { data: { variantId: match.id, quantity: qty } },
      {
        onSuccess: function () {
          notify.success('Đã thêm vào giỏ hàng', qty + ' × ' + (p.name ?? ''))
        },
        onError: function (err) {
          notify.fromError(err, 'cart', 'Không thêm được vào giỏ hàng')
        },
        onSettled: function () {
          setPendingAction(null)
        },
      },
    )
  }

  function buyNow() {
    if (requireSelection() === false) {
      return
    }
    if (isLoggedIn === false) {
      notify.info('Vui lòng đăng nhập để tiếp tục mua hàng')
      void navigate('/login', { state: { from: '/product/' + (p.id ?? '') } })
      return
    }
    if (match === undefined || match.id === undefined) {
      setSelectionError(true)
      notify.warning('Vui lòng chọn màu sắc và kích cỡ')
      return
    }
    if ((match.stockQuantity ?? 0) <= 0) {
      notify.warning('Biến thể này hiện đã hết hàng')
      return
    }
    const selectedVariantId = match.id
    const checkoutUrl = '/checkout?variantIds=' + encodeURIComponent(selectedVariantId)
    const existingCartItem = cartItems.find(function (item) {
      return item.variantId === selectedVariantId
    })

    if (existingCartItem !== undefined) {
      if (existingCartItem.quantity === qty) {
        void navigate(checkoutUrl)
        return
      }
      if (updateQuantity !== undefined) {
        setPendingAction('buyNow')
        updateQuantity.mutate(
          { variantId: selectedVariantId, data: { quantity: qty } },
          {
            onSuccess: function () {
              void navigate(checkoutUrl)
            },
            onError: function (err) {
              notify.fromError(err, 'cart', 'Không thể thực hiện mua ngay')
            },
            onSettled: function () {
              setPendingAction(null)
            },
          },
        )
        return
      }
    }

    setPendingAction('buyNow')
    addItem.mutate(
      { data: { variantId: selectedVariantId, quantity: qty } },
      {
        onSuccess: function () {
          void navigate(checkoutUrl)
        },
        onError: function (err) {
          notify.fromError(err, 'cart', 'Không thể thực hiện mua ngay')
        },
        onSettled: function () {
          setPendingAction(null)
        },
      },
    )
  }

  const isOutOfStock = info.totalStock === 0
  const showColorError = selectionError && needsColor
  const showSizeError = selectionError && needsSize

  return (
    <div className="flex w-full flex-col justify-between">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-[#17203a] md:text-2xl dark:text-white">
          {p.name}
        </h1>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <Star size={16} weight="fill" className="text-amber-400" />
          {p.averageRating !== null && p.averageRating !== undefined && (
            <span className="font-semibold tabular-nums">
              {p.averageRating.toFixed(1)} · {p.reviewCount ?? 0} đánh giá
            </span>
          )}
          {(p.averageRating === null || p.averageRating === undefined) && (
            <span>Chưa có đánh giá</span>
          )}
          {p.id !== undefined && (
            <div className="ml-3">
              <ReportProductButton productId={p.id} />
            </div>
          )}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-50/90 px-4 py-3 dark:bg-white/5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="text-2xl font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
              {priceLabel(price)}
            </span>
            {discountPct !== null && compareAt !== null && compareAt !== undefined && (
              <>
                <span className="text-sm text-zinc-400 tabular-nums line-through dark:text-zinc-500">
                  {formatVnd(compareAt)}
                </span>
                <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-extrabold text-white tabular-nums">
                  -{discountPct}%
                </span>
              </>
            )}
          </div>
        </div>

        {p.tryOnEnabled === true && p.id !== undefined && p.id !== '' && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/60 px-3.5 py-2 dark:border-sky-400/25 dark:bg-sky-500/10">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs dark:bg-sky-500">
                <Sparkle size={14} weight="fill" />
              </span>
              <p className="truncate text-xs font-bold text-[#17203a] dark:text-sky-100">
                Hỗ trợ Thử đồ ảo AI
              </p>
            </div>
            <Link
              to={'/try-on/' + p.id}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#17203a] px-3.5 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-2xs transition hover:bg-blue-700 active:scale-[0.98] dark:bg-sky-500 dark:hover:bg-sky-400',
                FOCUS_RING_CLASS,
              )}
            >
              <Sparkle size={13} weight="fill" />
              <span>Thử đồ ảo với AI</span>
            </Link>
          </div>
        )}

        {isOutOfStock && (
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold',
                  badgeToneClass('danger'),
                )}
              >
                Hết hàng
              </span>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                Sản phẩm hiện tạm hết hàng. Lưu vào yêu thích để theo dõi khi gian hàng nhập thêm.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <WishlistButton productId={p.id} variant="action" />
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Lưu sản phẩm yêu thích
              </span>
            </div>
          </div>
        )}

        {isOutOfStock === false && (
          <div className="mt-4 space-y-4 border-t border-zinc-200/70 pt-4 dark:border-white/10">
            {info.colors.length > 0 && (
              <div
                className={cn(
                  'rounded-2xl transition',
                  showColorError &&
                    'border border-rose-300 bg-rose-50/60 p-3 dark:border-rose-500/40 dark:bg-rose-500/10',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#17203a] dark:text-white">Màu sắc</p>
                  {showColorError && (
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Vui lòng chọn màu sắc
                    </span>
                  )}
                </div>
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

            {info.sizes.length > 0 && (
              <div
                className={cn(
                  'rounded-2xl transition',
                  showSizeError &&
                    'border border-rose-300 bg-rose-50/60 p-3 dark:border-rose-500/40 dark:bg-rose-500/10',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#17203a] dark:text-white">Kích cỡ</p>
                  {showSizeError && (
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Vui lòng chọn kích cỡ
                    </span>
                  )}
                </div>
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

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white/85 px-2 py-1 dark:border-white/15 dark:bg-white/10">
                <button
                  type="button"
                  aria-label="Giảm"
                  disabled={qty <= 1}
                  onClick={dec}
                  className={cn(
                    'cursor-pointer rounded-full p-2 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-6 text-center font-bold tabular-nums">{qty}</span>
                <button
                  type="button"
                  aria-label="Tăng"
                  disabled={qty >= stock}
                  onClick={inc}
                  className={cn(
                    'cursor-pointer rounded-full p-2 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                Còn {stock} sản phẩm
              </span>
            </div>
          </div>
        )}
      </div>

      {isOutOfStock === false && (
        <>
          <div className="mt-6 flex flex-col gap-2.5 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={addToCart}
              disabled={isBusy}
              className={cn(
                'btn-primary flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60',
                FOCUS_RING_CLASS,
              )}
            >
              <ShoppingBag size={16} weight="fill" />
              Thêm giỏ
            </button>
            <button
              type="button"
              onClick={buyNow}
              disabled={isBusy}
              className={cn(secondaryButtonClass(), 'flex-1 cursor-pointer py-3')}
            >
              Mua ngay
            </button>
            <WishlistButton productId={p.id} variant="action" />
          </div>

          {/* Sticky Mobile Bottom CTA Bar */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/90 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md md:hidden dark:border-white/10 dark:bg-[#0a0f1e]/95">
            <div className="mx-auto flex max-w-6xl items-center gap-2.5">
              <div className="min-w-0 pr-1">
                <p className="truncate text-sm font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
                  {priceLabel(price)}
                </p>
                {discountPct !== null && (
                  <p className="text-[11px] font-bold text-rose-600 tabular-nums dark:text-rose-400">
                    Tiết kiệm {discountPct}%
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Thêm vào giỏ nhanh"
                onClick={addToCart}
                disabled={isBusy}
                className={cn(
                  'btn-primary flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60',
                  FOCUS_RING_CLASS,
                )}
              >
                <ShoppingBag size={15} weight="fill" />
                Thêm vào giỏ
              </button>
              <button
                type="button"
                aria-label="Mua ngay nhanh"
                onClick={buyNow}
                disabled={isBusy}
                className={cn(secondaryButtonClass(), 'flex-1 py-2.5 text-xs')}
              >
                Mua ngay
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
