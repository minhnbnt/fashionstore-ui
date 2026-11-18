import { useGetAdminOrder } from '@generated/endpoints/admin-orders/admin-orders'
import {
  ArrowUUpLeft,
  ClockCounterClockwise,
  Funnel,
  Storefront,
  User,
  Warning,
  XCircle,
} from '@phosphor-icons/react'

import Drawer from '@/components/ui/Drawer'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import { statusMeta } from '@/lib/admin/admin'
import { formatDateTime } from '@/lib/admin/productModeration'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import {
  actorLabel,
  ALERT_OPTIONS,
  canAdminCancel,
  cancelledByLabel,
  cancelReasonLabel,
  statusBadgeClass,
  statusLabel,
} from '@/lib/order/orderMonitoring'
import { cn, dangerButtonClass, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { AdminOrderDetailResponse } from '@generated/model/adminOrderDetailResponse'
import type { AdminOrderResponse } from '@generated/model/adminOrderResponse'
import type { OrderTimelineResponse } from '@generated/model/orderTimelineResponse'

interface Props {
  orderId: string
  onClose: () => void
  onCancel: (order: AdminOrderResponse) => void
  onFilterShop: (shopId: string) => void
  onFilterBuyer: (buyerId: string) => void
}

const RETURN_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Chờ shop duyệt',
  APPROVED: 'Shop đã duyệt, chờ nhận hàng',
  REJECTED: 'Shop từ chối',
  COMPLETED: 'Đã hoàn tất',
}

function paymentMethodLabel(method: string | null | undefined): string {
  if (method === 'COD') {
    return 'Thanh toán khi nhận hàng (COD)'
  }
  if (method === 'VNPAY') {
    return 'VNPay'
  }
  if (method === 'MOMO') {
    return 'Ví MoMo'
  }
  if (method === 'BANK_TRANSFER') {
    return 'Chuyển khoản ngân hàng'
  }
  if (method === 'CARD') {
    return 'Thẻ ngân hàng'
  }
  return method ?? 'Không rõ'
}

function returnReasonLabel(reason: string | null | undefined): string {
  if (reason === 'DAMAGED') {
    return 'Sản phẩm bị hư hỏng / lỗi'
  }
  if (reason === 'WRONG_ITEM') {
    return 'Giao sai sản phẩm / size / màu'
  }
  if (reason === 'NOT_AS_DESCRIBED') {
    return 'Không đúng mô tả'
  }
  if (reason === 'CHANGE_MIND') {
    return 'Đổi ý / không còn nhu cầu'
  }
  if (reason === 'OTHER') {
    return 'Lý do khác'
  }
  return reason ?? 'Không rõ'
}

function timelineTitle(entry: OrderTimelineResponse): string {
  if (entry.fromStatus === null || entry.fromStatus === undefined) {
    return 'Đặt hàng'
  }
  if (entry.fromStatus === 'DELIVERED' && entry.toStatus === 'DELIVERED') {
    if (entry.actor === 'SYSTEM') {
      return 'Hệ thống tự động xác nhận hoàn thành sau 7 ngày'
    }
    return 'Người mua xác nhận đã nhận hàng'
  }
  return `${statusLabel(entry.fromStatus)} → ${statusLabel(entry.toStatus)}`
}

function MoneyRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  let className = 'flex justify-between text-sm'
  if (strong === true) {
    className = 'flex justify-between text-sm font-extrabold'
  }
  return (
    <div className={className}>
      <span>{label}</span>
      <span className="tabular-nums">{formatVnd(value)}</span>
    </div>
  )
}

