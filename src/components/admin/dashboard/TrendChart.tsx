import { useState } from 'react'

import { ChartBar } from '@phosphor-icons/react'

import { formatDayLabel, niceCeiling } from '@/lib/admin/adminStats'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { TrendPoint } from '@/types/admin'

interface Props {
  title: string
  points: TrendPoint[]
  formatValue: (value: number) => string
}

const CHART_HEIGHT = 200

/**
 * Cột theo ngày, 1 series, 1 trục. Hover/focus/click từng cột hiện tooltip (hỗ trợ cả cảm ứng).
 * Bảng sr-only bên dưới là bản đọc được cho trình đọc màn hình.
 */
export default function TrendChart({ title, points, formatValue }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  let max = 0
  for (const point of points) {
    if (point.value > max) {
      max = point.value
    }
  }

  if (points.length === 0 || max === 0) {
    return (
      <div className="flex h-[228px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 text-center dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
          <ChartBar size={22} weight="bold" />
        </div>
        <p className="mt-3 text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
          Chưa có phát sinh trong 14 ngày gần nhất
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Biểu đồ sẽ tự cập nhật ngay khi có dữ liệu mới cho chỉ số này.
        </p>
      </div>
    )
  }

  const ceiling = niceCeiling(max)
  const gridValues = [ceiling, ceiling / 2, 0]

  function handleTogglePoint(date: string) {
    setSelectedDate(function (prev) {
      if (prev === date) {
        return null
      }
      return date
    })
  }

  return (
    <figure>
      <div className="flex gap-2">
        <div
          className="relative w-14 shrink-0 text-right text-[11px] font-medium text-zinc-500 tabular-nums dark:text-zinc-400"
          style={{ height: CHART_HEIGHT }}
          aria-hidden="true"
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

        <div className="relative flex-1" style={{ height: CHART_HEIGHT }}>
          {gridValues.map(function (value, index) {
            return (
              <div
                key={value}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-zinc-200/90 dark:border-white/10"
                style={{ top: `${(index / (gridValues.length - 1)) * 100}%` }}
              />
            )
          })}

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {points.map(function (point, index) {
              const height = (point.value / ceiling) * 100
              const isSelected = selectedDate === point.date
              let tooltipSide = 'left-0'
              if (index >= points.length - 3) {
                tooltipSide = 'right-0'
              }
              let tooltipVisibility = 'hidden group-hover:block group-focus-visible:block'
              if (isSelected) {
                tooltipVisibility = 'block'
              }
              let buttonBgClass = ''
              if (isSelected) {
                buttonBgClass = 'bg-blue-500/10 dark:bg-sky-400/10'
              }
              return (
                <button
                  key={point.date}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${formatDayLabel(point.date)}: ${formatValue(point.value)}`}
                  onClick={function () {
                    handleTogglePoint(point.date)
                  }}
                  onBlur={function () {
                    if (isSelected) {
                      setSelectedDate(null)
                    }
                  }}
                  className={cn(
                    'group relative flex h-full flex-1 cursor-pointer items-end justify-center rounded-t-2xl transition-colors focus-visible:bg-blue-500/10 dark:focus-visible:bg-sky-400/10',
                    FOCUS_RING_CLASS,
                    buttonBgClass,
                  )}
                >
                  {point.value > 0 && (
                    <span
                      className="block w-full max-w-7 rounded-t-full bg-gradient-to-t from-[#312e81] via-[#1d4ed8] to-[#38bdf8] opacity-90 shadow-xs transition duration-150 group-hover:opacity-100 group-hover:brightness-110 group-focus-visible:opacity-100 group-focus-visible:brightness-110"
                      style={{ height: `${height}%`, minHeight: 4 }}
                    />
                  )}
                  <span
                    role="tooltip"
                    className={cn(
                      'pointer-events-none absolute bottom-full z-10 mb-2 rounded-2xl border border-white/15 bg-[#17203a] px-3 py-2 text-xs whitespace-nowrap text-white shadow-xl dark:bg-[#0a0f1e] dark:text-[#e2e8f0]',
                      tooltipVisibility,
                      tooltipSide,
                    )}
                  >
                    <span className="block text-zinc-300 dark:text-zinc-400">
                      {formatDayLabel(point.date)}
                    </span>
                    <span className="block font-extrabold tabular-nums">
                      {formatValue(point.value)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="mt-2 ml-16 flex gap-[2px] text-[11px] font-medium text-zinc-500 tabular-nums dark:text-zinc-400"
        aria-hidden="true"
      >
        {points.map(function (point, index) {
          const showOnNarrow = index % 2 === 0 || index === points.length - 1
          return (
            <span key={point.date} className="flex-1 text-center">
              {showOnNarrow && <span>{formatDayLabel(point.date)}</span>}
              {showOnNarrow === false && (
                <span className="hidden xl:inline">{formatDayLabel(point.date)}</span>
              )}
            </span>
          )
        })}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Ngày</th>
            <th scope="col">Giá trị</th>
          </tr>
        </thead>
        <tbody>
          {points.map(function (point) {
            return (
              <tr key={point.date}>
                <td>{formatDayLabel(point.date)}</td>
                <td>{formatValue(point.value)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </figure>
  )
}
