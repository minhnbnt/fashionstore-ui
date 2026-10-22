import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Storefront,
  Trash,
  TrendDown,
  TrendUp,
  Truck,
  WarningCircle,
} from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import { useCart } from '../hooks/useCart'
import { useWishlist } from '../hooks/useWishlist'

import type { CartItemResponse } from '@generated/model/cartItemResponse'

interface ShopCartGroup {
  shopId: string
  shopName: string
  items: CartItemResponse[]
}

export default function Cart() {
  const cart = useCart()
  const wishlist = useWishlist()
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(function () {
      setToast(null)
    }, 2800)
  }

  // Nhóm các sản phẩm theo từng Shop riêng biệt theo đặc tả 1.4.1
  const shopGroups = useMemo(function () {
    const map = new Map<string, ShopCartGroup>()
    for (const item of cart.items) {
      const sId = item.shopId ?? 'other-shop'
      const sName = item.shopName ?? 'Cửa hàng'
      let group = map.get(sId)
      if (!group) {
        group = {
          shopId: sId,
          shopName: sName,
          items: [],
        }
        map.set(sId, group)
      }
      group.items.push(item)
    }
    return Array.from(map.values())
  }, [cart.items])

  // Lọc danh sách các mặt hàng còn hàng có thể chọn
  const availableItems = useMemo(function () {
    return cart.items.filter(function (it) {
      return (it.stockQuantity ?? 0) > 0
    })
  }, [cart.items])

  // Trạng thái Chọn tất cả
  const isAllSelected =
    availableItems.length > 0 &&
    availableItems.every(function (it) {
      return it.variantId !== undefined && selectedIds.includes(it.variantId)
    })

  function handleToggleAll() {
    if (isAllSelected) {
      setSelectedIds([])
      return
    }
    const ids: string[] = []
    for (const item of availableItems) {
      if (item.variantId !== undefined) {
        ids.push(item.variantId)
      }
    }
    setSelectedIds(ids)
  }

  // Chọn / bỏ chọn toàn bộ sản phẩm của 1 Shop
  function handleToggleShop(group: ShopCartGroup) {
    const availableShopItems = group.items.filter(function (it) {
      return (it.stockQuantity ?? 0) > 0
    })
    if (availableShopItems.length === 0) {
      showToast('Tất cả sản phẩm trong shop này hiện đã hết hàng')
      return
    }

    const isShopAllSelected = availableShopItems.every(function (it) {
      return it.variantId !== undefined && selectedIds.includes(it.variantId)
    })

    const shopVariantIds = group.items
      .map(function (it) {
        return it.variantId
      })
      .filter(function (id): id is string {
        return id !== undefined
      })

    if (isShopAllSelected) {
      // Bỏ chọn tất cả sản phẩm của shop này
      setSelectedIds(function (prev) {
        return prev.filter(function (id) {
          return !shopVariantIds.includes(id)
        })
      })
    } else {
      // Thêm toàn bộ sản phẩm còn hàng của shop này vào danh sách chọn
      setSelectedIds(function (prev) {
        const set = new Set(prev)
        for (const it of availableShopItems) {
          if (it.variantId !== undefined) {
            set.add(it.variantId)
          }
        }
        return Array.from(set)
      })
    }
  }

  function handleToggleItem(item: CartItemResponse) {
    if (item.variantId === undefined) {
      return
    }
    if ((item.stockQuantity ?? 0) <= 0) {
      showToast('Sản phẩm đã hết hàng, không thể chọn thanh toán')
      return
    }
    const variantId = item.variantId
    setSelectedIds(function (prev) {
      if (prev.includes(variantId)) {
        return prev.filter(function (id) {
          return id !== variantId
        })
      }
      return [...prev, variantId]
    })
  }

  function handleUpdateQty(item: CartItemResponse, newQty: number) {
    if (item.variantId === undefined || newQty < 1) {
      return
    }
    const stock = item.stockQuantity ?? 0
    if (newQty > stock) {
      showToast(`Chỉ còn ${stock} sản phẩm trong kho`)
      return
    }
    cart.updateQuantity.mutate(
      { variantId: item.variantId, data: { quantity: newQty } },
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

  // Nghiệp vụ: Chuyển sang Yêu thích (Wishlist) cho sản phẩm chưa muốn mua ngay
  function handleMoveToWishlist(item: CartItemResponse) {
    if (!item.productId || !item.variantId) {
      return
    }
    const prodId = item.productId
    const varId = item.variantId
    const name = item.productName ?? 'Sản phẩm'

    if (!wishlist.isFavorited(prodId)) {
      wishlist.toggle.mutate(
        { data: { productId: prodId } },
        {
          onSuccess: function () {
            handleRemoveItem(varId)
            showToast(`Đã chuyển "${name}" sang danh sách Yêu thích`)
          },
          onError: function () {
            showToast('Không thể chuyển sang Yêu thích. Vui lòng thử lại.')
          },
        },
      )
    } else {
      // Đã có trong wishlist -> chỉ cần xóa khỏi giỏ
      handleRemoveItem(varId)
      showToast(`"${name}" đã có trong danh sách Yêu thích`)
    }
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

  // Kiểm tra xem có sản phẩm nào đang chọn bị vượt tồn kho không
  const hasOverStockItem = cart.items.some(function (item) {
    return (
      item.variantId !== undefined &&
      selectedIds.includes(item.variantId) &&
      (item.quantity ?? 1) > (item.stockQuantity ?? 0)
    )
  })

  function handleProceedToCheckout() {
    if (selectedIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán')
      return
    }
    if (hasOverStockItem) {
      showToast('Có sản phẩm vượt quá tồn kho. Vui lòng điều chỉnh số lượng trước khi đặt hàng.')
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

  if (!cart.isLoggedIn) {
    return (
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-4 pt-32 pb-24 text-center md:pt-36 min-h-[calc(100vh-100px)]">
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
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-4 pt-32 pb-24 text-center md:pt-36 min-h-[calc(100vh-100px)]">
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
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 pt-32 pb-44 md:pt-36 min-h-[calc(100vh-100px)]">
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

      {/* Header Danh Sách Chung */}
      <div className="mt-6 hidden grid-cols-12 items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50/70 px-6 py-3.5 text-xs font-bold text-zinc-600 sm:grid dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300">
        <div className="col-span-6 flex items-center gap-3">
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
        <div className="col-span-1 text-center">Số Tiền</div>
        <div className="col-span-1 text-center">Thao Tác</div>
      </div>

      {/* Danh Sách Món Hàng Nhóm Theo Shop (Chuẩn Đặc Tả 1.4.1) */}
      <div className="mt-4 space-y-6">
        {shopGroups.map(function (group) {
          const availableShopItems = group.items.filter(function (it) {
            return (it.stockQuantity ?? 0) > 0
          })
          const isShopAllSelected =
            availableShopItems.length > 0 &&
            availableShopItems.every(function (it) {
              return it.variantId !== undefined && selectedIds.includes(it.variantId)
            })

          return (
            <div
              key={group.shopId}
              className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-xs transition dark:border-zinc-800 dark:bg-zinc-900/90"
            >
              {/* Header của Shop: Checkbox + Tên Shop */}
              <div className="flex items-center justify-between border-b border-sky-100 bg-sky-50/40 px-4 py-3 sm:px-6 dark:border-zinc-800 dark:bg-zinc-800/40">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`shop-select-${group.shopId}`}
                    checked={isShopAllSelected}
                    onChange={function () {
                      handleToggleShop(group)
                    }}
                    className="h-4 w-4 cursor-pointer rounded accent-blue-600"
                  />
                  <Storefront size={18} weight="bold" className="text-blue-600 dark:text-sky-400" />
                  <Link
                    to={`/shops/${group.shopId}`}
                    className="text-sm font-extrabold text-zinc-900 transition hover:text-blue-600 hover:underline dark:text-white dark:hover:text-sky-300"
                  >
                    {group.shopName}
                  </Link>
                  <span className="rounded-md bg-blue-100/70 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-sky-300">
                    Đối tác
                  </span>
                </div>
              </div>

              {/* Danh sách các sản phẩm trong Shop */}
              <div className="divide-y divide-sky-100 dark:divide-zinc-800/70">
                {group.items.map(function (item) {
                  const isSelected =
                    item.variantId !== undefined && selectedIds.includes(item.variantId)
                  const unitPrice = item.unitPrice ?? 0
                  const quantity = item.quantity ?? 1
                  const lineTotal = unitPrice * quantity
                  const stock = item.stockQuantity ?? 0
                  const isOutOfStock = stock <= 0
                  const isOverStock = !isOutOfStock && quantity > stock
                  const isLowStock = !isOutOfStock && stock <= 5

                  // Cảnh báo đổi giá theo đặc tả 1.4.1
                  const priceAtAdded = item.priceAtAdded ?? unitPrice
                  const hasPriceChange =
                    Boolean(item.priceChanged) || (priceAtAdded > 0 && priceAtAdded !== unitPrice)
                  const priceDecreased = hasPriceChange && unitPrice < priceAtAdded
                  const priceIncreased = hasPriceChange && unitPrice > priceAtAdded

                  return (
                    <div
                      key={item.variantId}
                      className={`grid grid-cols-1 items-center gap-4 px-4 py-4 transition sm:grid-cols-12 sm:px-6 ${
                        isOutOfStock
                          ? 'bg-zinc-50/70 opacity-60 dark:bg-zinc-900/50'
                          : 'hover:bg-sky-50/20 dark:hover:bg-zinc-800/20'
                      }`}
                    >
                      {/* Cột 1: Checkbox + Ảnh + Tên sản phẩm + Cảnh báo */}
                      <div className="col-span-6 flex items-start gap-3 sm:items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isOutOfStock}
                          onChange={function () {
                            handleToggleItem(item)
                          }}
                          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded accent-blue-600 disabled:cursor-not-allowed sm:mt-0"
                        />

                        {/* Hình ảnh sản phẩm (Shopee Thumbnail) */}
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-sky-100 bg-zinc-100 shadow-xs dark:border-zinc-800 dark:bg-zinc-800">
                          {item.productId ? (
                            <Link
                              to={`/products/${item.productId}`}
                              className="group block h-full w-full"
                            >
                              <img
                                src={imageUrl(item.imageKey)}
                                alt={item.productName ?? 'Sản phẩm'}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                onError={function (e) {
                                  e.currentTarget.src = PLACEHOLDER_IMAGE
                                }}
                              />
                            </Link>
                          ) : (
                            <img
                              src={imageUrl(item.imageKey)}
                              alt={item.productName ?? 'Sản phẩm'}
                              className="h-full w-full object-cover"
                              onError={function (e) {
                                e.currentTarget.src = PLACEHOLDER_IMAGE
                              }}
                            />
                          )}
                          {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] font-black text-white">
                              HẾT HÀNG
                            </div>
                          )}
                        </div>

                        {/* Tên & Chi tiết */}
                        <div className="min-w-0 flex-1">
                          {item.productId ? (
                            <Link
                              to={`/products/${item.productId}`}
                              className="line-clamp-2 block text-sm font-bold text-zinc-900 transition hover:text-blue-600 hover:underline dark:text-white dark:hover:text-sky-400"
                              title={item.productName}
                            >
                              {item.productName}
                            </Link>
                          ) : (
                            <p className="line-clamp-2 text-sm font-bold text-zinc-900 dark:text-white">
                              {item.productName}
                            </p>
                          )}

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                              {item.variantLabel}
                            </span>
                            {item.sku !== undefined && (
                              <span className="text-[11px] text-zinc-400">SKU: {item.sku}</span>
                            )}
                          </div>

                          {/* Cảnh báo thay đổi giá */}
                          {priceDecreased && (
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <TrendDown size={14} weight="bold" />
                              <span>
                                Giá đã giảm từ {formatVnd(priceAtAdded)} xuống {formatVnd(unitPrice)}{' '}
                                (Tiết kiệm hơn)
                              </span>
                            </div>
                          )}
                          {priceIncreased && (
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <TrendUp size={14} weight="bold" />
                              <span>
                                Giá sản phẩm đã tăng từ {formatVnd(priceAtAdded)} lên{' '}
                                {formatVnd(unitPrice)}
                              </span>
                            </div>
                          )}

                          {/* Cảnh báo tồn kho */}
                          {isOutOfStock && (
                            <span className="mt-1.5 inline-block rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-300">
                              Sản phẩm hiện đã hết hàng
                            </span>
                          )}
                          {isOverStock && (
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                              <WarningCircle size={14} weight="bold" />
                              <span>Vượt quá tồn kho (Hiện còn {stock} sản phẩm)</span>
                            </div>
                          )}
                          {isLowStock && (
                            <span className="mt-1 inline-block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              Chỉ còn {stock} sản phẩm trong kho
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cột 2: Đơn giá */}
                      <div className="col-span-2 text-left sm:text-center">
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                          {formatVnd(unitPrice)}
                        </span>
                        {hasPriceChange && (
                          <div className="text-[11px] text-zinc-400 line-through">
                            {formatVnd(priceAtAdded)}
                          </div>
                        )}
                      </div>

                      {/* Cột 3: Tăng giảm số lượng */}
                      <div className="col-span-2 flex items-center justify-start sm:justify-center">
                        <div className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-2 py-1 dark:border-white/15 dark:bg-zinc-800">
                          <button
                            type="button"
                            aria-label="Giảm"
                            disabled={cart.updateQuantity.isPending || quantity <= 1 || isOutOfStock}
                            onClick={function () {
                              handleUpdateQty(item, quantity - 1)
                            }}
                            className="rounded-full p-1 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="min-w-6 text-center text-xs font-extrabold">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Tăng"
                            disabled={
                              cart.updateQuantity.isPending || quantity >= stock || isOutOfStock
                            }
                            onClick={function () {
                              handleUpdateQty(item, quantity + 1)
                            }}
                            className="rounded-full p-1 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            title={quantity >= stock ? 'Đã đạt số lượng tồn kho tối đa' : 'Tăng'}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Cột 4: Thành tiền */}
                      <div className="col-span-1 text-left sm:text-center">
                        <span className="text-sm font-extrabold text-blue-700 dark:text-sky-300">
                          {formatVnd(lineTotal)}
                        </span>
                      </div>

                      {/* Cột 5: Thao tác (Chuyển sang Yêu thích + Xóa) */}
                      <div className="col-span-1 flex items-center justify-end gap-1 sm:justify-center">
                        <button
                          type="button"
                          aria-label="Chuyển sang Yêu thích"
                          title="Chuyển sang Yêu thích"
                          disabled={wishlist.toggle.isPending}
                          onClick={function () {
                            handleMoveToWishlist(item)
                          }}
                          className={`rounded-full p-2 transition hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-500/10 dark:hover:text-pink-400 ${
                            item.productId && wishlist.isFavorited(item.productId)
                              ? 'text-pink-600 dark:text-pink-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          <Heart
                            size={16}
                            weight={
                              item.productId && wishlist.isFavorited(item.productId)
                                ? 'fill'
                                : 'bold'
                            }
                          />
                        </button>
                        <button
                          type="button"
                          aria-label="Xóa"
                          title="Xóa khỏi giỏ"
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
          )
        })}
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
              <span>Chọn Tất Cả ({availableItems.length})</span>
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
              <div className="text-xs text-zinc-500">
                Tổng thanh toán ({selectedCount} sản phẩm):
              </div>
              <div className="text-base font-black text-blue-700 sm:text-xl dark:text-sky-300">
                {formatVnd(selectedTotal)}
              </div>
            </div>

            <button
              type="button"
              disabled={selectedIds.length === 0 || hasOverStockItem}
              onClick={handleProceedToCheckout}
              className="btn-primary rounded-full px-6 py-3 text-sm font-extrabold shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mua Hàng ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
