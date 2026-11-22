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
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { takeData } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import { notify } from '@/lib/notifications'
import {
  orderStatusSummaryData,
  revenueCategoryItems,
  revenueChartPoints,
  revenuePaymentItems,
} from '@/lib/seller/sellerStatsAdapters'
import {
  cn,
  FOCUS_RING_CLASS,
  iconChipClass,
  PANEL_CLASS,
  primaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

interface Props {
  shopId: string
}

type PeriodType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

const CATEGORY_COLORS = [
  '#312e81',
  '#1d4ed8',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#38bdf8',
]

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

  if (detailQuery.isPending && comparisonQuery.isPending) {
    return <DashboardSkeleton />
  }

  const hasError =
    detailQuery.isError ||
    comparisonQuery.isError ||
    categoryQuery.isError ||
    paymentQuery.isError ||
    summaryQuery.isError

  let chartPoints = revenueChartPoints(null)
  if (detailQuery.data !== undefined) {
    const detailData = takeData(detailQuery.data)
    chartPoints = revenueChartPoints(detailData.points)
  }

  let rawCategories = revenueCategoryItems(null)
  if (categoryQuery.data !== undefined) {
    rawCategories = revenueCategoryItems(takeData(categoryQuery.data))
  }
  const categoryDonutData = rawCategories.map(function (c, idx) {
    return {
      label: c.categoryName,
      value: c.revenue,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] ?? '#1d4ed8',
    }
  })

  let categoryTotalRevenue = 0
  for (const cat of categoryDonutData) {
    categoryTotalRevenue += cat.value
  }

  let paymentItems = revenuePaymentItems(null)
  if (paymentQuery.data !== undefined) {
    paymentItems = revenuePaymentItems(takeData(paymentQuery.data))
  }
  const paymentBarData = paymentItems.map(function (p) {
    let barColor = '#10b981'
    if (p.paymentMethod === 'COD') {
      barColor = '#1d4ed8'
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

  const platformFee = Math.round(compData.currentRevenue * 0.05)
  const estimatedShippingCost = Math.round(compData.currentOrders * 15000)
  let estimatedProfit = compData.currentRevenue - platformFee - estimatedShippingCost
  if (estimatedProfit < 0) {
    estimatedProfit = 0
  }

  async function handleExportExcel() {
    if (dateError !== null) {
      notify.warning(dateError)
      return
    }
    setIsExporting(true)
    try {
      const res = await exportRevenueReport(shopId, {
        format: 'xlsx',
        from: queryFrom,
        to: queryTo,
      })
      if (res.status === 200) {
        let fileSuffix = period.toLowerCase()
        if (isCustomRangeActive) {
          fileSuffix = `${fromDate}_den_${toDate}`
        }
        const todayStr = new Date().toISOString().slice(0, 10)
        let downloadBlob: Blob

        const rawData = res.data as unknown
        if (rawData instanceof Blob) {
          downloadBlob = rawData
        } else {
          downloadBlob = new Blob([rawData as BlobPart], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
        }
        const filename = `bao-cao-doanh-thu-${fileSuffix}-${todayStr}.xlsx`

        const url = URL.createObjectURL(downloadBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        notify.success('Đã xuất file Excel (.xlsx) 4 sheet chi tiết thành công!')
      }
    } catch (err: unknown) {
      notify.fromError(err, undefined, 'Lỗi khi xuất file báo cáo')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + Filter toolbar */}
      <div
        className={cn(
          PANEL_CLASS,
          'flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between',
        )}
      >
        <div>
          <h2 className="text-xl font-black text-[#17203a] dark:text-white">
            Báo Cáo & Thống Kê Doanh Thu
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Phân tích số liệu dòng tiền, hiệu suất đơn hàng và so sánh kỳ trước
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className={segmentedTrackClass()}>
            <button
              type="button"
              onClick={function () {
                setPeriod('DAY')
                setFromDate('')
                setToDate('')
              }}
              className={segmentedItemClass(
                !isCustomRangeActive && period === 'DAY' && fromDate === '' && toDate === '',
              )}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={function () {
                setPeriod('WEEK')
                setFromDate('')
                setToDate('')
              }}
              className={segmentedItemClass(
                !isCustomRangeActive && period === 'WEEK' && fromDate === '' && toDate === '',
              )}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={function () {
                setPeriod('MONTH')
                setFromDate('')
                setToDate('')
              }}
              className={segmentedItemClass(
                !isCustomRangeActive && period === 'MONTH' && fromDate === '',
              )}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={function () {
                setPeriod('YEAR')
                setFromDate('')
                setToDate('')
              }}
              className={segmentedItemClass(
                !isCustomRangeActive && period === 'YEAR' && fromDate === '',
              )}
            >
              Năm nay
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white/85 px-3 py-1.5 text-xs dark:border-white/15 dark:bg-white/10">
              <CalendarBlank size={14} className="text-zinc-400" />
              <input
                type="date"
                aria-label="Từ ngày"
                value={fromDate}
                max={maxFromDateProp}
                onChange={function (e) {
                  setFromDate(e.target.value)
                }}
                className="bg-transparent text-xs text-[#17203a] outline-none dark:text-white"
                title="Từ ngày"
              />
              <span className="text-zinc-400">-</span>
              <input
                type="date"
                aria-label="Đến ngày"
                value={toDate}
                min={minToDateProp}
                onChange={function (e) {
                  setToDate(e.target.value)
                }}
                className="bg-transparent text-xs text-[#17203a] outline-none dark:text-white"
                title="Đến ngày"
              />
              {(fromDate !== '' || toDate !== '') && (
                <button
                  type="button"
                  aria-label="Xóa bộ lọc ngày"
                  onClick={function () {
                    setFromDate('')
                    setToDate('')
                  }}
                  className={cn(
                    'cursor-pointer rounded-full p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200',
                    FOCUS_RING_CLASS,
                  )}
                  title="Xóa bộ lọc ngày"
                >
                  <X size={12} weight="bold" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={function () {
                void handleExportExcel()
              }}
              disabled={isExporting || dateError !== null}
              className={cn(
                primaryButtonClass(),
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-sm disabled:opacity-50',
              )}
              title="Xuất file báo cáo Excel (.xlsx)"
            >
              <DownloadSimple size={14} weight="bold" />
              {isExporting && <span>Đang xuất...</span>}
              {!isExporting && <span>Xuất Excel</span>}
            </button>
          </div>
        </div>
      </div>

      {hasError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
          <WarningCircle size={16} weight="bold" className="shrink-0" />
          <span>Không thể tải một phần dữ liệu thống kê doanh thu. Vui lòng thử lại sau.</span>
        </div>
      )}

      {dateError !== null && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
          <WarningCircle size={16} weight="bold" className="shrink-0" />
          <span>{dateError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Tổng doanh thu
            </span>
            <div className={cn(iconChipClass(), 'h-9 w-9')}>
              <CurrencyDollar size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {formatVnd(compData.currentRevenue)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {compData.revenueChangePercent >= 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                <TrendUp size={12} weight="bold" />+{compData.revenueChangePercent}% so kỳ trước
              </span>
            )}
            {compData.revenueChangePercent < 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-rose-700 dark:text-rose-300">
                <TrendDown size={12} weight="bold" />
                {compData.revenueChangePercent}% so kỳ trước
              </span>
            )}
          </div>
        </div>

        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Đơn hàng thành công
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {compData.currentOrders} đơn
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {compData.ordersChangeCount >= 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                <TrendUp size={12} weight="bold" />+{compData.ordersChangeCount} đơn so kỳ trước
              </span>
            )}
            {compData.ordersChangeCount < 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-rose-700 dark:text-rose-300">
                <TrendDown size={12} weight="bold" />
                {compData.ordersChangeCount} đơn so kỳ trước
              </span>
            )}
          </div>
        </div>

        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Đơn hủy & Đổi trả
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
              <XCircle size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {orderSummary.cancelledOrders + orderSummary.returnedOrders} đơn
          </p>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
            Thiệt hại: {formatVnd(orderSummary.cancelledValue + orderSummary.returnedValue)}
          </p>
        </div>

        <div className={PANEL_CLASS}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Lợi nhuận ước tính
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Scales size={18} weight="bold" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#17203a] tabular-nums dark:text-white">
            {formatVnd(estimatedProfit)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Đã trừ phí sàn (~5%) & ship
          </p>
        </div>
      </div>

      {/* Doanh thu theo thời gian */}
      <div className={cn(PANEL_CLASS, 'overflow-hidden p-6')}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#17203a] dark:text-white">
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
            color="#1d4ed8"
            formatValue={formatVnd}
          />
        </div>
      </div>

      {/* Phân bổ theo danh mục & Phương thức thanh toán */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cn(PANEL_CLASS, 'p-6')}>
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#17203a] dark:text-white">
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
              centerValue={formatVnd(categoryTotalRevenue)}
              formatValue={formatVnd}
            />
          </div>
        </div>

        <div className={cn(PANEL_CLASS, 'p-6')}>
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#17203a] dark:text-white">
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
      <div className={cn(PANEL_CLASS, 'p-6')}>
        <h3 className="text-base font-bold text-[#17203a] dark:text-white">
          Tổng hợp giá trị theo trạng thái đơn hàng
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Theo dõi tổng lượng giá trị đơn hoàn thành, đơn hủy và giá trị hoàn tiền
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <CheckCircle size={22} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Đơn hoàn thành ({orderSummary.completedOrders})
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#17203a] tabular-nums dark:text-white">
                {formatVnd(orderSummary.completedValue)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white">
              <XCircle size={22} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                Đơn đã hủy ({orderSummary.cancelledOrders})
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#17203a] tabular-nums dark:text-white">
                {formatVnd(orderSummary.cancelledValue)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Receipt size={22} weight="bold" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Đổi trả hoàn tiền ({orderSummary.returnedOrders})
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#17203a] tabular-nums dark:text-white">
                {formatVnd(orderSummary.returnedValue)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
