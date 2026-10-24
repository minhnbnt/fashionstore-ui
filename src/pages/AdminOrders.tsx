import { useState } from 'react'
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
  Receipt,
  Truck,
  Warning,
  X,
  XCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'
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
} from '@/lib/orderMonitoring'
import { formatDateTime } from '@/lib/productModeration'

import AdminNav from '../components/admin/AdminNav'
import AdminOrderDetailPanel from '../components/admin/AdminOrderDetailPanel'
import CancelOrderDialog from '../components/admin/CancelOrderDialog'
import Pagination from '../components/search/Pagination'

import type { OrderAlertFilter, OrderStatusFilter } from '@/lib/orderMonitoring'
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
  let cardClass =
    'glass flex flex-col gap-2 rounded-3xl p-4 text-left transition hover:ring-2 hover:ring-amber-300'
  if (selected) {
    cardClass = 'glass flex flex-col gap-2 rounded-3xl p-4 text-left ring-2 ring-amber-500'
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
      <span className="text-3xl font-extrabold tracking-tighter tabular-nums">{countText}</span>
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
    <li className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3 sm:flex-row sm:items-center dark:bg-white/5">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold hover:underline">{order.code}</span>
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
          <span className="block truncate text-xs text-red-700 dark:text-red-300">
            Hủy bởi {cancelledByLabel(order.cancelledBy)}
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <div className="flex flex-col items-start gap-0.5 sm:items-end">
          <span className="text-sm font-bold tabular-nums">{formatVnd(order.total ?? 0)}</span>
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
            className="flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
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
  const [openId, setOpenId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<AdminOrderResponse | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [now] = useState(() => new Date())
  const queryClient = useQueryClient()
  const listQuery = useListAdminOrders(listParamsOf(filters))
  const summaryQuery = useGetAdminOrderSummary(summaryParamsOf(filters))
  const rangeProblem = dateRangeError(filters.from, filters.to)

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
    setNotice(message)
    void queryClient.invalidateQueries({ predicate: (query) => isAdminOrderKey(query.queryKey) })
  }

  let listBody = (
    <div className="space-y-2" aria-busy="true">
      {[0, 1, 2, 3].map(function (index) {
        return (
          <div
            key={index}
            className="h-[84px] animate-pulse rounded-2xl bg-white/60 dark:bg-white/5"
          />
        )
      })}
    </div>
  )
  let totalPages = 0
  let total = 0
  if (listQuery.isError) {
    listBody = (
      <p className="text-sm text-red-600 dark:text-red-400">
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
        <ul className="space-y-2">
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

  const chipClass =
    'flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 font-semibold dark:bg-white/10'
  const dateInputClass =
    'rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/5'

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
          <Receipt size={22} weight="bold" className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-400">
            Admin
          </p>
          <h1 className="text-xl font-extrabold tracking-tighter">Giám sát đơn hàng</h1>
        </div>
      </div>

      <AdminNav />

      {notice !== null && (
        <output className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          {notice}
          <button type="button" aria-label="Ẩn thông báo" onClick={() => setNotice(null)}>
            <X size={16} weight="bold" />
          </button>
        </output>
      )}

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

      <section className="glass rounded-3xl p-5">
        <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Lọc trạng thái">
          {STATUS_TABS.map(function (tab) {
            const selected = tab.value === filters.status && filters.alert === null
            const count = tabCount(summary, tab.value)
            let tabClass =
              'rounded-full px-3.5 py-1.5 text-xs font-bold transition text-zinc-600 hover:bg-white/70 dark:text-zinc-300 dark:hover:bg-white/10'
            if (selected) {
              tabClass =
                'rounded-full px-3.5 py-1.5 text-xs font-bold transition bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950'
            }
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => updateUrl({ status: tab.value, alert: null, page: null })}
                className={tabClass}
              >
                {tab.label}
                {count !== undefined && (
                  <span className="ml-1.5 tabular-nums opacity-70">
                    {count.toLocaleString('vi-VN')}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearch} className="flex w-full items-center gap-2 lg:w-auto">
            <label className="flex flex-1 items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 lg:w-96 dark:border-white/10 dark:bg-white/5">
              <MagnifyingGlass size={16} weight="bold" className="shrink-0 text-zinc-400" />
              <input
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Mã đơn, tên/SĐT người nhận, shop, email"
                aria-label="Tìm đơn hàng"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <button type="submit" className="btn-primary rounded-full px-4 py-2 text-sm font-bold">
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
                className={dateInputClass}
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">đến</span>
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => updateUrl({ to: event.target.value, page: null })}
                className={dateInputClass}
              />
            </label>
          </div>
        </div>

        {rangeProblem !== null && (
          <p className="mb-3 text-xs text-red-600 dark:text-red-400">{rangeProblem}</p>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {listQuery.isSuccess && (
            <span className="tabular-nums">{total.toLocaleString('vi-VN')} đơn hàng</span>
          )}
          {filters.alert !== null && (
            <button
              type="button"
              onClick={() => updateUrl({ alert: null, page: null })}
              className={chipClass}
            >
              {alertLabel(filters.alert)} · trễ lâu nhất trước
              <X size={12} weight="bold" />
            </button>
          )}
          {filters.shopId !== '' && (
            <button
              type="button"
              onClick={() => updateUrl({ shopId: null, page: null })}
              className={chipClass}
            >
              Đang lọc theo 1 shop
              <X size={12} weight="bold" />
            </button>
          )}
          {filters.buyerId !== '' && (
            <button
              type="button"
              onClick={() => updateUrl({ buyerId: null, page: null })}
              className={chipClass}
            >
              Đang lọc theo 1 người mua
              <X size={12} weight="bold" />
            </button>
          )}
          {(filters.from !== '' || filters.to !== '') && (
            <button
              type="button"
              onClick={() => updateUrl({ from: null, to: null, page: null })}
              className={chipClass}
            >
              Bỏ lọc ngày
              <X size={12} weight="bold" />
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
    </main>
  )
}
