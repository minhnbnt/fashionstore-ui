import { useState } from 'react'
import { Link, useParams } from 'react-router'

import {
  getGetAdminShopQueryKey,
  getListAdminShopsQueryKey,
  useApproveShop,
  useGetAdminShop,
  useReinstateShop,
  useRejectShop,
  useSuspendShop,
} from '@generated/endpoints/admin-shops/admin-shops'
import { getGetAdminStatsQueryKey } from '@generated/endpoints/admin-stats/admin-stats'
import { getListAdminUsersQueryKey } from '@generated/endpoints/admin-users/admin-users'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Cube,
  Envelope,
  LockKey,
  Package,
  Storefront,
  User,
  XCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminShell from '@/components/admin/AdminShell'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import HistoryTimeline from '@/components/admin/HistoryTimeline'
import ReasonDialog from '@/components/admin/ReasonDialog'
import StatePanel from '@/components/admin/StatePanel'
import StatusBadge from '@/components/admin/StatusBadge'
import { adminErrorMessage, formatDateTime } from '@/lib/admin'
import { takeData } from '@/lib/apiAdapters'

import type { AdminShopDetailResponse } from '@generated/model/adminShopDetailResponse'

type ConfirmAction = 'approve' | 'reinstate'
type ReasonAction = 'reject' | 'suspend'

const REJECT_REASONS = [
  'Thông tin shop chưa đầy đủ, vui lòng bổ sung mô tả và logo',
  'Tên hoặc nội dung shop có dấu hiệu gây nhầm lẫn thương hiệu',
  'Thông tin liên hệ chưa thể xác minh',
]

const SUSPEND_REASONS = [
  'Phát hiện dấu hiệu bán hàng giả hoặc xâm phạm thương hiệu',
  'Shop vi phạm chính sách vận hành nhiều lần',
  'Cần tạm dừng để xác minh khiếu nại của khách hàng',
]

