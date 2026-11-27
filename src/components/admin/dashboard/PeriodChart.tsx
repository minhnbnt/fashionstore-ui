import { useState } from 'react'

import { ChartBar } from '@phosphor-icons/react'

import { formatDayLabel, formatPercent, niceCeiling, percentChange } from '@/lib/admin/adminStats'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { TrendPoint } from '@/types/admin'

interface Props {
  title: string
  current: TrendPoint[]
  previous: TrendPoint[]
  formatValue: (value: number) => string
}

const CHART_HEIGHT = 240

/** Chỉ hiện nhãn ngày đủ thưa để không chồng chữ: 7 ngày hiện hết, 30 ngày cách 5. */
function labelEvery(count: number): number {
  if (count <= 7) {
    return 1
  }
  if (count <= 14) {
    return 2
  }
  return 5
}

function deltaText(current: number, previous: number | undefined): string {
  if (previous === undefined) {
    return ''
  }
  const change = percentChange(current, previous)
  if (change === null) {
    return ''
  }
  if (change > 0) {
    return `+${formatPercent(change)}`
  }
  if (change < 0) {
    return `−${formatPercent(Math.abs(change))}`
  }
  return 'Không đổi'
}

/**
 * Một trục, hai lớp: cột là kỳ đang xem, đường nét đứt là ngày tương ứng của kỳ liền trước.
 * Hover/focus/chạm vào cột để xem số của cả hai kỳ. Bảng sr-only là bản đọc cho trình đọc màn hình.
 */
