import { useState } from 'react'
import { useNavigate } from 'react-router'

import { Minus, Plus, ShoppingBag, Star } from '@phosphor-icons/react'

import { priceInfo } from '@/lib/api/apiAdapters'
import { formatVnd, priceLabel } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { findVariant, isOptionAvailable } from '@/lib/shop/variants'
import { cn, secondaryButtonClass } from '@/lib/ui/styles'

import { useCart } from '../../hooks/useCart'
import Markdown from '../Markdown'
import WishlistButton from '../WishlistButton'
import ReportProductButton from './ReportProductButton'

import type { ProductResponse } from '@generated/model/productResponse'

function optionClass(selected: boolean, available: boolean): string {
  if (selected) {
    return 'btn-primary cursor-pointer rounded-full px-4 py-2 text-sm font-bold shadow-xs'
  }
  if (available === false) {
    return 'cursor-not-allowed rounded-full border border-dashed border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-400 line-through dark:border-white/10 dark:text-zinc-600'
  }
  return 'cursor-pointer rounded-full border border-zinc-300 bg-white/80 px-4 py-2 text-sm font-bold text-[#17203a] transition hover:border-blue-600 dark:border-white/15 dark:bg-white/5 dark:text-[#e2e8f0] dark:hover:border-sky-400'
}

function unavailableTitle(available: boolean): string | undefined {
  if (available) {
    return undefined
  }
  return 'Hết hàng với lựa chọn hiện tại'
}

export default function ProductInfo(props: { product: ProductResponse }) {
  const p = props.product
  const { isLoggedIn, addItem } = useCart()
  const navigate = useNavigate()
  const info = priceInfo(p)
  const variants = p.variants ?? []
  const [color, setColor] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [qty, setQty] = useState(1)

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
      notify.warning('Vui lòng chọn màu sắc và kích cỡ')
      return false
    }
    return true
  }
  const price = match?.price ?? info.minPrice
  const compareAt = match?.compareAtPrice ?? info.maxCompareAt
  const stock = match?.stockQuantity ?? info.totalStock

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

  function addToCart() {
    if (requireSelection() === false) {
      return
    }
    if (isLoggedIn === false) {
      void navigate('/login', { state: { from: '/product/' + (p.id ?? '') } })
      return
    }
    if (match === undefined || match.id === undefined) {
      notify.warning('Vui lòng chọn màu sắc và kích cỡ')
      return
    }
    addItem.mutate(
      { data: { variantId: match.id, quantity: qty } },
      {
        onSuccess: function () {
          notify.success('Đã thêm vào giỏ hàng', qty + ' × ' + (p.name ?? ''))
        },
        onError: function (err) {
          notify.fromError(err, 'cart', 'Không thêm được vào giỏ hàng')
        },
      },
    )
  }

  function buyNow() {
    if (requireSelection() === false) {
      return
    }
    notify.info('Mua ngay', p.name ?? '')
  }

  if (info.totalStock === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
        <p className="mt-2 font-bold text-zinc-500 dark:text-zinc-400">Hết hàng</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <Star size={16} weight="fill" className="text-sky-400" />
        {p.averageRating !== null && p.averageRating !== undefined && (
          <span className="tabular-nums">
            {p.averageRating.toFixed(1)} · {p.reviewCount ?? 0} đánh giá
          </span>
        )}
        {(p.averageRating === null || p.averageRating === undefined) && (
          <span>Chưa có đánh giá</span>
        )}
        {p.id !== undefined && (
          <span className="ml-3">
            <ReportProductButton productId={p.id} />
          </span>
        )}
      </p>
      <div className="mt-4 flex flex-wrap items-baseline gap-2.5">
        <span className="text-2xl font-extrabold text-blue-700 tabular-nums md:text-3xl dark:text-sky-300">
          {priceLabel(price)}
        </span>
        {compareAt !== null && compareAt !== undefined && (
          <span className="text-sm text-zinc-400 tabular-nums line-through dark:text-zinc-500">
            {formatVnd(compareAt)}
          </span>
        )}
      </div>
      {p.description !== undefined && (
        <div className="mt-4">
          <Markdown source={p.description} />
        </div>
      )}
      {info.colors.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-bold">Màu sắc</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
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
        <div className="mt-5">
          <p className="text-sm font-bold">Kích cỡ</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
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
      <div className="mt-5 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white/80 px-2 py-1 dark:border-white/15 dark:bg-white/10">
          <button
            type="button"
            aria-label="Giảm"
            disabled={qty <= 1}
            onClick={dec}
            className="cursor-pointer rounded-full p-2 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-6 text-center font-bold tabular-nums">{qty}</span>
          <button
            type="button"
            aria-label="Tăng"
            disabled={qty >= stock}
            onClick={inc}
            className="cursor-pointer rounded-full p-2 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          Còn {stock} sản phẩm
        </span>
      </div>
      {/* mt-auto: neo hàng CTA xuống đáy cột phải khi cột ảnh cao hơn */}
      <div className="mt-auto flex flex-col gap-2.5 pt-6 sm:flex-row">
        <button
          type="button"
          onClick={addToCart}
          disabled={addItem.isPending}
          className="btn-primary flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingBag size={16} weight="fill" />
          Thêm giỏ
        </button>
        <button
          type="button"
          onClick={buyNow}
          className={cn(secondaryButtonClass(), 'flex-1 cursor-pointer py-3')}
        >
          Mua ngay
        </button>
        <WishlistButton productId={p.id} variant="action" />
      </div>
    </div>
  )
}
