import { useState } from 'react'

import { useTrend } from '@generated/endpoints/seller-reviews/seller-reviews'
import { CalendarBlank, ChartLineUp, WarningCircle } from '@phosphor-icons/react'

import { LineChart } from '@/components/ui/charts'
import { hookErrorMessage } from '@/lib/api/apiAdapters'
import { reviewTrendPoints } from '@/lib/seller/sellerAdapters'
import { cn, iconChipClass, PANEL_CLASS } from '@/lib/ui/styles'

import type { ReviewTrendPeriod, ReviewTrendPoint } from '@/types/seller'
import type { TrendParams } from '@generated/model/trendParams'

interface ReviewTrendCardProps {
  shopId: string
}

function toggleButtonClass(active: boolean): string {
  if (active) {
    return 'btn-primary shadow-sm'
  }
  return 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
}

export default function ReviewTrendCard({ shopId }: ReviewTrendCardProps) {
  const [period, setPeriod] = useState<ReviewTrendPeriod>('day')
  const [metric, setMetric] = useState<'rating' | 'count'>('rating')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  let dateError: string | null = null
  if (fromDate !== '' && toDate !== '' && fromDate > toDate) {
    dateError = 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.'
  }

  const trendParams: TrendParams = { shopId, period }
  if (fromDate !== '') {
    trendParams.from = fromDate
  }
  if (toDate !== '') {
    trendParams.to = toDate
  }

  const trendQuery = useTrend(trendParams, {
    query: { enabled: shopId !== '' && dateError === null },
  })

  let points: ReviewTrendPoint[] = []
  if (trendQuery.data !== undefined && trendQuery.data.status === 200) {
    points = reviewTrendPoints(trendQuery.data.data)
  }

  let chartData = points.map((pt) => ({ label: pt.label, value: pt.averageRating }))
  let chartLabel = 'Điểm sao trung bình'
  let chartColor = '#f59e0b'
  let chartMaxY: number | undefined = 5
  let formatAxisValue = function (val: number): string {
    return `${val}★`
  }
  let formatValue = function (val: number): string {
    return `${val.toFixed(2)}★`
  }

  if (metric === 'count') {
    chartData = points.map((pt) => ({ label: pt.label, value: pt.reviewCount }))
    chartLabel = 'Số lượt đánh giá'
    chartColor = '#6366f1'
    chartMaxY = undefined
    formatAxisValue = function (val: number): string {
      return `${Math.round(val)}`
    }
    formatValue = function (val: number): string {
      return `${Math.round(val)} đánh giá`
    }
  }

  const periodOptions: Array<{ key: ReviewTrendPeriod; label: string }> = [
    { key: 'day', label: 'Theo ngày' },
    { key: 'week', label: 'Theo tuần' },
    { key: 'month', label: 'Theo tháng' },
  ]

  return (
    <div className={cn(PANEL_CLASS, 'p-6')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn(iconChipClass(), 'h-9 w-9')}>
            <ChartLineUp size={18} weight="bold" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#17203a] dark:text-white">
              Xu hướng đánh giá theo thời gian
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Theo dõi biến động điểm sao trung bình và lượng đánh giá mới
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-zinc-100 p-1 text-xs font-bold dark:bg-white/10">
            <button
              type="button"
              onClick={function () {
                setMetric('rating')
              }}
              className={`cursor-pointer rounded-full px-3 py-1.5 transition ${toggleButtonClass(metric === 'rating')}`}
            >
              Điểm sao TB
            </button>
            <button
              type="button"
              onClick={function () {
                setMetric('count')
              }}
              className={`cursor-pointer rounded-full px-3 py-1.5 transition ${toggleButtonClass(metric === 'count')}`}
            >
              Số đánh giá
            </button>
          </div>

          <div className="inline-flex rounded-full bg-zinc-100 p-1 text-xs font-bold dark:bg-white/10">
            {periodOptions.map(function (opt) {
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={function () {
                    setPeriod(opt.key)
                  }}
                  className={`cursor-pointer rounded-full px-3 py-1.5 transition ${toggleButtonClass(period === opt.key)}`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
          <CalendarBlank size={15} weight="bold" />
          <span>Khoảng thời gian:</span>
        </div>
        <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
          <span>Từ</span>
          <input
            type="date"
            aria-label="Từ ngày"
            value={fromDate}
            onChange={function (e) {
              setFromDate(e.target.value)
            }}
            className="rounded-full border border-zinc-300 bg-white/85 px-3 py-1 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
          />
        </label>
        <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
          <span>Đến</span>
          <input
            type="date"
            aria-label="Đến ngày"
            value={toDate}
            onChange={function (e) {
              setToDate(e.target.value)
            }}
            className="rounded-full border border-zinc-300 bg-white/85 px-3 py-1 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
          />
        </label>
        {(fromDate !== '' || toDate !== '') && (
          <button
            type="button"
            onClick={function () {
              setFromDate('')
              setToDate('')
            }}
            className="cursor-pointer rounded-full border border-zinc-300 px-3 py-1 font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Xóa khoảng ngày
          </button>
        )}
      </div>

      {dateError !== null && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
          <WarningCircle size={16} weight="bold" />
          <span>{dateError}</span>
        </div>
      )}

      {dateError === null && trendQuery.isError && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
          <WarningCircle size={16} weight="bold" />
          <span>{hookErrorMessage('sellerReviewTrend', trendQuery.error)}</span>
        </div>
      )}

      {dateError === null && !trendQuery.isError && (
        <div className="mt-4">
          {trendQuery.isLoading && (
            <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-xs text-zinc-400 dark:border-white/10">
              Đang tải biểu đồ xu hướng đánh giá...
            </div>
          )}
          {!trendQuery.isLoading && (
            <LineChart
              data={chartData}
              currentLabel={chartLabel}
              height={220}
              color={chartColor}
              maxY={chartMaxY}
              formatAxisValue={formatAxisValue}
              formatValue={formatValue}
            />
          )}
        </div>
      )}
    </div>
  )
}
