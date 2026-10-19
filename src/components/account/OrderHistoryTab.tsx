import { useState } from 'react'
import { Link } from 'react-router'

import {
  getMine2QueryKey,
  useCancel1,
  useConfirmReceipt,
  useMine2,
} from '@generated/endpoints/orders/orders'
import {
  ArrowClockwise,
  ArrowRight,
  CheckCircle,
  ClockCountdown,
  MagnifyingGlass,
  Package,
  ShoppingBag,
  Storefront,
  Truck,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'

import type { OrderResponse } from '@generated/model/orderResponse'

type OrderStatusFilter = 'ALL' | 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

const TABS: { key: OrderStatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'SHIPPED', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
]

export default function OrderHistoryTab() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<OrderStatusFilter>('ALL')
  const [searchCode, setSearchCode] = useState('')
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const ordersQuery = useMine2()

  let orders: OrderResponse[] = []
  if (ordersQuery.data !== undefined) {
    const raw = takeData(ordersQuery.data)
    if (Array.isArray(raw)) {
      orders = raw
    }
  }

  const cancelMutation = useCancel1({
    mutation: {
      onSuccess: function () {
        setActionNotice('Đã hủy đơn hàng thành công.')
        setActionError(null)
        void queryClient.invalidateQueries({ queryKey: getMine2QueryKey() })
      },
      onError: function () {
        setActionError('Không thể hủy đơn hàng vào lúc này. Vui lòng thử lại.')
      },
    },
  })

  const confirmReceiptMutation = useConfirmReceipt({
    mutation: {
      onSuccess: function () {
        setActionNotice('Đã xác nhận đã nhận hàng thành công. Cảm ơn bạn!')
        setActionError(null)
        void queryClient.invalidateQueries({ queryKey: getMine2QueryKey() })
      },
      onError: function () {
        setActionError('Không thể xác nhận nhận hàng. Vui lòng thử lại.')
      },
    },
  })

  function handleCancelOrder(orderId: string | undefined) {
    if (orderId === undefined || orderId === '') {
      return
    }
    const confirmed = window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')
    if (confirmed === false) {
      return
    }
    setActionNotice(null)
    setActionError(null)
    cancelMutation.mutate({ id: orderId })
  }

  function handleConfirmReceipt(orderId: string | undefined) {
    if (orderId === undefined || orderId === '') {
      return
    }
    const confirmed = window.confirm('Bạn xác nhận đã nhận đầy đủ sản phẩm và hài lòng?')
    if (confirmed === false) {
      return
    }
    setActionNotice(null)
    setActionError(null)
    confirmReceiptMutation.mutate({ id: orderId })
  }

  // Filter orders by tab and search
  const filteredOrders = orders.filter(function (order) {
    if (activeTab !== 'ALL' && order.status !== activeTab) {
      return false
    }
    if (searchCode.trim() !== '') {
      const q = searchCode.trim().toLowerCase()
      const codeMatch = order.code !== undefined && order.code.toLowerCase().includes(q)
      let itemMatch = false
      if (order.items !== undefined) {
        for (const item of order.items) {
          if (item.productName !== undefined && item.productName.toLowerCase().includes(q)) {
            itemMatch = true
            break
          }
        }
      }
      if (codeMatch === false && itemMatch === false) {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Tab Header Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Đơn mua của tôi
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Quản lý và theo dõi trạng thái các đơn hàng đã mua
          </p>
        </div>
        <button
          type="button"
          onClick={function () {
            void ordersQuery.refetch()
          }}
          disabled={ordersQuery.isFetching}
          className="inline-flex items-center gap-1.5 self-start rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <ArrowClockwise
            size={14}
            className={ordersQuery.isFetching ? 'animate-spin text-orange-600' : ''}
          />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Notifications */}
      {actionNotice !== null && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle size={16} weight="fill" className="shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}
      {actionError !== null && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          <WarningCircle size={16} weight="fill" className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Shopee-style Status Filter Tabs */}
      <div className="flex overflow-x-auto border-b border-zinc-200 bg-white no-scrollbar dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map(function (tab) {
          const isActive = activeTab === tab.key
          let count = 0
          if (tab.key === 'ALL') {
            count = orders.length
          }
          if (tab.key !== 'ALL') {
            count = orders.filter(function (o) {
              return o.status === tab.key
            }).length
          }

          let tabClassName =
            'relative shrink-0 px-5 py-3 text-sm font-bold transition flex items-center gap-1.5'
          if (isActive) {
            tabClassName += ' text-orange-600 dark:text-orange-400'
          }
          if (isActive === false) {
            tabClassName +=
              ' text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }

          return (
            <button
              key={tab.key}
              type="button"
              onClick={function () {
                setActiveTab(tab.key)
              }}
              className={tabClassName}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-extrabold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-orange-600 dark:bg-orange-500" />
              )}
            </button>
          )
        })}
      </div>

      {/* Search Order Bar */}
      <div className="relative">
        <label htmlFor="searchOrderInput" className="sr-only">
          Tìm kiếm đơn hàng
        </label>
        <MagnifyingGlass
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400"
        />
        <input
          id="searchOrderInput"
          type="text"
          value={searchCode}
          onChange={function (e) {
            setSearchCode(e.target.value)
          }}
          placeholder="Tìm đơn hàng theo Mã đơn hoặc Tên sản phẩm…"
          className="w-full rounded-2xl border border-zinc-200 bg-white py-2.5 pr-4 pl-10 text-xs font-medium text-zinc-800 placeholder-zinc-400 transition focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100"
        />
      </div>

      {/* Loading state */}
      {ordersQuery.isLoading && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900">
          <ArrowClockwise size={28} className="animate-spin text-orange-600" />
          <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Đang tải dữ liệu đơn hàng từ CSDL…
          </p>
        </div>
      )}

      {/* Empty State */}
      {ordersQuery.isLoading === false && filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
            <Package size={32} weight="duotone" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-white">
            Chưa có đơn hàng nào
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Bạn chưa có đơn hàng nào trong mục này. Hãy dạo quanh nét để khám phá những sản phẩm thời
            trang hot nhất!
          </p>
          <Link
            to="/search"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700"
          >
            <ShoppingBag size={15} weight="bold" />
            <span>Mua sắm ngay</span>
          </Link>
        </div>
      )}

      {/* Orders List */}
      {ordersQuery.isLoading === false && filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map(function (order) {
            const isPending = order.status === 'PENDING'
            const isDelivered = order.status === 'DELIVERED'
            const isCancelled = order.status === 'CANCELLED'
            const isShipped = order.status === 'SHIPPED'

            return (
              <article
                key={order.id ?? order.code}
                className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5 dark:border-zinc-800/80 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-2.5">
                    <Storefront size={18} weight="fill" className="text-orange-600" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      Mã đơn: #{order.code ?? order.id?.slice(0, 8)}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        <ClockCountdown size={13} weight="bold" />
                        Chờ xác nhận
                      </span>
                    )}
                    {isShipped && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">
                        <Truck size={13} weight="bold" />
                        Đang vận chuyển
                      </span>
                    )}
                    {isDelivered && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                        <CheckCircle size={13} weight="fill" />
                        Giao hàng thành công
                      </span>
                    )}
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                        <XCircle size={13} weight="bold" />
                        Đã hủy
                      </span>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
                  {(order.items ?? []).map(function (item) {
                    return (
                      <div
                        key={item.id ?? item.productId}
                        className="flex items-center gap-4 py-4"
                      >
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                          <ShoppingBag size={24} weight="duotone" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="line-clamp-2 text-xs font-bold text-zinc-900 dark:text-white">
                            {item.productName ?? 'Sản phẩm thời trang nét'}
                          </h4>
                          {item.variantLabel !== undefined && item.variantLabel !== null && (
                            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                              Phân loại: {item.variantLabel}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            Số lượng: x{item.quantity ?? 1}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">
                            {formatVnd(item.lineTotal ?? item.unitPrice ?? 0)}
                          </p>
                          {item.quantity !== undefined &&
                            item.quantity > 1 &&
                            item.unitPrice !== undefined && (
                              <p className="text-[10px] text-zinc-400">
                                {formatVnd(item.unitPrice)} / món
                              </p>
                            )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Shipping & Payment Summary */}
                <div className="border-t border-zinc-100 bg-zinc-50/40 px-5 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/20 dark:text-zinc-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                        Giao tới:{' '}
                      </span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {order.shippingName ?? 'Người nhận'}{' '}
                        {order.shippingPhone !== undefined && order.shippingPhone !== null && (
                          <span>({order.shippingPhone})</span>
                        )}
                      </span>
                      <span className="ml-1 text-[11px] text-zinc-500">
                        - {order.shippingAddress ?? 'Địa chỉ mặc định'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-zinc-400">
                        (Phí ship: {formatVnd(order.shippingFee ?? 0)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Thành tiền ({order.items?.length ?? 1} sản phẩm):
                    </span>
                    <span className="text-base font-black text-orange-600 dark:text-orange-500">
                      {formatVnd(order.total ?? 0)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Action 1: Cancel order if PENDING */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={function () {
                          handleCancelOrder(order.id)
                        }}
                        disabled={cancelMutation.isPending}
                        className="rounded-full border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                      >
                        Hủy đơn hàng
                      </button>
                    )}

                    {/* Action 2: Confirm receipt if DELIVERED */}
                    {isDelivered && (
                      <button
                        type="button"
                        onClick={function () {
                          handleConfirmReceipt(order.id)
                        }}
                        disabled={confirmReceiptMutation.isPending}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Đã nhận được hàng
                      </button>
                    )}

                    {/* Action 3: Buy Again */}
                    <Link
                      to="/search"
                      className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
                    >
                      <span>Mua lại</span>
                      <ArrowRight size={13} weight="bold" />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
