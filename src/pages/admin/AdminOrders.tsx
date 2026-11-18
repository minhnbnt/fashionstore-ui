import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  useGetAdminOrderSummary,
  useListAdminOrders,
} from '@generated/endpoints/admin-orders/admin-orders'
import {
  ArrowUUpLeft,
  Clock,
  MagnifyingGlass,
  Package,
  Truck,
  Warning,
  X,
  XCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminOrderDetailPanel from '@/components/admin/AdminOrderDetailPanel'
import AdminShell from '@/components/admin/AdminShell'
import CancelOrderDialog from '@/components/admin/dialogs/CancelOrderDialog'
import Pagination from '@/components/search/Pagination'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/admin/productModeration'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import { notify } from '@/lib/notifications'
import {
  ALERT_OPTIONS,
  alertLabel,
  canAdminCancel,
  cancelledByLabel,
  dateRangeError,
  elapsedLabel,
  STATUS_TABS,
  statusBadgeClass,
  statusLabel,
  tabCount,
} from '@/lib/order/orderMonitoring'
import {
  cn,
  filterChipClass,
  FOCUS_RING_CLASS,
  INPUT_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

import type { OrderAlertFilter, OrderStatusFilter } from '@/lib/order/orderMonitoring'
import type { AdminOrderResponse } from '@generated/model/adminOrderResponse'
import type { AdminOrderSummaryResponse } from '@generated/model/adminOrderSummaryResponse'
import type { GetAdminOrderSummaryParams } from '@generated/model/getAdminOrderSummaryParams'
import type { ListAdminOrdersParams } from '@generated/model/listAdminOrdersParams'
import type { Icon } from '@phosphor-icons/react'

const PAGE_SIZE = 20

const ALERT_ICONS: Record<OrderAlertFilter, Icon> = {
  CONFIRM_LATE: Clock,
  HANDOVER_LATE: Package,
  DELIVERY_LATE: Truck,
  RETURN_OPEN: ArrowUUpLeft,
}

interface Filters {
  status: OrderStatusFilter
  alert: OrderAlertFilter | null
  q: string
  from: string
  to: string
  shopId: string
  buyerId: string
  page: number
}

function statusFromUrl(raw: string | null): OrderStatusFilter {
  const match = STATUS_TABS.find((tab) => tab.value === raw)
  if (match === undefined) {
    return 'ALL'
  }
  return match.value
}

function alertFromUrl(raw: string | null): OrderAlertFilter | null {
  const match = ALERT_OPTIONS.find((option) => option.value === raw)
  if (match === undefined) {
    return null
  }
  return match.value
}

function pageFromUrl(raw: string | null): number {
  const parsed = Number(raw)
  if (Number.isInteger(parsed) === false || parsed < 0) {
    return 0
  }
  return parsed
}

/** Bộ lọc chung của danh sách và bảng đếm; khoảng ngày sai thì bỏ để không gọi API lỗi. */
function summaryParamsOf(filters: Filters): GetAdminOrderSummaryParams {
  const params: GetAdminOrderSummaryParams = {}
  if (filters.q !== '') {
    params.q = filters.q
  }
  if (filters.shopId !== '') {
    params.shopId = filters.shopId
  }
  if (filters.buyerId !== '') {
    params.buyerId = filters.buyerId
  }
  if (dateRangeError(filters.from, filters.to) !== null) {
    return params
  }
  if (filters.from !== '') {
    params.from = filters.from
  }
  if (filters.to !== '') {
    params.to = filters.to
  }
  return params
}

function listParamsOf(filters: Filters): ListAdminOrdersParams {
  const params: ListAdminOrdersParams = {
    ...summaryParamsOf(filters),
    page: filters.page,
    size: PAGE_SIZE,
  }
  if (filters.status !== 'ALL') {
    params.status = filters.status
  }
  if (filters.alert !== null) {
    params.alert = filters.alert
  }
  return params
}

function isAdminOrderKey(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0]
  return typeof head === 'string' && head.startsWith('/api/admin/orders')
}

function alertCount(summary: AdminOrderSummaryResponse | undefined, alert: OrderAlertFilter) {
  if (summary === undefined) {
    return undefined
  }
  if (alert === 'CONFIRM_LATE') {
    return summary.confirmLate ?? 0
  }
  if (alert === 'HANDOVER_LATE') {
    return summary.handoverLate ?? 0
  }
  if (alert === 'DELIVERY_LATE') {
    return summary.deliveryLate ?? 0
  }
  return summary.returnOpen ?? 0
}

function AlertCard({
  alert,
  count,
  selected,
  onSelect,
}: {
  alert: (typeof ALERT_OPTIONS)[number]
  count: number | undefined
  selected: boolean
  onSelect: () => void
}) {
  const CardIcon = ALERT_ICONS[alert.value]
  const hasAlerts = count !== undefined && count > 0
  let cardClass = cn(
    PANEL_CLASS,
    'flex cursor-pointer flex-col gap-2 p-4 text-left transition hover:ring-2 hover:ring-amber-300',
    FOCUS_RING_CLASS,
  )
  if (selected) {
    cardClass = cn(
      PANEL_CLASS,
      'flex cursor-pointer flex-col gap-2 p-4 text-left ring-2 ring-amber-500',
      FOCUS_RING_CLASS,
    )
  }
  let iconClass =
    'flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400'
  if (hasAlerts) {
    iconClass =
      'flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
  }
  let countText = '…'
  if (count !== undefined) {
    countText = count.toLocaleString('vi-VN')
  }

  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={cardClass}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {alert.label}
        </span>
        <span className={iconClass}>
          <CardIcon size={18} weight="bold" />
        </span>
      </span>
      <span className="text-3xl font-extrabold tracking-tighter text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
        {countText}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{alert.hint}</span>
    </button>
  )
}

