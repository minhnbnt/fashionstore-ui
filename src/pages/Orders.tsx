import { Link } from 'react-router'

import { useMine2 } from '@generated/endpoints/orders/orders'
import { ArrowRight, Package, Receipt } from '@phosphor-icons/react'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { orderItemSummary, orderStatusMeta } from '@/lib/orderStatus'

import type { OrderResponse } from '@generated/model/orderResponse'

function OrderCard(props: { order: OrderResponse }) {
  const order = props.order
  const status = orderStatusMeta(order.status)
  const items = order.items ?? []
  const href = '/account/orders/' + (order.id ?? '')
  let total = 0
  if (order.total !== undefined) {
    total = order.total
  }

  return (
    <article className="glass rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {formatDateTime(order.createdAt)}
          </p>
          <p className="mt-1 font-extrabold tracking-tight">Đơn {order.code ?? '—'}</p>
        </div>
        <span
          className={'inline-flex rounded-full px-2.5 py-1 text-xs font-bold ' + status.className}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{orderItemSummary(items)}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{items.length} sản phẩm</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Tổng tiền</p>
          <p className="font-extrabold text-blue-700 dark:text-sky-300">{formatVnd(total)}</p>
        </div>
      </div>

      <Link
        to={href}
        className="btn-primary mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
      >
        Xem chi tiết
        <ArrowRight size={16} weight="bold" />
      </Link>
    </article>
  )
}

export default function Orders() {
  // shortcut: lấy hết đơn trong 1 request (BE chưa phân trang); đơn nhiều thì thêm page/size.
  const query = useMine2()
  let orders: OrderResponse[] = []
  if (query.isSuccess) {
    orders = takeData(query.data)
  }

  let body = (
    <div className="space-y-4" aria-busy="true">
      {[0, 1, 2].map(function (index) {
        return (
          <div key={index} className="h-40 animate-pulse rounded-3xl bg-white/60 dark:bg-white/5" />
        )
      })}
    </div>
  )

  if (query.isError) {
    body = (
      <div className="glass rounded-3xl px-6 py-12 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('orders', query.error)}
        </p>
        <button
          type="button"
          onClick={function () {
            void query.refetch()
          }}
          className="mt-3 rounded-full px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (query.isSuccess && orders.length === 0) {
    body = (
      <div className="glass rounded-3xl px-6 py-16 text-center">
        <Package size={40} weight="duotone" className="mx-auto text-indigo-400" />
        <p className="mt-3 font-bold">Chưa có đơn hàng nào</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Đơn bạn đặt sẽ xuất hiện ở đây.
        </p>
        <Link
          to="/"
          className="btn-primary mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-bold"
        >
          Mua sắm ngay
        </Link>
      </div>
    )
  }

  if (orders.length > 0) {
    body = (
      <div className="space-y-4">
        {orders.map(function (order, index) {
          return <OrderCard key={order.id ?? index} order={order} />
        })}
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[110px] pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
            <Receipt size={22} weight="bold" className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tighter">Đơn hàng của tôi</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{orders.length} đơn hàng</p>
          </div>
        </div>
      </div>

      <div className="mt-6">{body}</div>
    </main>
  )
}
