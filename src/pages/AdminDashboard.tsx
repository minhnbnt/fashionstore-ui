import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useGetAdminStats } from '@generated/endpoints/admin-stats/admin-stats'
import {
  ArrowClockwise,
  Coins,
  Package,
  ShieldCheck,
  SignOut,
  Storefront,
  Users,
} from '@phosphor-icons/react'

import { formatCompactVnd, trendPoints } from '@/lib/adminStats'
import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import AdminNav from '../components/admin/AdminNav'
import BreakdownCard from '../components/admin/BreakdownCard'
import PendingShopsQueue from '../components/admin/PendingShopsQueue'
import StatTile from '../components/admin/StatTile'
import TrendChart from '../components/admin/TrendChart'
import UserAvatar from '../components/UserAvatar'
import { useSignOut } from '../hooks/useAuthMutations'
import { useSessionQuery } from '../hooks/useSession'

import type { TrendMetric } from '@/lib/adminStats'
import type { AdminStatsResponse } from '@generated/model/adminStatsResponse'

const TREND_TABS: { metric: TrendMetric; label: string }[] = [
  { metric: 'orders', label: 'Đơn hàng' },
  { metric: 'orderValue', label: 'Giá trị đơn' },
  { metric: 'newUsers', label: 'Người dùng mới' },
  { metric: 'newShops', label: 'Shop mới' },
]

function formatCount(value: number): string {
  return value.toLocaleString('vi-VN')
}

function formatterOf(metric: TrendMetric): (value: number) => string {
  if (metric === 'orderValue') {
    return formatCompactVnd
  }
  return formatCount
}

export default function AdminDashboard() {
  const { data: session } = useSessionQuery()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const statsQuery = useGetAdminStats()
  const [metric, setMetric] = useState<TrendMetric>('orders')

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: function () {
        void navigate('/', { replace: true })
      },
    })
  }

  let stats: AdminStatsResponse | undefined
  let shopHighlight: string | undefined
  let orderHighlight: string | undefined
  if (statsQuery.isSuccess) {
    stats = takeData(statsQuery.data)
    if ((stats.pendingShops ?? 0) > 0) {
      shopHighlight = `${formatCount(stats.pendingShops ?? 0)} chờ duyệt`
    }
    if ((stats.pendingOrders ?? 0) > 0) {
      orderHighlight = `${formatCount(stats.pendingOrders ?? 0)} chờ shop xác nhận`
    }
  }
  let refreshIconClass = ''
  if (statsQuery.isFetching) {
    refreshIconClass = 'animate-spin'
  }
  const activeTab = TREND_TABS.find((tab) => tab.metric === metric) ?? TREND_TABS[0]

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
            <ShieldCheck size={22} weight="bold" className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-400">
              Admin
            </p>
            <h1 className="text-xl font-extrabold tracking-tighter">Tổng quan hệ thống</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void statsQuery.refetch()}
            disabled={statsQuery.isFetching}
            className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-white/70 disabled:opacity-60 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            <ArrowClockwise size={16} weight="bold" className={refreshIconClass} />
            Làm mới
          </button>
          {session !== undefined && session !== null && (
            <div className="flex items-center gap-3">
              <UserAvatar name={session.user.email ?? 'admin'} size={36} />
              <p className="hidden text-sm font-medium text-zinc-500 sm:block dark:text-zinc-400">
                {session.user.email}
              </p>
            </div>
          )}
        </div>
      </div>

      <AdminNav />

      {statsQuery.isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map(function (index) {
            return <div key={index} className="glass h-36 animate-pulse rounded-3xl" />
          })}
        </div>
      )}

      {statsQuery.isError && (
        <div className="glass rounded-3xl p-6 text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('adminStats', statsQuery.error)}
        </div>
      )}

      {stats !== undefined && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={Users}
              label="Người dùng"
              value={formatCount(stats.totalUsers ?? 0)}
              detail={`${formatCount(stats.lockedUsers ?? 0)} tài khoản đang bị khóa`}
            />
            <StatTile
              icon={Storefront}
              label="Shop"
              value={formatCount(stats.totalShops ?? 0)}
              detail={`${formatCount(stats.approvedShops ?? 0)} shop đang hoạt động`}
              highlight={shopHighlight}
            />
            <StatTile
              icon={Package}
              label="Đơn hàng"
              value={formatCount(stats.totalOrders ?? 0)}
              detail={`${formatCount(stats.deliveredOrders ?? 0)} đơn đã giao`}
              highlight={orderHighlight}
            />
            <StatTile
              icon={Coins}
              label="Doanh thu COD đã thu"
              value={formatVnd(stats.collectedRevenue ?? 0)}
              detail={`GMV ${formatVnd(stats.grossMerchandiseValue ?? 0)} (đơn chưa hủy)`}
            />
          </div>

          <section className="glass mt-6 rounded-3xl p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold tracking-tighter">
                  {activeTab.label} 14 ngày gần nhất
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Theo ngày, giờ Việt Nam</p>
              </div>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Chọn chỉ số">
                {TREND_TABS.map(function (tab) {
                  const selected = tab.metric === metric
                  let tabClass =
                    'rounded-full px-3.5 py-1.5 text-xs font-bold transition text-zinc-600 hover:bg-white/70 dark:text-zinc-300 dark:hover:bg-white/10'
                  if (selected) {
                    tabClass =
                      'rounded-full px-3.5 py-1.5 text-xs font-bold transition bg-indigo-600 text-white dark:bg-indigo-500'
                  }
                  return (
                    <button
                      key={tab.metric}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setMetric(tab.metric)}
                      className={tabClass}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <TrendChart
              title={`${activeTab.label} 14 ngày gần nhất`}
              points={trendPoints(stats, metric)}
              formatValue={formatterOf(metric)}
            />
          </section>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <BreakdownCard
              title="Người dùng theo vai trò"
              total={stats.totalUsers ?? 0}
              items={[
                { label: 'Khách hàng', value: stats.customerUsers ?? 0 },
                { label: 'Chủ shop', value: stats.sellerUsers ?? 0 },
                { label: 'Quản trị', value: stats.adminUsers ?? 0 },
              ]}
            />
            <BreakdownCard
              title="Shop theo trạng thái"
              total={stats.totalShops ?? 0}
              items={[
                { label: 'Đang hoạt động', value: stats.approvedShops ?? 0 },
                { label: 'Chờ duyệt', value: stats.pendingShops ?? 0 },
                { label: 'Tạm khóa', value: stats.suspendedShops ?? 0 },
                { label: 'Từ chối', value: stats.rejectedShops ?? 0 },
              ]}
            />
            <BreakdownCard
              title="Đơn hàng theo trạng thái"
              total={stats.totalOrders ?? 0}
              items={[
                { label: 'Chờ xác nhận', value: stats.pendingOrders ?? 0 },
                { label: 'Đã xác nhận', value: stats.confirmedOrders ?? 0 },
                { label: 'Đang giao', value: stats.shippingOrders ?? 0 },
                { label: 'Đã giao', value: stats.deliveredOrders ?? 0 },
                { label: 'Đã hủy', value: stats.cancelledOrders ?? 0 },
              ]}
            />
          </div>

          <div className="mt-6">
            <PendingShopsQueue pendingCount={stats.pendingShops ?? 0} />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signOut.isPending}
        className="mt-6 flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:hover:bg-red-500/10"
      >
        <SignOut size={16} weight="bold" />
        {signOut.isPending && <span>Đang đăng xuất…</span>}
        {signOut.isPending === false && <span>Đăng xuất</span>}
      </button>
    </main>
  )
}
