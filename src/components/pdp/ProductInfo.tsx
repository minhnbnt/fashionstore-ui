import { useState } from 'react'
import { useNavigate } from 'react-router'

import { Minus, Plus, ShoppingBag, Star } from '@phosphor-icons/react'

import { priceInfo } from '@/lib/apiAdapters'
import { formatVnd, priceLabel } from '@/lib/format'
import { findVariant, isOptionAvailable } from '@/lib/variants'

import { useCart } from '../../hooks/useCart'
import Markdown from '../Markdown'
import WishlistButton from '../WishlistButton'
import ReportProductButton from './ReportProductButton'

import type { ProductResponse } from '@generated/model/productResponse'

function optionClass(selected: boolean, available: boolean): string {
  if (selected) {
    return 'rounded-full bg-indigo-900 px-4 py-2 text-sm font-bold text-white'
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
  const { isLoggedIn, addItem } = useCart()
  const navigate = useNavigate()
  const info = priceInfo(p)
  const variants = p.variants ?? []
  const [color, setColor] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [toast, setToast] = useState<string | null>(null)

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
      showToast('Vui lòng chọn màu sắc và kích cỡ')
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
      showToast('Vui lòng chọn màu sắc và kích cỡ')
      return
    }
    addItem.mutate(
      { data: { variantId: match.id, quantity: qty } },
      {
        onSuccess: function () {
          showToast('Đã thêm ' + qty + ' × ' + (p.name ?? '') + ' vào giỏ')
        },
        onError: function () {
          showToast('Không thêm được vào giỏ, vui lòng thử lại')
        },
      },
    )
  }

  if (info.totalStock === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
        <p className="mt-2 font-bold text-zinc-500">Hết hàng</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <Star size={16} weight="fill" className="text-sky-400" />
        {p.averageRating !== null && p.averageRating !== undefined && (
          <span>
            {p.averageRating} · {p.reviewCount ?? 0} đánh giá
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
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-extrabold text-blue-700 dark:text-sky-300">
          {priceLabel(price)}
        </span>
        {compareAt !== null && compareAt !== undefined && (
          <span className="text-sm text-zinc-400 line-through dark:text-zinc-500">
            {formatVnd(compareAt)}
          </span>
        )}
      </div>
      {p.description !== undefined && (
        <div className="mt-3">
          <Markdown source={p.description} />
        </div>
      )}
      {info.colors.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold">Màu sắc</p>
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
        <div className="mt-4">
          <p className="text-sm font-bold">Kích cỡ</p>
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
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-sky-100 px-2 py-1 dark:border-white/10">
          <button type="button" aria-label="Giảm" onClick={dec} className="rounded-full p-2">
            <Minus size={14} />
          </button>
          <span className="min-w-6 text-center font-bold">{qty}</span>
          <button type="button" aria-label="Tăng" onClick={inc} className="rounded-full p-2">
            <Plus size={14} />
          </button>
        </div>
        <span className="text-xs text-zinc-500">Còn {stock} sản phẩm</span>
      </div>
      {/* mt-auto: neo hàng CTA xuống đáy cột phải khi cột ảnh cao hơn */}
      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
        <button
          type="button"
          onClick={addToCart}
          disabled={addItem.isPending}
          className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold disabled:opacity-60"
        >
          <ShoppingBag size={16} weight="fill" />
          Thêm giỏ
        </button>
        <button
          type="button"
          onClick={function () {
            if (requireSelection() === false) {
              return
            }
            showToast('Mua ngay: ' + (p.name ?? ''))
          }}
          className="flex-1 rounded-full border border-sky-200 py-3 text-sm font-bold"
        >
          Mua ngay
        </button>
        <WishlistButton productId={p.id} variant="action" />
      </div>
      {toast && (
        <p className="glass fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-bold">
          {toast}
        </p>
      )}
    </div>
  )
}
