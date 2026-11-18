import {
  useGetCustomerOverview,
  useGetFollowerTrend,
  useGetTopCustomers,
} from '@generated/endpoints/seller-statistics/seller-statistics'
import {
  Crown,
  Heart,
  Lightbulb,
  Receipt,
  TrendDown,
  TrendUp,
  UserCheck,
  UserPlus,
  Users,
  WarningCircle,
} from '@phosphor-icons/react'

import { CircularProgress, DonutChart } from '@/components/ui/charts'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { takeData } from '@/lib/api/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { customerAnalyticsData, topCustomerItems } from '@/lib/seller/sellerStatsAdapters'
import { badgeToneClass, cn, iconChipClass, PANEL_CLASS } from '@/lib/ui/styles'

import type { CustomerAnalyticsData, TopCustomerItem } from '@/types/seller'

interface Props {
  shopId: string
}

export default function SellerStatsCustomersTab({ shopId }: Props) {
  const isEnabled = shopId !== ''

  const overviewQuery = useGetCustomerOverview(shopId, { query: { enabled: isEnabled } })
  const topCustomersQuery = useGetTopCustomers(
    shopId,
    { limit: 10 },
    { query: { enabled: isEnabled } },
  )
  const followerQuery = useGetFollowerTrend(shopId, { query: { enabled: isEnabled } })

  if (overviewQuery.isPending && topCustomersQuery.isPending) {
    return <DashboardSkeleton />
  }

  const hasError = overviewQuery.isError || topCustomersQuery.isError || followerQuery.isError

  let stats: CustomerAnalyticsData = customerAnalyticsData(null)
  if (overviewQuery.data !== undefined) {
    stats = customerAnalyticsData(takeData(overviewQuery.data))
  }

  let topCustomers: TopCustomerItem[] = []
  if (topCustomersQuery.data !== undefined) {
    topCustomers = topCustomerItems(takeData(topCustomersQuery.data))
  }

  let followerCount = stats.totalFollowers
  let followerChange = stats.followerChange
  if (followerQuery.data !== undefined) {
    const fd = takeData(followerQuery.data)
    if (fd.totalFollowers !== undefined) {
      followerCount = fd.totalFollowers
    }
    if (fd.followerChange !== undefined) {
      followerChange = fd.followerChange
    }
  }

  const customerDonutData = [
    {
      label: 'Khách hàng mới',
      value: stats.newCustomers,
      color: '#1d4ed8',
    },
    {
      label: 'Khách quay lại',
      value: stats.returningCustomers,
      color: '#10b981',
    },
  ]

  const retentionPercent = Math.round(stats.retentionRate * 100 * 10) / 10

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(PANEL_CLASS, 'flex flex-col gap-2 p-6')}>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-3 py-1 text-xs font-bold', badgeToneClass('info'))}>
            Khách Hàng & Người Theo Dõi
          </span>
        </div>
        <h2 className="text-xl font-black text-[#17203a] dark:text-white">
          Phân Tích Chân Dung Khách Hàng
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Theo dõi số lượng khách hàng mới, tỷ lệ khách quay lại và xếp hạng khách hàng thân thiết
          của Shop
        </p>
      </div>

      {hasError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
          <WarningCircle size={16} weight="bold" className="shrink-0" />
          <span>Không thể tải đầy đủ dữ liệu khách hàng. Vui lòng thử lại sau.</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Tổng số khách hàng
            </span>
            <div className={cn(iconChipClass(), 'h-9 w-9')}>
              <Users size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {stats.totalCustomers.toLocaleString('vi-VN')}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Đã từng đặt hàng thành công
          </p>
        </div>

        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Khách hàng mới
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              <UserPlus size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {stats.newCustomers.toLocaleString('vi-VN')}
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-sky-300">Mua lần đầu tại Shop</p>
        </div>

        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Tỷ lệ giữ chân khách
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <UserCheck size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {retentionPercent}%
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            {stats.returningCustomers} khách mua từ 2 lần trở lên
          </p>
        </div>

        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Giá trị TB mỗi đơn (AOV)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Receipt size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {formatVnd(stats.avgOrderValue)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Doanh thu / Tổng đơn hoàn tất
          </p>
        </div>
      </div>

      {/* Grid: Cơ cấu khách hàng + Người theo dõi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cn(PANEL_CLASS, 'p-6')}>
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#17203a] dark:text-white">
              Cơ cấu khách hàng mới & quay lại
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Tỷ trọng giữa người mua mới và khách hàng trung thành
            </p>
          </div>

          <div className="pt-2">
            <DonutChart
              data={customerDonutData}
              centerLabel="Tổng khách"
              centerValue={stats.totalCustomers.toString()}
            />
          </div>
        </div>

        <div className={cn(PANEL_CLASS, 'flex flex-col justify-between p-6')}>
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#17203a] dark:text-white">
                  Tăng trưởng người theo dõi Shop
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Lượng người theo dõi nhận thông báo khi có hàng mới hoặc khuyến mãi
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                <Heart size={22} weight="fill" />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6 rounded-2xl bg-zinc-50/70 p-5 dark:bg-white/5">
              <div className="flex-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Tổng lượt theo dõi hiện tại
                </span>
                <p className="mt-1 text-3xl font-black text-[#17203a] tabular-nums dark:text-white">
                  {followerCount.toLocaleString('vi-VN')}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                  {followerChange >= 0 && (
                    <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300">
                      <TrendUp size={14} weight="bold" />+{followerChange} người theo dõi mới trong
                      tháng
                    </span>
                  )}
                  {followerChange < 0 && (
                    <span className="flex items-center gap-0.5 text-rose-700 dark:text-rose-300">
                      <TrendDown size={14} weight="bold" />
                      {followerChange} người theo dõi trong tháng
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <CircularProgress
                  value={stats.retentionRate}
                  label="Giữ chân"
                  subLabel="Trung thành"
                  size={85}
                  color="#10b981"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5 text-xs text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
            <Lightbulb
              size={16}
              weight="bold"
              className="mt-0.5 shrink-0 text-blue-700 dark:text-sky-300"
            />
            <span>
              Mẹo: Chăm sóc khách hàng đã mua hàng qua tin nhắn CSKH và cập nhật bộ sưu tập mới
              thường xuyên để tăng tỷ lệ khách quay lại.
            </span>
          </div>
        </div>
      </div>

      {/* Top khách hàng mua nhiều nhất */}
      <div className={cn(PANEL_CLASS, 'p-6')}>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Crown size={18} weight="bold" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#17203a] dark:text-white">
              Top khách hàng thân thiết chi tiêu nhiều nhất
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Vinh danh những khách hàng VIP có giá trị đóng góp doanh số cao nhất cho Shop
            </p>
          </div>
        </div>

        {topCustomers.length === 0 && (
          <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Chưa có đủ số liệu khách hàng chi tiêu
          </div>
        )}

        {topCustomers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  <th className="pb-3 font-semibold">Hạng</th>
                  <th className="pb-3 font-semibold">Khách hàng</th>
                  <th className="pb-3 text-right font-semibold">Số đơn hoàn thành</th>
                  <th className="pb-3 text-right font-semibold">Tổng chi tiêu</th>
                  <th className="pb-3 text-right font-semibold">Đơn gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {topCustomers.map(function (cust, idx) {
                  let badge = 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300'
                  if (idx === 0) {
                    badge = 'bg-amber-500 text-white font-bold'
                  }
                  if (idx === 1) {
                    badge = 'bg-slate-400 text-white font-bold'
                  }
                  if (idx === 2) {
                    badge = 'bg-amber-700 text-white font-bold'
                  }

                  return (
                    <tr
                      key={cust.buyerId + idx}
                      className="hover:bg-zinc-50/50 dark:hover:bg-white/5"
                    >
                      <td className="py-3">
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                            badge,
                          )}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3" aria-label="Thông tin khách hàng">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-blue-700 dark:bg-sky-500/20 dark:text-sky-300">
                            {cust.buyerName.slice(0, 1).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-[#17203a] dark:text-white">
                              {cust.buyerName || 'Khách hàng'}
                            </span>
                            <span className="block text-[11px] text-zinc-400 dark:text-zinc-500">
                              ID: {cust.buyerId.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-medium text-zinc-700 tabular-nums dark:text-zinc-300">
                        {cust.orderCount} đơn
                      </td>
                      <td className="py-3 text-right font-bold text-blue-700 tabular-nums dark:text-sky-300">
                        {formatVnd(cust.totalSpent)}
                      </td>
                      <td className="py-3 text-right text-zinc-500 tabular-nums dark:text-zinc-400">
                        {formatDateTime(cust.lastOrderAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
