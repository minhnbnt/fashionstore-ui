import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import {
  getMine2QueryKey as getMyReturnsQueryKey,
  useCreate2 as useCreateReturn,
  useMine2 as useMyReturns,
} from '@generated/endpoints/buyer-returns/buyer-returns'
import { getViewQueryKey, useReorder } from '@generated/endpoints/cart/cart'
import {
  getDetail2QueryKey,
  getMine3QueryKey,
  getTimeline1QueryKey,
  useCancel1,
  useConfirmReceipt,
  useMine3,
  useRetryVietQrPayment,
} from '@generated/endpoints/orders/orders'
import {
  getList1QueryKey as getProductReviewsQueryKey,
  getMine1QueryKey as getMyReviewsQueryKey,
  getSummary2QueryKey as getProductReviewSummaryQueryKey,
  useCreate1 as useCreateReview,
  useMine1 as useMyReviews,
  useUpdate3 as useUpdateReview,
} from '@generated/endpoints/reviews/reviews'
import {
  ArrowCounterClockwise,
  ChatCircleDots,
  CheckCircle,
  MagnifyingGlass,
  Package,
  QrCode,
  Star,
  Storefront,
  Truck,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AccountLayout from '@/components/account/AccountLayout'
import CancelOrderModal from '@/components/order/CancelOrderModal'
import OrderProgressStepper from '@/components/order/OrderProgressStepper'
import ReorderResultModal from '@/components/order/ReorderResultModal'
import ReturnRequestModal from '@/components/order/ReturnRequestModal'
import ReviewModal, { type ReviewSubmitPayload } from '@/components/order/ReviewModal'
import ReviewProductPickerModal from '@/components/order/ReviewProductPickerModal'
import StatePanel from '@/components/ui/StatePanel'
import { useSessionQuery } from '@/hooks/useSession'
import {
  fallbackImageOnError,
  hookErrorMessage,
  urlOrPlaceholder,
  PLACEHOLDER_IMAGE,
  takeData,
} from '@/lib/api/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { notify } from '@/lib/notifications'
import {
  BUYER_ORDER_TABS,
  type BuyerOrderTabKey,
  canCancel,
  canConfirmReceipt,
  orderStatusMeta,
  paymentStatusLabel,
  returnStatusMeta,
} from '@/lib/order/orderStatus'
import {
  buildOrderReviewLookup,
  findOrderProductReview,
  groupOrderReviewProducts,
  resolveOrderReviewAction,
} from '@/lib/review/reviewOrderHelpers'
import { cn, segmentedItemClass } from '@/lib/ui/styles'

import type { OrderResponse } from '@generated/model/orderResponse'
import type { ReorderResponse } from '@generated/model/reorderResponse'
import type { ReturnRequestResponse } from '@generated/model/returnRequestResponse'
import type { ReviewResponse } from '@generated/model/reviewResponse'

function normalizeTab(raw: string | null): BuyerOrderTabKey {
  for (const tab of BUYER_ORDER_TABS) {
    if (tab.key === raw) {
      return tab.key
    }
  }
  return 'ALL'
}

function buildLatestReturnMap(
  returns: ReturnRequestResponse[],
): Map<string, ReturnRequestResponse> {
  const map = new Map<string, ReturnRequestResponse>()
  for (const ret of returns) {
    const orderId = ret.orderId
    if (!orderId) {
      continue
    }
    const existing = map.get(orderId)
    if (existing === undefined) {
      map.set(orderId, ret)
      continue
    }
    const nextTime = ret.createdAt ?? ''
    const prevTime = existing.createdAt ?? ''
    if (nextTime >= prevTime) {
      map.set(orderId, ret)
    }
  }
  return map
}

function effectiveReturnStatus(
  order: OrderResponse,
  latestReturnByOrderId: Map<string, ReturnRequestResponse>,
): string | null {
  if (order.id) {
    const latest = latestReturnByOrderId.get(order.id)
    if (latest?.status) {
      return latest.status
    }
  }
  return order.returnStatus ?? null
}

function isBlockingReturn(returnStatus: string | null): boolean {
  return returnStatus === 'REQUESTED' || returnStatus === 'APPROVED' || returnStatus === 'COMPLETED'
}

function matchesSearch(order: OrderResponse, query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  if (trimmed === '') {
    return true
  }
  if ((order.code ?? '').toLowerCase().includes(trimmed)) {
    return true
  }
  for (const item of order.items ?? []) {
    if ((item.productName ?? '').toLowerCase().includes(trimmed)) {
      return true
    }
  }
  return false
}

function orderMatchesTab(
  order: OrderResponse,
  tab: BuyerOrderTabKey,
  latestReturnByOrderId: Map<string, ReturnRequestResponse>,
): boolean {
  if (tab === 'ALL') {
    return true
  }
  if (tab === 'RETURNS') {
    return effectiveReturnStatus(order, latestReturnByOrderId) !== null
  }
  return order.status === tab
}

function tabButtonClass(active: boolean): string {
  if (active) {
    return cn(segmentedItemClass(true), 'shrink-0 cursor-pointer px-4 py-2')
  }
  return cn(
    segmentedItemClass(false),
    'shrink-0 cursor-pointer border border-zinc-200/80 bg-white/80 px-4 py-2 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10',
  )
}

export default function Orders() {
  const { data: session, isPending: sessionPending } = useSessionQuery()
  const isLoggedIn = session !== null && session !== undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = normalizeTab(searchParams.get('tab'))
  const searchText = searchParams.get('q') ?? ''

  const [cancelTarget, setCancelTarget] = useState<OrderResponse | null>(null)
  const [returnTarget, setReturnTarget] = useState<OrderResponse | null>(null)
  const [pickerOrder, setPickerOrder] = useState<OrderResponse | null>(null)
  const [reviewContext, setReviewContext] = useState<{
    orderId: string
    productId: string
    productName: string
    variantLabel?: string
    reviewerName?: string
    existing?: ReviewResponse
  } | null>(null)
  const [reorderResult, setReorderResult] = useState<ReorderResponse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingReceiptOrderId, setPendingReceiptOrderId] = useState<string | null>(null)
  const [pendingReorderOrderId, setPendingReorderOrderId] = useState<string | null>(null)
  const [pendingRetryOrderId, setPendingRetryOrderId] = useState<string | null>(null)

  const ordersQuery = useMine3({ query: { enabled: isLoggedIn } })
  const returnsQuery = useMyReturns({ query: { enabled: isLoggedIn } })
  const reviewsQuery = useMyReviews({ query: { enabled: isLoggedIn } })

  const cancelMutation = useCancel1()
  const confirmReceiptMutation = useConfirmReceipt()
  const retryVietQrMutation = useRetryVietQrPayment()
  const createReturnMutation = useCreateReturn()
  const createReviewMutation = useCreateReview()
  const updateReviewMutation = useUpdateReview()
  const reorderMutation = useReorder()

  const orders = useMemo(() => {
    if (ordersQuery.data === undefined) {
      return []
    }
    return takeData(ordersQuery.data)
  }, [ordersQuery.data])

  const returns = useMemo(() => {
    if (returnsQuery.data === undefined) {
      return []
    }
    return takeData(returnsQuery.data)
  }, [returnsQuery.data])

  const reviews = useMemo(() => {
    if (reviewsQuery.data === undefined) {
      return []
    }
    return takeData(reviewsQuery.data)
  }, [reviewsQuery.data])

  const latestReturnByOrderId = useMemo(() => buildLatestReturnMap(returns), [returns])

  const reviewLookup = useMemo(() => buildOrderReviewLookup(reviews), [reviews])

  const combinedOrders = useMemo(() => {
    const existingIds = new Set<string>()
    for (const order of orders) {
      if (order.id) {
        existingIds.add(order.id)
      }
    }
    const extra: OrderResponse[] = []
    for (const [orderId, ret] of latestReturnByOrderId.entries()) {
      if (existingIds.has(orderId)) {
        continue
      }
      extra.push({
        id: orderId,
        code: ret.orderCode ?? orderId,
        shopId: ret.shopId,
        status: ret.orderStatus ?? 'DELIVERED',
        returnStatus: ret.status,
        items: [],
        createdAt: ret.createdAt,
      })
    }
    return [...orders, ...extra]
  }, [orders, latestReturnByOrderId])

  const tabCounts = useMemo(() => {
    const counts: Record<BuyerOrderTabKey, number> = {
      ALL: combinedOrders.length,
      AWAITING_PAYMENT: 0,
      PENDING: 0,
      CONFIRMED: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      RETURNS: 0,
    }
    for (const order of combinedOrders) {
      if (order.status === 'AWAITING_PAYMENT') {
        counts.AWAITING_PAYMENT += 1
      } else if (order.status === 'PENDING') {
        counts.PENDING += 1
      } else if (order.status === 'CONFIRMED') {
        counts.CONFIRMED += 1
      } else if (order.status === 'SHIPPING') {
        counts.SHIPPING += 1
      } else if (order.status === 'DELIVERED') {
        counts.DELIVERED += 1
      } else if (order.status === 'CANCELLED') {
        counts.CANCELLED += 1
      }
      if (effectiveReturnStatus(order, latestReturnByOrderId) !== null) {
        counts.RETURNS += 1
      }
    }
    return counts
  }, [combinedOrders, latestReturnByOrderId])

  const filteredOrders = useMemo(() => {
    return combinedOrders.filter(
      (order) =>
        orderMatchesTab(order, activeTab, latestReturnByOrderId) &&
        matchesSearch(order, searchText),
    )
  }, [combinedOrders, activeTab, latestReturnByOrderId, searchText])

  function selectTab(tab: BuyerOrderTabKey) {
    const next = new URLSearchParams(searchParams)
    if (tab === 'ALL') {
      next.delete('tab')
    } else {
      next.set('tab', tab)
    }
    setSearchParams(next)
  }

  function handleSearchChange(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value === '') {
      next.delete('q')
    } else {
      next.set('q', value)
    }
    setSearchParams(next)
  }

  function invalidateOrderCaches(orderId: string | undefined) {
    void queryClient.invalidateQueries({ queryKey: getMine3QueryKey() })
    void queryClient.invalidateQueries({ queryKey: getMyReturnsQueryKey() })
    if (orderId) {
      void queryClient.invalidateQueries({ queryKey: getDetail2QueryKey(orderId) })
      void queryClient.invalidateQueries({ queryKey: getTimeline1QueryKey(orderId) })
    }
  }

  function handleConfirmCancel(reason: string, note: string | null) {
    if (!cancelTarget?.id) {
      return
    }
    const orderId = cancelTarget.id
    setActionError(null)
    cancelMutation.mutate(
      { id: orderId, data: { reason, note } },
      {
        onSuccess: () => {
          setCancelTarget(null)
          setActionError(null)
          notify.success('Đã hủy đơn hàng thành công')
          invalidateOrderCaches(orderId)
        },
        onError: (err) => {
          setActionError(notify.safeErrorMessage(err, 'cancelOrder', 'Không thể hủy đơn hàng'))
          notify.fromError(err, 'cancelOrder', 'Không thể hủy đơn hàng')
        },
      },
    )
  }

  function handleConfirmReceipt(order: OrderResponse) {
    if (!order.id) {
      return
    }
    const orderId = order.id
    setPendingReceiptOrderId(orderId)
    confirmReceiptMutation.mutate(
      { id: orderId },
      {
        onSuccess: () => {
          notify.success('Đã xác nhận nhận hàng thành công')
          invalidateOrderCaches(orderId)
        },
        onError: (err) => {
          notify.fromError(err, 'confirmReceipt', 'Không thể xác nhận nhận hàng')
        },
        onSettled: () => {
          setPendingReceiptOrderId(null)
        },
      },
    )
  }

  function handleRetryVietQr(order: OrderResponse) {
    if (!order.id) {
      if (order.paymentTxnRef) {
        void navigate('/payment/qr/' + order.paymentTxnRef)
      }
      return
    }
    const orderId = order.id
    setPendingRetryOrderId(orderId)
    retryVietQrMutation.mutate(
      { id: orderId },
      {
        onSuccess: (res) => {
          const sessionData = takeData(res)
          const targetTxnRef = sessionData.txnRef || order.paymentTxnRef
          if (targetTxnRef) {
            void navigate('/payment/qr/' + targetTxnRef)
          }
        },
        onError: (err) => {
          notify.fromError(err, 'retryVietQrPayment', 'Không thể khởi tạo phiên thanh toán VietQR')
          invalidateOrderCaches(orderId)
        },
        onSettled: () => {
          setPendingRetryOrderId(null)
        },
      },
    )
  }

  function handleOpenShopChat(order: OrderResponse) {
    if (!order.shopId) {
      return
    }
    window.dispatchEvent(
      new CustomEvent('fashionstore:open-chat', {
        detail: { shopId: order.shopId, shopName: order.shopName },
      }),
    )
  }

  function handleSubmitReturn(payload: {
    reason: string
    description: string
    evidenceUploadIds: string[]
  }) {
    if (!returnTarget?.id) {
      return
    }
    const orderId = returnTarget.id
    setActionError(null)
    createReturnMutation.mutate(
      {
        id: orderId,
        data: {
          reason: payload.reason,
          description: payload.description || null,
          evidenceUploadIds: payload.evidenceUploadIds,
        },
      },
      {
        onSuccess: () => {
          setReturnTarget(null)
          setActionError(null)
          notify.success('Đã gửi yêu cầu đổi trả cho shop')
          invalidateOrderCaches(orderId)
        },
        onError: (err) => {
          setActionError(
            notify.safeErrorMessage(err, 'createReturn', 'Không thể gửi yêu cầu đổi trả'),
          )
          notify.fromError(err, 'createReturn', 'Không thể gửi yêu cầu đổi trả')
        },
      },
    )
  }

  function openReviewForOrder(order: OrderResponse) {
    if (!order.id) {
      return
    }
    const grouped = groupOrderReviewProducts(order.items)
    if (grouped.length === 0) {
      return
    }
    if (grouped.length === 1 && grouped[0].item.productId) {
      const productId = grouped[0].item.productId
      setActionError(null)
      setReviewContext({
        orderId: order.id,
        productId,
        productName: grouped[0].item.productName ?? 'Sản phẩm',
        variantLabel: grouped[0].variantLabel,
        reviewerName: order.shippingName ?? undefined,
        existing: findOrderProductReview(order.id, productId, reviewLookup),
      })
      return
    }
    setActionError(null)
    setPickerOrder(order)
  }

  function handleSubmitReview(payload: ReviewSubmitPayload) {
    if (!reviewContext) {
      return
    }
    const { orderId, productId, existing } = reviewContext
    setActionError(null)
    const isEditing = existing !== undefined && existing.id !== undefined && existing.id !== ''
    const onSuccess = () => {
      setReviewContext(null)
      setActionError(null)
      let successTitle = 'Đã gửi đánh giá của bạn'
      if (isEditing) {
        successTitle = 'Đã cập nhật đánh giá của bạn'
      }
      notify.success(successTitle)
      void queryClient.invalidateQueries({ queryKey: getMyReviewsQueryKey() })
      void queryClient.invalidateQueries({ queryKey: getProductReviewsQueryKey(productId) })
      void queryClient.invalidateQueries({ queryKey: getProductReviewSummaryQueryKey(productId) })
    }
    const onError = (err: unknown) => {
      setActionError(notify.safeErrorMessage(err, 'review', 'Không thể lưu đánh giá'))
      notify.fromError(err, 'review', 'Không thể lưu đánh giá')
    }

    if (existing !== undefined && existing.id) {
      updateReviewMutation.mutate({ reviewId: existing.id, data: payload }, { onSuccess, onError })
      return
    }
    createReviewMutation.mutate(
      { productId, data: { orderId, ...payload } },
      { onSuccess, onError },
    )
  }

  async function handleReorder(order: OrderResponse) {
    if (!order.id) {
      return
    }
    setPendingReorderOrderId(order.id)
    try {
      const response = await reorderMutation.mutateAsync({ orderId: order.id })
      const data = takeData(response)
      void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      const adjusted = data.adjustedCount ?? 0
      const skipped = data.skippedCount ?? 0
      const added = data.addedCount ?? 0
      if (adjusted === 0 && skipped === 0 && added > 0) {
        notify.success('Đã thêm sản phẩm vào giỏ hàng')
        void navigate('/cart')
        return
      }
      setReorderResult(data)
    } catch (err) {
      notify.fromError(err, 'reorder', 'Không thể mua lại đơn hàng')
    } finally {
      setPendingReorderOrderId(null)
    }
  }

  const breadcrumbs = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Tài khoản', to: '/account' },
    { label: 'Đơn hàng của tôi' },
  ]

  if (sessionPending) {
    return (
      <AccountLayout breadcrumbs={breadcrumbs}>
        <StatePanel title="Đang tải đơn hàng" description="Vui lòng đợi trong giây lát…" />
      </AccountLayout>
    )
  }

  if (!isLoggedIn) {
    return (
      <AccountLayout breadcrumbs={breadcrumbs}>
        <StatePanel
          title="Bạn chưa đăng nhập"
          description="Đăng nhập để theo dõi tiến trình và lịch sử đơn hàng của bạn."
          action={
            <Link
              to="/login"
              className="btn-primary mt-5 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold"
            >
              Đăng nhập ngay
            </Link>
          }
        />
      </AccountLayout>
    )
  }

  return (
    <AccountLayout breadcrumbs={breadcrumbs}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600 uppercase dark:text-sky-400">
            Tài khoản cá nhân
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
            Đơn hàng của tôi
          </h1>
        </div>

        <div className="relative w-full sm:w-80">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm theo mã đơn hoặc tên sản phẩm…"
            className="w-full rounded-full border border-zinc-300 bg-white/80 py-2.5 pr-4 pl-9 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* 7 tabs dong bo 1-1 voi shop — single-line horizontal scroll on mobile */}
      <nav
        aria-label="Lọc theo trạng thái đơn hàng"
        className="mb-6 flex flex-nowrap gap-2 overflow-x-auto pb-2 md:flex-wrap"
      >
        {BUYER_ORDER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={activeTab === tab.key}
            onClick={() => selectTab(tab.key)}
            className={tabButtonClass(activeTab === tab.key)}
          >
            {tab.label} ({tabCounts[tab.key]})
          </button>
        ))}
      </nav>

      {ordersQuery.isLoading && (
        <StatePanel title="Đang tải đơn hàng" description="Danh sách đơn đang được cập nhật…" />
      )}

      {ordersQuery.isError && (
        <StatePanel
          title="Không tải được đơn hàng"
          description={hookErrorMessage('orders', ordersQuery.error)}
        />
      )}

      {!ordersQuery.isLoading && !ordersQuery.isError && filteredOrders.length === 0 && (
        <StatePanel
          title="Chưa có đơn hàng phù hợp"
          description="Thử chuyển sang tab khác hoặc xóa bộ lọc tìm kiếm."
        />
      )}

      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const orderStatus = orderStatusMeta(order.status)
          const retStatus = effectiveReturnStatus(order, latestReturnByOrderId)
          const retMeta = returnStatusMeta(retStatus)
          const showReceiptBtn = canConfirmReceipt(order.status, order.receivedAt, retStatus)
          const blockedByReturn =
            order.status === 'DELIVERED' && !order.receivedAt && isBlockingReturn(retStatus)
          const canReturn =
            order.status === 'DELIVERED' && !order.receivedAt && !isBlockingReturn(retStatus)
          const canReorder = order.status === 'DELIVERED' || order.status === 'CANCELLED'
          const reviewBtn = resolveOrderReviewAction(order, reviewLookup)

          return (
            <article key={order.id ?? order.code} className="glass space-y-4 rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 pb-3 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-zinc-900 dark:text-white">
                    <Storefront
                      size={16}
                      weight="bold"
                      className="text-blue-600 dark:text-sky-300"
                    />
                    {Boolean(order.shopSlug) && (
                      <Link to={`/shops/${order.shopSlug}`} className="hover:underline">
                        {order.shopName ?? 'Cửa hàng'}
                      </Link>
                    )}
                    {!order.shopSlug && <span>{order.shopName ?? 'Cửa hàng'}</span>}
                  </div>
                  <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    {order.code}
                  </span>
                  {Boolean(order.createdAt) && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {formatDateTime(order.createdAt)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${orderStatus.className}`}
                  >
                    {orderStatus.label}
                  </span>
                  {retMeta !== null && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${retMeta.className}`}
                    >
                      {retMeta.label}
                    </span>
                  )}
                </div>
              </div>

              {(order.status === 'CONFIRMED' ||
                order.status === 'SHIPPING' ||
                (order.status === 'DELIVERED' && !order.receivedAt)) && (
                <OrderProgressStepper
                  status={order.status}
                  createdAt={order.createdAt}
                  confirmedAt={order.confirmedAt}
                  shippedAt={order.shippedAt}
                  deliveredAt={order.deliveredAt}
                  receivedAt={order.receivedAt}
                  returnStatus={retStatus}
                  compact={true}
                />
              )}

              <div className="divide-y divide-sky-100 dark:divide-white/5">
                {(order.items ?? []).map((item, idx) => {
                  let thumb = PLACEHOLDER_IMAGE
                  if (item.imageUrl) {
                    thumb = urlOrPlaceholder(item.imageUrl)
                  }
                  const canVisitProduct = Boolean(item.productId) && item.productAvailable !== false
                  return (
                    <div
                      key={item.id ?? `${order.id}-${idx}`}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <img
                        src={thumb}
                        alt={item.productName ?? 'Sản phẩm'}
                        loading="lazy"
                        onError={fallbackImageOnError}
                        className="h-14 w-14 shrink-0 rounded-2xl border border-sky-100 object-cover dark:border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        {canVisitProduct && (
                          <Link
                            to={`/product/${item.productId}`}
                            className="truncate text-sm font-bold text-zinc-900 hover:underline dark:text-white"
                          >
                            {item.productName}
                          </Link>
                        )}
                        {!canVisitProduct && (
                          <p className="truncate text-sm font-bold text-zinc-500 dark:text-zinc-400">
                            {item.productName}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {item.variantLabel} • x{item.quantity ?? 1}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
                        {formatVnd(item.lineTotal ?? (item.unitPrice ?? 0) * (item.quantity ?? 1))}
                      </span>
                    </div>
                  )
                })}
              </div>

              {blockedByReturn && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  Đơn đang có yêu cầu đổi trả — nút xác nhận đã nhận hàng tạm khóa cho đến khi yêu
                  cầu kết thúc hoặc bị từ chối.
                </p>
              )}

              {order.status === 'DELIVERED' &&
                !order.receivedAt &&
                !isBlockingReturn(retStatus) &&
                Boolean(order.autoCompleteAt) && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Đơn sẽ tự động hoàn thành vào {formatDateTime(order.autoCompleteAt)} nếu không
                    có yêu cầu đổi trả.
                  </p>
                )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 pt-3 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {Boolean(order.shippingCarrier) && Boolean(order.trackingCode) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                      <Truck size={13} />
                      {order.shippingCarrier}: {order.trackingCode}
                    </span>
                  )}
                  {Boolean(order.paymentStatus) && (
                    <span>{paymentStatusLabel(order.paymentStatus)}</span>
                  )}
                  <span className="text-sm font-extrabold text-zinc-900 tabular-nums dark:text-white">
                    Tổng: {formatVnd(order.total ?? 0)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {Boolean(order.shopId) && (
                    <button
                      type="button"
                      onClick={() => handleOpenShopChat(order)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25"
                    >
                      <ChatCircleDots size={14} weight="bold" />
                      <span>Chat với Shop</span>
                    </button>
                  )}

                  <Link
                    to={`/account/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
                  >
                    <Package size={14} />
                    <span>Chi tiết</span>
                  </Link>

                  {order.status === 'AWAITING_PAYMENT' && (
                    <button
                      type="button"
                      disabled={retryVietQrMutation.isPending && pendingRetryOrderId === order.id}
                      onClick={() => handleRetryVietQr(order)}
                      className="btn-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <QrCode size={14} weight="bold" />
                      <span>Thanh toán ngay (Mã QR)</span>
                    </button>
                  )}

                  {canCancel(order.status) && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(order)}
                      className="cursor-pointer rounded-full border border-rose-300 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/15"
                    >
                      Hủy đơn hàng
                    </button>
                  )}

                  {showReceiptBtn && (
                    <button
                      type="button"
                      disabled={
                        confirmReceiptMutation.isPending && pendingReceiptOrderId === order.id
                      }
                      onClick={() => handleConfirmReceipt(order)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle size={14} weight="bold" />
                      <span>Đã nhận hàng</span>
                    </button>
                  )}

                  {canReturn && (
                    <button
                      type="button"
                      onClick={() => setReturnTarget(order)}
                      className="cursor-pointer rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
                    >
                      Yêu cầu đổi trả
                    </button>
                  )}

                  {reviewBtn.visible && (
                    <button
                      type="button"
                      disabled={reviewBtn.disabled}
                      onClick={() => openReviewForOrder(order)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-300 px-3.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-500/15"
                    >
                      <Star size={14} weight="bold" />
                      <span>{reviewBtn.label}</span>
                    </button>
                  )}

                  {canReorder && (
                    <button
                      type="button"
                      disabled={reorderMutation.isPending && pendingReorderOrderId === order.id}
                      onClick={() => void handleReorder(order)}
                      className="btn-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowCounterClockwise size={14} weight="bold" />
                      <span>Mua lại</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <CancelOrderModal
        open={cancelTarget !== null}
        orderCode={cancelTarget?.code}
        isPending={cancelMutation.isPending}
        error={actionError}
        onClose={() => {
          setActionError(null)
          setCancelTarget(null)
        }}
        onConfirm={handleConfirmCancel}
      />

      <ReturnRequestModal
        open={returnTarget !== null}
        orderCode={returnTarget?.code}
        isPending={createReturnMutation.isPending}
        error={actionError}
        onClose={() => {
          setActionError(null)
          setReturnTarget(null)
        }}
        onSubmit={handleSubmitReturn}
      />

      <ReviewProductPickerModal
        open={pickerOrder !== null}
        orderId={pickerOrder?.id}
        orderCode={pickerOrder?.code}
        items={pickerOrder?.items ?? []}
        reviewLookup={reviewLookup}
        onClose={() => setPickerOrder(null)}
        onSelectProduct={(item, variantLabel, existing) => {
          const orderId = pickerOrder?.id
          const reviewerName = pickerOrder?.shippingName ?? undefined
          setPickerOrder(null)
          if (orderId && item.productId) {
            setReviewContext({
              orderId,
              productId: item.productId,
              productName: item.productName ?? 'Sản phẩm',
              variantLabel,
              reviewerName,
              existing,
            })
          }
        }}
      />

      <ReviewModal
        key={
          (reviewContext?.orderId ?? 'none') + ':' + (reviewContext?.productId ?? 'review-modal')
        }
        open={reviewContext !== null}
        productName={reviewContext?.productName ?? ''}
        variantLabel={reviewContext?.variantLabel}
        reviewerName={reviewContext?.reviewerName}
        existingReview={reviewContext?.existing}
        isPending={createReviewMutation.isPending || updateReviewMutation.isPending}
        error={actionError}
        onClose={() => {
          setActionError(null)
          setReviewContext(null)
        }}
        onSubmit={handleSubmitReview}
      />

      <ReorderResultModal
        result={reorderResult}
        onClose={() => setReorderResult(null)}
        onGoToCart={() => {
          setReorderResult(null)
          void navigate('/cart')
        }}
      />
    </AccountLayout>
  )
}
