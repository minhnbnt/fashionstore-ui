import { useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  getList5QueryKey,
  useBulkConfirm,
  useCancel,
  useConfirm,
  useDeliver,
  useList5,
  useShip,
  useTimeline,
} from '@generated/endpoints/seller-orders/seller-orders'
import { getInventoryQueryKey } from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import { useList4 } from '@generated/endpoints/seller-returns/seller-returns'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  MagnifyingGlass,
  MapPin,
  Note,
  Phone,
  Truck,
  Warning,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { orderItem, returnItem } from '@/lib/sellerAdapters'
import { useSellerPermissions } from '@/lib/sellerPermissions'
import { sellerStatusMeta } from '@/lib/sellerStatus'

import type { OrderItem, ReturnItem } from '@/types/seller'
import type { BulkConfirmOrderResponse, List5Params, OrderResponse } from '@generated/model'

interface Props {
  shopId: string
}

type TabKey = 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'RETURNS'

interface SlaStatus {
  text: string
  isExpired: boolean
  isWarning: boolean
}

function getSlaCountdown(rawCreatedAt: string): SlaStatus {
  const createdTime = new Date(rawCreatedAt).getTime()
  if (Number.isNaN(createdTime)) {
    return { text: '24h', isExpired: false, isWarning: false }
  }
  const deadline = createdTime + 24 * 3600 * 1000
  const now = Date.now()
  const diff = deadline - now

  if (diff <= 0) {
    return { text: 'Đã quá hạn 24h (Tự hủy)', isExpired: true, isWarning: true }
  }

  const hours = Math.floor(diff / (3600 * 1000))
  const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000))

  let text = 'Còn ' + hours + 'h ' + minutes + 'm'
  let isWarning = false
  if (hours < 4) {
    text = text + ' (Sắp quá hạn)'
    isWarning = true
  }

  return { text, isExpired: false, isWarning }
}

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE
  }
}