export default function AdminShopDetail() {
  const params = useParams()
  const id = params.id ?? ''
  const queryClient = useQueryClient()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const detailQuery = useGetAdminShop(id, { query: { enabled: id !== '' } })

  function refresh(): void {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetAdminShopQueryKey(id) }),
      queryClient.invalidateQueries({ queryKey: getListAdminShopsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() }),
    ])
  }

  function completed(message: string): void {
    setConfirmAction(null)
    setReasonAction(null)
    setSuccess(message)
    refresh()
  }

  const approve = useApproveShop({
    mutation: {
      onSuccess: function () {
        completed('Shop đã được duyệt và có thể bắt đầu bán hàng.')
      },
    },
  })
  const reinstate = useReinstateShop({
    mutation: {
      onSuccess: function () {
        completed('Shop đã được mở lại trên sàn.')
      },
    },
  })
  const reject = useRejectShop({
    mutation: {
      onSuccess: function () {
        completed('Hồ sơ đã bị từ chối và chủ shop sẽ thấy lý do.')
      },
    },
  })
  const suspend = useSuspendShop({
    mutation: {
      onSuccess: function () {
        completed('Shop đã được tạm khóa và ẩn khỏi sàn.')
      },
    },
  })

  let detail: AdminShopDetailResponse | undefined
  if (detailQuery.data !== undefined) {
    detail = takeData(detailQuery.data)
  }
  const shop = detail?.shop
  const productCount = detail?.productCount ?? 0
  const orderCount = detail?.orderCount ?? 0
  const history = detail?.history ?? []

  let confirmTitle = ''
  let confirmDescription = ''
  let confirmLabel = ''
  let confirmPending = false
  let confirmError: string | undefined
  if (confirmAction === 'approve') {
    confirmTitle = 'Duyệt shop này?'
    confirmDescription =
      'Shop sẽ xuất hiện trên sàn và chủ shop được cấp quyền truy cập kênh người bán.'
    confirmLabel = 'Duyệt shop'
    confirmPending = approve.isPending
    if (approve.isError) {
      confirmError = adminErrorMessage(approve.error)
    }
  }
  if (confirmAction === 'reinstate') {
    confirmTitle = 'Mở lại shop?'
    confirmDescription = 'Shop sẽ hiển thị trở lại và có thể nhận đơn hàng mới.'
    confirmLabel = 'Mở lại shop'
    confirmPending = reinstate.isPending
    if (reinstate.isError) {
      confirmError = adminErrorMessage(reinstate.error)
    }
  }

  let reasonTitle = ''
  let reasonDescription = ''
  let reasonLabel = ''
  let reasonSuggestions = REJECT_REASONS
  let reasonPending = false
  let reasonError: string | undefined
  if (reasonAction === 'reject') {
    reasonTitle = 'Từ chối hồ sơ shop'
    reasonDescription = 'Lý do sẽ hiển thị cho chủ shop để họ chỉnh sửa và gửi duyệt lại.'
    reasonLabel = 'Từ chối hồ sơ'
    reasonPending = reject.isPending
    if (reject.isError) {
      reasonError = adminErrorMessage(reject.error)
    }
  }
  if (reasonAction === 'suspend') {
    reasonTitle = 'Tạm khóa shop'
    reasonDescription = 'Shop sẽ bị ẩn khỏi sàn nhưng vẫn được xử lý các đơn đang có.'
    reasonLabel = 'Tạm khóa shop'
    reasonSuggestions = SUSPEND_REASONS
    reasonPending = suspend.isPending
    if (suspend.isError) {
      reasonError = adminErrorMessage(suspend.error)
    }
  }

  function confirmModeration(): void {
    if (confirmAction === 'approve') {
      approve.mutate({ id })
      return
    }
    if (confirmAction === 'reinstate') {
      reinstate.mutate({ id })
    }
  }

  function submitReason(reason: string): void {
    if (reasonAction === 'reject') {
      reject.mutate({ id, data: { reason } })
      return
    }
    if (reasonAction === 'suspend') {
      suspend.mutate({ id, data: { reason } })
    }
  }

  let actions: React.ReactNode
  if (shop?.status === 'PENDING') {
    actions = (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={function () {
            setSuccess(null)
            setReasonAction('reject')
          }}
          className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 dark:border-red-400/20 dark:text-red-200 dark:hover:bg-red-500/10"
        >
          Từ chối
        </button>
        <button
          type="button"
          onClick={function () {
            setSuccess(null)
            setConfirmAction('approve')
          }}
          className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold"
        >
          Duyệt shop
        </button>
      </div>
    )
  }
  if (shop?.status === 'APPROVED') {
    actions = (
      <button
        type="button"
        onClick={function () {
          setSuccess(null)
          setReasonAction('suspend')
        }}
        className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 dark:border-red-400/20 dark:text-red-200 dark:hover:bg-red-500/10"
      >
        Tạm khóa shop
      </button>
    )
  }
  if (shop?.status === 'SUSPENDED') {
    actions = (
      <button
        type="button"
        onClick={function () {
          setSuccess(null)
          setConfirmAction('reinstate')
        }}
        className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold"
      >
        Mở lại shop
      </button>
    )
  }

  return (
    <AdminShell
      title={shop?.name ?? 'Chi tiết shop'}
      description="Kiểm tra hồ sơ, chủ sở hữu và toàn bộ lịch sử kiểm duyệt."
      actions={actions}
    >
      <Link
        to="/admin/shops"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:underline dark:text-indigo-200"
      >
        <ArrowLeft size={16} weight="bold" />
        Quay lại danh sách
      </Link>

      {detailQuery.isPending && (
        <StatePanel title="Đang tải hồ sơ" description="Thông tin shop đang được cập nhật…" />
      )}
      {detailQuery.isError && (
        <StatePanel
          title="Không mở được hồ sơ shop"
          description={adminErrorMessage(detailQuery.error)}
        />
      )}

      {shop !== undefined && (
        <>
          {success !== null && (
            <p className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
              {success}
            </p>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <div className="space-y-5">
              <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200">
                      <Storefront size={25} weight="bold" />
                    </span>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight">{shop.name}</h2>
                      <p className="text-sm text-zinc-500">/{shop.slug}</p>
                    </div>
                  </div>
                  <StatusBadge status={shop.status} />
                </div>

                <p className="mt-5 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                  {shop.description || 'Shop chưa cung cấp mô tả.'}
                </p>

                {shop.statusReason !== undefined && shop.statusReason !== null && (
                  <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 dark:bg-red-500/10">
                    <p className="text-xs font-bold tracking-wide text-red-700 uppercase dark:text-red-200">
                      Lý do trạng thái hiện tại
                    </p>
                    <p className="mt-1 text-sm text-red-800 dark:text-red-100">
                      {shop.statusReason}
                    </p>
                  </div>
                )}

                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold text-zinc-500 uppercase">Lần nộp gần nhất</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {formatDateTime(shop.submittedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-zinc-500 uppercase">Được duyệt lúc</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {formatDateTime(shop.approvedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-zinc-500 uppercase">Ngày tạo</dt>
                    <dd className="mt-1 text-sm font-semibold">{formatDateTime(shop.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-zinc-500 uppercase">Cập nhật gần nhất</dt>
                    <dd className="mt-1 text-sm font-semibold">{formatDateTime(shop.updatedAt)}</dd>
                  </div>
                </dl>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
                  <Cube size={22} className="text-indigo-700 dark:text-indigo-200" />
                  <p className="mt-3 text-3xl font-extrabold tracking-tighter">{productCount}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Sản phẩm mọi trạng thái
                  </p>
                </article>
                <article className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
                  <Package size={22} className="text-indigo-700 dark:text-indigo-200" />
                  <p className="mt-3 text-3xl font-extrabold tracking-tighter">{orderCount}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Đơn hàng mọi trạng thái
                  </p>
                </article>
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
                <h2 className="font-extrabold tracking-tight">Chủ sở hữu</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="flex items-center gap-2">
                    <User size={17} className="text-zinc-500" />
                    <span className="font-semibold">{shop.ownerName ?? 'Chưa có tên'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <Envelope size={17} className="text-zinc-500" />
                    {shop.ownerEmail ?? '—'}
                  </p>
                  <div className="flex items-center gap-2">
                    <LockKey size={17} className="text-zinc-500" />
                    <StatusBadge status={shop.ownerStatus} />
                  </div>
                </div>
                {shop.ownerId !== undefined && shop.ownerId !== null && (
                  <Link
                    to={'/admin/users/' + shop.ownerId}
                    className="mt-5 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-400/10 dark:text-indigo-200"
                  >
                    Mở hồ sơ chủ shop
                  </Link>
                )}
              </section>

              <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-indigo-700 dark:text-indigo-200" />
                  <h2 className="font-extrabold tracking-tight">Lịch sử trạng thái</h2>
                </div>
                <HistoryTimeline items={history} />
              </section>

              {shop.status === 'REJECTED' && (
                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-sm dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 font-bold">
                    <XCircle size={19} className="text-red-600 dark:text-red-300" />
                    Đang chờ chủ shop chỉnh sửa
                  </div>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                    Chủ shop có thể cập nhật hồ sơ rồi gửi duyệt lại. Khi đó hồ sơ sẽ xếp cuối hàng
                    đợi.
                  </p>
                </div>
              )}
              {shop.status === 'APPROVED' && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm dark:border-emerald-400/20 dark:bg-emerald-400/10">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200">
                    <CheckCircle size={19} />
                    Shop đang hoạt động
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        pending={confirmPending}
        error={confirmError}
        onClose={function () {
          if (confirmPending === false) {
            setConfirmAction(null)
          }
        }}
        onConfirm={confirmModeration}
      />
      <ReasonDialog
        open={reasonAction !== null}
        title={reasonTitle}
        description={reasonDescription}
        confirmLabel={reasonLabel}
        suggestions={reasonSuggestions}
        pending={reasonPending}
        error={reasonError}
        onClose={function () {
          if (reasonPending === false) {
            setReasonAction(null)
          }
        }}
        onConfirm={submitReason}
      />
    </AdminShell>
  )
}
