import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Storefront,
  Trash,
  TrendDown,
  TrendUp,
} from '@phosphor-icons/react'

import { hookErrorMessage, imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'
import { classifyPriceChange, groupCartByShop, stockState } from '@/lib/cartView'
import { formatVnd } from '@/lib/format'

import { useCart } from '../hooks/useCart'
import { useWishlist } from '../hooks/useWishlist'

import type { CartShopGroup } from '@/lib/cartView'
import type { CartItemResponse } from '@generated/model/cartItemResponse'

export default function Cart() {
  const { items, totalQuantity, isLoading, isError, error, updateQuantity, removeItem, clearCart } =
    useCart()
  const wishlist = useWishlist()
  // Giu dang "loai tru" de item moi them vao mac dinh duoc tick.
  const [excluded, setExcluded] = useState<string[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Nhom theo shop theo dac ta 1.4.1, mon het hang khong the chon.
  const selectable = items.filter(function (item) {
    return stockState(item) !== 'out'
  })
  const selected = selectable.filter(function (item) {
    return excluded.includes(item.variantId ?? '') === false
  })
  let selectedTotal = 0
  let selectedCount = 0
  for (const item of selected) {
    selectedTotal += (item.unitPrice ?? 0) * (item.quantity ?? 0)
    selectedCount += item.quantity ?? 0
  }
  const allSelected = selectable.length > 0 && selected.length === selectable.length
  const shopGroups = groupCartByShop(items)

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
        selectable.map(function (item) {
          return item.variantId ?? ''
        }),
      )
      return
    }
    setExcluded([])
  }

  function toggleShop(group: CartShopGroup) {
    const ids: string[] = []
    for (const item of group.items) {
      if (item.variantId !== undefined && stockState(item) !== 'out') {
        ids.push(item.variantId)
      }
    }
    const isShopSelected =
      ids.length > 0 &&
      ids.every(function (id) {
        return excluded.includes(id) === false
      })
    if (isShopSelected) {
      setExcluded([...excluded, ...ids])
      return
    }
    setExcluded(
      excluded.filter(function (id) {
        return ids.includes(id) === false
      }),
    )
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

  function handleRemove(variantId: string) {
    removeItem.mutate({ variantId })
  }

  function confirmClear() {
    if (window.confirm('Xoá toàn bộ giỏ hàng?')) {
      clearCart.mutate()
    }
  }

  function removeSelected() {
    if (selected.length === 0) {
      return
    }
    if (window.confirm(`Xoá ${selected.length} sản phẩm đã chọn?`) === false) {
      return
    }
    for (const item of selected) {
      if (item.variantId !== undefined) {
        handleRemove(item.variantId)
      }
    }
  }

  function moveToWishlist(item: CartItemResponse) {
    const productId = item.productId
    const variantId = item.variantId
    if (productId === undefined || variantId === undefined) {
      return
    }
    setActionError(null)
    if (wishlist.isFavorited(productId)) {
      handleRemove(variantId)
      return
    }
    wishlist.toggle.mutate(
      { data: { productId } },
      {
        onSuccess: function () {
          handleRemove(variantId)
        },
        onError: function () {
          setActionError('Không thể chuyển sản phẩm sang Yêu thích. Vui lòng thử lại.')
        },
      },
    )
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
              Chọn tất cả ({selectable.length})
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={removeSelected}
                disabled={selected.length === 0}
                className="text-sm font-semibold text-zinc-500 transition hover:text-red-600 disabled:opacity-50 dark:text-zinc-400"
              >
                Xoá đã chọn
              </button>
              <button
                type="button"
                onClick={confirmClear}
                disabled={clearCart.isPending}
                className="text-sm font-semibold text-zinc-500 transition hover:text-red-600 disabled:opacity-50 dark:text-zinc-400"
              >
                Xoá giỏ
              </button>
            </div>
          </div>

          {actionError !== null && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>
          )}

          <div className="space-y-6">
            {shopGroups.map(function (group) {
              const shopIds: string[] = []
              for (const item of group.items) {
                if (item.variantId !== undefined && stockState(item) !== 'out') {
                  shopIds.push(item.variantId)
                }
              }
              const shopSelected =
                shopIds.length > 0 &&
                shopIds.every(function (id) {
                  return excluded.includes(id) === false
                })

              return (
                <div key={group.shopId}>
                  <div className="flex items-center justify-between gap-3 border-b border-zinc-200/70 pb-2 dark:border-white/10">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={shopSelected}
                        onChange={function () {
                          toggleShop(group)
                        }}
                        className="h-4 w-4 accent-indigo-600"
                      />
                      <Storefront size={16} weight="bold" className="text-indigo-500" />
                      {group.shopName}
                    </label>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {group.items.length} sản phẩm
                    </span>
                  </div>

                  <ul className="divide-y divide-zinc-200/70 dark:divide-white/10">
                    {group.items.map(function (item) {
                      const variantId = item.variantId ?? ''
                      const quantity = item.quantity ?? 0
                      const stock = item.stockQuantity ?? 0
                      const unitPrice = item.unitPrice ?? 0
                      const state = stockState(item)
                      const isSelected = state !== 'out' && excluded.includes(variantId) === false
                      const priceChange = classifyPriceChange(item)
                      const priceAtAdded = item.priceAtAdded ?? 0
                      const favorited = wishlist.isFavorited(item.productId)

                      let rowClass = 'flex gap-3 py-4'
                      if (state === 'out') {
                        rowClass += ' opacity-60'
                      }

                      let heartWeight: 'fill' | 'bold' = 'bold'
                      let heartClass =
                        'flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/10'
                      if (favorited) {
                        heartWeight = 'fill'
                        heartClass =
                          'flex h-8 w-8 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/10'
                      }

                      return (
                        <li key={variantId} className={rowClass}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={state === 'out'}
                            onChange={() => toggle(variantId)}
                            aria-label={`Chọn ${item.productName ?? ''}`}
                            className="mt-1 h-4 w-4 shrink-0 accent-indigo-600 disabled:opacity-40"
                          />

                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-white/5">
                            {item.productId !== undefined && (
                              <Link
                                to={`/product/${item.productId}`}
                                className="block h-full w-full"
                              >
                                <img
                                  src={imageUrl(item.imageKey)}
                                  alt={item.productName ?? 'Sản phẩm'}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  onError={function (event) {
                                    if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
                                      event.currentTarget.src = PLACEHOLDER_IMAGE
                                    }
                                  }}
                                />
                              </Link>
                            )}
                            {item.productId === undefined && (
                              <img
                                src={imageUrl(item.imageKey)}
                                alt={item.productName ?? 'Sản phẩm'}
                                loading="lazy"
                                className="h-full w-full object-cover"
                                onError={function (event) {
                                  if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
                                    event.currentTarget.src = PLACEHOLDER_IMAGE
                                  }
                                }}
                              />
                            )}
                            {state === 'out' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] font-black text-white">
                                HẾT HÀNG
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            {item.productId !== undefined && (
                              <Link
                                to={`/product/${item.productId}`}
                                className="line-clamp-2 font-bold transition hover:text-indigo-600 dark:hover:text-indigo-300"
                                title={item.productName}
                              >
                                {item.productName}
                              </Link>
                            )}
                            {item.productId === undefined && (
                              <p className="line-clamp-2 font-bold">{item.productName}</p>
                            )}
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {item.variantLabel} · SKU {item.sku}
                            </p>
                            <p className="mt-1 text-sm font-semibold">{formatVnd(unitPrice)}</p>

                            {priceChange === 'decreased' && (
                              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <TrendDown size={14} weight="bold" />
                                Giá đã giảm từ {formatVnd(priceAtAdded)} xuống{' '}
                                {formatVnd(unitPrice)}
                              </p>
                            )}
                            {priceChange === 'increased' && (
                              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <TrendUp size={14} weight="bold" />
                                Giá đã tăng từ {formatVnd(priceAtAdded)} lên {formatVnd(unitPrice)}
                              </p>
                            )}

                            {state === 'out' && (
                              <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                                Hết hàng
                              </p>
                            )}
                            {state === 'low' && (
                              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                Chỉ còn {stock} sản phẩm
                              </p>
                            )}

                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center rounded-full border border-zinc-200 dark:border-white/15">
                                <button
                                  type="button"
                                  aria-label="Giảm số lượng"
                                  disabled={
                                    quantity <= 1 || state === 'out' || updateQuantity.isPending
                                  }
                                  onClick={() =>
                                    updateQuantity.mutate({
                                      variantId,
                                      data: { quantity: quantity - 1 },
                                    })
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
                                >
                                  <Minus size={14} weight="bold" />
                                </button>
                                <span className="w-8 text-center text-sm font-semibold">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Tăng số lượng"
                                  disabled={
                                    quantity >= stock || state === 'out' || updateQuantity.isPending
                                  }
                                  onClick={() =>
                                    updateQuantity.mutate({
                                      variantId,
                                      data: { quantity: quantity + 1 },
                                    })
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
                                >
                                  <Plus size={14} weight="bold" />
                                </button>
                              </div>

                              <button
                                type="button"
                                aria-label="Chuyển sang Yêu thích"
                                disabled={wishlist.toggle.isPending}
                                onClick={function () {
                                  moveToWishlist(item)
                                }}
                                className={heartClass}
                              >
                                <Heart size={16} weight={heartWeight} />
                              </button>

                              <button
                                type="button"
                                aria-label="Xoá sản phẩm"
                                disabled={removeItem.isPending}
                                onClick={() => handleRemove(variantId)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>

                          <p className="shrink-0 text-right font-bold">
                            {formatVnd(unitPrice * quantity)}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>

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
