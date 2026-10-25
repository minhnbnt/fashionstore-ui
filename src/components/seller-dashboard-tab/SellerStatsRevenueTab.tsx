import { useState } from 'react'

import {
  exportRevenueReport,
  useGetOrderStatusSummary,
  useGetPeriodComparison,
  useGetRevenueByCategory,
  useGetRevenueByPayment,
  useGetRevenueDetail,
} from '@generated/endpoints/seller-statistics/seller-statistics'
import {
  CalendarBlank,
  CheckCircle,
  CurrencyDollar,
  DownloadSimple,
  Receipt,
  Scales,
  TrendDown,
  TrendUp,
  WarningCircle,
  X,
  XCircle,
} from '@phosphor-icons/react'

import { BarChart, DonutChart, LineChart } from '@/components/ui/charts'
import { takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'
import {
  orderStatusSummaryData,
  revenueCategoryItems,
  revenueChartPoints,
  revenuePaymentItems,
} from '@/lib/sellerStatsAdapters'

interface Props {
  shopId: string
}

type PeriodType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

const CATEGORY_COLORS = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#14b8a6', // teal
  '#f97316', // orange
]

function periodFilterClass(active: boolean): string {
  if (active) {
    return 'bg-white text-indigo-600 shadow-sm dark:bg-indigo-600 dark:text-white'
  }
  return 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
}