function DetailBody({
  detail,
  onCancel,
  onFilterShop,
  onFilterBuyer,
}: {
  detail: AdminOrderDetailResponse
  onCancel: Props['onCancel']
  onFilterShop: Props['onFilterShop']
  onFilterBuyer: Props['onFilterBuyer']
}) {
  const order = detail.order
  const items = detail.items ?? []
  const timeline = detail.timeline ?? []
  const returns = detail.returns ?? []
  if (order === undefined) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Không có dữ liệu đơn hàng.</p>
  }
  const alert = ALERT_OPTIONS.find((option) => option.value === order.alert)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
          <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            Đặt lúc {formatDateTime(order.createdAt)}
          </span>
        </div>
        <h3 className="mt-2 text-xl font-extrabold tracking-tighter text-[#17203a] dark:text-[#e2e8f0]">
          {order.code}
        </h3>
      </div>

      {alert !== undefined && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
          <Warning size={18} weight="bold" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">{alert.label}</p>
            <p className="mt-0.5 text-xs">{alert.hint}</p>
          </div>
        </div>
      )}

      {order.status === 'CANCELLED' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200">
          <p className="font-bold">
            Hủy bởi {cancelledByLabel(order.cancelledBy)}
            {order.cancelReason !== null && order.cancelReason !== undefined && (
              <span> · {cancelReasonLabel(order.cancelReason, order.cancelledBy)}</span>
            )}
          </p>
          {detail.cancelNote !== null && detail.cancelNote !== undefined && (
            <p className="mt-1">{detail.cancelNote}</p>
          )}
          <p className="mt-1 text-xs tabular-nums">
            {formatDateTime(detail.cancelledAt ?? undefined)}
          </p>
        </div>
      )}

      {canAdminCancel(order.status) && (
        <button
          type="button"
          onClick={() => onCancel(order)}
          className={cn(dangerButtonClass(), 'px-5 py-2.5')}
        >
          <XCircle size={16} weight="bold" />
          Hủy can thiệp
        </button>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
          <h4 className="mb-2 flex items-center gap-2 font-bold">
            <User size={16} weight="bold" />
            Người mua
          </h4>
          <p className="truncate">{order.buyerEmail}</p>
          <p className="mt-2 font-semibold">{order.shippingName}</p>
          <p className="text-zinc-600 dark:text-zinc-300">{order.shippingPhone}</p>
          <p className="text-zinc-600 dark:text-zinc-300">{detail.shippingAddress}</p>
          {order.buyerId !== undefined && (
            <button
              type="button"
              onClick={() => onFilterBuyer(order.buyerId ?? '')}
              className={cn(
                'mt-2 flex cursor-pointer items-center gap-1 rounded-full text-xs font-bold text-blue-700 hover:underline dark:text-sky-300',
                FOCUS_RING_CLASS,
              )}
            >
              <Funnel size={12} weight="bold" />
              Đơn khác của người mua
            </button>
          )}
        </section>
        <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
          <h4 className="mb-2 flex items-center gap-2 font-bold">
            <Storefront size={16} weight="bold" />
            Shop
          </h4>
          <p className="truncate font-semibold">{order.shopName}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">/{order.shopSlug}</p>
          {detail.shopStatus !== 'APPROVED' && (
            <p className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-300">
              Trạng thái shop: {statusMeta(detail.shopStatus).label}
            </p>
          )}
          {order.shopId !== undefined && (
            <button
              type="button"
              onClick={() => onFilterShop(order.shopId ?? '')}
              className={cn(
                'mt-2 flex cursor-pointer items-center gap-1 rounded-full text-xs font-bold text-blue-700 hover:underline dark:text-sky-300',
                FOCUS_RING_CLASS,
              )}
            >
              <Funnel size={12} weight="bold" />
              Đơn khác của shop
            </button>
          )}
        </section>
      </div>

      {detail.note !== undefined && detail.note !== '' && (
        <p className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
          <span className="font-bold">Lời nhắn: </span>
          {detail.note}
        </p>
      )}

      <section>
        <h4 className="mb-2 text-sm font-bold">Sản phẩm ({items.length})</h4>
        <ul className="divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
          {items.map(function (item) {
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{item.productName}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.variantLabel} · {item.sku}
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  {formatVnd(item.unitPrice ?? 0)} × {item.quantity}
                  <span className="block font-bold">{formatVnd(item.lineTotal ?? 0)}</span>
                </span>
              </li>
            )
          })}
        </ul>
        <div className="mt-3 space-y-1 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <MoneyRow label="Tiền hàng" value={detail.subtotal ?? 0} />
          <MoneyRow label="Phí vận chuyển" value={detail.shippingFee ?? 0} />
          <MoneyRow label="Tổng cộng" value={order.total ?? 0} strong />
          <p className="pt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {paymentMethodLabel(detail.paymentMethod)} ·{' '}
            {order.paymentStatus === 'COLLECTED' && 'Đã thu tiền'}
            {order.paymentStatus !== 'COLLECTED' && 'Chưa thu tiền'}
          </p>
        </div>
      </section>

      <section>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <ClockCounterClockwise size={16} weight="bold" />
          Dòng thời gian
        </h4>
        <ol className="space-y-3 border-l-2 border-zinc-200 pl-4 dark:border-white/10">
          {timeline.map(function (entry, index) {
            return (
              <li key={`${entry.createdAt}-${index}`} className="text-sm">
                <p className="font-bold">{timelineTitle(entry)}</p>
                {entry.note !== undefined && entry.note !== '' && (
                  <p className="text-zinc-700 dark:text-zinc-300">{entry.note}</p>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {actorLabel(entry.actor)}
                  {entry.changedByEmail !== null && entry.changedByEmail !== undefined && (
                    <span> ({entry.changedByEmail})</span>
                  )}{' '}
                  · {formatDateTime(entry.createdAt)}
                </p>
              </li>
            )
          })}
        </ol>
      </section>

      {returns.length > 0 && (
        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <ArrowUUpLeft size={16} weight="bold" />
            Yêu cầu trả hàng
          </h4>
          <ul className="space-y-2">
            {returns.map(function (request) {
              return (
                <li
                  key={request.id}
                  className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"
                >
                  <p className="font-bold">
                    {RETURN_STATUS_LABELS[request.status ?? ''] ?? request.status} ·{' '}
                    {returnReasonLabel(request.reason)}
                  </p>
                  {request.description !== null && request.description !== undefined && (
                    <p className="text-zinc-700 dark:text-zinc-300">{request.description}</p>
                  )}
                  {request.sellerNote !== null && request.sellerNote !== undefined && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Shop: {request.sellerNote}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {formatDateTime(request.createdAt)}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Bảng trượt bên phải: đủ thông tin để admin đánh giá trước khi can thiệp. */
export default function AdminOrderDetailPanel({
  orderId,
  onClose,
  onCancel,
  onFilterShop,
  onFilterBuyer,
}: Props) {
  const query = useGetAdminOrder(orderId)

  let body: React.ReactNode = <TableRowsSkeleton rows={4} columns={2} />
  if (query.isError) {
    body = (
      <p
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
      >
        {hookErrorMessage('adminOrderDetail', query.error)}
      </p>
    )
  }
  if (query.isSuccess) {
    body = (
      <DetailBody
        detail={takeData(query.data)}
        onCancel={onCancel}
        onFilterShop={onFilterShop}
        onFilterBuyer={onFilterBuyer}
      />
    )
  }

  return (
    <Drawer open side="right" title="Chi tiết đơn hàng" widthClass="max-w-lg" onClose={onClose}>
      {body}
    </Drawer>
  )
}
