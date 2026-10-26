import { useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  getList5QueryKey,
  useCancel,
  useConfirm,
  useDeliver,
  useList5,
  useShip,
} from '@generated/endpoints/seller-orders/seller-orders'
import { getInventoryQueryKey } from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import {
  ArrowLeft,
  CheckCircle,
  MagnifyingGlass,
  MapPin,
  Phone,
  Truck,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { takeData } from '@/lib/apiAdapters'
import { orderItem } from '@/lib/sellerAdapters'
import { useSellerPermissions } from '@/lib/sellerPermissions'
import { sellerStatusMeta } from '@/lib/sellerStatus'

import { formatVnd } from '../../lib/format'

import type { OrderItem } from '@/types/seller'
import type { List5Params } from '@generated/model'

interface Props {
  shopId: string
}

export default function SellerOrdersTab({ shopId }: Props) {
  const { can } = useSellerPermissions(shopId)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const orderIdParam = searchParams.get('orderId')
  const isSingleOrderDetail = orderIdParam !== null && orderIdParam !== ''

  const statusParam = searchParams.get('status')
  let activeTab: 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' = 'ALL'
  if (
    statusParam === 'PENDING' ||
    statusParam === 'CONFIRMED' ||
    statusParam === 'SHIPPING' ||
    statusParam === 'DELIVERED' ||
    statusParam === 'CANCELLED'
  ) {
    activeTab = statusParam
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('Hết hàng trong kho')
  const [notification, setNotification] = useState<string | null>(null)

  let queryParams: List5Params = { shopId, limit: 100 }
  if (isSingleOrderDetail) {
    queryParams = { shopId, q: orderIdParam, limit: 100 }
  }

  const ordersQuery = useList5(queryParams, { query: { enabled: shopId !== '' } })

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

  function handleBackToAllOrders() {
    setSearchParams(function (prev) {
      const next = new URLSearchParams(prev)
      next.delete('orderId')
      return next
    })
  }

  // Lọc
  let filteredOrders = orders
  if (isSingleOrderDetail) {
    filteredOrders = orders.filter(function (o) {
      return o.id === orderIdParam || o.code.toLowerCase() === orderIdParam.toLowerCase()
    })
  } else {
    filteredOrders = orders.filter(function (o) {
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
      {isSingleOrderDetail && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="btn-back-to-orders"
                onClick={handleBackToAllOrders}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                <ArrowLeft size={16} weight="bold" />
                <span>Tất cả đơn hàng</span>
              </button>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                Chi tiết đơn hàng
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Đang xem chi tiết đơn hàng được chọn từ thông báo. Không hiển thị các đơn hàng khác.
            </p>
          </div>
        </div>
      )}

      {!isSingleOrderDetail && (
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">Quản lý Đơn hàng</h2>
          <p className="text-xs text-zinc-500">
            Xử lý chu trình đơn hàng từ xác nhận, bàn giao vận chuyển đến hoàn tất thu tiền COD
          </p>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        {!isSingleOrderDetail && (
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 pb-2 md:border-b-0 md:pb-0 dark:border-white/10">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'PENDING', label: 'Chờ xác nhận' },
                { id: 'CONFIRMED', label: 'Chờ lấy hàng' },
                { id: 'SHIPPING', label: 'Đang giao' },
                { id: 'DELIVERED', label: 'Đã giao' },
                { id: 'CANCELLED', label: 'Đã hủy' },
              ].map(function (tab) {
                const isCurrent = activeTab === tab.id
                let tabClass =
                  'rounded-2xl px-3.5 py-2 text-xs font-bold transition text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                if (isCurrent) {
                  tabClass =
                    'rounded-2xl px-3.5 py-2 text-xs font-bold transition bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
                }
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={function () {
                      const nextTab = tab.id as
                        | 'ALL'
                        | 'PENDING'
                        | 'CONFIRMED'
                        | 'SHIPPING'
                        | 'DELIVERED'
                        | 'CANCELLED'
                      setSearchParams(function (prev) {
                        const next = new URLSearchParams(prev)
                        if (nextTab === 'ALL') {
                          next.delete('status')
                        } else {
                          next.set('status', nextTab)
                        }
                        return next
                      })
                    }}
                    className={tabClass}
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
                className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2 pr-4 pl-9 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Danh sách thẻ đơn hàng */}
        <div className="mt-5 space-y-4">
          {filteredOrders.map(function (order) {
            return (
              <div
                key={order.id}
                className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition hover:border-zinc-200 dark:border-white/10 dark:bg-white/5"
              >
                {/* Header đơn */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                      {order.code}
                    </span>
                    <span className="text-[11px] text-zinc-400">{order.createdAt}</span>
                  </div>
                  <div>
                    <StatusBadge status={order.status} meta={sellerStatusMeta} />
                  </div>
                </div>

                {/* Danh sách sản phẩm */}
                <div className="divide-y divide-zinc-100 py-3 dark:divide-white/10">
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
                <div className="flex flex-col justify-between gap-4 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center dark:border-white/10">
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
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {formatVnd(order.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === 'PENDING' && can('ORDER_CANCEL') && (
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
                      {order.status === 'PENDING' && can('ORDER_PROCESS') && (
                        <button
                          type="button"
                          onClick={function () {
                            handleConfirmOrder(order.id)
                            showToast('Đã xác nhận đơn hàng thành công!')
                          }}
                          className="btn-primary flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm"
                        >
                          <CheckCircle size={14} weight="bold" />
                          Xác nhận đơn
                        </button>
                      )}

                      {order.status === 'CONFIRMED' && can('ORDER_PROCESS') && (
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

                      {order.status === 'SHIPPING' && can('ORDER_PROCESS') && (
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

          {filteredOrders.length === 0 && !isSingleOrderDetail && (
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm">Không có đơn hàng nào trong mục này.</p>
            </div>
          )}

          {filteredOrders.length === 0 && isSingleOrderDetail && (
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Không tìm thấy thông tin đơn hàng này trong gian hàng.
              </p>
              <button
                type="button"
                onClick={handleBackToAllOrders}
                className="btn-primary mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2 text-xs font-bold"
              >
                <ArrowLeft size={14} weight="bold" />
                <span>Quay lại danh sách đơn hàng</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Hủy Đơn */}
      {cancelTargetId !== null && (
        <Modal
          title="Xác nhận hủy đơn hàng"
          onClose={function () {
            setCancelTargetId(null)
          }}
          widthClass="max-w-md"
        >
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
              className="mt-1.5 w-full rounded-full border border-zinc-300 p-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
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
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
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
        </Modal>
      )}
    </div>
  )
}