function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) {
    return ''
  }
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export default function SellerStatsRevenueTab({ shopId }: Props) {
  const [period, setPeriod] = useState<PeriodType>('WEEK')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const isEnabled = shopId !== ''

  let minToDate = ''
  if (fromDate !== '') {
    minToDate = addDays(fromDate, 1)
  }
  let maxFromDate = ''
  if (toDate !== '') {
    maxFromDate = addDays(toDate, -1)
  }

  let minToDateProp: string | undefined = undefined
  if (minToDate !== '') {
    minToDateProp = minToDate
  }
  let maxFromDateProp: string | undefined = undefined
  if (maxFromDate !== '') {
    maxFromDateProp = maxFromDate
  }

  let dateError: string | null = null
  let isCustomRangeActive = false
  if (fromDate !== '' && toDate !== '') {
    if (toDate <= fromDate) {
      dateError = 'Ngày kết thúc phải lớn hơn ngày bắt đầu'
    } else {
      isCustomRangeActive = true
    }
  } else if (fromDate !== '' || toDate !== '') {
    dateError = 'Vui lòng chọn cả từ ngày và đến ngày'
  }

  let queryFrom: string | undefined = undefined
  let queryTo: string | undefined = undefined
  if (isCustomRangeActive) {
    queryFrom = fromDate
    queryTo = toDate
  }

  const detailQuery = useGetRevenueDetail(
    shopId,
    { period, from: queryFrom, to: queryTo },
    { query: { enabled: isEnabled && dateError === null } },
  )

  const comparisonQuery = useGetPeriodComparison(
    shopId,
    { period },
    { query: { enabled: isEnabled } },
  )

  const categoryQuery = useGetRevenueByCategory(shopId, { query: { enabled: isEnabled } })

  const paymentQuery = useGetRevenueByPayment(shopId, { query: { enabled: isEnabled } })

  const summaryQuery = useGetOrderStatusSummary(
    shopId,
    { from: queryFrom, to: queryTo },
    { query: { enabled: isEnabled } },
  )

  // Adapters
  let chartPoints = revenueChartPoints(null)
  if (detailQuery.data !== undefined) {
    const detailData = takeData(detailQuery.data)
    chartPoints = revenueChartPoints(detailData.points)
  }

  let rawCategories = revenueCategoryItems(null)
  if (categoryQuery.data !== undefined) {
    rawCategories = revenueCategoryItems(takeData(categoryQuery.data))
  }
  const categoryDonutData = rawCategories.map((c, idx) => ({
    label: c.categoryName,
    value: c.revenue,
    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] ?? '#6366f1',
  }))

  let paymentItems = revenuePaymentItems(null)
  if (paymentQuery.data !== undefined) {
    paymentItems = revenuePaymentItems(takeData(paymentQuery.data))
  }
  const paymentBarData = paymentItems.map((p) => {
    let barColor = '#10b981'
    if (p.paymentMethod === 'COD') {
      barColor = '#3b82f6'
    }
    return {
      label: p.paymentMethod,
      value: p.revenue,
      subLabel: `${p.orderCount} đơn`,
      color: barColor,
    }
  })

  let orderSummary = orderStatusSummaryData(null)
  if (summaryQuery.data !== undefined) {
    orderSummary = orderStatusSummaryData(takeData(summaryQuery.data))
  }

  let compData = {
    currentRevenue: 0,
    previousRevenue: 0,
    revenueChangePercent: 0,
    currentOrders: 0,
    previousOrders: 0,
    ordersChangeCount: 0,
  }
  if (comparisonQuery.data !== undefined) {
    const cd = takeData(comparisonQuery.data)
    const currentOrders = cd.currentOrders ?? 0
    const previousOrders = cd.previousOrders ?? 0
    compData = {
      currentRevenue: cd.currentRevenue ?? 0,
      previousRevenue: cd.previousRevenue ?? 0,
      revenueChangePercent: Math.round((cd.changePercent ?? 0) * 100 * 10) / 10,
      currentOrders,
      previousOrders,
      ordersChangeCount: currentOrders - previousOrders,
    }
  }

  // Estimated profit = Revenue - 5% platform fee - 2% shipping support estimate
  const platformFee = Math.round(compData.currentRevenue * 0.05)
  const estimatedShippingCost = Math.round(compData.currentOrders * 15000)
  let estimatedProfit = compData.currentRevenue - platformFee - estimatedShippingCost
  if (estimatedProfit < 0) {
    estimatedProfit = 0
  }

  async function handleExportExcel() {
    if (dateError !== null) {
      setExportError(dateError)
      return
    }
    setIsExporting(true)
    setExportError(null)
    try {
      const res = await exportRevenueReport(shopId, {
        format: 'CSV',
        from: queryFrom,
        to: queryTo,
      })
      if (res.status === 200) {
        const csvData = typeof res.data === 'string' ? res.data : String(res.data)
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        let fileSuffix = period.toLowerCase()
        if (isCustomRangeActive) {
          fileSuffix = `${fromDate}_den_${toDate}`
        }
        link.download = `bao-cao-doanh-thu-${fileSuffix}-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setExportError(err.message)
      } else {
        setExportError('Lỗi khi xuất file báo cáo')
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + Filter toolbar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-[#11182a]">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            Báo Cáo & Thống Kê Doanh Thu
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Phân tích số liệu dòng tiền, hiệu suất đơn hàng và so sánh kỳ trước
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector pills */}
          <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-white/5">
            <button
              type="button"
              onClick={() => {
                setPeriod('DAY')
                setFromDate('')
                setToDate('')
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${periodFilterClass(
                !isCustomRangeActive && period === 'DAY' && fromDate === '' && toDate === '',
              )}`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriod('WEEK')
                setFromDate('')
                setToDate('')
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${periodFilterClass(
                !isCustomRangeActive && period === 'WEEK' && fromDate === '' && toDate === '',
              )}`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriod('MONTH')
                setFromDate('')
                setToDate('')
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${periodFilterClass(
                !isCustomRangeActive && period === 'MONTH' && fromDate === '',
              )}`}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriod('YEAR')
                setFromDate('')
                setToDate('')
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${periodFilterClass(
                !isCustomRangeActive && period === 'YEAR' && fromDate === '',
              )}`}
            >
              Năm nay
            </button>
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs dark:border-white/10 dark:bg-[#11182a]">
            <CalendarBlank size={14} className="text-zinc-400" />
            <input
              type="date"
              value={fromDate}
              max={maxFromDateProp}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-xs text-zinc-700 outline-none dark:text-zinc-200"
              title="Từ ngày"
            />
            <span className="text-zinc-400">-</span>
            <input
              type="date"
              value={toDate}
              min={minToDateProp}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-xs text-zinc-700 outline-none dark:text-zinc-200"
              title="Đến ngày"
            />
            {(fromDate !== '' || toDate !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('')
                  setToDate('')
                  setExportError(null)
                }}
                className="rounded-full p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                title="Xóa bộ lọc ngày"
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </div>

          {/* Export Excel button */}
          <button
            type="button"
            onClick={() => {
              void handleExportExcel()
            }}
            disabled={isExporting || dateError !== null}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <DownloadSimple size={15} weight="bold" />
            {isExporting && 'Đang xuất...'}
            {!isExporting && 'Xuất Excel'}
          </button>
        </div>
      </div>

      {dateError !== null && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <WarningCircle size={16} weight="bold" className="shrink-0 text-amber-600" />
          <span>{dateError}</span>
        </div>
      )}

      {exportError !== null && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
          {exportError}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Doanh thu */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Tổng doanh thu
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <CurrencyDollar size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 tabular-nums dark:text-white">
            {formatVnd(compData.currentRevenue)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {compData.revenueChangePercent >= 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendUp size={12} weight="bold" />+{compData.revenueChangePercent}% so kỳ trước
              </span>
            )}
            {compData.revenueChangePercent < 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-rose-600 dark:text-rose-400">
                <TrendDown size={12} weight="bold" />
                {compData.revenueChangePercent}% so kỳ trước
              </span>
            )}
          </div>
        </div>

        {/* Đơn hoàn thành */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Đơn hàng thành công
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <CheckCircle size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 tabular-nums dark:text-white">
            {compData.currentOrders} đơn
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {compData.ordersChangeCount >= 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendUp size={12} weight="bold" />+{compData.ordersChangeCount} đơn so kỳ trước
              </span>
            )}
            {compData.ordersChangeCount < 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-rose-600 dark:text-rose-400">
                <TrendDown size={12} weight="bold" />
                {compData.ordersChangeCount} đơn so kỳ trước
              </span>
            )}
          </div>
        </div>

        {/* Đơn hủy & Hoàn trả */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Đơn hủy & Đổi trả
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40">
              <XCircle size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 tabular-nums dark:text-white">
            {orderSummary.cancelledOrders + orderSummary.returnedOrders} đơn
          </p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            Thiệt hại: {formatVnd(orderSummary.cancelledValue + orderSummary.returnedValue)}
          </p>
        </div>

        {/* Lợi nhuận ước tính */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Lợi nhuận ước tính
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Scales size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-zinc-900 tabular-nums dark:text-white">
            {formatVnd(estimatedProfit)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Đã trừ phí sàn (~5%) & ship
          </p>
        </div>
      </div>

      {/* Doanh thu theo thời gian */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Biểu đồ doanh thu theo chu kỳ
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Chi tiết diễn biến doanh thu bán hàng qua từng mốc thời gian
            </p>
          </div>
        </div>

        <div className="pt-2">
          <LineChart
            data={chartPoints}
            currentLabel="Doanh thu thực tế (VND)"
            height={260}
            color="#6366f1"
            formatValue={formatVnd}
          />
        </div>
      </div>

      {/* Phân bổ theo danh mục & Phương thức thanh toán */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Doanh thu theo danh mục (Donut Chart) */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="mb-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Tỷ trọng doanh thu theo danh mục
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Phân bổ cơ cấu bán hàng theo các nhóm sản phẩm thời trang
            </p>
          </div>

          <div className="pt-2">
            <DonutChart
              data={categoryDonutData}
              centerLabel="Tổng danh mục"
              centerValue={formatVnd(compData.currentRevenue)}
              formatValue={formatVnd}
            />
          </div>
        </div>

        {/* Phân bổ theo phương thức thanh toán (Horizontal Bar Chart) */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="mb-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Doanh thu theo phương thức thanh toán
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              So sánh tỷ trọng thanh toán khi nhận hàng (COD) vs Trực tuyến (VNPay/Momo)
            </p>
          </div>

          <div className="pt-2">
            <BarChart data={paymentBarData} horizontal={true} formatValue={formatVnd} />
          </div>
        </div>
      </div>

      {/* Bảng tổng hợp trạng thái đơn hàng */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Tổng hợp giá trị theo trạng thái đơn hàng
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Theo dõi tổng lượng giá trị đơn hoàn thành, đơn hủy và giá trị hoàn tiền
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <CheckCircle size={22} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Đơn hoàn thành ({orderSummary.completedOrders})
              </p>
              <p className="mt-0.5 text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
                {formatVnd(orderSummary.completedValue)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white">
              <XCircle size={22} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                Đơn đã hủy ({orderSummary.cancelledOrders})
              </p>
              <p className="mt-0.5 text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
                {formatVnd(orderSummary.cancelledValue)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Receipt size={22} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Đổi trả hoàn tiền ({orderSummary.returnedOrders})
              </p>
              <p className="mt-0.5 text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
                {formatVnd(orderSummary.returnedValue)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