function OrderRow({
  order,
  now,
  onOpen,
  onCancel,
}: {
  order: AdminOrderResponse
  now: Date
  onOpen: () => void
  onCancel: () => void
}) {
  const itemCount = order.itemCount ?? 0
  const hasAlert = order.alert !== null && order.alert !== undefined

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={onOpen}
        className={cn('min-w-0 flex-1 cursor-pointer rounded-2xl text-left', FOCUS_RING_CLASS)}
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-[#17203a] hover:underline dark:text-[#e2e8f0]">
            {order.code}
          </span>
          <span className={statusBadgeClass(order.status)}>{statusLabel(order.status)}</span>
          {hasAlert && (
            <span className="flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              <Warning size={12} weight="bold" />
              {alertLabel(order.alert)}
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-xs text-zinc-500 dark:text-zinc-400">
          {order.shopName} · {order.buyerEmail} · {order.shippingName} {order.shippingPhone}
        </span>
        <span className="block truncate text-xs text-zinc-700 dark:text-zinc-300">
          {order.firstItemName}
          {itemCount > 1 && <span> · {itemCount} sản phẩm</span>}
        </span>
        {order.status === 'CANCELLED' && (
          <span className="block truncate text-xs text-rose-700 dark:text-rose-300">
            Hủy bởi {cancelledByLabel(order.cancelledBy)}
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <div className="flex flex-col items-start gap-0.5 sm:items-end">
          <span className="text-sm font-bold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
            {formatVnd(order.total ?? 0)}
          </span>
          <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {formatDateTime(order.createdAt)}
          </span>
          {hasAlert && (
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Đặt {elapsedLabel(order.createdAt, now)} trước
            </span>
          )}
        </div>
        {canAdminCancel(order.status) && (
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-full border border-rose-300 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/15',
              FOCUS_RING_CLASS,
            )}
          >
            <XCircle size={14} weight="bold" />
            Hủy
          </button>
        )}
      </div>
    </li>
  )
}

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters: Filters = {
    status: statusFromUrl(searchParams.get('status')),
    alert: alertFromUrl(searchParams.get('alert')),
    q: searchParams.get('q') ?? '',
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
    shopId: searchParams.get('shopId') ?? '',
    buyerId: searchParams.get('buyerId') ?? '',
    page: pageFromUrl(searchParams.get('page')),
  }

  const [draft, setDraft] = useState(filters.q)
  const [syncedQ, setSyncedQ] = useState(filters.q)
  if (syncedQ !== filters.q) {
    setSyncedQ(filters.q)
    setDraft(filters.q)
  }
  const [openId, setOpenId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<AdminOrderResponse | null>(null)
  const [now, setNow] = useState(() => new Date())
  const queryClient = useQueryClient()
  const listQuery = useListAdminOrders(listParamsOf(filters))
  const summaryQuery = useGetAdminOrderSummary(summaryParamsOf(filters))
  const rangeProblem = dateRangeError(filters.from, filters.to)

  // Làm mới mốc tính thời gian SLA mỗi 60 giây
  useEffect(function () {
    const timer = window.setInterval(function () {
      setNow(new Date())
    }, 60_000)
    return function () {
      window.clearInterval(timer)
    }
  }, [])

  let summary: AdminOrderSummaryResponse | undefined
  if (summaryQuery.isSuccess) {
    summary = takeData(summaryQuery.data)
  }

  function updateUrl(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') {
        next.delete(key)
        continue
      }
      next.set(key, value)
    }
    setSearchParams(next)
  }

  function clearAllFilters() {
    setDraft('')
    setSearchParams(new URLSearchParams())
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateUrl({ q: draft.trim(), page: null })
  }

  // Cảnh báo gắn với 1 trạng thái nên chọn cảnh báo thì bỏ lọc trạng thái, bấm lại thẻ đang chọn là bỏ lọc.
  function toggleAlert(alert: OrderAlertFilter) {
    if (filters.alert === alert) {
      updateUrl({ alert: null, page: null })
      return
    }
    updateUrl({ alert, status: null, page: null })
  }

  function filterBy(key: 'shopId' | 'buyerId', value: string) {
    setOpenId(null)
    updateUrl({ [key]: value, page: null })
  }

  function refreshAfterCancel(message: string) {
    setCancelTarget(null)
    notify.success(message)
    void queryClient.invalidateQueries({ predicate: (query) => isAdminOrderKey(query.queryKey) })
  }

  const hasAnyFilter =
    filters.status !== 'ALL' ||
    filters.alert !== null ||
    filters.q !== '' ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.shopId !== '' ||
    filters.buyerId !== ''

  let listBody: React.ReactNode = <TableRowsSkeleton rows={5} columns={4} />
  let totalPages = 0
  let total = 0
  if (listQuery.isError) {
    listBody = (
      <p
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
      >
        {hookErrorMessage('adminOrders', listQuery.error)}
      </p>
    )
  }
  if (listQuery.isSuccess) {
    const data = takeData(listQuery.data)
    const items = data.items ?? []
    total = data.total ?? 0
    totalPages = Math.ceil(total / PAGE_SIZE)
    listBody = (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Không có đơn hàng nào.
      </p>
    )
    if (items.length > 0) {
      listBody = (
        <ul className="space-y-2.5">
          {items.map(function (order) {
            return (
              <OrderRow
                key={order.id}
                order={order}
                now={now}
                onOpen={() => setOpenId(order.id ?? null)}
                onCancel={() => setCancelTarget(order)}
              />
            )
          })}
        </ul>
      )
    }
  }

  return (
    <AdminShell
      title="Giám sát đơn hàng"
      description="Theo dõi đơn hàng toàn sàn, xử lý đơn chậm trễ và hỗ trợ hủy đơn khi cần thiết."
    >
      <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ALERT_OPTIONS.map(function (alert) {
          return (
            <AlertCard
              key={alert.value}
              alert={alert}
              count={alertCount(summary, alert.value)}
              selected={filters.alert === alert.value}
              onSelect={() => toggleAlert(alert.value)}
            />
          )
        })}
      </div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        Hạn xử lý tính theo ngày làm việc, không tính Chủ nhật và ngày lễ.
      </p>

      <section className={PANEL_CLASS}>
        <div className="mb-4 overflow-x-auto pb-1">
          <div
            className={cn(segmentedTrackClass(), 'w-max')}
            role="tablist"
            aria-label="Lọc trạng thái"
          >
            {STATUS_TABS.map(function (tab) {
              const selected = tab.value === filters.status && filters.alert === null
              const count = tabCount(summary, tab.value)
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => updateUrl({ status: tab.value, alert: null, page: null })}
                  className={cn(segmentedItemClass(selected), 'cursor-pointer')}
                >
                  <span>{tab.label}</span>
                  {count !== undefined && (
                    <span className="tabular-nums opacity-75">{count.toLocaleString('vi-VN')}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearch} className="flex w-full items-center gap-2 lg:w-auto">
            <label className="flex flex-1 items-center gap-2 rounded-full border border-zinc-300 bg-white/85 px-4 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 lg:w-96 dark:border-white/15 dark:bg-white/10 dark:focus-within:border-sky-400 dark:focus-within:ring-sky-400/25">
              <MagnifyingGlass
                size={16}
                weight="bold"
                className="shrink-0 text-zinc-500 dark:text-zinc-400"
              />
              <input
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Mã đơn, tên/SĐT người nhận, shop, email"
                aria-label="Tìm đơn hàng"
                className="w-full bg-transparent text-sm text-[#17203a] outline-none placeholder:text-zinc-500 dark:text-white dark:placeholder:text-zinc-400"
              />
            </label>
            <button
              type="submit"
              className={cn(primaryButtonClass(), 'rounded-full px-4 py-2 text-sm font-bold')}
            >
              Tìm
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Từ</span>
              <input
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) => updateUrl({ from: event.target.value, page: null })}
                className={cn(INPUT_CLASS, 'w-auto px-3 py-2')}
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">đến</span>
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => updateUrl({ to: event.target.value, page: null })}
                className={cn(INPUT_CLASS, 'w-auto px-3 py-2')}
              />
            </label>
          </div>
        </div>

        {rangeProblem !== null && (
          <p role="alert" className="mb-3 text-xs font-medium text-rose-600 dark:text-rose-400">
            {rangeProblem}
          </p>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {listQuery.isSuccess && (
            <span className="tabular-nums">{total.toLocaleString('vi-VN')} đơn hàng</span>
          )}
          {filters.alert !== null && (
            <button
              type="button"
              onClick={() => updateUrl({ alert: null, page: null })}
              className={filterChipClass()}
            >
              {alertLabel(filters.alert)} · trễ lâu nhất trước
              <X size={12} weight="bold" />
            </button>
          )}
          {filters.shopId !== '' && (
            <button
              type="button"
              onClick={() => updateUrl({ shopId: null, page: null })}
              className={filterChipClass()}
            >
              Đang lọc theo 1 shop
              <X size={12} weight="bold" />
            </button>
          )}
          {filters.buyerId !== '' && (
            <button
              type="button"
              onClick={() => updateUrl({ buyerId: null, page: null })}
              className={filterChipClass()}
            >
              Đang lọc theo 1 người mua
              <X size={12} weight="bold" />
            </button>
          )}
          {(filters.from !== '' || filters.to !== '') && (
            <button
              type="button"
              onClick={() => updateUrl({ from: null, to: null, page: null })}
              className={filterChipClass()}
            >
              Bỏ lọc ngày
              <X size={12} weight="bold" />
            </button>
          )}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className={cn(
                'ml-auto inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/15',
                FOCUS_RING_CLASS,
              )}
            >
              <X size={12} weight="bold" />
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>

        {listBody}

        <Pagination
          page={filters.page}
          totalPages={totalPages}
          onPage={(next) => updateUrl({ page: String(next) })}
        />
      </section>

      {openId !== null && (
        <AdminOrderDetailPanel
          orderId={openId}
          onClose={() => setOpenId(null)}
          onCancel={(order) => setCancelTarget(order)}
          onFilterShop={(shopId) => filterBy('shopId', shopId)}
          onFilterBuyer={(buyerId) => filterBy('buyerId', buyerId)}
        />
      )}

      {cancelTarget !== null && (
        <CancelOrderDialog
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={() => refreshAfterCancel(`Đã hủy đơn ${cancelTarget.code}.`)}
        />
      )}
    </AdminShell>
  )
}
