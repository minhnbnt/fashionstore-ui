import { useState } from 'react'
import { Link } from 'react-router'

import { useGetAdminStats } from '@generated/endpoints/admin-stats/admin-stats'
import {
  ArrowClockwise,
  ArrowRight,
  Coins,
  Package,
  Storefront,
  Users,
} from '@phosphor-icons/react'

import AdminShell from '@/components/admin/AdminShell'
import BreakdownCard from '@/components/admin/dashboard/BreakdownCard'
import StatTile from '@/components/admin/dashboard/StatTile'
import TrendChart from '@/components/admin/dashboard/TrendChart'
import PendingShopsQueue from '@/components/admin/PendingShopsQueue'
import { formatCompactVnd, trendPoints } from '@/lib/admin/adminStats'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import {
  cn,
  iconChipClass,
  secondaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

import type { TrendMetric } from '@/types/admin'
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
  const statsQuery = useGetAdminStats()
  const [metric, setMetric] = useState<TrendMetric>('orders')

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

  const refreshButton = (
    <button
      type="button"
      onClick={() => void statsQuery.refetch()}
      disabled={statsQuery.isFetching}
      className={cn(secondaryButtonClass(), 'cursor-pointer')}
    >
      <ArrowClockwise size={16} weight="bold" className={refreshIconClass} />
      <span>Làm mới</span>
    </button>
  )

  return (
    <AdminShell
      title="Tổng quan hệ thống"
      description="Theo dõi chỉ số vận hành sàn DHMQ, xu hướng đơn hàng và hàng đợi duyệt shop."
      actions={refreshButton}
    >
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
              <div
                className={cn(segmentedTrackClass(), 'flex-wrap')}
                role="tablist"
                aria-label="Chọn chỉ số"
              >
                {TREND_TABS.map(function (tab) {
                  const selected = tab.metric === metric
                  return (
                    <button
                      key={tab.metric}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setMetric(tab.metric)}
                      className={cn(segmentedItemClass(selected), 'cursor-pointer')}
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

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              to="/admin/shops"
              className="group glass flex items-start gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5"
            >
              <span className={cn(iconChipClass(), 'h-11 w-11 rounded-2xl')}>
                <Storefront size={22} weight="bold" />
              </span>
              <span>
                <span className="block font-extrabold tracking-tight">Quản lý shop</span>
                <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-300">
                  Duyệt hồ sơ, tạm khóa và mở lại shop.
                </span>
              </span>
              <ArrowRight
                size={18}
                weight="bold"
                className="mt-1 ml-auto shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-sky-400"
              />
            </Link>
            <Link
              to="/admin/users"
              className="group glass flex items-start gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5"
            >
              <span className={cn(iconChipClass(), 'h-11 w-11 rounded-2xl')}>
                <Users size={22} weight="bold" />
              </span>
              <span>
                <span className="block font-extrabold tracking-tight">Quản lý tài khoản</span>
                <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-300">
                  Tra cứu lịch sử, khóa và mở khóa tài khoản.
                </span>
              </span>
              <ArrowRight
                size={18}
                weight="bold"
                className="mt-1 ml-auto shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-sky-400"
              />
            </Link>
            <Link
              to="/admin/products"
              className="group glass flex items-start gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5"
            >
              <span className={cn(iconChipClass(), 'h-11 w-11 rounded-2xl')}>
                <Package size={22} weight="bold" />
              </span>
              <span>
                <span className="block font-extrabold tracking-tight">Kiểm duyệt sản phẩm</span>
                <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-300">
                  Xử lý báo cáo của người mua và cờ từ khóa cấm.
                </span>
                {(stats.openProductReports ?? 0) > 0 && (
                  <span className="mt-2 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                    {formatCount(stats.openProductReports ?? 0)} báo cáo chờ xử lý
                  </span>
                )}
              </span>
              <ArrowRight
                size={18}
                weight="bold"
                className="mt-1 ml-auto shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-sky-400"
              />
            </Link>
          </section>
        </>
      )}
    </AdminShell>
  )
}
