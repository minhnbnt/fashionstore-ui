import { useState } from 'react'

import { useGetAdminStats } from '@generated/endpoints/admin-stats/admin-stats'
import { ArrowClockwise } from '@phosphor-icons/react'

import AdminShell from '@/components/admin/AdminShell'
import ActionQueue from '@/components/admin/dashboard/ActionQueue'
import CompositionPanel from '@/components/admin/dashboard/CompositionPanel'
import KpiLedger from '@/components/admin/dashboard/KpiLedger'
import MarketplaceHealth from '@/components/admin/dashboard/MarketplaceHealth'
import OrderPipeline from '@/components/admin/dashboard/OrderPipeline'
import PeriodChart from '@/components/admin/dashboard/PeriodChart'
import RankingList from '@/components/admin/dashboard/RankingList'
import PendingShopsQueue from '@/components/admin/PendingShopsQueue'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { formatCompactVnd, periodWindow } from '@/lib/admin/adminStats'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import {
  cn,
  PANEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

import type { ActionQueueItem } from '@/components/admin/dashboard/ActionQueue'
import type { CompositionGroup } from '@/components/admin/dashboard/CompositionPanel'
import type { KpiCell } from '@/components/admin/dashboard/KpiLedger'
import type { PipelineStage } from '@/components/admin/dashboard/OrderPipeline'
import type { RankingRow } from '@/components/admin/dashboard/RankingList'
import type { TrendMetric } from '@/types/admin'
import type { AdminStatsResponse } from '@generated/model/adminStatsResponse'

const PERIODS = [7, 14, 30]

const METRICS: { metric: TrendMetric; label: string; chartTitle: string }[] = [
  { metric: 'orderValue', label: 'GMV', chartTitle: 'Giá trị đơn chưa hủy theo ngày' },
  { metric: 'orders', label: 'Đơn đặt', chartTitle: 'Số đơn đặt theo ngày' },
  { metric: 'newUsers', label: 'Người dùng mới', chartTitle: 'Tài khoản mới theo ngày' },
  { metric: 'newShops', label: 'Shop đăng ký', chartTitle: 'Shop đăng ký mới theo ngày' },
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

function actionItems(stats: AdminStatsResponse): ActionQueueItem[] {
  return [
    {
      key: 'shops',
      label: 'Hồ sơ shop chờ duyệt',
      hint: 'Kiểm tra eKYC và tài khoản ngân hàng',
      count: stats.pendingShops ?? 0,
      tone: 'warning',
      to: '/admin/shops?status=PENDING',
    },
    {
      key: 'reports',
      label: 'Báo cáo sản phẩm',
      hint: 'Từ người mua và bộ lọc từ khóa cấm',
      count: stats.openProductReports ?? 0,
      tone: 'danger',
      to: '/admin/products?status=REPORTED',
    },
    {
      key: 'products',
      label: 'Sản phẩm chờ duyệt',
      hint: 'Shop mới đăng bán, cần duyệt trước khi hiện',
      count: stats.pendingProducts ?? 0,
      tone: 'warning',
      to: '/admin/products?status=PENDING',
    },
    {
      key: 'orders',
      label: 'Đơn chờ shop xác nhận',
      hint: 'Theo dõi shop chậm xác nhận',
      count: stats.pendingOrders ?? 0,
      tone: 'warning',
      to: '/admin/orders?status=PENDING',
    },
    {
      key: 'returns',
      label: 'Yêu cầu đổi trả đang mở',
      hint: 'Shop đang xử lý với người mua',
      count: stats.openReturnRequests ?? 0,
      tone: 'warning',
    },
  ]
}

function pipelineStages(stats: AdminStatsResponse): PipelineStage[] {
  return [
    {
      status: 'PENDING',
      label: 'Chờ xác nhận',
      count: stats.pendingOrders ?? 0,
      fillClass: 'bg-amber-400',
    },
    {
      status: 'CONFIRMED',
      label: 'Đã xác nhận',
      count: stats.confirmedOrders ?? 0,
      fillClass: 'bg-sky-300 dark:bg-sky-300',
    },
    {
      status: 'SHIPPING',
      label: 'Đang giao',
      count: stats.shippingOrders ?? 0,
      fillClass: 'bg-sky-600 dark:bg-sky-500',
    },
    {
      status: 'DELIVERED',
      label: 'Đã giao',
      count: stats.deliveredOrders ?? 0,
      fillClass: 'bg-emerald-500',
    },
    {
      status: 'CANCELLED',
      label: 'Đã hủy',
      count: stats.cancelledOrders ?? 0,
      fillClass: 'bg-rose-500',
    },
  ]
}

function compositionGroups(stats: AdminStatsResponse): CompositionGroup[] {
  const brandFill = 'bg-blue-700 dark:bg-blue-500'
  return [
    {
      key: 'users',
      title: 'Tài khoản',
      total: stats.totalUsers ?? 0,
      to: '/admin/users',
      items: [
        { label: 'Khách hàng', value: stats.customerUsers ?? 0, fillClass: brandFill },
        { label: 'Chủ shop', value: stats.sellerUsers ?? 0, fillClass: brandFill },
        { label: 'Quản trị', value: stats.adminUsers ?? 0, fillClass: brandFill },
      ],
    },
    {
      key: 'shops',
      title: 'Shop',
      total: stats.totalShops ?? 0,
      to: '/admin/shops',
      items: [
        { label: 'Đang hoạt động', value: stats.approvedShops ?? 0, fillClass: 'bg-emerald-500' },
        { label: 'Chờ duyệt', value: stats.pendingShops ?? 0, fillClass: 'bg-amber-400' },
        { label: 'Tạm khóa', value: stats.suspendedShops ?? 0, fillClass: 'bg-rose-500' },
        { label: 'Bị từ chối', value: stats.rejectedShops ?? 0, fillClass: 'bg-zinc-400' },
      ],
    },
    {
      key: 'products',
      title: 'Sản phẩm',
      total: stats.totalProducts ?? 0,
      to: '/admin/products?status=ALL',
      items: [
        { label: 'Đang bán', value: stats.activeProducts ?? 0, fillClass: 'bg-emerald-500' },
        { label: 'Chờ duyệt', value: stats.pendingProducts ?? 0, fillClass: 'bg-amber-400' },
        { label: 'Shop tự ẩn', value: stats.hiddenProducts ?? 0, fillClass: 'bg-zinc-400' },
        { label: 'Bị gỡ', value: stats.bannedProducts ?? 0, fillClass: 'bg-rose-500' },
      ],
    },
  ]
}

function shopRows(stats: AdminStatsResponse): RankingRow[] {
  return (stats.topShops ?? []).map(function (shop) {
    return {
      key: shop.shopId ?? shop.slug ?? '',
      name: shop.name ?? 'Shop',
      secondary: `${formatCount(shop.orders ?? 0)} đơn`,
      value: shop.gmv ?? 0,
      valueLabel: formatCompactVnd(shop.gmv ?? 0),
      to: `/admin/shops/${shop.shopId ?? ''}`,
    }
  })
}

function productRows(stats: AdminStatsResponse): RankingRow[] {
  return (stats.topProducts ?? []).map(function (product) {
    return {
      key: product.productId ?? product.name ?? '',
      name: product.name ?? 'Sản phẩm',
      secondary: `${product.shopName ?? ''}, ${formatCompactVnd(product.revenue ?? 0)}`,
      value: product.quantity ?? 0,
      valueLabel: `${formatCount(product.quantity ?? 0)} cái`,
      to: `/product/${product.productId ?? ''}`,
    }
  })
}

function categoryRows(stats: AdminStatsResponse): RankingRow[] {
  return (stats.topCategories ?? []).map(function (category) {
    return {
      key: category.name ?? '',
      name: category.name ?? '',
      secondary: `${formatCount(category.quantity ?? 0)} sản phẩm bán ra`,
      value: category.revenue ?? 0,
      valueLabel: formatCompactVnd(category.revenue ?? 0),
    }
  })
}

export default function AdminDashboard() {
  const statsQuery = useGetAdminStats({ query: { staleTime: 60_000 } })
  const [metric, setMetric] = useState<TrendMetric>('orderValue')
  const [days, setDays] = useState(30)

  let stats: AdminStatsResponse | undefined
  if (statsQuery.isSuccess) {
    stats = takeData(statsQuery.data)
  }

  let refreshIconClass = ''
  if (statsQuery.isFetching) {
    refreshIconClass = 'motion-safe:animate-spin'
  }

  const activeMetric = METRICS.find((item) => item.metric === metric) ?? METRICS[0]
  const chartWindow = periodWindow(stats, metric, days)

  const kpiCells: KpiCell[] = METRICS.map(function (item) {
    const win = periodWindow(stats, item.metric, days)
    return {
      metric: item.metric,
      label: item.label,
      value: formatterOf(item.metric)(win.currentTotal),
      change: win.change,
    }
  })

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className={cn(segmentedTrackClass(), 'm-0 min-w-0 border-0')}>
        <legend className="sr-only">Chọn kỳ xem</legend>
        {PERIODS.map(function (period) {
          return (
            <button
              key={period}
              type="button"
              aria-pressed={period === days}
              onClick={function () {
                setDays(period)
              }}
              className={segmentedItemClass(period === days)}
            >
              {period} ngày
            </button>
          )
        })}
      </fieldset>
      <button
        type="button"
        onClick={() => void statsQuery.refetch()}
        disabled={statsQuery.isFetching}
        className={cn(secondaryButtonClass(), 'cursor-pointer')}
      >
        <ArrowClockwise size={16} weight="bold" className={refreshIconClass} />
        <span>Làm mới</span>
      </button>
    </div>
  )

  return (
    <AdminShell
      title="Tổng quan hệ thống"
      description="Sàn đang bán thế nào, so với kỳ trước, và việc gì đang chờ bạn."
      actions={headerActions}
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
          <KpiLedger cells={kpiCells} days={days} selected={metric} onSelect={setMetric} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <section aria-labelledby="trend-title" className={cn(PANEL_CLASS, 'xl:col-span-8')}>
              <div className="mb-4">
                <h2
                  id="trend-title"
                  className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]"
                >
                  {activeMetric.chartTitle}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {days} ngày gần nhất theo giờ Việt Nam. Chọn ô ở dải trên để đổi chỉ số.
                </p>
              </div>
              <PeriodChart
                title={`${activeMetric.chartTitle}, ${days} ngày gần nhất`}
                current={chartWindow.current}
                previous={chartWindow.previous}
                formatValue={formatterOf(metric)}
              />
            </section>

            <div className="xl:col-span-4">
              <ActionQueue items={actionItems(stats)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <OrderPipeline
                stages={pipelineStages(stats)}
                total={stats.totalOrders ?? 0}
                cancelled={stats.cancelledOrders ?? 0}
                avgConfirmHours={stats.avgConfirmHours ?? 0}
                avgDeliveryHours={stats.avgDeliveryHours ?? 0}
              />
            </div>
            <div className="xl:col-span-5">
              <MarketplaceHealth
                averageRating={stats.averageRating ?? 0}
                totalReviews={stats.totalReviews ?? 0}
                activeBuyers={stats.activeBuyers ?? 0}
                repeatBuyers={stats.repeatBuyers ?? 0}
                collectedRevenue={stats.collectedRevenue ?? 0}
                grossMerchandiseValue={stats.grossMerchandiseValue ?? 0}
                liveOrders={(stats.totalOrders ?? 0) - (stats.cancelledOrders ?? 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <RankingList
              title="Shop bán tốt nhất"
              caption="Theo GMV 30 ngày gần nhất"
              rows={shopRows(stats)}
              emptyText="Chưa có đơn nào trong 30 ngày gần nhất."
            />
            <RankingList
              title="Sản phẩm bán chạy"
              caption="Theo số lượng bán 30 ngày gần nhất"
              rows={productRows(stats)}
              emptyText="Chưa có sản phẩm nào được mua trong 30 ngày."
            />
            <RankingList
              title="Danh mục dẫn đầu"
              caption="Theo doanh số 30 ngày gần nhất"
              rows={categoryRows(stats)}
              emptyText="Chưa có doanh số theo danh mục."
            />
          </div>

          <CompositionPanel groups={compositionGroups(stats)} />

          <PendingShopsQueue pendingCount={stats.pendingShops ?? 0} />
        </div>
      )}
    </AdminShell>
  )
}
