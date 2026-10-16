import { Link } from 'react-router'

import { useListAdminShops } from '@generated/endpoints/admin-shops/admin-shops'
import { useGetAdminStats } from '@generated/endpoints/admin-stats/admin-stats'
import {
  ArrowRight,
  CheckCircle,
  ClockCountdown,
  LockKey,
  Storefront,
  Users,
} from '@phosphor-icons/react'

import AdminShell from '@/components/admin/AdminShell'
import StatePanel from '@/components/admin/StatePanel'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatDateTime } from '@/lib/admin'
import { takeData } from '@/lib/apiAdapters'

import type { AdminShopResponse } from '@generated/model/adminShopResponse'
import type { AdminStatsResponse } from '@generated/model/adminStatsResponse'

function valueOf(value: number | undefined, pending: boolean): string {
  if (pending) {
    return '…'
  }
  return String(value ?? 0)
}

export default function AdminDashboard() {
  const statsQuery = useGetAdminStats()
  const queueQuery = useListAdminShops({ status: 'PENDING', page: 0, size: 5 })

  let stats: AdminStatsResponse = {}
  if (statsQuery.data !== undefined) {
    stats = takeData(statsQuery.data)
  }

  let queue: AdminShopResponse[] = []
  let pendingTotal = 0
  if (queueQuery.data !== undefined) {
    const page = takeData(queueQuery.data)
    queue = page.items ?? []
    pendingTotal = page.total ?? 0
  }

  const statCards = [
    {
      label: 'Tổng tài khoản',
      value: valueOf(stats.totalUsers, statsQuery.isPending),
      note: `${stats.lockedUsers ?? 0} đang khóa`,
      icon: Users,
    },
    {
      label: 'Tổng shop',
      value: valueOf(stats.totalShops, statsQuery.isPending),
      note: `${stats.approvedShops ?? 0} đang hoạt động`,
      icon: Storefront,
    },
    {
      label: 'Chờ duyệt',
      value: valueOf(stats.pendingShops, statsQuery.isPending),
      note: 'Xử lý theo thứ tự nộp',
      icon: ClockCountdown,
    },
    {
      label: 'Đang tạm khóa',
      value: valueOf(stats.suspendedShops, statsQuery.isPending),
      note: `${stats.rejectedShops ?? 0} shop bị từ chối`,
      icon: LockKey,
    },
  ]

  return (
    <AdminShell
      title="Tổng quan vận hành"
      description="Theo dõi hàng đợi duyệt và các trạng thái cần quản trị viên xử lý."
      actions={
        <Link
          to="/admin/shops?status=PENDING"
          className="btn-primary inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
        >
          Mở hàng đợi
          <ArrowRight size={16} weight="bold" />
        </Link>
      }
    >
      {statsQuery.isError && (
        <StatePanel
          title="Chưa tải được số liệu"
          description="Kiểm tra kết nối backend rồi thử tải lại trang."
        />
      )}

      {statsQuery.isError === false && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(function (card) {
            return (
              <article
                key={card.label}
                className="rounded-3xl border border-zinc-200 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                      {card.label}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tighter">{card.value}</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200">
                    <card.icon size={21} weight="bold" />
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{card.note}</p>
              </article>
            )
          })}
        </div>
      )}

      <section className="mt-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase dark:text-indigo-200">
              FIFO
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">Shop chờ duyệt lâu nhất</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {pendingTotal} hồ sơ đang trong hàng đợi.
            </p>
          </div>
          <Link
            to="/admin/shops?status=PENDING"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-white/10"
          >
            Xem tất cả
            <ArrowRight size={15} weight="bold" />
          </Link>
        </div>

        {queueQuery.isPending && (
          <StatePanel title="Đang tải hàng đợi" description="Danh sách shop đang được cập nhật…" />
        )}
        {queueQuery.isError && (
          <StatePanel
            title="Không tải được hàng đợi"
            description="Dữ liệu tổng quan vẫn an toàn. Hãy thử tải lại trang."
          />
        )}
        {queueQuery.isPending === false && queueQuery.isError === false && queue.length === 0 && (
          <StatePanel
            title="Hàng đợi đã sạch"
            description="Hiện không có hồ sơ shop mới cần duyệt."
          />
        )}
        {queue.length > 0 && (
          <div className="overflow-x-auto rounded-3xl border border-zinc-200 dark:border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase dark:bg-white/5 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Shop</th>
                  <th className="px-5 py-3 font-bold">Chủ shop</th>
                  <th className="px-5 py-3 font-bold">Nộp lúc</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-bold">Xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white/60 dark:divide-white/10 dark:bg-transparent">
                {queue.map(function (shop) {
                  return (
                    <tr key={shop.id}>
                      <td className="px-5 py-4">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{shop.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">/{shop.slug}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p>{shop.ownerName ?? 'Chưa có tên'}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{shop.ownerEmail ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                        {formatDateTime(shop.submittedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={shop.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={'/admin/shops/' + shop.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-900 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800 dark:bg-indigo-300 dark:text-indigo-950"
                        >
                          Kiểm tra
                          <CheckCircle size={15} weight="bold" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-2">
        <Link
          to="/admin/shops"
          className="group rounded-3xl border border-zinc-200 bg-white/60 p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5"
        >
          <Storefront size={24} className="text-indigo-700 dark:text-indigo-200" />
          <h2 className="mt-3 font-extrabold tracking-tight">Quản lý shop</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Duyệt hồ sơ, tạm khóa và mở lại shop.
          </p>
        </Link>
        <Link
          to="/admin/users"
          className="group rounded-3xl border border-zinc-200 bg-white/60 p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5"
        >
          <Users size={24} className="text-indigo-700 dark:text-indigo-200" />
          <h2 className="mt-3 font-extrabold tracking-tight">Quản lý tài khoản</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Tra cứu lịch sử, khóa và mở khóa tài khoản.
          </p>
        </Link>
      </section>
    </AdminShell>
  )
}
