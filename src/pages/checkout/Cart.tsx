import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  CheckCircle,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Storefront,
  Trash,
  TrendDown,
  TrendUp,
  Truck,
} from '@phosphor-icons/react'

import Breadcrumb from '@/components/ui/Breadcrumb'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCheckoutPreview } from '@/hooks/useCheckoutPreview'
import { hookErrorMessage, urlOrPlaceholder, PLACEHOLDER_IMAGE } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { classifyPriceChange, groupCartByShop, stockState } from '@/lib/shop/cartView'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import { useCart } from '../../hooks/useCart'
import { useWishlist } from '../../hooks/useWishlist'

import type { CartShopGroup } from '@/lib/shop/cartView'
import type { CartItemResponse } from '@generated/model/cartItemResponse'
import type { ShopCheckoutPreview } from '@generated/model/shopCheckoutPreview'

function FreeShipHint(props: { quote: ShopCheckoutPreview }) {
  const subtotal = props.quote.subtotal ?? 0
  const amountToFreeShip = props.quote.amountToFreeShip ?? 0

  if (props.quote.freeShipApplied === true) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
        <CheckCircle size={14} weight="fill" className="shrink-0" />
        Đơn của shop được miễn phí vận chuyển
      </p>
    )
  }

  if (amountToFreeShip <= 0) {
    return null
  }

  let progress = Math.round((subtotal / (subtotal + amountToFreeShip)) * 100)
  if (progress > 100) {
    progress = 100
  }

  return (
    <div className="mt-2 text-xs">
      <p className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
        <Truck size={14} weight="fill" className="shrink-0 text-blue-700 dark:text-sky-300" />
        <span>
          Mua thêm{' '}
          <strong className="font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
            {formatVnd(amountToFreeShip)}
          </strong>{' '}
          để được miễn phí vận chuyển đơn của shop
        </span>
      </p>
      <progress
        value={progress}
        max={100}
        aria-label="Tiến độ miễn phí vận chuyển"
        className="sr-only"
      />
      <div
        aria-hidden="true"
        className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-zinc-200/80 dark:bg-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

type CartConfirmState = null | { kind: 'clear' } | { kind: 'removeSelected'; count: number }

export default function Cart() {
  const { items, totalQuantity, isLoading, isError, error, updateQuantity, removeItem, clearCart } =
    useCart()
  const wishlist = useWishlist()
  // Giu dang "loai tru" de item moi them vao mac dinh duoc tick.
  const [excluded, setExcluded] = useState<string[]>([])
  const [confirmState, setConfirmState] = useState<CartConfirmState>(null)
  const [pendingUpdateVariantId, setPendingUpdateVariantId] = useState<string | null>(null)
  const [pendingRemoveVariantId, setPendingRemoveVariantId] = useState<string | null>(null)
  const [pendingWishlistVariantId, setPendingWishlistVariantId] = useState<string | null>(null)
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

  // Phí ship/freeship theo từng đơn shop do server tính trên các món đang chọn.
  const selectedIds = selected.map(function (item) {
    return item.variantId ?? ''
  })
  const { preview } = useCheckoutPreview(selectedIds, selectedIds.length > 0)
  const shopQuotes = new Map<string, ShopCheckoutPreview>()
  if (preview !== null) {
    for (const shopQuote of preview.shops ?? []) {
      shopQuotes.set(shopQuote.shopId ?? '', shopQuote)
    }
  }

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

  function handleUpdateQty(variantId: string, nextQuantity: number) {
    setPendingUpdateVariantId(variantId)
    updateQuantity.mutate(
      { variantId, data: { quantity: nextQuantity } },
      {
        onError: function (err) {
          notify.fromError(err, 'cart', 'Không thể cập nhật số lượng')
        },
        onSettled: function () {
          setPendingUpdateVariantId(null)
        },
      },
    )
  }

  function handleRemove(variantId: string, successMessage?: string) {
    const resolvedSuccess = successMessage ?? 'Đã xoá sản phẩm khỏi giỏ hàng'
    setPendingRemoveVariantId(variantId)
    removeItem.mutate(
      { variantId },
      {
        onSuccess: function () {
          notify.success(resolvedSuccess)
        },
        onError: function (err) {
          notify.fromError(err, 'cart', 'Không thể xoá sản phẩm khỏi giỏ hàng')
        },
        onSettled: function () {
          setPendingRemoveVariantId(null)
        },
      },
    )
  }

  function requestClear() {
    setConfirmState({ kind: 'clear' })
  }

  function requestRemoveSelected() {
    if (selected.length === 0) {
      return
    }
    setConfirmState({ kind: 'removeSelected', count: selected.length })
  }

  function handleConfirmDialog() {
    if (confirmState === null) {
      return
    }
    if (confirmState.kind === 'clear') {
      setConfirmState(null)
      clearCart.mutate(undefined, {
        onSuccess: function () {
          notify.success('Đã xoá toàn bộ giỏ hàng')
        },
        onError: function (err) {
          notify.fromError(err, 'cart', 'Không thể xoá giỏ hàng')
        },
      })
      return
    }

    setConfirmState(null)
    const targets: string[] = []
    for (const item of selected) {
      if (item.variantId !== undefined) {
        targets.push(item.variantId)
      }
    }
    if (targets.length === 0) {
      return
    }
    let notifiedSuccess = false
    for (const variantId of targets) {
      removeItem.mutate(
        { variantId },
        {
          onSuccess: function () {
            if (notifiedSuccess === false) {
              notifiedSuccess = true
              notify.success(`Đã xoá ${targets.length} sản phẩm đã chọn`)
            }
          },
          onError: function (err) {
            notify.fromError(err, 'cart', 'Không thể xoá sản phẩm đã chọn')
          },
        },
      )
    }
  }

  function moveToWishlist(item: CartItemResponse) {
    const productId = item.productId
    const variantId = item.variantId
    if (productId === undefined || variantId === undefined) {
      return
    }
    if (wishlist.isFavorited(productId)) {
      handleRemove(variantId, 'Đã chuyển sản phẩm sang Yêu thích')
      return
    }
    setPendingWishlistVariantId(variantId)
    wishlist.toggle.mutate(
      { data: { productId } },
      {
        onSuccess: function () {
          handleRemove(variantId, 'Đã chuyển sản phẩm sang Yêu thích')
        },
        onError: function (err) {
          notify.fromError(
            err,
            'wishlist',
            'Không thể chuyển sản phẩm sang Yêu thích. Vui lòng thử lại.',
          )
        },
        onSettled: function () {
          setPendingWishlistVariantId(null)
        },
      },
    )
  }

  let body = (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2].map(function (index) {
        return <Skeleton key={index} className="h-24 w-full rounded-3xl" />
      })}
    </div>
  )

  if (isError) {
    body = (
      <p className="text-sm text-rose-600 dark:text-rose-400">{hookErrorMessage('cart', error)}</p>
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
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 cursor-pointer accent-blue-600"
              />
              Chọn tất cả ({selectable.length})
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={requestRemoveSelected}
                disabled={selected.length === 0}
                className="cursor-pointer text-sm font-semibold text-zinc-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:text-rose-400"
              >
                Xoá đã chọn
              </button>
              <button
                type="button"
                onClick={requestClear}
                disabled={clearCart.isPending}
                className="cursor-pointer text-sm font-semibold text-zinc-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:text-rose-400"
              >
                Xoá giỏ
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {shopGroups.map(function (group) {
              const shopIds: string[] = []
              let shopSubtotal = 0
              for (const item of group.items) {
                const vId = item.variantId ?? ''
                if (item.variantId !== undefined && stockState(item) !== 'out') {
                  shopIds.push(item.variantId)
                  if (excluded.includes(vId) === false) {
                    shopSubtotal += (item.unitPrice ?? 0) * (item.quantity ?? 0)
                  }
                }
              }
              const shopSelected =
                shopIds.length > 0 &&
                shopIds.every(function (id) {
                  return excluded.includes(id) === false
                })
              const shopQuote = shopQuotes.get(group.shopId)

              return (
                <div key={group.shopId}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 pb-2 dark:border-white/10">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={shopSelected}
                        onChange={function () {
                          toggleShop(group)
                        }}
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                      />
                      <Storefront
                        size={16}
                        weight="bold"
                        className="text-blue-700 dark:text-sky-300"
                      />
                      {group.shopName}
                    </label>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {group.items.length} sản phẩm
                      </span>
                      <span className="font-bold text-blue-700 dark:text-sky-300">
                        Tạm tính: {formatVnd(shopSubtotal)}
                      </span>
                    </div>
                  </div>
                  {shopQuote !== undefined && <FreeShipHint quote={shopQuote} />}

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
                      const isUpdatingItem =
                        updateQuantity.isPending && pendingUpdateVariantId === variantId
                      const isRemovingItem =
                        removeItem.isPending && pendingRemoveVariantId === variantId
                      const isMovingItem =
                        wishlist.toggle.isPending && pendingWishlistVariantId === variantId

                      let rowClass = 'flex gap-3 py-4'
                      if (state === 'out') {
                        rowClass += ' opacity-60'
                      }

                      let heartWeight: 'fill' | 'bold' = 'bold'
                      let heartClass =
                        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-500/10'
                      if (favorited) {
                        heartWeight = 'fill'
                        heartClass =
                          'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-500/10'
                      }

                      return (
                        <li key={variantId} className={rowClass}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={state === 'out'}
                            onChange={() => toggle(variantId)}
                            aria-label={`Chọn ${item.productName ?? ''}`}
                            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                          />

                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-white/5">
                            {item.productId !== undefined && (
                              <Link
                                to={`/product/${item.productId}`}
                                className="block h-full w-full"
                              >
                                <img
                                  src={urlOrPlaceholder(item.imageUrl)}
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
                                src={urlOrPlaceholder(item.imageUrl)}
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
                                className="line-clamp-2 font-bold transition hover:text-blue-700 dark:hover:text-sky-300"
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
                            <p className="mt-1 text-sm font-semibold tabular-nums">
                              {formatVnd(unitPrice)}
                            </p>

                            {priceChange === 'decreased' && (
                              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                                <TrendDown size={14} weight="bold" />
                                Giá đã giảm từ {formatVnd(priceAtAdded)} xuống{' '}
                                {formatVnd(unitPrice)}
                              </p>
                            )}
                            {priceChange === 'increased' && (
                              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                                <TrendUp size={14} weight="bold" />
                                Giá đã tăng từ {formatVnd(priceAtAdded)} lên {formatVnd(unitPrice)}
                              </p>
                            )}

                            {state === 'out' && (
                              <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                Hết hàng
                              </p>
                            )}
                            {state === 'low' && (
                              <p className="mt-1 text-xs text-amber-600 tabular-nums dark:text-amber-400">
                                Chỉ còn {stock} sản phẩm
                              </p>
                            )}

                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center rounded-full border border-zinc-300 bg-white/80 dark:border-white/15 dark:bg-white/10">
                                <button
                                  type="button"
                                  aria-label="Giảm số lượng"
                                  disabled={quantity <= 1 || state === 'out' || isUpdatingItem}
                                  onClick={() => handleUpdateQty(variantId, quantity - 1)}
                                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
                                >
                                  <Minus size={14} weight="bold" />
                                </button>
                                <span className="w-8 text-center text-sm font-semibold tabular-nums">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Tăng số lượng"
                                  disabled={quantity >= stock || state === 'out' || isUpdatingItem}
                                  onClick={() => handleUpdateQty(variantId, quantity + 1)}
                                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
                                >
                                  <Plus size={14} weight="bold" />
                                </button>
                              </div>

                              <button
                                type="button"
                                aria-label="Chuyển sang Yêu thích"
                                disabled={isMovingItem || isRemovingItem}
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
                                disabled={isRemovingItem}
                                onClick={() => handleRemove(variantId)}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-500/10"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>

                          <p className="shrink-0 text-right font-bold tabular-nums">
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
        </section>

        <aside className="glass h-fit rounded-3xl p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold tracking-tight">Tóm tắt</h2>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Đã chọn</dt>
              <dd className="font-semibold tabular-nums">{selectedCount} sản phẩm</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Tạm tính</dt>
              <dd className="font-bold tabular-nums">{formatVnd(selectedTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Phí ship</dt>
              <dd className="font-semibold">
                {preview !== null && preview.shippingFee === 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">Miễn phí</span>
                )}
                {preview !== null && (preview.shippingFee ?? 0) > 0 && (
                  <span className="tabular-nums">{formatVnd(preview.shippingFee ?? 0)}</span>
                )}
                {preview === null && <span>Tính ở bước đặt hàng</span>}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={goCheckout}
            disabled={selected.length === 0}
            className="btn-primary mt-5 w-full cursor-pointer rounded-full py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Thanh toán ({selected.length})
          </button>
          <p className="mt-3 text-center text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {totalQuantity} sản phẩm trong giỏ · thanh toán khi nhận hàng
          </p>
        </aside>
      </div>
    )
  }

  let dialogTitle = ''
  let dialogDescription = ''
  let dialogConfirmLabel = 'Xác nhận'
  let dialogPending = false
  if (confirmState !== null) {
    if (confirmState.kind === 'clear') {
      dialogTitle = 'Xoá toàn bộ giỏ hàng?'
      dialogDescription = 'Tất cả sản phẩm trong giỏ hàng của bạn sẽ bị xoá và không thể hoàn tác.'
      dialogConfirmLabel = 'Xoá tất cả'
      dialogPending = clearCart.isPending
    } else {
      dialogTitle = `Xoá ${confirmState.count} sản phẩm đã chọn?`
      dialogDescription = 'Các sản phẩm đang chọn sẽ bị xoá khỏi giỏ hàng của bạn.'
      dialogConfirmLabel = 'Xác nhận xoá'
      dialogPending = removeItem.isPending
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-24 pb-28 lg:pb-16">
      <Breadcrumb
        items={[{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]}
        showHomeIcon={true}
        className="mb-4"
      />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
          <ShoppingBag size={22} weight="bold" className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tighter">Giỏ hàng</h1>
      </div>
      {body}

      {/* Sticky Mobile Checkout Bar */}
      {isLoading === false && items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/90 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-md lg:hidden dark:border-white/10 dark:bg-[#11182a]/95">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Tạm tính ({selectedCount} sản phẩm)
              </p>
              <p className="truncate text-base font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
                {formatVnd(selectedTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={goCheckout}
              disabled={selected.length === 0}
              className={cn(
                'btn-primary shrink-0 cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
                FOCUS_RING_CLASS,
              )}
            >
              Thanh toán ({selected.length})
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmState !== null}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={dialogConfirmLabel}
        cancelLabel="Hủy"
        variant="danger"
        isPending={dialogPending}
        onConfirm={handleConfirmDialog}
        onCancel={function () {
          setConfirmState(null)
        }}
      />
    </main>
  )
}
