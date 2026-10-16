import { formatDayLabel, niceCeiling } from '@/lib/adminStats'

import type { TrendPoint } from '@/lib/adminStats'

interface Props {
  title: string
  points: TrendPoint[]
  formatValue: (value: number) => string
}

const CHART_HEIGHT = 200

/**
 * Cột theo ngày, 1 series, 1 trục. Hover/focus từng cột hiện tooltip (CSS group-hover, không cần state).
 * Bảng sr-only bên dưới là bản đọc được cho trình đọc màn hình.
 */
export default function TrendChart({ title, points, formatValue }: Props) {
  let max = 0
  for (const point of points) {
    if (point.value > max) {
      max = point.value
    }
  }
  const ceiling = niceCeiling(max)
  const gridValues = [ceiling, ceiling / 2, 0]

  return (
    <figure>
      <div className="flex gap-2">
        <div
          className="relative w-14 shrink-0 text-right text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500"
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
                className="absolute inset-x-0 border-t border-zinc-200 dark:border-white/10"
                style={{ top: `${(index / (gridValues.length - 1)) * 100}%` }}
              />
            )
          })}

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {points.map(function (point, index) {
              const height = (point.value / ceiling) * 100
              let tooltipSide = 'left-0'
              if (index >= points.length - 3) {
                tooltipSide = 'right-0'
              }
              return (
                <button
                  key={point.date}
                  type="button"
                  aria-label={`${formatDayLabel(point.date)}: ${formatValue(point.value)}`}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-t outline-none focus-visible:bg-indigo-500/10"
                >
                  {point.value > 0 && (
                    <span
                      className="block w-full max-w-7 rounded-t bg-indigo-500 transition-colors group-hover:bg-indigo-700 group-focus-visible:bg-indigo-700 dark:bg-indigo-400 dark:group-hover:bg-indigo-300"
                      style={{ height: `${height}%`, minHeight: 2 }}
                    />
                  )}
                  <span
                    role="tooltip"
                    className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden rounded-2xl bg-zinc-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg group-hover:block group-focus-visible:block dark:bg-white dark:text-zinc-900 ${tooltipSide}`}
                  >
                    <span className="block text-zinc-300 dark:text-zinc-500">
                      {formatDayLabel(point.date)}
                    </span>
                    <span className="block font-bold tabular-nums">{formatValue(point.value)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="mt-2 ml-16 flex gap-[2px] text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500"
        aria-hidden="true"
      >
        {points.map(function (point, index) {
          const showOnMobile = index % 2 === points.length % 2 || index === points.length - 1
          return (
            <span key={point.date} className="flex-1 text-center">
              {showOnMobile && <span>{formatDayLabel(point.date)}</span>}
              {showOnMobile === false && (
                <span className="hidden md:inline">{formatDayLabel(point.date)}</span>
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
