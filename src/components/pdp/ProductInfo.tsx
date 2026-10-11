import { useState } from 'react'

import { Minus, Plus, ShoppingBag, Star } from '@phosphor-icons/react'

// TODO(mock): điểm và lượt đánh giá là demo, thay bằng API reviews khi backend có endpoint
import { DEMO_RATING } from '@/data/demoReviews'
import { priceInfo } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import type { ProductResponse } from '@generated/model/productResponse'

export default function ProductInfo(props: { product: ProductResponse }) {
  const p = props.product
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

  const match = variants.find(function (v) {
    const colorOk = color === null || v.color === color
    const sizeOk = size === null || v.size === size
    return colorOk && sizeOk
  })
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

  if (info.totalStock === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
        <p className="mt-2 font-bold text-zinc-500">Hết hàng</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{p.name}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <Star size={16} weight="fill" className="text-sky-400" />
        {DEMO_RATING.value} · {DEMO_RATING.count} đánh giá
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-extrabold text-blue-700 dark:text-sky-300">
          {price !== null && price !== undefined ? formatVnd(price) : 'Liên hệ'}
        </span>
        {compareAt !== null && compareAt !== undefined && (
          <span className="text-sm text-zinc-400 line-through dark:text-zinc-500">
            {formatVnd(compareAt)}
          </span>
        )}
      </div>
      {p.description !== undefined && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {p.description}
        </p>
      )}
      {info.colors.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold">Màu sắc</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {info.colors.map(function (c) {
              const selected = color === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={function () {
                    setColor(selected ? null : c)
                  }}
                  className={
                    selected
                      ? 'rounded-full bg-indigo-900 px-4 py-2 text-sm font-bold text-white'
                      : 'rounded-full border border-sky-100 px-4 py-2 text-sm font-bold dark:border-white/10'
                  }
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
              return (
                <button
                  key={s}
                  type="button"
                  onClick={function () {
                    setSize(selected ? null : s)
                  }}
                  className={
                    selected
                      ? 'rounded-full bg-indigo-900 px-4 py-2 text-sm font-bold text-white'
                      : 'rounded-full border border-sky-100 px-4 py-2 text-sm font-bold dark:border-white/10'
                  }
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
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={function () {
            showToast('Đã thêm ' + qty + ' × ' + (p.name ?? '') + ' vào giỏ')
          }}
          className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold"
        >
          <ShoppingBag size={16} weight="fill" />
          Thêm giỏ
        </button>
        <button
          type="button"
          onClick={function () {
            showToast('Mua ngay: ' + (p.name ?? ''))
          }}
          className="flex-1 rounded-full border border-sky-200 py-3 text-sm font-bold"
        >
          Mua ngay
        </button>
      </div>
      {toast && (
        <p className="glass fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-bold">
          {toast}
        </p>
      )}
    </div>
  )
}
