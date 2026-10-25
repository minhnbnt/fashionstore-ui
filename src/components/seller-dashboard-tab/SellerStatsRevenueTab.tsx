import { useEffect, useRef, useState } from 'react'

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
  CaretDown,
  CheckCircle,
  CurrencyDollar,
  DownloadSimple,
  FileText,
  Receipt,
  Scales,
  Table,
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
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

  let categoryTotalRevenue = 0
  for (const cat of categoryDonutData) {
    categoryTotalRevenue += cat.value
  }

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

  async function handleExport(exportFormat: 'xlsx' | 'csv' = 'xlsx') {
    if (dateError !== null) {
      setExportError(dateError)
      return
    }
    setIsExporting(true)
    setExportError(null)
    setExportSuccessMessage(null)
    setShowExportMenu(false)
    try {
      const res = await exportRevenueReport(shopId, {
        format: exportFormat,
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
        let filename: string

        if (exportFormat === 'xlsx') {
          const rawData = res.data as unknown
          if (rawData instanceof Blob) {
            downloadBlob = rawData
          } else {
            downloadBlob = new Blob([rawData as BlobPart], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })
          }
          filename = `bao-cao-doanh-thu-${fileSuffix}-${todayStr}.xlsx`
        } else {
          let rawText = String(res.data)
          if (typeof res.data === 'string') {
            rawText = res.data
          }
          let textWithBom = rawText
          if (!rawText.startsWith('\uFEFF')) {
            textWithBom = '\uFEFF' + rawText
          }
          downloadBlob = new Blob([textWithBom], { type: 'text/csv;charset=utf-8;' })
          filename = `bao-cao-doanh-thu-${fileSuffix}-${todayStr}.csv`
        }

        const url = URL.createObjectURL(downloadBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        let msg = 'Đã xuất file CSV (tích hợp UTF-8 BOM) thành công!'
        if (exportFormat === 'xlsx') {
          msg = 'Đã xuất file Excel (.xlsx) 4 sheet chi tiết thành công!'
        }
        setExportSuccessMessage(msg)
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

          {/* Export Dropdown */}
          <div ref={exportDropdownRef} className="relative">
            <div className="flex items-center rounded-full bg-indigo-600 shadow-md transition hover:bg-indigo-700">
              <button
                type="button"
                onClick={() => {
                  void handleExport('xlsx')
                }}
                disabled={isExporting || dateError !== null}
                className="flex items-center gap-2 rounded-l-full py-2 pl-4 pr-2 text-xs font-bold text-white disabled:opacity-50"
                title="Tải về file Excel (.xlsx) 4 sheet đầy đủ"
              >
                <DownloadSimple size={15} weight="bold" />
                {isExporting && <span>Đang xuất...</span>}
                {!isExporting && <span>Xuất Excel</span>}
                <span className="rounded bg-white/20 px-1 py-0.5 text-[10px] font-semibold text-white">
                  .xlsx
                </span>
              </button>
              <div className="h-4 w-[1px] bg-white/25" />
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting || dateError !== null}
                className="rounded-r-full p-2 text-white transition hover:bg-white/10 disabled:opacity-50"
                title="Tùy chọn định dạng xuất báo cáo"
              >
                <CaretDown size={14} weight="bold" />
              </button>
            </div>

            {showExportMenu && (
              <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#161f36]">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Chọn định dạng xuất
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleExport('xlsx')
                  }}
                  className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-white/5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <Table size={18} weight="bold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        Excel (.xlsx)
                      </span>
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                        Khuyên dùng
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Báo cáo 4 sheet chi tiết: Tổng quan, Biểu đồ ngày, Top sản phẩm, Đơn hàng. Chuẩn font tiếng Việt 100%.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleExport('csv')
                  }}
                  className="mt-1 flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-white/5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <FileText size={18} weight="bold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        CSV (.csv)
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Xuất nhanh dữ liệu nhẹ, tích hợp UTF-8 BOM giúp mở trực tiếp trên Excel không bị lỗi font.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
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

      {exportSuccessMessage !== null && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle size={16} weight="bold" className="shrink-0 text-emerald-600" />
          <span>{exportSuccessMessage}</span>
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
              centerValue={formatVnd(categoryTotalRevenue)}
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
