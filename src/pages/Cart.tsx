import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Minus, Plus, ShoppingBag, Trash } from '@phosphor-icons/react'

import { hookErrorMessage } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import { useCart } from '../hooks/useCart'

export default function Cart() {
  const { items, totalQuantity, isLoading, isError, error, updateQuantity, removeItem, clearCart } =
    useCart()
  // Giu dang "loai tru" de item moi them vao mac dinh duoc tick.
  const [excluded, setExcluded] = useState<string[]>([])
  const navigate = useNavigate()

  const selected = items.filter(function (item) {
    return excluded.includes(item.variantId ?? '') === false
  })
  let selectedTotal = 0
  let selectedCount = 0
  for (const item of selected) {
    selectedTotal += (item.unitPrice ?? 0) * (item.quantity ?? 0)
    selectedCount += item.quantity ?? 0
  }
  const allSelected = items.length > 0 && selected.length === items.length

  function toggle(variantId: string) {
    if (excluded.includes(variantId)) {
      setExcluded(excluded.filter((id) => id !== variantId))
      return
    }
    setExcluded([...excluded, variantId])
  }

  function toggleAll() {
    if (allSelected) {
      setExcluded(
        items.map(function (item) {
          return item.variantId ?? ''
        }),
      )
      return
    }
    setExcluded([])
  }

  function goCheckout() {
    const query = new URLSearchParams()
    query.set(
      'variantIds',
      selected
        .map(function (item) {
          return item.variantId ?? ''
        })
        .join(','),
    )
    void navigate(`/checkout?${query.toString()}`)
  }

  function confirmClear() {
    if (window.confirm('Xoá toàn bộ giỏ hàng?')) {
      clearCart.mutate()
    }
  }

  let body = (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2].map(function (index) {
        return (
          <div key={index} className="h-24 animate-pulse rounded-3xl bg-white/60 dark:bg-white/5" />
        )
      })}
    </div>
  )

  if (isError) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">{hookErrorMessage('cart', error)}</p>
    )
  }

  if (isLoading === false && isError === false && items.length === 0) {
    body = (
      <div className="glass rounded-3xl px-6 py-16 text-center">
        <ShoppingBag size={40} weight="duotone" className="mx-auto text-indigo-500" />
        <p className="mt-3 font-bold">Giỏ đang trống</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Chọn vài món rồi quay lại đây nhé.
        </p>
        <Link
          to="/search"
          className="btn-primary mt-5 inline-block rounded-full px-6 py-2.5 text-sm font-semibold"
        >
          Đi mua sắm
        </Link>
      </div>
    )
  }

  if (isLoading === false && items.length > 0) {
    body = (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="glass rounded-3xl p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-200/70 pb-3 dark:border-white/10">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 accent-indigo-600"
              />
              Chọn tất cả ({items.length})
            </label>
            <button
              type="button"
              onClick={confirmClear}
              disabled={clearCart.isPending}
              className="text-sm font-semibold text-zinc-500 transition hover:text-red-600 disabled:opacity-50 dark:text-zinc-400"
            >
              Xoá giỏ
            </button>
          </div>

          <ul className="divide-y divide-zinc-200/70 dark:divide-white/10">
            {items.map(function (item) {
              const variantId = item.variantId ?? ''
              const quantity = item.quantity ?? 0
              const stock = item.stockQuantity ?? 0
              const unitPrice = item.unitPrice ?? 0
              const isSelected = excluded.includes(variantId) === false

              return (
                <li key={variantId} className="flex gap-3 py-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(variantId)}
                    aria-label={`Chọn ${item.productName ?? ''}`}
                    className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{item.productName}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {item.variantLabel} · SKU {item.sku}
                    </p>
                    <p className="mt-1 text-sm">{formatVnd(unitPrice)}</p>
                    {quantity >= stock && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Chỉ còn {stock} sản phẩm
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-zinc-200 dark:border-white/15">
                        <button
                          type="button"
                          aria-label="Giảm số lượng"
                          disabled={quantity <= 1 || updateQuantity.isPending}
                          onClick={() =>
                            updateQuantity.mutate({ variantId, data: { quantity: quantity - 1 } })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
                        >
                          <Minus size={14} weight="bold" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                        <button
                          type="button"
                          aria-label="Tăng số lượng"
                          disabled={quantity >= stock || updateQuantity.isPending}
                          onClick={() =>
                            updateQuantity.mutate({ variantId, data: { quantity: quantity + 1 } })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
                        >
                          <Plus size={14} weight="bold" />
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label="Xoá sản phẩm"
                        disabled={removeItem.isPending}
                        onClick={() => removeItem.mutate({ variantId })}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>

                  <p className="shrink-0 text-right font-bold">{formatVnd(unitPrice * quantity)}</p>
                </li>
              )
            })}
          </ul>

          {updateQuantity.isError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {hookErrorMessage('cart', updateQuantity.error)}
            </p>
          )}
        </section>

        <aside className="glass h-fit rounded-3xl p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold tracking-tight">Tóm tắt</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Đã chọn</dt>
              <dd className="font-semibold">{selectedCount} sản phẩm</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Tạm tính</dt>
              <dd className="font-bold">{formatVnd(selectedTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Phí ship</dt>
              <dd className="font-semibold">Tính ở bước đặt hàng</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={goCheckout}
            disabled={selected.length === 0}
            className="btn-primary mt-5 w-full rounded-full py-3 text-sm font-bold disabled:opacity-50"
          >
            Thanh toán ({selected.length})
          </button>
          <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {totalQuantity} sản phẩm trong giỏ · thanh toán khi nhận hàng
          </p>
        </aside>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-[110px] pb-16">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
          <ShoppingBag size={22} weight="bold" className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tighter">Giỏ hàng</h1>
      </div>
      {body}
    </main>
  )
}
