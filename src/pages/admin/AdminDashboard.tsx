import { useState } from 'react'
import { Link } from 'react-router'

import { useGetAdminStats } from '@generated/endpoints/admin-stats/admin-stats'
import {
  ArrowClockwise,
  ArrowRight,
  Coins,
  Flag,
  HourglassMedium,
  Package,
  Storefront,
  Users,
} from '@phosphor-icons/react'

import AdminShell from '@/components/admin/AdminShell'
import BreakdownCard from '@/components/admin/dashboard/BreakdownCard'
import StatTile from '@/components/admin/dashboard/StatTile'
import TrendChart from '@/components/admin/dashboard/TrendChart'
import PendingShopsQueue from '@/components/admin/PendingShopsQueue'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { formatCompactVnd, trendPoints } from '@/lib/admin/adminStats'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import {
  badgeToneClass,
  cn,
  FOCUS_RING_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
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
  const statsQuery = useGetAdminStats({ query: { staleTime: 60_000 } })
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
    refreshIconClass = 'motion-safe:animate-spin'
  }
  const activeTab = TREND_TABS.find((tab) => tab.metric === metric) ?? TREND_TABS[0]

  const pendingShopsCount = stats?.pendingShops ?? 0
  const openReportsCount = stats?.openProductReports ?? 0

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
      {statsQuery.isPending && <DashboardSkeleton />}

      {statsQuery.isError && (
        <div
          role="alert"
          className={cn(
            PANEL_CLASS,
            'flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <div>
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
              Không tải được số liệu tổng quan
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {hookErrorMessage('adminStats', statsQuery.error)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void statsQuery.refetch()}
            className={cn(
              primaryButtonClass(),
              'inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm font-bold',
            )}
          >
            <ArrowClockwise size={16} weight="bold" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {stats !== undefined && (
        <div className="space-y-5">
          {/* 4 KPI tiles có drill-down */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={Users}
              label="Người dùng"
              value={formatCount(stats.totalUsers ?? 0)}
              detail={`${formatCount(stats.lockedUsers ?? 0)} tài khoản đang bị khóa`}
              to="/admin/users"
            />
            <StatTile
              icon={Storefront}
              label="Shop"
              value={formatCount(stats.totalShops ?? 0)}
              detail={`${formatCount(stats.approvedShops ?? 0)} shop đang hoạt động`}
              highlight={shopHighlight}
              to="/admin/shops?status=PENDING"
            />
            <StatTile
              icon={Package}
              label="Đơn hàng"
              value={formatCount(stats.totalOrders ?? 0)}
              detail={`${formatCount(stats.deliveredOrders ?? 0)} đơn đã giao`}
              highlight={orderHighlight}
              to="/admin/orders"
            />
            <StatTile
              icon={Coins}
              label="Doanh thu COD đã thu"
              value={formatVnd(stats.collectedRevenue ?? 0)}
              detail={`GMV ${formatVnd(stats.grossMerchandiseValue ?? 0)} (đơn chưa hủy)`}
              to="/admin/orders?status=DELIVERED"
            />
          </div>

          {/* Action Queue Strip ngay dưới 4 KPI tiles */}
          <section
            aria-label="Hàng đợi cần xử lý"
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <Link
              to="/admin/shops?status=PENDING"
              className={cn(
                PANEL_CLASS,
                'group flex cursor-pointer items-center justify-between gap-4 transition hover:-translate-y-0.5 hover:border-amber-300 dark:hover:border-amber-400/40',
                FOCUS_RING_CLASS,
              )}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <HourglassMedium size={22} weight="bold" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                      Hồ sơ shop chờ duyệt
                    </h2>
                    {pendingShopsCount > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums',
                          badgeToneClass('warning'),
                        )}
                      >
                        {formatCount(pendingShopsCount)} hồ sơ
                      </span>
                    )}
                    {pendingShopsCount === 0 && (
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold',
                          badgeToneClass('success'),
                        )}
                      >
                        Đã xử lý hết
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    Kiểm tra eKYC, đối soát ngân hàng và phê duyệt gian hàng mới.
                  </p>
                </div>
              </div>
              <ArrowRight
                size={18}
                weight="bold"
                className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700 dark:group-hover:text-sky-300"
              />
            </Link>

            <Link
              to="/admin/products?status=REPORTED"
              className={cn(
                PANEL_CLASS,
                'group flex cursor-pointer items-center justify-between gap-4 transition hover:-translate-y-0.5 hover:border-rose-300 dark:hover:border-rose-400/40',
                FOCUS_RING_CLASS,
              )}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  <Flag size={22} weight="bold" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
                      Báo cáo sản phẩm chờ xử lý
                    </h2>
                    {openReportsCount > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums',
                          badgeToneClass('danger'),
                        )}
                      >
                        {formatCount(openReportsCount)} báo cáo
                      </span>
                    )}
                    {openReportsCount === 0 && (
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold',
                          badgeToneClass('success'),
                        )}
                      >
                        Không có tồn đọng
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    Xem báo cáo từ người mua, cờ từ khóa cấm và gỡ hàng vi phạm.
                  </p>
                </div>
              </div>
              <ArrowRight
                size={18}
                weight="bold"
                className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700 dark:group-hover:text-sky-300"
              />
            </Link>
          </section>

          {/* Biểu đồ xu hướng 14 ngày */}
          <section className={PANEL_CLASS}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold tracking-tighter text-[#17203a] dark:text-[#e2e8f0]">
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

          {/* 3 BreakdownCard với semantic tones */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <BreakdownCard
              title="Người dùng theo vai trò"
              total={stats.totalUsers ?? 0}
              items={[
                { label: 'Khách hàng', value: stats.customerUsers ?? 0, tone: 'info' },
                { label: 'Chủ shop', value: stats.sellerUsers ?? 0, tone: 'success' },
                { label: 'Quản trị', value: stats.adminUsers ?? 0, tone: 'neutral' },
              ]}
            />
            <BreakdownCard
              title="Shop theo trạng thái"
              total={stats.totalShops ?? 0}
              items={[
                { label: 'Đang hoạt động', value: stats.approvedShops ?? 0, tone: 'success' },
                { label: 'Chờ duyệt', value: stats.pendingShops ?? 0, tone: 'warning' },
                { label: 'Tạm khóa', value: stats.suspendedShops ?? 0, tone: 'danger' },
                { label: 'Từ chối', value: stats.rejectedShops ?? 0, tone: 'danger' },
              ]}
            />
            <BreakdownCard
              title="Đơn hàng theo trạng thái"
              total={stats.totalOrders ?? 0}
              items={[
                { label: 'Chờ xác nhận', value: stats.pendingOrders ?? 0, tone: 'warning' },
                { label: 'Đã xác nhận', value: stats.confirmedOrders ?? 0, tone: 'info' },
                { label: 'Đang giao', value: stats.shippingOrders ?? 0, tone: 'info' },
                { label: 'Đã giao', value: stats.deliveredOrders ?? 0, tone: 'success' },
                { label: 'Đã hủy', value: stats.cancelledOrders ?? 0, tone: 'danger' },
              ]}
            />
          </div>

          <PendingShopsQueue pendingCount={stats.pendingShops ?? 0} />
        </div>
      )}
    </AdminShell>
  )
}
