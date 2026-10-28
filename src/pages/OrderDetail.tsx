import { useState } from 'react'
import { Link, useParams } from 'react-router'

import {
  getDetail2QueryKey,
  getMine2QueryKey,
  useCancel1,
  useDetail2,
} from '@generated/endpoints/orders/orders'
import { ArrowLeft, Receipt } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import ConfirmDialog from '@/components/admin/ConfirmDialog'
import StatePanel from '@/components/ui/StatePanel'
import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { canCancel, orderStatusMeta, paymentStatusLabel } from '@/lib/orderStatus'

import type { OrderItemResponse } from '@generated/model/orderItemResponse'
import type { OrderResponse } from '@generated/model/orderResponse'

function OrderItemRow(props: { item: OrderItemResponse }) {
  const item = props.item
  let detail = String(item.quantity ?? 0) + ' × ' + formatVnd(item.unitPrice ?? 0)
  if (item.variantLabel !== undefined && item.variantLabel !== '') {
    detail = item.variantLabel + ' · ' + detail
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-bold">{item.productName}</p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>
      </div>
      <p className="text-sm font-extrabold">{formatVnd(item.lineTotal ?? 0)}</p>
    </li>
  )
}

export default function OrderDetail() {
  const params = useParams()
  const id = params.id ?? ''
  const queryClient = useQueryClient()
  const [cancelOpen, setCancelOpen] = useState(false)

  const detailQuery = useDetail2(id, { query: { enabled: id !== '' } })
  const cancel = useCancel1({
    mutation: {
      onSuccess: function () {
        setCancelOpen(false)
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: getDetail2QueryKey(id) }),
          queryClient.invalidateQueries({ queryKey: getMine2QueryKey() }),
        ])
      },
    },
  })

  let order: OrderResponse | undefined
  if (detailQuery.isSuccess) {
    order = takeData(detailQuery.data)
  }

  let cancelError: string | undefined
  if (cancel.isError) {
    cancelError = hookErrorMessage('orderCancel', cancel.error)
  }

  let body = <StatePanel title="Đang tải đơn hàng" description="Chi tiết đơn đang được tải…" />

  if (detailQuery.isError) {
    body = (
      <StatePanel
        title="Không mở được đơn hàng"
        description={hookErrorMessage('orderDetail', detailQuery.error)}
      />
    )
  }

  if (order !== undefined) {
    const status = orderStatusMeta(order.status)
    const items = order.items ?? []
    let cancelButton = null
    if (canCancel(order.status)) {
      cancelButton = (
        <button
          type="button"
          onClick={function () {
            setCancelOpen(true)
          }}
          className="mt-5 w-full rounded-full border border-red-200 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Hủy đơn hàng
        </button>
      )
    }

    body = (
      <>
        <section className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
                <Receipt size={22} weight="bold" className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tighter">
                  Đơn {order.code ?? '—'}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Đặt lúc {formatDateTime(order.createdAt)}
                </p>
              </div>
            </div>
            <span
              className={
                'inline-flex rounded-full px-2.5 py-1 text-xs font-bold ' + status.className
              }
            >
              {status.label}
            </span>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
            <h2 className="font-extrabold tracking-tight">Sản phẩm</h2>
            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-white/10">
              {items.map(function (item, index) {
                return <OrderItemRow key={item.id ?? index} item={item} />
              })}
            </ul>
          </section>

          <div className="space-y-5">
            <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="font-extrabold tracking-tight">Giao hàng</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500 dark:text-zinc-400">Người nhận</dt>
                  <dd className="font-semibold">{order.shippingName ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500 dark:text-zinc-400">Điện thoại</dt>
                  <dd className="font-semibold">{order.shippingPhone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-400">Địa chỉ</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{order.shippingAddress ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500 dark:text-zinc-400">Thanh toán</dt>
                  <dd className="font-semibold">{paymentStatusLabel(order.paymentStatus)}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
              <h2 className="font-extrabold tracking-tight">Tổng tiền</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500 dark:text-zinc-400">Tạm tính</dt>
                  <dd className="font-semibold">{formatVnd(order.subtotal ?? 0)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500 dark:text-zinc-400">Phí vận chuyển</dt>
                  <dd className="font-semibold">{formatVnd(order.shippingFee ?? 0)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 dark:border-white/10">
                  <dt className="font-bold">Thành tiền</dt>
                  <dd className="text-base font-extrabold text-blue-700 dark:text-sky-300">
                    {formatVnd(order.total ?? 0)}
                  </dd>
                </div>
              </dl>
              {cancelButton}
            </section>
          </div>
        </div>
      </>
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

      <ConfirmDialog
        open={cancelOpen}
        title="Hủy đơn hàng?"
        description="Đơn sẽ chuyển sang trạng thái Đã hủy và không thể hoàn tác."
        confirmLabel="Hủy đơn"
        pending={cancel.isPending}
        error={cancelError}
        onClose={function () {
          setCancelOpen(false)
        }}
        onConfirm={function () {
          cancel.mutate({ id: id })
        }}
      />
    </main>
  )
}
