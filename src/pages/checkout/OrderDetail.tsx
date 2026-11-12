import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

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
  getTracking1QueryKey,
  useCancel1,
  useConfirmReceipt,
  useDetail2,
  useTimeline1,
  useTracking1,
} from '@generated/endpoints/orders/orders'
import {
  getListQueryKey as getProductReviewsQueryKey,
  getMine1QueryKey as getMyReviewsQueryKey,
  useCreate as useCreateReview,
  useMine1 as useMyReviews,
  useUpdate3 as useUpdateReview,
} from '@generated/endpoints/reviews/reviews'
import {
  ArrowCounterClockwise,
  ArrowLeft,
  CheckCircle,
  MapPin,
  Star,
  Storefront,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import CancelOrderModal from '@/components/order/CancelOrderModal'
import OrderProgressStepper from '@/components/order/OrderProgressStepper'
import ReorderResultModal from '@/components/order/ReorderResultModal'
import ReturnRequestModal from '@/components/order/ReturnRequestModal'
import ReviewModal from '@/components/order/ReviewModal'
import ReviewProductPickerModal from '@/components/order/ReviewProductPickerModal'
import ShipmentTrackingCard from '@/components/order/ShipmentTrackingCard'
import StatePanel from '@/components/ui/StatePanel'
import { hookErrorMessage, imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/api/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { actorLabel, cancelReasonLabel } from '@/lib/order/orderMonitoring'
import {
  canCancel,
  canConfirmReceipt,
  orderStatusMeta,
  paymentStatusLabel,
  returnStatusMeta,
} from '@/lib/order/orderStatus'

import type { BuyerOrderTimelineResponse } from '@generated/model/buyerOrderTimelineResponse'
import type { OrderItemResponse } from '@generated/model/orderItemResponse'
import type { OrderResponse } from '@generated/model/orderResponse'
import type { OrderTrackingEventResponse } from '@generated/model/orderTrackingEventResponse'
import type { ReorderResponse } from '@generated/model/reorderResponse'
import type { ReviewResponse } from '@generated/model/reviewResponse'

function isBlockingReturn(status: string | null | undefined): boolean {
  return status === 'REQUESTED' || status === 'APPROVED' || status === 'COMPLETED'
}

function distinctReviewableItems(items: OrderItemResponse[] | undefined): OrderItemResponse[] {
  const seen = new Set<string>()
  const list: OrderItemResponse[] = []
  for (const item of items ?? []) {
    if (!item.productId || seen.has(item.productId)) {
      continue
    }
    seen.add(item.productId)
    list.push(item)
  }
  return list
}

function resolveReviewState(
  order: OrderResponse,
  reviewsByProductId: Map<string, ReviewResponse>,
): { visible: boolean; label: string; disabled: boolean } {
  if (order.status !== 'DELIVERED') {
    return { visible: false, label: '', disabled: true }
  }
  const items = distinctReviewableItems(order.items)
  if (items.length === 0) {
    return { visible: false, label: '', disabled: true }
  }
  let hasUnreviewed = false
  let hasEditable = false
  for (const item of items) {
    if (!item.productId) {
      continue
    }
    const existing = reviewsByProductId.get(item.productId)
    if (existing === undefined) {
      hasUnreviewed = true
    } else if (!existing.edited) {
      hasEditable = true
    }
  }
  if (hasUnreviewed) {
    return { visible: true, label: 'Đánh giá', disabled: false }
  }
  if (hasEditable) {
    return { visible: true, label: 'Sửa đánh giá (1 lần)', disabled: false }
  }
  return { visible: true, label: 'Đã đánh giá', disabled: true }
}

export default function OrderDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const detailQuery = useDetail2(id, { query: { enabled: id !== '' } })
  const trackingQuery = useTracking1(id, { query: { enabled: id !== '' } })
  const timelineQuery = useTimeline1(id, { query: { enabled: id !== '' } })
  const returnsQuery = useMyReturns({ query: { enabled: id !== '' } })
  const reviewsQuery = useMyReviews({ query: { enabled: id !== '' } })

  const cancelMutation = useCancel1()
  const confirmReceiptMutation = useConfirmReceipt()
  const createReturnMutation = useCreateReturn()
  const createReviewMutation = useCreateReview()
  const updateReviewMutation = useUpdateReview()
  const reorderMutation = useReorder()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [reviewContext, setReviewContext] = useState<{
    productId: string
    productName: string
    existing?: ReviewResponse
  } | null>(null)
  const [reorderResult, setReorderResult] = useState<ReorderResponse | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  let order: OrderResponse | undefined
  if (detailQuery.data !== undefined) {
    order = takeData(detailQuery.data)
  }
  let trackingEvents: OrderTrackingEventResponse[] = []
  if (trackingQuery.data !== undefined) {
    trackingEvents = takeData(trackingQuery.data)
  }
  let timeline: BuyerOrderTimelineResponse[] = []
  if (timelineQuery.data !== undefined) {
    timeline = takeData(timelineQuery.data)
  }
  const allReturns = useMemo(() => {
    if (returnsQuery.data === undefined) {
      return []
    }
    return takeData(returnsQuery.data)
  }, [returnsQuery.data])
  const myReviews = useMemo(() => {
    if (reviewsQuery.data === undefined) {
      return []
    }
    return takeData(reviewsQuery.data)
  }, [reviewsQuery.data])

  const orderReturns = useMemo(() => {
    return allReturns
      .filter((r) => r.orderId === id)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  }, [allReturns, id])

  const reviewsByProductId = useMemo(() => {
    const map = new Map<string, ReviewResponse>()
    for (const review of myReviews) {
      if (review.productId) {
        map.set(review.productId, review)
      }
    }
    return map
  }, [myReviews])

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: getMine3QueryKey() })
    void queryClient.invalidateQueries({ queryKey: getMyReturnsQueryKey() })
    if (id !== '') {
      void queryClient.invalidateQueries({ queryKey: getDetail2QueryKey(id) })
      void queryClient.invalidateQueries({ queryKey: getTimeline1QueryKey(id) })
      void queryClient.invalidateQueries({ queryKey: getTracking1QueryKey(id) })
    }
  }

  let body = <StatePanel title="Đang tải đơn hàng" description="Chi tiết đơn đang được tải…" />

  if (detailQuery.isError) {
    body = (
      <StatePanel
        title="Không mở được đơn hàng"
        description={hookErrorMessage('orderDetail', detailQuery.error)}
      />
    )
  } else if (order !== undefined) {
    const status = orderStatusMeta(order.status)
    const latestReturn = orderReturns[0]
    const effectiveReturnStatus = latestReturn?.status ?? order.returnStatus ?? null
    const retMeta = returnStatusMeta(effectiveReturnStatus)
    const showReceipt = canConfirmReceipt(order.status, order.receivedAt, effectiveReturnStatus)
    const blockedByReturn =
      order.status === 'DELIVERED' && !order.receivedAt && isBlockingReturn(effectiveReturnStatus)
    const canReturn =
      order.status === 'DELIVERED' && !order.receivedAt && !isBlockingReturn(effectiveReturnStatus)
    const canReorder = order.status === 'DELIVERED' || order.status === 'CANCELLED'
    const reviewBtn = resolveReviewState(order, reviewsByProductId)

    function handleCancel(reason: string, note: string | null) {
      setActionError(null)
      cancelMutation.mutate(
        { id, data: { reason, note } },
        {
          onSuccess: () => {
            setCancelOpen(false)
            setActionSuccess('Đã hủy đơn hàng thành công.')
            invalidateAll()
          },
          onError: (err) => {
            setActionError(hookErrorMessage('cancelOrder', err))
          },
        },
      )
    }

    function handleConfirmReceipt() {
      setActionError(null)
      confirmReceiptMutation.mutate(
        { id },
        {
          onSuccess: () => {
            setActionSuccess('Cảm ơn bạn đã xác nhận đã nhận hàng!')
            invalidateAll()
          },
          onError: (err) => {
            setActionError(hookErrorMessage('confirmReceipt', err))
          },
        },
      )
    }

    function handleSubmitReturn(payload: {
      reason: string
      description: string
      evidenceKeys: string[]
    }) {
      setActionError(null)
      createReturnMutation.mutate(
        {
          id,
          data: {
            reason: payload.reason,
            description: payload.description || null,
            evidenceKeys: payload.evidenceKeys,
          },
        },
        {
          onSuccess: () => {
            setReturnOpen(false)
            setActionSuccess('Đã gửi yêu cầu đổi trả cho shop.')
            invalidateAll()
          },
          onError: (err) => {
            setActionError(hookErrorMessage('createReturn', err))
          },
        },
      )
    }

    function openReview() {
      if (!order) {
        return
      }
      const items = distinctReviewableItems(order.items)
      if (items.length === 1 && items[0].productId) {
        const productId = items[0].productId
        setReviewContext({
          productId,
          productName: items[0].productName ?? 'Sản phẩm',
          existing: reviewsByProductId.get(productId),
        })
        return
      }
      setPickerOpen(true)
    }

    function handleSubmitReview(stars: number, comment: string) {
      if (!reviewContext) {
        return
      }
      const { productId, existing } = reviewContext
      setActionError(null)
      const cleanComment = comment || null
      const onSuccess = () => {
        setReviewContext(null)
        setActionSuccess('Đã lưu đánh giá của bạn.')
        void queryClient.invalidateQueries({ queryKey: getMyReviewsQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getProductReviewsQueryKey(productId) })
      }
      const onError = (err: unknown) => {
        setActionError(hookErrorMessage('review', err))
      }

      if (existing !== undefined) {
        updateReviewMutation.mutate(
          { productId, data: { stars, comment: cleanComment } },
          { onSuccess, onError },
        )
        return
      }
      createReviewMutation.mutate(
        { productId, data: { stars, comment: cleanComment } },
        { onSuccess, onError },
      )
    }

    async function handleReorder() {
      setActionError(null)
      try {
        const res = await reorderMutation.mutateAsync({ orderId: id })
        const data = takeData(res)
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
        const adjusted = data.adjustedCount ?? 0
        const skipped = data.skippedCount ?? 0
        const added = data.addedCount ?? 0
        if (adjusted === 0 && skipped === 0 && added > 0) {
          void navigate('/cart')
          return
        }
        setReorderResult(data)
      } catch (err) {
        setActionError(hookErrorMessage('reorder', err))
      }
    }

    body = (
      <div className="space-y-6">
        {actionSuccess !== null && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">
            <span>{actionSuccess}</span>
            <button type="button" onClick={() => setActionSuccess(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {actionError !== null && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        <section className="space-y-5 rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-white/10">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  {order.code}
                </h1>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>
                  {status.label}
                </span>
                {retMeta !== null && (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${retMeta.className}`}>
                    {retMeta.label}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
                  <Storefront size={15} />
                  {Boolean(order.shopSlug) && (
                    <Link to={`/shops/${order.shopSlug}`} className="hover:underline">
                      {order.shopName ?? 'Cửa hàng'}
                    </Link>
                  )}
                  {!order.shopSlug && <span>{order.shopName ?? 'Cửa hàng'}</span>}
                </span>
                {Boolean(order.createdAt) && <span>Đặt lúc {formatDateTime(order.createdAt)}</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canCancel(order.status) && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="rounded-full border border-red-300 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/15"
                >
                  Hủy đơn hàng
                </button>
              )}

              {showReceipt && (
                <button
                  type="button"
                  disabled={confirmReceiptMutation.isPending}
                  onClick={handleConfirmReceipt}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle size={15} weight="bold" />
                  <span>Đã nhận hàng</span>
                </button>
              )}

              {canReturn && (
                <button
                  type="button"
                  onClick={() => setReturnOpen(true)}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
                >
                  Yêu cầu đổi trả
                </button>
              )}

              {reviewBtn.visible && (
                <button
                  type="button"
                  disabled={reviewBtn.disabled}
                  onClick={openReview}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-500/15"
                >
                  <Star size={14} weight="bold" />
                  <span>{reviewBtn.label}</span>
                </button>
              )}

              {canReorder && (
                <button
                  type="button"
                  disabled={reorderMutation.isPending}
                  onClick={() => void handleReorder()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <ArrowCounterClockwise size={15} weight="bold" />
                  <span>Mua lại</span>
                </button>
              )}
            </div>
          </div>

          <OrderProgressStepper
            status={order.status}
            createdAt={order.createdAt}
            confirmedAt={order.confirmedAt}
            shippedAt={order.shippedAt}
            deliveredAt={order.deliveredAt}
            receivedAt={order.receivedAt}
            cancelledAt={order.cancelledAt}
            returnStatus={effectiveReturnStatus}
          />

          {blockedByReturn && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Đơn hàng đang có yêu cầu đổi trả đang xử lý nên nút xác nhận đã nhận hàng tạm thời bị
              khóa.
            </p>
          )}

          {order.status === 'DELIVERED' &&
            !order.receivedAt &&
            !isBlockingReturn(effectiveReturnStatus) &&
            Boolean(order.autoCompleteAt) && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Nếu không có khiếu nại hoặc đổi trả, hệ thống sẽ tự động hoàn thành đơn vào{' '}
                {formatDateTime(order.autoCompleteAt)}.
              </p>
            )}

          {order.status === 'CANCELLED' && Boolean(order.cancelReason) && (
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3.5 text-xs text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              <p className="font-bold">
                Lý do hủy ({actorLabel(order.cancelledBy)}):{' '}
                {cancelReasonLabel(order.cancelReason, order.cancelledBy)}
              </p>
              {Boolean(order.cancelNote) && <p className="mt-1">Ghi chú: {order.cancelNote}</p>}
            </div>
          )}
        </section>

        <ShipmentTrackingCard
          shippingCarrier={order.shippingCarrier}
          trackingCode={order.trackingCode}
          events={trackingEvents}
          timeline={timeline}
          isLoading={trackingQuery.isLoading || timelineQuery.isLoading}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 rounded-3xl border border-zinc-200 bg-white/90 p-5 lg:col-span-2 dark:border-white/10 dark:bg-[#11182a]">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
              Sản phẩm trong đơn ({order.items?.length ?? 0})
            </h2>
            <div className="divide-y divide-zinc-100 dark:divide-white/5">
              {(order.items ?? []).map((item, idx) => {
                let thumb = PLACEHOLDER_IMAGE
                if (item.imageKey) {
                  thumb = imageUrl(item.imageKey)
                }
                const canVisit = Boolean(item.productId) && item.productAvailable !== false
                return (
                  <div key={item.id ?? `${idx}`} className="flex items-center gap-3 py-3">
                    <img
                      src={thumb}
                      alt={item.productName ?? 'Sản phẩm'}
                      className="h-16 w-16 shrink-0 rounded-2xl border border-zinc-200 object-cover dark:border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      {canVisit && (
                        <Link
                          to={`/product/${item.productId}`}
                          className="text-sm font-bold text-zinc-900 hover:underline dark:text-white"
                        >
                          {item.productName}
                        </Link>
                      )}
                      {!canVisit && (
                        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                          {item.productName}
                        </p>
                      )}
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {item.variantLabel} • x{item.quantity ?? 1}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Đơn giá: {formatVnd(item.unitPrice ?? 0)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-zinc-900 tabular-nums dark:text-white">
                      {formatVnd(item.lineTotal ?? (item.unitPrice ?? 0) * (item.quantity ?? 1))}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white/90 p-5 dark:border-white/10 dark:bg-[#11182a]">
            <div className="space-y-1.5">
              <h2 className="flex items-center gap-1.5 text-base font-extrabold text-zinc-900 dark:text-white">
                <MapPin size={16} weight="bold" />
                <span>Thông tin nhận hàng</span>
              </h2>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                {order.shippingName}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{order.shippingPhone}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">{order.shippingAddress}</p>
              {Boolean(order.note) && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Ghi chú: {order.note}</p>
              )}
            </div>

            <div className="space-y-2 border-t border-zinc-200 pt-4 text-sm dark:border-white/10">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Tạm tính</span>
                <span className="tabular-nums">{formatVnd(order.subtotal ?? 0)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Phí vận chuyển</span>
                <span className="tabular-nums">{formatVnd(order.shippingFee ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-extrabold text-zinc-900 dark:border-white/10 dark:text-white">
                <span>Tổng cộng</span>
                <span className="tabular-nums">{formatVnd(order.total ?? 0)}</span>
              </div>
              {Boolean(order.paymentStatus) && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Thanh toán: {order.paymentMethod ?? 'COD'} —{' '}
                  {paymentStatusLabel(order.paymentStatus)}
                </p>
              )}
            </div>
          </section>
        </div>

        {orderReturns.length > 0 && (
          <section className="space-y-3 rounded-3xl border border-zinc-200 bg-white/90 p-5 dark:border-white/10 dark:bg-[#11182a]">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
              Lịch sử yêu cầu đổi trả ({orderReturns.length})
            </h2>
            <div className="space-y-3">
              {orderReturns.map((ret) => {
                const badge = returnStatusMeta(ret.status)
                return (
                  <div
                    key={ret.id ?? ret.createdAt}
                    className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 text-xs dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white">
                        Lý do: {ret.reason}
                      </span>
                      {badge !== null && (
                        <span className={`rounded-full px-2.5 py-0.5 font-bold ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    {Boolean(ret.description) && (
                      <p className="text-zinc-600 dark:text-zinc-300">{ret.description}</p>
                    )}
                    {Boolean(ret.sellerNote) && (
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        Phản hồi shop: {ret.sellerNote}
                      </p>
                    )}
                    {Boolean(ret.createdAt) && (
                      <p className="text-[11px] text-zinc-400">{formatDateTime(ret.createdAt)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <CancelOrderModal
          open={cancelOpen}
          orderCode={order.code}
          isPending={cancelMutation.isPending}
          error={actionError}
          onClose={() => setCancelOpen(false)}
          onConfirm={handleCancel}
        />

        <ReturnRequestModal
          open={returnOpen}
          orderCode={order.code}
          isPending={createReturnMutation.isPending}
          error={actionError}
          onClose={() => setReturnOpen(false)}
          onSubmit={handleSubmitReturn}
        />

        <ReviewProductPickerModal
          open={pickerOpen}
          orderCode={order.code}
          items={order.items ?? []}
          reviewsByProductId={reviewsByProductId}
          onClose={() => setPickerOpen(false)}
          onSelectProduct={(item, existing) => {
            setPickerOpen(false)
            if (item.productId) {
              setReviewContext({
                productId: item.productId,
                productName: item.productName ?? 'Sản phẩm',
                existing,
              })
            }
          }}
        />

        <ReviewModal
          key={reviewContext?.productId ?? 'review-modal-detail'}
          open={reviewContext !== null}
          productName={reviewContext?.productName ?? ''}
          existingReview={reviewContext?.existing}
          isPending={createReviewMutation.isPending || updateReviewMutation.isPending}
          error={actionError}
          onClose={() => setReviewContext(null)}
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
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[110px] pb-16">
      <Link
        to="/account/orders"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:underline dark:text-indigo-200"
      >
        <ArrowLeft size={16} weight="bold" />
        Quay lại danh sách đơn
      </Link>
      {body}
    </main>
  )
}