export default function PeriodChart({ title, current, previous, formatValue }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  let max = 0
  for (const point of current) {
    max = Math.max(max, point.value)
  }
  for (const point of previous) {
    max = Math.max(max, point.value)
  }

  if (current.length === 0 || max === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 text-center dark:border-white/10 dark:bg-white/[0.03]"
        style={{ height: CHART_HEIGHT }}
      >
        <ChartBar size={24} weight="bold" className="text-zinc-400" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
          Chưa có phát sinh trong kỳ này
        </p>
        <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
          Chọn kỳ dài hơn hoặc chỉ số khác ở dải phía trên.
        </p>
      </div>
    )
  }

  const ceiling = niceCeiling(max)
  const gridValues = [ceiling, ceiling / 2, 0]
  const count = current.length
  const every = labelEvery(count)

  // Kỳ trước có thể ngắn hơn kỳ này khi dữ liệu chưa đủ 60 ngày: canh phải để ngày cuối khớp ngày cuối.
  const offset = count - previous.length
  const previousPoints: string[] = []
  previous.forEach(function (point, idx) {
    const slot = idx + offset
    const left = (slot / count) * 100
    const right = ((slot + 1) / count) * 100
    const y = 100 - (point.value / ceiling) * 100
    previousPoints.push(`${left.toFixed(3)},${y.toFixed(3)}`)
    previousPoints.push(`${right.toFixed(3)},${y.toFixed(3)}`)
  })

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-[3px] bg-blue-700 dark:bg-blue-500"
          />
          Kỳ này
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" width="16" height="4" className="overflow-visible">
            <line
              x1="0"
              y1="2"
              x2="16"
              y2="2"
              strokeWidth="2"
              strokeDasharray="3 3"
              className="stroke-slate-500 dark:stroke-slate-400"
            />
          </svg>
          {count} ngày liền trước
        </span>
      </div>

      <div className="flex gap-2">
        <div
          aria-hidden="true"
          className="relative w-14 shrink-0 text-right text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400"
          style={{ height: CHART_HEIGHT }}
        >
          {gridValues.map(function (value, index) {
            return (
              <span
                key={value}
                className="absolute right-0 -translate-y-1/2"
                style={{ top: `${(index / (gridValues.length - 1)) * 100}%` }}
              >
                {formatValue(value)}
              </span>
            )
          })}
        </div>

        <div className="relative min-w-0 flex-1" style={{ height: CHART_HEIGHT }}>
          {gridValues.map(function (value, index) {
            let lineClass = 'border-zinc-200/80 dark:border-white/[0.07]'
            if (value === 0) {
              lineClass = 'border-zinc-300 dark:border-white/20'
            }
            return (
              <div
                key={value}
                aria-hidden="true"
                className={cn('absolute inset-x-0 border-t', lineClass)}
                style={{ top: `${(index / (gridValues.length - 1)) * 100}%` }}
              />
            )
          })}

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {current.map(function (point, index) {
              const height = (point.value / ceiling) * 100
              const isActive = activeIndex === index
              const prev = previous[index - offset]
              let tooltipSide = 'left-1/2 -translate-x-1/2'
              if (index < 2) {
                tooltipSide = 'left-0'
              }
              if (index >= count - 2) {
                tooltipSide = 'right-0'
              }
              let tooltipVisibility = 'hidden group-hover:block group-focus-visible:block'
              if (isActive) {
                tooltipVisibility = 'block'
              }
              const delta = deltaText(point.value, prev?.value)
              let ariaPrev = ''
              if (prev !== undefined) {
                ariaPrev = `, cùng kỳ trước ${formatValue(prev.value)}`
              }

              return (
                <button
                  key={point.date}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`${formatDayLabel(point.date)}: ${formatValue(point.value)}${ariaPrev}`}
                  onClick={function () {
                    setActiveIndex(function (prevIndex) {
                      if (prevIndex === index) {
                        return null
                      }
                      return index
                    })
                  }}
                  onBlur={function () {
                    if (isActive) {
                      setActiveIndex(null)
                    }
                  }}
                  className={cn(
                    'group relative flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center rounded-t-md transition-colors hover:bg-blue-500/[0.06] dark:hover:bg-sky-400/[0.06]',
                    FOCUS_RING_CLASS,
                    isActive && 'bg-blue-500/[0.08] dark:bg-sky-400/[0.08]',
                  )}
                >
                  {point.value > 0 && (
                    <span
                      className="block w-full max-w-6 rounded-t-[4px] bg-blue-700 dark:bg-blue-500"
                      style={{ height: `${height}%`, minHeight: 3 }}
                    />
                  )}
                  <span
                    role="tooltip"
                    className={cn(
                      'pointer-events-none absolute bottom-full z-10 mb-2 min-w-36 rounded-2xl border border-white/15 bg-[#17203a] px-3 py-2 text-left text-xs whitespace-nowrap text-white shadow-xl dark:bg-[#0a0f1e]',
                      tooltipVisibility,
                      tooltipSide,
                    )}
                  >
                    <span className="block text-zinc-300">{formatDayLabel(point.date)}</span>
                    <span className="mt-0.5 block text-sm font-bold tabular-nums">
                      {formatValue(point.value)}
                    </span>
                    {prev !== undefined && (
                      <span className="mt-1 block text-zinc-300 tabular-nums">
                        Kỳ trước ({formatDayLabel(prev.date)}): {formatValue(prev.value)}
                        {delta !== '' && <span className="ml-1 text-white">{delta}</span>}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {previousPoints.length > 0 && (
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            >
              <polyline
                points={previousPoints.join(' ')}
                fill="none"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="stroke-slate-500 dark:stroke-slate-400"
              />
            </svg>
          )}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="mt-2 ml-16 flex gap-[2px] text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400"
      >
        {current.map(function (point, index) {
          const fromEnd = count - 1 - index
          const show = fromEnd % every === 0
          return (
            <span key={point.date} className="min-w-0 flex-1 text-center">
              {show && <span className="whitespace-nowrap">{formatDayLabel(point.date)}</span>}
            </span>
          )
        })}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Ngày</th>
            <th scope="col">Kỳ này</th>
            <th scope="col">Cùng kỳ trước</th>
          </tr>
        </thead>
        <tbody>
          {current.map(function (point, index) {
            const prev = previous[index - offset]
            let prevText = 'Không có'
            if (prev !== undefined) {
              prevText = formatValue(prev.value)
            }
            return (
              <tr key={point.date}>
                <td>{formatDayLabel(point.date)}</td>
                <td>{formatValue(point.value)}</td>
                <td>{prevText}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </figure>
  )
}
