import {
  useGetCustomerOverview,
  useGetFollowerTrend,
  useGetTopCustomers,
} from '@generated/endpoints/seller-statistics/seller-statistics'
import {
  Crown,
  Heart,
  Receipt,
  TrendDown,
  TrendUp,
  UserCheck,
  UserPlus,
  Users,
} from '@phosphor-icons/react'

import { CircularProgress, DonutChart } from '@/components/ui/charts'
import { takeData } from '@/lib/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { customerAnalyticsData, topCustomerItems } from '@/lib/sellerStatsAdapters'

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
      color: '#6366f1',
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
      <div className="flex flex-col gap-2 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            Khách Hàng & Người Theo Dõi
          </span>
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">
          Phân Tích Chân Dung Khách Hàng
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Theo dõi số lượng khách hàng mới, tỷ lệ khách quay lại và xếp hạng khách hàng thân thiết
          của Shop
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng khách hàng */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Tổng số khách hàng
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <Users size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 tabular-nums dark:text-white">
            {stats.totalCustomers.toLocaleString('vi-VN')}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Đã từng đặt hàng thành công
          </p>
        </div>

        {/* Khách hàng mới */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Khách hàng mới
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <UserPlus size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 tabular-nums dark:text-white">
            {stats.newCustomers.toLocaleString('vi-VN')}
          </p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Mua lần đầu tại Shop</p>
        </div>

        {/* Tỷ lệ quay lại */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Tỷ lệ giữ chân khách
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <UserCheck size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 tabular-nums dark:text-white">
            {retentionPercent}%
          </p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            {stats.returningCustomers} khách mua từ 2 lần trở lên
          </p>
        </div>

        {/* Giá trị đơn trung bình (AOV) */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Giá trị TB mỗi đơn (AOV)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Receipt size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 tabular-nums dark:text-white">
            {formatVnd(stats.avgOrderValue)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Doanh thu / Tổng đơn hoàn tất
          </p>
        </div>
      </div>

      {/* Grid: Cơ cấu khách hàng (Donut) + Người theo dõi (Follower gauge card) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Donut: Khách mới vs Khách quay lại */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="mb-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
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

        {/* Người theo dõi & Giữ chân */}
        <div className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Tăng trưởng người theo dõi Shop
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Lượng fan hâm mộ nhận thông báo khi có hàng mới hoặc khuyến mãi
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/40">
                <Heart size={22} weight="fill" />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6 rounded-2xl bg-zinc-50/60 p-5 dark:bg-white/5">
              <div className="flex-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Tổng lượt theo dõi hiện tại
                </span>
                <p className="mt-1 text-3xl font-black text-zinc-900 tabular-nums dark:text-white">
                  {followerCount.toLocaleString('vi-VN')}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                  {followerChange >= 0 && (
                    <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                      <TrendUp size={14} weight="bold" />+{followerChange} người theo dõi mới trong
                      tháng
                    </span>
                  )}
                  {followerChange < 0 && (
                    <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
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

          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 text-xs text-indigo-900 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-200">
            💡 Mẹo: Tạo thêm mã giảm giá độc quyền cho người theo dõi để gia tăng tỷ lệ chốt đơn và
            chuyển đổi fan thành khách hàng thân thiết.
          </div>
        </div>
      </div>

      {/* Top khách hàng mua nhiều nhất */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
            <Crown size={18} weight="bold" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Top khách hàng thân thiết chi tiêu nhiều nhất
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Vinh danh những khách hàng VIP có giá trị đóng góp doanh số cao nhất cho Shop
            </p>
          </div>
        </div>

        {topCustomers.length === 0 && (
          <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
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
                {topCustomers.map((cust, idx) => {
                  let badge = 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300'
                  if (idx === 0) {
                    badge = 'bg-amber-500 text-white font-bold'
                  }
                  if (idx === 1) {
                    badge = 'bg-slate-400 text-white font-bold'
                  }
                  if (idx === 2) {
                    badge = 'bg-orange-500 text-white font-bold'
                  }

                  return (
                    <tr
                      key={cust.buyerId + idx}
                      className="hover:bg-zinc-50/50 dark:hover:bg-white/5"
                    >
                      <td className="py-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${badge}`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3" aria-label="Thông tin khách hàng">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {cust.buyerName.slice(0, 1).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-white">
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
                      <td className="py-3 text-right font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
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
