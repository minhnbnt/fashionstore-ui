import { niceCeiling } from '@/lib/adminStats'

export interface BarChartItem {
  label: string
  value: number
  color?: string
  subLabel?: string
  rank?: number
}

export interface BarChartProps {
  data: BarChartItem[]
  height?: number
  horizontal?: boolean
  formatValue?: (val: number) => string
}

export function BarChart({
  data,
  height,
  horizontal,
  formatValue,
}: BarChartProps) {
  let isHorizontal = true
  if (horizontal !== undefined) {
    isHorizontal = horizontal
  }

  function displayValue(val: number): string {
    if (formatValue !== undefined) {
      return formatValue(val)
    }
    return val.toLocaleString('vi-VN')
  }

  let chartHeight = 220
  if (height !== undefined && height > 0) {
    chartHeight = height
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-zinc-400 dark:border-white/10 dark:text-zinc-500"
        style={{ height: chartHeight }}
      >
        Không có dữ liệu
      </div>
    )
  }

  let maxValue = 0
  for (const item of data) {
    if (item.value > maxValue) {
      maxValue = item.value
    }
  }
  const ceiling = niceCeiling(maxValue)

  // HORIZONTAL MODE (Best for Top Products, Payment methods, Rankings)
  if (isHorizontal) {
    return (
      <div className="flex flex-col gap-3.5">
        {data.map((item, index) => {
          let barPercent = 0
          if (ceiling > 0) {
            barPercent = Math.min(100, (item.value / ceiling) * 100)
          }

          let barColor = '#6366f1'
          if (item.color !== undefined && item.color !== '') {
            barColor = item.color
          }

          let rankBadgeClass = 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200'
          if (index === 0) {
            rankBadgeClass = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
          }
          if (index === 1) {
            rankBadgeClass = 'bg-slate-400/15 text-slate-600 dark:text-slate-300 font-bold'
          }
          if (index === 2) {
            rankBadgeClass = 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold'
          }

          return (
            <div key={item.label + index} className="group flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  {item.rank !== undefined && (
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${rankBadgeClass}`}
                    >
                      {item.rank}
                    </span>
                  )}
                  <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                    {item.label}
                  </span>
                  {item.subLabel !== undefined && item.subLabel !== '' && (
                    <span className="shrink-0 text-zinc-400 dark:text-zinc-500">
                      ({item.subLabel})
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-semibold text-zinc-900 tabular-nums dark:text-white">
                  {displayValue(item.value)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barPercent}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // VERTICAL MODE
  return (
    <div className="relative flex items-end gap-3 pt-6 pb-6" style={{ height: chartHeight }}>
      {data.map((item, index) => {
        let heightPercent = 0
        if (ceiling > 0) {
          heightPercent = (item.value / ceiling) * 100
        }

        let barColor = '#6366f1'
        if (item.color !== undefined && item.color !== '') {
          barColor = item.color
        }

        return (
          <div key={item.label + index} className="group relative flex flex-1 flex-col items-center h-full justify-end">
            {/* Tooltip on hover */}
            <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-800 whitespace-nowrap shadow-lg">
              {displayValue(item.value)}
            </div>

            <div
              className="w-full max-w-[36px] rounded-t-xl transition-all duration-300 group-hover:brightness-110"
              style={{
                height: `${heightPercent}%`,
                backgroundColor: barColor,
              }}
            />

            <span className="mt-2 truncate text-[11px] text-zinc-500 dark:text-zinc-400 w-full text-center">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
