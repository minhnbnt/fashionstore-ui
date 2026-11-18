import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { getListAdminShopsQueryKey } from '@generated/endpoints/admin-shops/admin-shops'
import { getGetAdminStatsQueryKey } from '@generated/endpoints/admin-stats/admin-stats'
import {
  getGetAdminUserQueryKey,
  getListAdminUsersQueryKey,
  useGetAdminUser,
  useLockUser,
  useUnlockUser,
} from '@generated/endpoints/admin-users/admin-users'
import { Clock, Package, ShieldCheck, Storefront, UserCircle } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminShell from '@/components/admin/AdminShell'
import HistoryTimeline from '@/components/admin/dashboard/HistoryTimeline'
import ReasonDialog from '@/components/admin/dialogs/ReasonDialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import StatePanel from '@/components/ui/StatePanel'
import StatusBadge from '@/components/ui/StatusBadge'
import UserAvatar from '@/components/UserAvatar'
import { adminErrorMessage, formatDateTime, roleLabel } from '@/lib/admin/admin'
import { takeData } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import { cn, FOCUS_RING_CLASS, PANEL_CLASS, primaryButtonClass } from '@/lib/ui/styles'

import type { AdminUserDetailResponse } from '@generated/model/adminUserDetailResponse'

const LOCK_REASONS = [
  'Phát hiện hành vi gian lận đơn hàng hoặc hoàn tiền',
  'Tài khoản phát tán nội dung rác hoặc quấy rối người dùng',
  'Vi phạm điều khoản sử dụng nhiều lần',
]