export default function SellerOrdersTab({ shopId }: Props) {
  const { can } = useSellerPermissions(shopId)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const orderIdParam = searchParams.get('orderId')
  const isSingleOrderDetail = orderIdParam !== null && orderIdParam !== ''

  const statusParam = searchParams.get('status')
  let activeTab: TabKey = 'ALL'
  if (
    statusParam === 'PENDING' ||
    statusParam === 'CONFIRMED' ||
    statusParam === 'SHIPPING' ||
    statusParam === 'DELIVERED' ||
    statusParam === 'CANCELLED' ||
    statusParam === 'RETURNS'
  ) {
    activeTab = statusParam
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('Hết hàng trong kho')
  const [cancelNote, setCancelNote] = useState('')
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<OrderItem | null>(null)
  const [bulkResult, setBulkResult] = useState<BulkConfirmOrderResponse | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  let queryParams: List5Params = { shopId, limit: 100 }
  if (isSingleOrderDetail) {
    queryParams = { shopId, q: orderIdParam, limit: 100 }
  }

  const ordersQuery = useList5(queryParams, { query: { enabled: shopId !== '' } })
  const returnsQuery = useList4({ shopId }, { query: { enabled: shopId !== '' } })

  const confirmMutation = useConfirm({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
      },
    },
  })
  const bulkConfirmMutation = useBulkConfirm({
    mutation: {
      onSuccess: function (response) {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
        setSelectedOrderIds([])
        setBulkResult(takeData(response))
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

  // Timeline query for modal
  const selectedOrderId = selectedOrderForDetail?.id ?? ''
  const timelineQuery = useTimeline(selectedOrderId, {
    query: { enabled: selectedOrderForDetail !== null && selectedOrderId !== '' },
  })

  let orders: OrderItem[] = []
  if (ordersQuery.data !== undefined) {
    orders = takeData(ordersQuery.data).map(orderItem)
  }

  const orderById = new Map<string, OrderResponse>()
  if (ordersQuery.data !== undefined) {
    for (const o of takeData(ordersQuery.data)) {
      orderById.set(o.id ?? '', o)
    }
  }

  let returns: ReturnItem[] = []
  if (returnsQuery.data !== undefined) {
    returns = takeData(returnsQuery.data).map(function (r) {
      return returnItem(r, orderById)
    })
  }

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
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

  function handleConfirmCancel() {
    if (cancelTargetId !== null) {
      let trimmedNote: string | undefined = undefined
      if (cancelNote.trim() !== '') {
        trimmedNote = cancelNote.trim()
      }
      cancelMutation.mutate({
        id: cancelTargetId,
        data: {
          reason: cancelReason,
          note: trimmedNote,
        },
      })
      setCancelTargetId(null)
      setCancelNote('')
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

  function handleToggleSelect(orderId: string) {
    setSelectedOrderIds(function (prev) {
      if (prev.includes(orderId)) {
        return prev.filter(function (id) {
          return id !== orderId
        })
      }
      return [...prev, orderId]
    })
  }

  function handleToggleSelectAll(pendingOrders: OrderItem[]) {
    if (selectedOrderIds.length === pendingOrders.length && pendingOrders.length > 0) {
      setSelectedOrderIds([])
      return
    }
    const allPendingIds = pendingOrders.map(function (o) {
      return o.id
    })
    setSelectedOrderIds(allPendingIds)
  }

  function handleExecuteBulkConfirm() {
    if (selectedOrderIds.length === 0) {
      return
    }
    bulkConfirmMutation.mutate({
      data: {
        orderIds: selectedOrderIds,
      },
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
      if (activeTab === 'RETURNS') {
        return false
      }
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

  // FIFO sorting for PENDING
  if (activeTab === 'PENDING') {
    filteredOrders.sort(function (a, b) {
      return new Date(a.rawCreatedAt).getTime() - new Date(b.rawCreatedAt).getTime()
    })
  }

  const allCount = orders.length
  const pendingOrders = orders.filter(function (o) {
    return o.status === 'PENDING'
  })
  const confirmedCount = orders.filter(function (o) {
    return o.status === 'CONFIRMED'
  }).length
  const shippingCount = orders.filter(function (o) {
    return o.status === 'SHIPPING'
  }).length
  const deliveredCount = orders.filter(function (o) {
    return o.status === 'DELIVERED'
  }).length
  const cancelledCount = orders.filter(function (o) {
    return o.status === 'CANCELLED'
  }).length
  const returnsCount = returns.length

  const tabs: { id: TabKey; label: string; count: number }[] = [
    { id: 'ALL', label: 'Tất cả', count: allCount },
    { id: 'PENDING', label: 'Chờ xác nhận', count: pendingOrders.length },
    { id: 'CONFIRMED', label: 'Đang chuẩn bị', count: confirmedCount },
    { id: 'SHIPPING', label: 'Đã giao cho ĐVVC', count: shippingCount },
    { id: 'DELIVERED', label: 'Hoàn thành', count: deliveredCount },
    { id: 'CANCELLED', label: 'Đã hủy', count: cancelledCount },
    { id: 'RETURNS', label: 'Đổi trả', count: returnsCount },
  ]

  let currentTabLabel = 'Tất cả'
  for (const t of tabs) {
    if (t.id === activeTab) {
      currentTabLabel = t.label
    }
  }

  let selectAllBtnText = 'Chọn tất cả (' + pendingOrders.length + ')'
  if (selectedOrderIds.length === pendingOrders.length && pendingOrders.length > 0) {
    selectAllBtnText = 'Bỏ chọn tất cả'
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
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">Quản lý Đơn hàng</h2>
            <p className="text-xs text-zinc-500">
              Xem và xử lý chu trình đơn hàng, xác nhận 24h, bàn giao vận chuyển và đổi trả
            </p>
          </div>
          {activeTab === 'PENDING' && pendingOrders.length > 0 && can('ORDER_PROCESS') && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-select-all-pending"
                onClick={function () {
                  handleToggleSelectAll(pendingOrders)
                }}
                className="rounded-2xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
              >
                {selectAllBtnText}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        {!isSingleOrderDetail && (
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 pb-2 md:border-b-0 md:pb-0 dark:border-white/10">
              {tabs.map(function (tab) {
                const isCurrent = activeTab === tab.id
                let tabClass =
                  'flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'
                if (isCurrent) {
                  tabClass =
                    'flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
                }

                let countBadgeClass =
                  'rounded-full px-2 py-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400'
                if (isCurrent) {
                  countBadgeClass =
                    'rounded-full px-2 py-0.5 text-[10px] font-black bg-white/25 text-white'
                } else if (tab.count > 0) {
                  countBadgeClass =
                    'rounded-full px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                }

                return (
                  <button
                    key={tab.id}
                    type="button"
                    id={'tab-' + tab.id.toLowerCase()}
                    onClick={function () {
                      setSearchParams(function (prev) {
                        const next = new URLSearchParams(prev)
                        if (tab.id === 'ALL') {
                          next.delete('status')
                        } else {
                          next.set('status', tab.id)
                        }
                        return next
                      })
                    }}
                    className={tabClass}
                  >
                    <span>{tab.label}</span>
                    <span className={countBadgeClass}>{tab.count}</span>
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
                id="order-search-input"
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

        {/* Tab Đổi trả */}
        {activeTab === 'RETURNS' && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              <div className="flex items-center gap-2 font-bold">
                <Warning size={16} weight="bold" />
                <span>Danh sách yêu cầu Đổi trả / Hoàn tiền</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                Hiển thị các đơn hàng người mua đã gửi yêu cầu khiếu nại hoặc trả hàng.
              </p>
            </div>

            {returns.map(function (ret) {
              return (
                <div
                  key={ret.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition hover:border-zinc-200 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                        #{ret.orderCode}
                      </span>
                      <span className="text-[11px] text-zinc-400">{ret.createdAt}</span>
                    </div>
                    <div>
                      <StatusBadge status={ret.status} meta={sellerStatusMeta} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        Lý do: <span className="text-red-600 dark:text-red-400">{ret.reason}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {ret.description}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">Người mua: {ret.buyerName}</p>
                    </div>

                    {ret.evidenceImage !== '' && (
                      <div className="shrink-0">
                        <img
                          src={ret.evidenceImage}
                          alt="Bằng chứng"
                          onError={handleImageError}
                          className="h-16 w-16 rounded-xl border border-zinc-200 object-cover dark:border-white/10"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {returns.length === 0 && (
              <div className="py-12 text-center text-zinc-400">
                <p className="text-sm">Hiện không có yêu cầu đổi trả nào từ khách hàng.</p>
              </div>
            )}
          </div>
        )}

        {/* Danh sách thẻ đơn hàng thông thường */}
        {activeTab !== 'RETURNS' && (
          <div className="mt-5 space-y-4">
            {!isSingleOrderDetail && (
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>
                  Đang hiển thị{' '}
                  <strong className="text-zinc-900 dark:text-white">{filteredOrders.length}</strong>{' '}
                  đơn hàng trong mục{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {currentTabLabel}
                  </strong>
                  {searchTerm.trim() !== '' && ' (khớp với từ khóa tìm kiếm)'}
                </span>
              </div>
            )}
            {filteredOrders.map(function (order) {
              const isPending = order.status === 'PENDING'
              const isSelected = selectedOrderIds.includes(order.id)
              const sla = getSlaCountdown(order.rawCreatedAt)

              let cardBorderClass =
                'rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition hover:border-zinc-200 dark:border-white/10 dark:bg-white/5'
              if (isSelected) {
                cardBorderClass =
                  'rounded-2xl border-2 border-indigo-600 bg-indigo-50/20 p-4 transition dark:border-indigo-400 dark:bg-indigo-950/20'
              }

              let confirmButtonClass =
                'btn-primary flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm'
              if (sla.isExpired) {
                confirmButtonClass =
                  'flex items-center gap-1.5 rounded-xl bg-zinc-200 px-3.5 py-1.5 text-xs font-bold text-zinc-400 cursor-not-allowed dark:bg-white/10 dark:text-zinc-500'
              }

              let checkboxTitle: string | undefined = undefined
              if (sla.isExpired) {
                checkboxTitle = 'Đơn hàng đã quá hạn 24h (tự hủy)'
              }

              let slaBadgeClass =
                'flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400'
              if (sla.isWarning) {
                slaBadgeClass =
                  'flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400'
              }

              let paymentMethodLabel = 'Tổng thanh toán: '
              if (order.paymentMethod === 'COD' || order.paymentMethod === undefined) {
                paymentMethodLabel = 'Tổng thu COD: '
              }

              return (
                <div key={order.id} className={cardBorderClass}>
                  {/* Header đơn */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      {isPending && can('ORDER_PROCESS') && (
                        <input
                          type="checkbox"
                          id={'checkbox-order-' + order.id}
                          checked={isSelected}
                          disabled={sla.isExpired}
                          title={checkboxTitle}
                          onChange={function () {
                            if (!sla.isExpired) {
                              handleToggleSelect(order.id)
                            }
                          }}
                          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                        />
                      )}

                      <button
                        type="button"
                        onClick={function () {
                          setSelectedOrderForDetail(order)
                        }}
                        className="font-mono text-xs font-bold text-zinc-900 underline-offset-2 hover:underline dark:text-white"
                      >
                        {order.code}
                      </button>

                      <span className="text-[11px] text-zinc-400">{order.createdAt}</span>

                      {/* SLA Countdown Badge cho PENDING */}
                      {isPending && (
                        <div className={slaBadgeClass}>
                          <Clock size={12} weight="bold" />
                          <span>{sla.text}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={function () {
                          setSelectedOrderForDetail(order)
                        }}
                        className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-bold text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
                      >
                        <Eye size={12} weight="bold" />
                        <span>Chi tiết</span>
                      </button>
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
                              Phân loại: {item.color} / Size {item.size} • Số lượng: x
                              {item.quantity}
                              {item.sku !== undefined && item.sku !== '' && (
                                <span className="ml-2 font-mono text-[10px] text-zinc-400">
                                  SKU: {item.sku}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {formatVnd(item.price * item.quantity)}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Buyer Note nếu có */}
                  {order.note !== undefined && order.note !== '' && (
                    <div className="mb-3 flex items-start gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100/70 p-2.5 text-xs text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                      <Note size={14} weight="bold" className="mt-0.5 shrink-0 text-zinc-500" />
                      <div>
                        <span className="font-bold">Ghi chú của khách: </span>
                        <span>{order.note}</span>
                      </div>
                    </div>
                  )}

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
                          {order.cancelledBy !== undefined && ' (' + order.cancelledBy + ')'}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2.5">
                      <div className="text-right">
                        <span className="text-xs text-zinc-500">{paymentMethodLabel}</span>
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
                            disabled={sla.isExpired}
                            onClick={function () {
                              if (sla.isExpired) {
                                showToast('Đơn hàng đã quá hạn 24h và đã bị hệ thống tự hủy!')
                                return
                              }
                              handleConfirmOrder(order.id)
                              showToast('Đã xác nhận đơn hàng thành công!')
                            }}
                            className={confirmButtonClass}
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
                            Giao cho ĐVVC
                          </button>
                        )}

                        {order.status === 'SHIPPING' && can('ORDER_PROCESS') && (
                          <button
                            type="button"
                            onClick={function () {
                              handleDeliverOrder(order.id)
                              showToast('Đã xác nhận giao thành công và thu tiền COD!')
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                          >
                            <CheckCircle size={14} weight="bold" />
                            Hoàn tất thu COD
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
        )}
      </div>

      {/* Sticky Floating Action Bar for Bulk Confirm */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-zinc-700 bg-zinc-900/95 px-6 py-3.5 text-white shadow-2xl backdrop-blur-md dark:border-white/20 dark:bg-zinc-950/95">
          <div className="flex items-center gap-5">
            <span className="text-xs font-bold">
              Đã chọn{' '}
              <strong className="text-amber-400 underline">{selectedOrderIds.length}</strong> đơn
              chờ xác nhận
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-cancel-selection"
                onClick={function () {
                  setSelectedOrderIds([])
                }}
                className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                id="btn-bulk-confirm"
                onClick={handleExecuteBulkConfirm}
                disabled={bulkConfirmMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle size={15} weight="bold" />
                <span>
                  {bulkConfirmMutation.isPending && 'Đang xử lý...'}
                  {!bulkConfirmMutation.isPending &&
                    'Xác nhận tất cả (' + selectedOrderIds.length + ')'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo Cáo Kết Quả Bulk Confirm */}
      {bulkResult !== null && (
        <Modal
          title="Kết quả xác nhận hàng loạt"
          onClose={function () {
            setBulkResult(null)
          }}
          widthClass="max-w-md"
        >
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-zinc-100 p-2.5 dark:bg-white/5">
                <p className="text-[11px] text-zinc-500">Tổng yêu cầu</p>
                <p className="text-base font-black text-zinc-800 dark:text-zinc-200">
                  {bulkResult.totalRequested}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-950/30">
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Thành công</p>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  {bulkResult.successCount}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-2.5 dark:bg-red-950/30">
                <p className="text-[11px] text-red-600 dark:text-red-400">Thất bại</p>
                <p className="text-base font-black text-red-700 dark:text-red-300">
                  {bulkResult.failureCount}
                </p>
              </div>
            </div>

            {bulkResult.failures !== undefined && bulkResult.failures.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-bold text-red-600 dark:text-red-400">
                  Chi tiết đơn không thể xác nhận:
                </p>
                <div className="max-h-48 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 text-xs dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
                  {bulkResult.failures.map(function (fail, idx) {
                    return (
                      <div key={idx} className="py-1.5">
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">
                          #{fail.code}
                        </span>
                        <p className="text-[11px] text-red-500">{fail.reason}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={function () {
                  setBulkResult(null)
                }}
                className="btn-primary rounded-xl px-5 py-2 text-xs font-bold"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Chi Tiết Đơn Hàng & Timeline */}
      {selectedOrderForDetail !== null && (
        <Modal
          title={'Chi tiết đơn hàng #' + selectedOrderForDetail.code}
          onClose={function () {
            setSelectedOrderForDetail(null)
          }}
          widthClass="max-w-2xl"
        >
          <div className="mt-3 space-y-5 text-xs">
            {/* Trạng thái & ngày tạo */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-white/10">
              <div>
                <span className="text-zinc-500">Ngày đặt hàng: </span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {selectedOrderForDetail.createdAt}
                </span>
              </div>
              <StatusBadge status={selectedOrderForDetail.status} meta={sellerStatusMeta} />
            </div>

            {/* Thông tin người nhận & Thanh toán */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">Thông tin người nhận</p>
                <p className="mt-1 font-semibold text-zinc-900 dark:text-white">
                  {selectedOrderForDetail.buyerName} - {selectedOrderForDetail.buyerPhone}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {selectedOrderForDetail.shippingAddress}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">Phương thức thanh toán</p>
                <p className="mt-1 font-semibold text-zinc-900 dark:text-white">
                  {(selectedOrderForDetail.paymentMethod === 'COD' ||
                    selectedOrderForDetail.paymentMethod === undefined) &&
                    'Thanh toán khi nhận hàng (COD)'}
                  {selectedOrderForDetail.paymentMethod !== 'COD' &&
                    selectedOrderForDetail.paymentMethod !== undefined &&
                    selectedOrderForDetail.paymentMethod}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Tổng thu: {formatVnd(selectedOrderForDetail.totalAmount)}
                </p>
              </div>
            </div>

            {/* Ghi chú người mua nếu có */}
            {selectedOrderForDetail.note !== undefined && selectedOrderForDetail.note !== '' && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-3 dark:border-white/10 dark:bg-white/5">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  Ghi chú từ khách hàng:{' '}
                </span>
                <span className="text-zinc-900 dark:text-white">{selectedOrderForDetail.note}</span>
              </div>
            )}

            {/* Danh sách mặt hàng */}
            <div>
              <p className="mb-2 font-bold text-zinc-800 dark:text-zinc-200">
                Sản phẩm trong đơn ({selectedOrderForDetail.items.length})
              </p>
              <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-100 p-2 dark:divide-white/10 dark:border-white/10">
                {selectedOrderForDetail.items.map(function (item, idx) {
                  return (
                    <div key={idx} className="flex items-center justify-between py-2 text-xs">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {item.productName}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Phân loại: {item.color} / Size {item.size} • Số lượng: x{item.quantity}
                          {item.sku !== undefined && item.sku !== '' && (
                            <span className="ml-2 font-mono text-[10px] text-zinc-400">
                              SKU: {item.sku}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {formatVnd(item.price * item.quantity)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="mb-2 font-bold text-zinc-800 dark:text-zinc-200">Lịch sử đơn hàng</p>
              <div className="relative ml-2 space-y-4 border-l-2 border-indigo-200 pl-4 dark:border-indigo-900">
                {timelineQuery.data !== undefined &&
                  takeData(timelineQuery.data).map(function (entry, idx) {
                    return (
                      <div key={idx} className="relative">
                        <div className="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {entry.toStatus}
                          </span>
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                            {entry.actor}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {formatDateTime(entry.createdAt)}
                          </span>
                        </div>
                        {entry.note !== '' && (
                          <p className="mt-0.5 text-[11px] text-zinc-500">{entry.note}</p>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={function () {
                  setSelectedOrderForDetail(null)
                }}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Hủy Đơn */}
      {cancelTargetId !== null && (
        <Modal
          title="Xác nhận từ chối / hủy đơn hàng"
          onClose={function () {
            setCancelTargetId(null)
            setCancelNote('')
          }}
          widthClass="max-w-md"
        >
          <div className="mt-2 space-y-4 text-xs">
            <p className="leading-relaxed text-zinc-500">
              Hệ thống sẽ <strong>hoàn trả tồn kho nguyên tử</strong> và gửi thông báo lý do hủy đơn
              đến người mua.
            </p>

            <div>
              <label
                htmlFor="cancelReasonSelect"
                className="block font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Lý do hủy đơn *
              </label>
              <select
                id="cancelReasonSelect"
                value={cancelReason}
                onChange={function (e) {
                  setCancelReason(e.target.value)
                }}
                className="mt-1.5 w-full rounded-2xl border border-zinc-300 bg-white p-2.5 text-xs outline-none focus:border-indigo-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
              >
                <option value="Hết hàng trong kho">Hết hàng trong kho</option>
                <option value="Sai thông tin giá / sản phẩm">Sai thông tin giá / sản phẩm</option>
                <option value="Khách hàng yêu cầu hủy qua chat">
                  Khách hàng yêu cầu hủy qua chat
                </option>
                <option value="Không liên lạc được với khách để xác nhận">
                  Không liên lạc được với khách để xác nhận
                </option>
                <option value="Địa chỉ người nhận không hợp lệ">
                  Địa chỉ người nhận không hợp lệ
                </option>
                <option value="Lý do khác">Lý do khác</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="cancelNoteInput"
                className="block font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Ghi chú thêm (Tùy chọn)
              </label>
              <textarea
                id="cancelNoteInput"
                value={cancelNote}
                onChange={function (e) {
                  setCancelNote(e.target.value)
                }}
                rows={3}
                placeholder="Nhập thông tin chi tiết giải thích cho người mua..."
                className="mt-1.5 w-full rounded-2xl border border-zinc-300 bg-white p-2.5 text-xs outline-none focus:border-indigo-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={function () {
                  setCancelTargetId(null)
                  setCancelNote('')
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
              >
                Đóng
              </button>
              <button
                type="button"
                id="btn-confirm-cancel-order"
                onClick={handleConfirmCancel}
                className="rounded-2xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Xác nhận hủy & Hoàn kho
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
