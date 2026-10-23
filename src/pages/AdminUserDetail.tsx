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
import {
  ArrowLeft,
  Clock,
  Package,
  ShieldCheck,
  Storefront,
  UserCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminShell from '@/components/admin/AdminShell'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import HistoryTimeline from '@/components/admin/HistoryTimeline'
import ReasonDialog from '@/components/admin/ReasonDialog'
import StatePanel from '@/components/admin/StatePanel'
import StatusBadge from '@/components/admin/StatusBadge'
import UserAvatar from '@/components/UserAvatar'
import { adminErrorMessage, formatDateTime, roleLabel } from '@/lib/admin'
import { takeData } from '@/lib/apiAdapters'

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
  const [success, setSuccess] = useState<string | null>(null)

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
        setSuccess('Tài khoản đã bị khóa. Các shop do tài khoản này sở hữu cũng được tạm khóa.')
        refresh()
      },
    },
  })
  const unlock = useUnlockUser({
    mutation: {
      onSuccess: function () {
        setUnlockOpen(false)
        setSuccess('Tài khoản đã được mở khóa. Shop liên quan vẫn cần được xem xét riêng.')
        refresh()
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
          setSuccess(null)
          setLockOpen(true)
        }}
        className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 dark:border-red-400/20 dark:text-red-200 dark:hover:bg-red-500/10"
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
          setSuccess(null)
          setUnlockOpen(true)
        }}
        className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold"
      >
        Mở khóa tài khoản
      </button>
    )
  }

  let lockError: string | undefined
  if (lock.isError) {
    lockError = adminErrorMessage(lock.error)
  }
  let unlockError: string | undefined
  if (unlock.isError) {
    unlockError = adminErrorMessage(unlock.error)
  }

  return (
    <AdminShell
      title={user?.displayName ?? 'Chi tiết tài khoản'}
      description="Xem vai trò, hoạt động mua hàng, shop liên quan và lịch sử kiểm duyệt."
      actions={actions}
    >
      <Link
        to="/admin/users"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:underline dark:text-indigo-200"
      >
        <ArrowLeft size={16} weight="bold" />
        Quay lại danh sách
      </Link>

      {detailQuery.isPending && (
        <StatePanel title="Đang tải hồ sơ" description="Thông tin tài khoản đang được cập nhật…" />
      )}
      {detailQuery.isError && (
        <StatePanel
          title="Không mở được hồ sơ tài khoản"
          description={adminErrorMessage(detailQuery.error)}
        />
      )}

      {user !== undefined && (
        <>
          {success !== null && (
            <p className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
              {success}
            </p>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
            <div className="space-y-5">
              <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <UserAvatar name={user.email ?? user.displayName ?? 'user'} size={56} />
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-extrabold tracking-tight">
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
                  <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 dark:bg-red-500/10">
                    <p className="text-xs font-bold tracking-wide text-red-700 uppercase dark:text-red-200">
                      Lý do khóa
                    </p>
                    <p className="mt-1 text-sm text-red-800 dark:text-red-100">
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
                      <UserCircle size={17} className="text-indigo-700 dark:text-indigo-200" />
                      {roleLabel(user.role)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-zinc-500 uppercase dark:text-zinc-400">
                      Ngày tham gia
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">{formatDateTime(user.createdAt)}</dd>
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

              <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Storefront size={21} className="text-indigo-700 dark:text-indigo-200" />
                    <h2 className="font-extrabold tracking-tight">Shop tham gia</h2>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold dark:bg-white/10">
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
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-3 transition hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <div>
                          <p className="font-bold">{shop.name}</p>
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
              <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
                <Package size={22} className="text-indigo-700 dark:text-indigo-200" />
                <p className="mt-3 text-3xl font-extrabold tracking-tighter">{orderCount}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Đơn hàng đã đặt</p>
              </section>

              <section className="rounded-3xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-indigo-700 dark:text-indigo-200" />
                  <h2 className="font-extrabold tracking-tight">Lịch sử khóa</h2>
                </div>
                <HistoryTimeline items={history} />
              </section>

              {user.role === 'ADMIN' && (
                <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-sm dark:border-indigo-300/20 dark:bg-indigo-400/10">
                  <div className="flex items-center gap-2 font-bold text-indigo-800 dark:text-indigo-200">
                    <ShieldCheck size={19} />
                    Tài khoản quản trị được bảo vệ
                  </div>
                  <p className="mt-2 text-indigo-700 dark:text-indigo-100">
                    Hệ thống không cho phép khóa tài khoản có vai trò quản trị viên.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ReasonDialog
        open={lockOpen}
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
        pending={unlock.isPending}
        error={unlockError}
        onClose={function () {
          if (unlock.isPending === false) {
            setUnlockOpen(false)
          }
        }}
        onConfirm={function () {
          unlock.mutate({ id })
        }}
      />
    </AdminShell>
  )
}