export default function AdminUserDetail() {
  const params = useParams()
  const id = params.id ?? ''
  const queryClient = useQueryClient()
  const [lockOpen, setLockOpen] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)

  const detailQuery = useGetAdminUser(id, { query: { enabled: id !== '' } })

  function refresh(): void {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(id) }),
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListAdminShopsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }),
    ])
  }

  const lock = useLockUser({
    mutation: {
      onSuccess: function () {
        setLockOpen(false)
        notify.success(
          'Tài khoản đã bị khóa',
          'Các shop do tài khoản này sở hữu cũng được tạm khóa.',
        )
        refresh()
      },
      onError: function (err) {
        notify.fromError(err, undefined, adminErrorMessage(err))
      },
    },
  })
  const unlock = useUnlockUser({
    mutation: {
      onSuccess: function () {
        setUnlockOpen(false)
        notify.success('Tài khoản đã được mở khóa', 'Shop liên quan vẫn cần được xem xét riêng.')
        refresh()
      },
      onError: function (err) {
        notify.fromError(err, undefined, adminErrorMessage(err))
      },
    },
  })

  let detail: AdminUserDetailResponse | undefined
  if (detailQuery.data !== undefined) {
    detail = takeData(detailQuery.data)
  }
  const user = detail?.user
  const shops = detail?.shops ?? []
  const orderCount = detail?.orderCount ?? 0
  const history = detail?.history ?? []

  let actions: React.ReactNode
  if (user?.status === 'ACTIVE' && user.role !== 'ADMIN') {
    actions = (
      <button
        type="button"
        onClick={function () {
          setLockOpen(true)
        }}
        className={cn(
          'cursor-pointer rounded-full border border-rose-300 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-500/15',
          FOCUS_RING_CLASS,
        )}
      >
        Khóa tài khoản
      </button>
    )
  }
  if (user?.status === 'LOCKED') {
    actions = (
      <button
        type="button"
        onClick={function () {
          setUnlockOpen(true)
        }}
        className={cn(primaryButtonClass(), 'rounded-full px-5 py-2.5 text-sm font-bold')}
      >
        Mở khóa tài khoản
      </button>
    )
  }

  let lockError: string | undefined
  if (lock.isError) {
    lockError = adminErrorMessage(lock.error)
  }

  const pageTitle = user?.displayName ?? 'Chi tiết tài khoản'

  return (
    <AdminShell
      title={pageTitle}
      description="Xem vai trò, hoạt động mua hàng, shop liên quan và lịch sử kiểm duyệt."
      actions={actions}
      breadcrumbs={[
        { label: 'Quản trị', to: '/admin' },
        { label: 'Tài khoản', to: '/admin/users' },
        { label: pageTitle },
      ]}
    >
      {detailQuery.isPending && <TableRowsSkeleton rows={5} columns={3} />}
      {detailQuery.isError && (
        <StatePanel
          title="Không mở được hồ sơ tài khoản"
          description={adminErrorMessage(detailQuery.error)}
        />
      )}

      {user !== undefined && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <div className="space-y-5">
            <section className={PANEL_CLASS}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <UserAvatar name={user.email ?? user.displayName ?? 'user'} size={56} />
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                      {user.displayName ?? 'Chưa có tên'}
                    </h2>
                    <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {user.email}
                    </p>
                  </div>
                </div>
                <StatusBadge status={user.status} />
              </div>

              {user.statusReason !== undefined && user.statusReason !== null && (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/15">
                  <p className="text-xs font-bold tracking-wide text-rose-700 uppercase dark:text-rose-300">
                    Lý do khóa
                  </p>
                  <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">
                    {user.statusReason}
                  </p>
                </div>
              )}

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Vai trò hệ thống
                  </dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <UserCircle size={17} className="text-blue-700 dark:text-sky-300" />
                    {roleLabel(user.role)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Ngày tham gia
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums">
                    {formatDateTime(user.createdAt)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold text-zinc-500 uppercase dark:text-zinc-400">
                    Mã tài khoản
                  </dt>
                  <dd className="mt-1 font-mono text-xs break-all text-zinc-600 dark:text-zinc-300">
                    {user.id}
                  </dd>
                </div>
              </dl>
            </section>

            <section className={PANEL_CLASS}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Storefront size={21} className="text-blue-700 dark:text-sky-300" />
                  <h2 className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                    Shop tham gia
                  </h2>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold tabular-nums dark:bg-white/10">
                  {shops.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {shops.map(function (shop) {
                  if (shop.id === undefined) {
                    return null
                  }
                  return (
                    <Link
                      key={shop.id}
                      to={'/admin/shops/' + shop.id}
                      className={cn(
                        'flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-3 transition hover:border-blue-300 hover:bg-sky-50/60 dark:border-white/10 dark:hover:border-sky-400/40 dark:hover:bg-white/5',
                        FOCUS_RING_CLASS,
                      )}
                    >
                      <div>
                        <p className="font-bold text-[#17203a] dark:text-[#e2e8f0]">{shop.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">/{shop.slug}</p>
                      </div>
                      <StatusBadge status={shop.status} />
                    </Link>
                  )
                })}
                {shops.length === 0 && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Tài khoản chưa tham gia shop nào.
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className={PANEL_CLASS}>
              <Package size={22} className="text-blue-700 dark:text-sky-300" />
              <p className="mt-3 text-3xl font-extrabold tracking-tighter tabular-nums">
                {orderCount.toLocaleString('vi-VN')}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Đơn hàng đã đặt</p>
            </section>

            <section className={PANEL_CLASS}>
              <div className="mb-4 flex items-center gap-2">
                <Clock size={20} className="text-blue-700 dark:text-sky-300" />
                <h2 className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                  Lịch sử khóa
                </h2>
              </div>
              <HistoryTimeline items={history} />
            </section>

            {user.role === 'ADMIN' && (
              <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 text-sm dark:border-sky-500/30 dark:bg-sky-500/15">
                <div className="flex items-center gap-2 font-bold text-sky-900 dark:text-sky-300">
                  <ShieldCheck size={19} weight="bold" />
                  Tài khoản quản trị được bảo vệ
                </div>
                <p className="mt-2 text-sky-800 dark:text-sky-200">
                  Hệ thống không cho phép khóa tài khoản có vai trò quản trị viên.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <ReasonDialog
        open={lockOpen}
        danger
        title="Khóa tài khoản"
        description="Tài khoản sẽ bị chặn ngay. Mọi shop đang hoạt động do họ sở hữu cũng được tạm khóa."
        confirmLabel="Khóa tài khoản"
        suggestions={LOCK_REASONS}
        pending={lock.isPending}
        error={lockError}
        onClose={function () {
          if (lock.isPending === false) {
            setLockOpen(false)
          }
        }}
        onConfirm={function (reason) {
          lock.mutate({ id, data: { reason } })
        }}
      />
      <ConfirmDialog
        open={unlockOpen}
        title="Mở khóa tài khoản?"
        description="Người dùng sẽ đăng nhập và sử dụng hệ thống trở lại. Các shop từng bị tạm khóa không tự mở lại."
        confirmLabel="Mở khóa"
        variant="primary"
        isPending={unlock.isPending}
        onCancel={function () {
          setUnlockOpen(false)
        }}
        onConfirm={function () {
          unlock.mutate({ id })
        }}
      />
    </AdminShell>
  )
}
