import { useState } from 'react'

import {
  getList5QueryKey,
  useCancel,
  useConfirm,
  useDeliver,
  useList5,
  useShip,
} from '@generated/endpoints/seller-orders/seller-orders'
import { getInventoryQueryKey } from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import { MagnifyingGlass, CheckCircle, Truck, X, Phone, MapPin } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'
import { orderItem } from '@/lib/sellerAdapters'

import { formatVnd } from '../../lib/format'

import type { OrderItem } from '@/types/seller'

interface Props {
  shopId: string
}

export default function SellerOrdersTab({ shopId }: Props) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED'
  >('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('Hết hàng trong kho')
  const [notification, setNotification] = useState<string | null>(null)

  const ordersQuery = useList5({ shopId }, { query: { enabled: shopId !== '' } })

  const confirmMutation = useConfirm({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
      },
    },
  })
  const shipMutation = useShip({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
      },
    },
  })
  const deliverMutation = useDeliver({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
      },
    },
  })
  const cancelMutation = useCancel({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
        void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
      },
    },
  })

  let orders: OrderItem[] = []
  if (ordersQuery.data !== undefined) {
    orders = takeData(ordersQuery.data).map(orderItem)
  }

  function handleConfirmOrder(orderId: string) {
    confirmMutation.mutate({ id: orderId })
  }

  function handleShipOrder(orderId: string) {
    shipMutation.mutate({ id: orderId })
  }

  function handleDeliverOrder(orderId: string) {
    deliverMutation.mutate({ id: orderId })
  }

  function handleCancelOrder(orderId: string, reason: string) {
    cancelMutation.mutate({ id: orderId, data: { reason } })
  }

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  function handleConfirmCancel() {
    if (cancelTargetId !== null) {
      handleCancelOrder(cancelTargetId, cancelReason)
      setCancelTargetId(null)
      showToast('Đã hủy đơn hàng và tự động hoàn trả tồn kho nguyên tử!')
    }
  }

  // Lọc
  const filteredOrders = orders.filter(function (o) {
    if (activeTab !== 'ALL' && o.status !== activeTab) {
      return false
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      const matchCode = o.code.toLowerCase().includes(term)
      const matchBuyer = o.buyerName.toLowerCase().includes(term)
      const matchPhone = o.buyerPhone.includes(term)
      if (matchCode === false && matchBuyer === false && matchPhone === false) {
        return false
      }
    }
    return true
  })

  function renderStatusBadge(status: string) {
    if (status === 'PENDING') {
      return (
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          Chờ xác nhận
        </span>
      )
    }
    if (status === 'CONFIRMED') {
      return (
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          Chờ lấy hàng
        </span>
      )
    }
    if (status === 'SHIPPING') {
      return (
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
          Đang vận chuyển
        </span>
      )
    }
    if (status === 'DELIVERED') {
      return (
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          Đã giao (Đã thu COD)
        </span>
      )
    }
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
        Đã hủy
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification !== null && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-zinc-900">
          <CheckCircle size={18} weight="bold" className="text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Header bar */}
      <div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">Quản lý Đơn hàng</h2>
        <p className="text-xs text-zinc-500">
          Xử lý chu trình đơn hàng từ xác nhận, bàn giao vận chuyển đến hoàn tất thu tiền COD
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 pb-2 md:border-b-0 md:pb-0 dark:border-zinc-800">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'PENDING', label: 'Chờ xác nhận' },
              { id: 'CONFIRMED', label: 'Chờ lấy hàng' },
              { id: 'SHIPPING', label: 'Đang giao' },
              { id: 'DELIVERED', label: 'Đã giao' },
              { id: 'CANCELLED', label: 'Đã hủy' },
            ].map(function (tab) {
              const isCurrent = activeTab === tab.id
              let btnClass =
                'rounded-2xl px-3.5 py-2 text-xs font-bold transition text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              if (isCurrent) {
                btnClass =
                  'rounded-2xl px-3.5 py-2 text-xs font-bold transition bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-sky-400'
              }
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={function () {
                    setActiveTab(
                      tab.id as
                        | 'ALL'
                        | 'PENDING'
                        | 'CONFIRMED'
                        | 'SHIPPING'
                        | 'DELIVERED'
                        | 'CANCELLED',
                    )
                  }}
                  className={btnClass}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="relative w-full md:w-72">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={function (e) {
                setSearchTerm(e.target.value)
              }}
              placeholder="Mã đơn hàng, tên khách, SĐT..."
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-2 pr-4 pl-9 text-xs outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        {/* Danh sách thẻ đơn hàng Shopee-style */}
        <div className="mt-5 space-y-4">
          {filteredOrders.map(function (order) {
            return (
              <div
                key={order.id}
                className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                {/* Header đơn */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                      {order.code}
                    </span>
                    <span className="text-[11px] text-zinc-400">{order.createdAt}</span>
                  </div>
                  <div>{renderStatusBadge(order.status)}</div>
                </div>

                {/* Danh sách sản phẩm */}
                <div className="divide-y divide-zinc-100 py-3 dark:divide-zinc-800/60">
                  {order.items.map(function (item, idx) {
                    return (
                      <div key={idx} className="flex items-center justify-between py-2 text-xs">
                        <div>
                          <p className="font-bold text-zinc-800 dark:text-zinc-200">
                            {item.productName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            Phân loại: {item.color} / Size {item.size} • Số lượng: x{item.quantity}
                          </p>
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {formatVnd(item.price * item.quantity)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Thông tin giao nhận & Tổng tiền & Nút hành động */}
                <div className="flex flex-col justify-between gap-4 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center dark:border-zinc-800/80">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <p className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                      {order.buyerName}
                      <span className="font-normal text-zinc-400">•</span>
                      <Phone size={13} weight="bold" className="text-zinc-400" />
                      {order.buyerPhone}
                    </p>
                    <p className="mt-1 flex items-start gap-1 text-[11px] text-zinc-500">
                      <MapPin size={13} weight="bold" className="mt-0.5 shrink-0 text-zinc-400" />
                      {order.shippingAddress}
                    </p>
                    {order.cancelReason !== undefined && (
                      <p className="mt-1 text-[11px] font-semibold text-red-500">
                        Lý do hủy: {order.cancelReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2.5">
                    <div className="text-right">
                      <span className="text-xs text-zinc-500">Tổng thu COD: </span>
                      <span className="text-base font-black text-blue-700 dark:text-sky-300">
                        {formatVnd(order.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={function () {
                            setCancelTargetId(order.id)
                          }}
                          className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                        >
                          Hủy đơn
                        </button>
                      )}
                      {order.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={function () {
                            handleConfirmOrder(order.id)
                            showToast('Đã xác nhận đơn hàng thành công!')
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                        >
                          <CheckCircle size={14} weight="bold" />
                          Xác nhận đơn
                        </button>
                      )}

                      {order.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          onClick={function () {
                            handleShipOrder(order.id)
                            showToast('Đã bàn giao đơn hàng cho đơn vị vận chuyển!')
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                        >
                          <Truck size={14} weight="bold" />
                          Giao hàng
                        </button>
                      )}

                      {order.status === 'SHIPPING' && (
                        <button
                          type="button"
                          onClick={function () {
                            handleDeliverOrder(order.id)
                            showToast('Đã giao thành công và thu tiền COD!')
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                        >
                          <CheckCircle size={14} weight="bold" />
                          Đã giao & Thu COD
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {filteredOrders.length === 0 && (
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm">Không có đơn hàng nào trong mục này.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Hủy Đơn */}
      {cancelTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Xác nhận hủy đơn hàng
              </h3>
              <button
                type="button"
                onClick={function () {
                  setCancelTargetId(null)
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Khi hủy đơn hàng, hệ thống sẽ{' '}
              <strong>tự động hoàn trả số lượng tồn kho nguyên tử</strong> và ghi nhận lý do vào sổ
              nhật ký biến động kho.
            </p>

            <div className="mt-4">
              <label
                htmlFor="cancelReasonSelect"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Lý do hủy đơn
              </label>
              <select
                id="cancelReasonSelect"
                value={cancelReason}
                onChange={function (e) {
                  setCancelReason(e.target.value)
                }}
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                <option value="Hết hàng trong kho">Hết hàng trong kho</option>
                <option value="Người mua yêu cầu hủy">Người mua yêu cầu hủy qua chat</option>
                <option value="Không liên lạc được với khách">
                  Không liên lạc được với khách để xác nhận
                </option>
                <option value="Địa chỉ người nhận không hợp lệ">
                  Địa chỉ người nhận không hợp lệ
                </option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={function () {
                  setCancelTargetId(null)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="rounded-2xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Xác nhận hủy & Hoàn kho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
