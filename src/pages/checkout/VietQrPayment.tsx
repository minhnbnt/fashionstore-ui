import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { getMine3QueryKey } from '@generated/endpoints/orders/orders'
import {
  getGetVietQrSessionQueryKey,
  useGetVietQrSession,
  useSimulateVietQrTransfer,
} from '@generated/endpoints/payments-vietqr/payments-vietqr'
import {
  ArrowLeft,
  ArrowRight,
  Bank,
  CheckCircle,
  Clock,
  Copy,
  DownloadSimple,
  Flask,
  QrCode,
  ShieldCheck,
  Storefront,
  WarningCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Breadcrumb from '@/components/ui/Breadcrumb'
import { PageSkeleton } from '@/components/ui/Skeleton'
import StatePanel from '@/components/ui/StatePanel'
import {
  fallbackImageOnError,
  hookErrorMessage,
  takeData,
  urlOrPlaceholder,
} from '@/lib/api/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { orderStatusMeta } from '@/lib/order/orderStatus'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { VietQrSessionResponse } from '@generated/model/vietQrSessionResponse'

function resolveRefetchInterval(status: string | undefined): number | false {
  if (status === 'PENDING') {
    return 3000
  }
  return false
}

export default function VietQrPayment() {
  const { txnRef = '' } = useParams()
  const queryClient = useQueryClient()
  const [simulatedSession, setSimulatedSession] = useState<VietQrSessionResponse | null>(null)

  const sessionQuery = useGetVietQrSession(txnRef, {
    query: {
      enabled: txnRef !== '',
      refetchInterval: function (query) {
        const res = query.state.data
        if (res !== undefined && res.status === 200) {
          return resolveRefetchInterval(res.data.status)
        }
        return false
      },
    },
  })

  const simulateMutation = useSimulateVietQrTransfer()

  let session: VietQrSessionResponse | null = null
  if (sessionQuery.data !== undefined) {
    session = takeData(sessionQuery.data)
  }
  if (simulatedSession !== null && simulatedSession.txnRef === txnRef) {
    session = simulatedSession
  }

  async function handleCopy(label: string, value: string | undefined) {
    if (!value) {
      return
    }
    try {
      if (navigator.clipboard !== undefined) {
        await navigator.clipboard.writeText(value)
      }
      notify.success('Đã sao chép ' + label)
    } catch {
      notify.info(label + ': ' + value)
    }
  }

  function handleSimulate(amount: number) {
    if (txnRef === '') {
      return
    }
    simulateMutation.mutate(
      { txnRef, data: { amount } },
      {
        onSuccess: function (res) {
          const updated = takeData(res)
          setSimulatedSession(updated)
          queryClient.setQueryData(getGetVietQrSessionQueryKey(txnRef), res)
          void queryClient.invalidateQueries({ queryKey: getGetVietQrSessionQueryKey(txnRef) })
          void queryClient.invalidateQueries({ queryKey: getMine3QueryKey() })
          if (updated.status === 'SUCCESS') {
            notify.success('Thanh toán VietQR thành công!')
          } else if (updated.status === 'UNDERPAID') {
            notify.warning('Giao dịch chuyển thiếu tiền đã được ghi nhận chờ hoàn tiền')
          }
        },
        onError: function (err) {
          notify.fromError(err, 'simulateVietQr', 'Không thể giả lập chuyển khoản VietQR')
        },
      },
    )
  }

  if (sessionQuery.isLoading && session === null) {
    return <PageSkeleton />
  }

  if (sessionQuery.isError || session === null) {
    return (
      <main className="mx-auto max-w-4xl px-4 pt-24 pb-16">
        <StatePanel
          title="Không tìm thấy phiên thanh toán VietQR"
          description={hookErrorMessage('vietQrSession', sessionQuery.error)}
          action={
            <Link
              to="/account/orders"
              className="btn-primary mt-5 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold"
            >
              <ArrowLeft size={16} weight="bold" />
              <span>Xem đơn hàng của tôi</span>
            </Link>
          }
        />
      </main>
    )
  }

  const orders = session.orders ?? []
  const amount = session.amount ?? 0
  const receivedAmount = session.receivedAmount ?? 0
  const halfAmount = Math.floor(amount / 2)

  return (
    <main className="mx-auto max-w-5xl px-4 pt-24 pb-16">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Đơn hàng của tôi', to: '/account/orders' },
          { label: 'Thanh toán VietQR' },
        ]}
        showHomeIcon={true}
        className="mb-4"
      />

      {session.status === 'SUCCESS' && (
        <section className="glass mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-emerald-50/70 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
            <CheckCircle size={36} weight="fill" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-emerald-900 sm:text-3xl dark:text-emerald-200">
            Thanh toán thành công!
          </h1>
          <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
            Hệ thống đã xác nhận khoản chuyển khoản{' '}
            <strong className="font-extrabold tabular-nums">
              {formatVnd(receivedAmount || amount)}
            </strong>{' '}
            với mã tham chiếu <span className="font-mono font-bold">{session.txnRef}</span>.
          </p>
          {Boolean(session.paidAt) && (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300/80">
              Thời gian xác nhận: {formatDateTime(session.paidAt)}
            </p>
          )}

          {orders.length > 0 && (
            <div className="mt-6 space-y-2 rounded-2xl border border-emerald-200/80 bg-white/80 p-4 text-left text-xs dark:border-emerald-500/20 dark:bg-white/5">
              <p className="font-extrabold text-zinc-900 dark:text-white">
                Đơn hàng đã được thanh toán ({orders.length})
              </p>
              <div className="divide-y divide-zinc-200/70 dark:divide-white/10">
                {orders.map(function (ord) {
                  return (
                    <div
                      key={ord.orderId ?? ord.orderCode}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Storefront
                          size={14}
                          weight="bold"
                          className="text-blue-700 dark:text-sky-300"
                        />
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">
                          {ord.orderCode}
                        </span>
                        {Boolean(ord.shopName) && (
                          <span className="text-zinc-500 dark:text-zinc-400">· {ord.shopName}</span>
                        )}
                      </div>
                      <span className="font-extrabold text-zinc-900 tabular-nums dark:text-white">
                        {formatVnd(ord.total ?? 0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/account/orders"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold"
            >
              <span>Xem đơn hàng của tôi</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </section>
      )}

      {session.status !== 'SUCCESS' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 pb-4 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <QrCode size={24} weight="bold" className="text-blue-700 dark:text-sky-300" />
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Quét Mã VietQR Thanh Toán
                </h1>
              </div>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Mở ứng dụng ngân hàng và quét mã QR để tự động điền số tiền và nội dung chuyển khoản
              </p>
            </div>
            <Link
              to="/account/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Xem đơn hàng của tôi</span>
            </Link>
          </div>

          {session.status === 'UNDERPAID' && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200"
            >
              <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="text-sm font-extrabold">Hệ thống ghi nhận bạn đã chuyển thiếu tiền</p>
                <p>
                  Đã nhận{' '}
                  <strong className="font-extrabold tabular-nums">
                    {formatVnd(receivedAmount)}
                  </strong>{' '}
                  / Cần thanh toán{' '}
                  <strong className="font-extrabold tabular-nums">{formatVnd(amount)}</strong>.
                  Khoản tiền đã chuyển đã được đánh dấu chờ hoàn tiền (REFUND_PENDING). Vui lòng vào
                  chi tiết đơn hàng để tạo mã QR thanh toán lại hoặc liên hệ bộ phận hỗ trợ.
                </p>
              </div>
            </div>
          )}

          {(session.status === 'EXPIRED' || session.status === 'FAILED') && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-3xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200"
            >
              <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-extrabold">Phiên thanh toán đã hết hạn hoặc bị hủy</p>
                <p className="mt-1">
                  Vui lòng kiểm tra trạng thái đơn hàng trong mục Đơn hàng của tôi.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Cột trái: Khung mã QR */}
            <div className="lg:col-span-5">
              <div className="glass flex flex-col items-center rounded-3xl p-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200">
                  <Clock size={14} weight="bold" />
                  <span>Tự động kiểm tra trạng thái mỗi 3 giây</span>
                </span>

                <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-md dark:border-white/10">
                  <img
                    src={urlOrPlaceholder(session.qrImageUrl)}
                    alt="Mã VietQR thanh toán"
                    onError={fallbackImageOnError}
                    className="mx-auto h-64 w-64 object-contain"
                  />
                </div>

                {Boolean(session.qrImageUrl) && (
                  <a
                    href={session.qrImageUrl}
                    download={`vietqr-${session.txnRef ?? 'payment'}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white/80 px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
                  >
                    <DownloadSimple size={14} weight="bold" />
                    <span>Tải ảnh mã QR</span>
                  </a>
                )}

                {Boolean(session.expiresAt) && (
                  <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Hạn giữ đơn chờ thanh toán:{' '}
                    <strong className="font-bold text-zinc-800 dark:text-zinc-200">
                      {formatDateTime(session.expiresAt)}
                    </strong>
                  </p>
                )}

                <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Tiền thanh toán được sàn bảo vệ (Escrow) cho tới khi bạn nhận hàng</span>
                </div>
              </div>
            </div>

            {/* Cột phải: Thông tin chuyển khoản thủ công & Danh sách đơn + Sandbox */}
            <div className="space-y-6 lg:col-span-7">
              <div className="glass space-y-4 rounded-3xl p-6">
                <div className="flex items-center gap-2">
                  <Bank size={18} weight="bold" className="text-blue-700 dark:text-sky-300" />
                  <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                    Thông tin chuyển khoản ngân hàng
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <span className="text-zinc-500 dark:text-zinc-400">Ngân hàng thụ hưởng</span>
                    <div className="text-right">
                      <span className="font-extrabold text-zinc-900 dark:text-white">
                        {session.bankName || session.bankCode || 'Ngân hàng NAPAS'}
                      </span>
                      {Boolean(session.bankCode) && Boolean(session.bankName) && (
                        <span className="ml-1.5 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-500/15 dark:text-sky-200">
                          {session.bankCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <span className="text-zinc-500 dark:text-zinc-400">Chủ tài khoản</span>
                    <span className="font-extrabold text-zinc-900 dark:text-white">
                      {session.accountName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <div>
                      <span className="block text-zinc-500 dark:text-zinc-400">Số tài khoản</span>
                      <span className="font-mono text-sm font-extrabold text-zinc-900 dark:text-white">
                        {session.accountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={function () {
                        void handleCopy('số tài khoản', session.accountNumber)
                      }}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200',
                        FOCUS_RING_CLASS,
                      )}
                    >
                      <Copy size={13} weight="bold" />
                      <span>Sao chép</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <div>
                      <span className="block text-zinc-500 dark:text-zinc-400">
                        Số tiền cần chuyển
                      </span>
                      <span className="text-base font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
                        {formatVnd(amount)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={function () {
                        void handleCopy('số tiền', String(amount))
                      }}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200',
                        FOCUS_RING_CLASS,
                      )}
                    >
                      <Copy size={13} weight="bold" />
                      <span>Sao chép</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 dark:border-sky-500/30 dark:bg-sky-500/15">
                    <div>
                      <span className="block text-sky-800 dark:text-sky-200">
                        Nội dung chuyển khoản (bắt buộc chính xác)
                      </span>
                      <span className="font-mono text-base font-extrabold tracking-wider text-blue-700 dark:text-sky-300">
                        {session.txnRef}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={function () {
                        void handleCopy('nội dung chuyển khoản', session.txnRef)
                      }}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1 rounded-full border border-sky-300 bg-white px-3 py-1 text-xs font-bold text-blue-700 hover:bg-sky-100 dark:border-sky-400/30 dark:bg-white/10 dark:text-sky-200',
                        FOCUS_RING_CLASS,
                      )}
                    >
                      <Copy size={13} weight="bold" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Danh sách đơn hàng thuộc phiên thanh toán */}
              <div className="glass space-y-3 rounded-3xl p-6">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  Đơn hàng trong phiên thanh toán ({orders.length})
                </h2>
                <div className="divide-y divide-zinc-200/70 text-xs dark:divide-white/10">
                  {orders.map(function (ord) {
                    const statusBadge = orderStatusMeta(ord.orderStatus)
                    return (
                      <div
                        key={ord.orderId ?? ord.orderCode}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Storefront
                            size={15}
                            weight="bold"
                            className="text-blue-700 dark:text-sky-300"
                          />
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {ord.shopName ?? 'Cửa hàng'}
                          </span>
                          <span className="font-mono font-bold text-zinc-600 dark:text-zinc-300">
                            {ord.orderCode}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>
                        <span className="font-extrabold text-zinc-900 tabular-nums dark:text-white">
                          {formatVnd(ord.total ?? 0)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Công cụ Demo Sandbox */}
              {session.sandboxMode === true && (
                <div className="glass space-y-3 rounded-3xl border border-amber-300/80 bg-amber-50/70 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Flask size={18} weight="fill" className="text-amber-700 dark:text-amber-300" />
                    <h2 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                      Công cụ Demo Sandbox
                    </h2>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-200/90">
                    Cổng VietQR đang bật chế độ Demo Sandbox. Bấm nút bên dưới để giả lập webhook
                    ngân hàng báo biến động số dư mà không cần chuyển tiền thật.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      disabled={simulateMutation.isPending}
                      onClick={function () {
                        handleSimulate(amount)
                      }}
                      className={cn(
                        'btn-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50',
                        FOCUS_RING_CLASS,
                      )}
                    >
                      <CheckCircle size={15} weight="bold" />
                      <span>Giả lập ngân hàng báo đã nhận đủ tiền</span>
                    </button>

                    <button
                      type="button"
                      disabled={simulateMutation.isPending}
                      onClick={function () {
                        handleSimulate(halfAmount)
                      }}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-400 bg-white/90 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-400/40 dark:bg-white/10 dark:text-amber-200 dark:hover:bg-white/15',
                        FOCUS_RING_CLASS,
                      )}
                    >
                      <WarningCircle size={15} weight="bold" />
                      <span>Giả lập chuyển thiếu tiền (50%)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
