import {
  useGetRevenueDetail,
  useGetShopAlerts,
  useGetShopDashboard,
} from '@generated/endpoints/seller-statistics/seller-statistics'
import {
  ArrowBendDownLeft,
  CaretRight,
  ChartLineUp,
  ChatCircleDots,
  Info,
  Package,
  PaintBrushBroad,
  Percent,
  PlusCircle,
  Receipt,
  Storefront,
  TrendDown,
  TrendUp,
  Users,
  Wallet,
  WarningCircle,
} from '@phosphor-icons/react'

import { LineChart } from '@/components/ui/charts'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { takeData } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import { alertItems, dashboardData, revenueChartPoints } from '@/lib/seller/sellerStatsAdapters'
import { cn, FOCUS_RING_CLASS, iconChipClass, PANEL_CLASS } from '@/lib/ui/styles'

import type { AlertData } from '@/types/seller'

interface Props {
  shopId: string
  onNavigateTab: (tabId: string, params?: Record<string, string>) => void
  shopName: string
  pendingOrdersCount: number
  confirmedOrdersCount: number
  pendingReturnsCount: number
  lowStockCount: number
  unreadChatCount?: number
}

export default function SellerOverviewTab({
  shopId,
  onNavigateTab,
  shopName,
  pendingOrdersCount,
  confirmedOrdersCount,
  pendingReturnsCount,
  lowStockCount,
  unreadChatCount,
}: Props) {
  const isEnabled = shopId !== ''

  const dashboardQuery = useGetShopDashboard(shopId, { query: { enabled: isEnabled } })
  const alertsQuery = useGetShopAlerts(shopId, { query: { enabled: isEnabled } })
  const revenueQuery = useGetRevenueDetail(
    shopId,
    { period: 'WEEK' },
    { query: { enabled: isEnabled } },
  )

  if (dashboardQuery.isPending) {
    return <DashboardSkeleton />
  }

  let chatUnread = 0
  if (unreadChatCount !== undefined) {
    chatUnread = unreadChatCount
  }

  let liveStats = dashboardData(null)
  if (dashboardQuery.data !== undefined) {
    liveStats = dashboardData(takeData(dashboardQuery.data))
  }

  let alertsList: AlertData[] = []
  if (alertsQuery.data !== undefined) {
    alertsList = alertItems(takeData(alertsQuery.data))
  }

  let revenueTrendPoints = revenueChartPoints(null)
  if (revenueQuery.data !== undefined) {
    const detail = takeData(revenueQuery.data)
    revenueTrendPoints = revenueChartPoints(detail.points)
  }

  interface TodoItem {
    label: string
    count: number
    tab: string
    params?: Record<string, string>
    icon: typeof Receipt
    color: string
  }

  const todoItems: TodoItem[] = [
    {
      label: 'Chờ xác nhận',
      count: pendingOrdersCount,
      tab: 'orders',
      params: { status: 'PENDING' },
      icon: Receipt,
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    },
    {
      label: 'Chờ giao hàng',
      count: confirmedOrdersCount,
      tab: 'orders',
      params: { status: 'CONFIRMED' },
      icon: Package,
      color: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    },
    {
      label: 'Đổi/Trả cần duyệt',
      count: pendingReturnsCount,
      tab: 'returns',
      params: { status: 'REQUESTED' },
      icon: ArrowBendDownLeft,
      color: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    },
    {
      label: 'Sản phẩm hết/sắp hết',
      count: lowStockCount,
      tab: 'inventory',
      params: { filter: 'low_stock' },
      icon: WarningCircle,
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    },
    {
      label: 'Tin nhắn chưa đọc',
      count: chatUnread,
      tab: 'chat',
      params: {},
      icon: ChatCircleDots,
      color: 'bg-indigo-50 text-blue-700 dark:bg-sky-500/15 dark:text-sky-300',
    },
  ]

  let revenueSign = ''
  if (liveStats.revenueChangePercent > 0) {
    revenueSign = '+'
  }
  let revenueChangeLabel = `${revenueSign}${liveStats.revenueChangePercent}% so với hôm qua`
  if (liveStats.yesterdayRevenue === 0 && liveStats.todayRevenue === 0) {
    revenueChangeLabel = 'Chưa có biến động'
  }

  let ordersSign = ''
  if (liveStats.ordersChangeCount > 0) {
    ordersSign = '+'
  }
  let ordersChangeLabel = `${ordersSign}${liveStats.ordersChangeCount} đơn so với hôm qua`
  if (liveStats.ordersChangeCount === 0) {
    ordersChangeLabel = 'Bằng số lượng hôm qua'
  }

  let conversionRateEstimate = 0
  if (liveStats.shopVisits > 0) {
    conversionRateEstimate =
      Math.round((liveStats.todayOrders / liveStats.shopVisits) * 100 * 10) / 10
  }

  const metrics = [
    {
      label: 'Doanh số hôm nay',
      value: formatVnd(liveStats.todayRevenue),
      change: revenueChangeLabel,
      isPositive: liveStats.revenueChangePercent >= 0,
      icon: ChartLineUp,
    },
    {
      label: 'Đơn hàng mới hôm nay',
      value: `${liveStats.todayOrders} đơn`,
      change: ordersChangeLabel,
      isPositive: liveStats.ordersChangeCount >= 0,
      icon: Receipt,
    },
    {
      label: 'Lượt truy cập shop',
      value: `${liveStats.shopVisits.toLocaleString('vi-VN')} lượt`,
      change: 'Theo dõi thời gian thực',
      isPositive: true,
      icon: Users,
    },
    {
      label: 'Tỉ lệ chuyển đổi hôm nay',
      value: `${conversionRateEstimate}%`,
      change: 'Đơn hàng / Lượt truy cập',
      isPositive: conversionRateEstimate >= 3,
      icon: Percent,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Banner Chào mừng */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8] p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                <Storefront size={14} weight="bold" />
                Kênh Người Bán
              </span>
            </div>
            <h2 className="mt-2.5 text-2xl font-black tracking-tight">Xin chào, {shopName}!</h2>
            <p className="mt-1 text-sm text-white/90">
              Hôm nay bạn có {pendingOrdersCount} đơn hàng mới cần xác nhận và {pendingReturnsCount}{' '}
              yêu cầu đổi trả cần xử lý.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={function () {
                onNavigateTab('add_product')
              }}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#17203a] shadow-md transition hover:bg-sky-50 dark:bg-[#11182a] dark:text-sky-300 dark:hover:bg-[#17203a]',
                FOCUS_RING_CLASS,
              )}
            >
              <PlusCircle size={18} weight="bold" />
              Thêm sản phẩm
            </button>
            <button
              type="button"
              onClick={function () {
                onNavigateTab('chat')
              }}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/30',
                FOCUS_RING_CLASS,
              )}
            >
              <ChatCircleDots size={18} weight="bold" />
              Tin nhắn khách
            </button>
          </div>
        </div>
      </div>

      {/* Cảnh báo lỗi tải thống kê nếu có */}
      {dashboardQuery.isError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
          <WarningCircle size={18} weight="bold" className="shrink-0" />
          <span>Không thể tải đầy đủ chỉ số tổng quan. Vui lòng thử tải lại trang.</span>
        </div>
      )}

      {/* Việc cần làm (To-Do List) */}
      <div className={cn(PANEL_CLASS, 'p-6')}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#17203a] dark:text-white">
              Danh sách việc cần làm
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Các việc cần xử lý ngay để bảo đảm trải nghiệm cho người mua
            </p>
          </div>
          <button
            type="button"
            onClick={function () {
              onNavigateTab('orders')
            }}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300',
              FOCUS_RING_CLASS,
            )}
          >
            Xem tất cả đơn
            <CaretRight size={12} weight="bold" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {todoItems.map(function (item) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={function () {
                  onNavigateTab(item.tab, item.params)
                }}
                className={cn(
                  'group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 text-center transition hover:border-blue-300 hover:bg-sky-50/50 dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-400/40 dark:hover:bg-white/10',
                  FOCUS_RING_CLASS,
                )}
              >
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl',
                    item.color,
                  )}
                >
                  <item.icon size={22} weight="bold" />
                </div>
                <span className="mt-3 text-2xl font-extrabold text-[#17203a] tabular-nums group-hover:text-blue-700 dark:text-white dark:group-hover:text-sky-300">
                  {item.count}
                </span>
                <span className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chỉ số hôm nay (Live metrics) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(function (m) {
          return (
            <div key={m.label} className={PANEL_CLASS}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {m.label}
                </span>
                <div className={cn(iconChipClass(), 'h-9 w-9')}>
                  <m.icon size={18} weight="bold" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
                {m.value}
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {m.isPositive && (
                  <span className="flex items-center gap-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                    <TrendUp size={12} weight="bold" />
                    {m.change}
                  </span>
                )}
                {!m.isPositive && (
                  <span className="flex items-center gap-0.5 font-medium text-rose-700 dark:text-rose-300">
                    <TrendDown size={12} weight="bold" />
                    {m.change}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Biểu đồ doanh thu 7 ngày */}
      <div className={cn(PANEL_CLASS, 'overflow-hidden p-6')}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#17203a] dark:text-white">
              Xu hướng doanh thu 7 ngày gần nhất
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Theo dõi biến động dòng tiền bán hàng theo ngày
            </p>
          </div>
          <button
            type="button"
            onClick={function () {
              onNavigateTab('stats_revenue')
            }}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300',
              FOCUS_RING_CLASS,
            )}
          >
            Báo cáo chi tiết
            <CaretRight size={12} weight="bold" />
          </button>
        </div>

        <div className="pt-2">
          <LineChart
            data={revenueTrendPoints}
            currentLabel="Doanh thu (VND)"
            height={240}
            color="#1d4ed8"
            formatValue={formatVnd}
          />
        </div>
      </div>

      {/* Cảnh báo & Nhắc nhở vận hành */}
      {alertsList.length > 0 && (
        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/50 p-6 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white">
              <WarningCircle size={18} weight="bold" />
            </div>
            <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
              Cảnh báo cần lưu ý ({alertsList.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alertsList.map(function (alert, i) {
              let borderClass = 'border-amber-200 dark:border-amber-500/30'
              let bgClass = 'bg-white dark:bg-[#11182a]'
              if (alert.severity === 'DANGER') {
                borderClass = 'border-rose-200 dark:border-rose-500/30'
                bgClass = 'bg-rose-50/40 dark:bg-rose-500/10'
              }
              if (alert.severity === 'INFO') {
                borderClass = 'border-sky-200 dark:border-sky-500/30'
                bgClass = 'bg-sky-50/40 dark:bg-sky-500/10'
              }

              function handleAlertClick() {
                if (alert.type === 'PENDING_ORDER') {
                  onNavigateTab('orders', { status: 'PENDING' })
                  return
                }
                if (alert.type === 'OUT_OF_STOCK') {
                  onNavigateTab('inventory', { filter: 'low_stock' })
                  return
                }
              }

              return (
                <button
                  key={alert.type + i}
                  type="button"
                  onClick={handleAlertClick}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left shadow-xs transition hover:scale-[1.01]',
                    borderClass,
                    bgClass,
                    FOCUS_RING_CLASS,
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {alert.severity === 'DANGER' && (
                      <WarningCircle
                        size={20}
                        weight="bold"
                        className="text-rose-600 dark:text-rose-400"
                      />
                    )}
                    {alert.severity === 'WARNING' && (
                      <WarningCircle
                        size={20}
                        weight="bold"
                        className="text-amber-600 dark:text-amber-400"
                      />
                    )}
                    {alert.severity === 'INFO' && (
                      <Info size={20} weight="bold" className="text-sky-600 dark:text-sky-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[#17203a] dark:text-white">
                      {alert.message}
                    </p>
                    <span className="mt-1 inline-block text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      Số lượng: {alert.count}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lối tắt nghiệp vụ */}
      <div className={cn(PANEL_CLASS, 'p-6')}>
        <h3 className="text-base font-bold text-[#17203a] dark:text-white">
          Truy cập nhanh các chức năng
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={function () {
              onNavigateTab('revenue')
            }}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200/80 p-3.5 text-left transition hover:bg-sky-50/50 dark:border-white/10 dark:hover:bg-white/10',
              FOCUS_RING_CLASS,
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Wallet size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#17203a] dark:text-white">Ví người bán</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Rút tiền & quyết toán</p>
            </div>
          </button>

          <button
            type="button"
            onClick={function () {
              onNavigateTab('stats_revenue')
            }}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200/80 p-3.5 text-left transition hover:bg-sky-50/50 dark:border-white/10 dark:hover:bg-white/10',
              FOCUS_RING_CLASS,
            )}
          >
            <div className={cn(iconChipClass(), 'h-10 w-10')}>
              <ChartLineUp size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#17203a] dark:text-white">Thống kê doanh thu</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Biểu đồ & Xuất file</p>
            </div>
          </button>

          <button
            type="button"
            onClick={function () {
              onNavigateTab('decoration')
            }}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200/80 p-3.5 text-left transition hover:bg-sky-50/50 dark:border-white/10 dark:hover:bg-white/10',
              FOCUS_RING_CLASS,
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              <PaintBrushBroad size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#17203a] dark:text-white">Trang trí Shop</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Giao diện kéo-thả</p>
            </div>
          </button>

          <button
            type="button"
            onClick={function () {
              onNavigateTab('staff')
            }}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200/80 p-3.5 text-left transition hover:bg-sky-50/50 dark:border-white/10 dark:hover:bg-white/10',
              FOCUS_RING_CLASS,
            )}
          >
            <div className={cn(iconChipClass(), 'h-10 w-10')}>
              <Users size={20} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#17203a] dark:text-white">Phân quyền</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Nhân viên & vai trò</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
