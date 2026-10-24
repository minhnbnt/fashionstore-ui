import { useState } from 'react'

import { niceCeiling } from '@/lib/adminStats'

export interface LineChartPoint {
  label: string
  value: number
}

export interface LineChartProps {
  data: LineChartPoint[]
  comparisonData?: LineChartPoint[]
  currentLabel?: string
  comparisonLabel?: string
  height?: number
  color?: string
  comparisonColor?: string
  formatValue?: (val: number) => string
}

const VIEW_WIDTH = 640
const VIEW_HEIGHT = 220
const PAD_LEFT = 60
const PAD_RIGHT = 24
const PAD_TOP = 24
const PAD_BOTTOM = 36

export function LineChart({
  data,
  comparisonData,
  currentLabel,
  comparisonLabel,
  height,
  color,
  comparisonColor,
  formatValue,
}: LineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  let strokeColor = '#6366f1'
  if (color !== undefined && color !== '') {
    strokeColor = color
  }

  let compColor = '#94a3b8'
  if (comparisonColor !== undefined && comparisonColor !== '') {
    compColor = comparisonColor
  }

  let chartHeight = 220
  if (height !== undefined && height > 0) {
    chartHeight = height
  }

  function displayValue(val: number): string {
    if (formatValue !== undefined) {
      return formatValue(val)
    }
    return val.toLocaleString('vi-VN')
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-zinc-400 dark:border-white/10 dark:text-zinc-500"
        style={{ height: chartHeight }}
      >
        Không có dữ liệu biểu đồ
      </div>
    )
  }

  let maxValue = 0
  for (const point of data) {
    if (point.value > maxValue) {
      maxValue = point.value
    }
  }
  if (comparisonData !== undefined) {
    for (const point of comparisonData) {
      if (point.value > maxValue) {
        maxValue = point.value
      }
    }
  }

  const ceiling = niceCeiling(maxValue)
  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT
  const plotHeight = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM

  function getX(index: number, total: number): number {
    if (total <= 1) {
      return PAD_LEFT + plotWidth / 2
    }
    return PAD_LEFT + (index / (total - 1)) * plotWidth
  }

  function getY(value: number): number {
    if (ceiling === 0) {
      return PAD_TOP + plotHeight
    }
    const ratio = value / ceiling
    return PAD_TOP + (1 - ratio) * plotHeight
  }

  const currentPoints = data.map((pt, i) => ({
    x: getX(i, data.length),
    y: getY(pt.value),
    pt,
  }))

  const polylineStr = currentPoints.map((p) => `${p.x},${p.y}`).join(' ')

  let polygonStr = ''
  if (currentPoints.length > 0) {
    const firstX = currentPoints[0]?.x ?? PAD_LEFT
    const lastX = currentPoints[currentPoints.length - 1]?.x ?? PAD_LEFT + plotWidth
    const bottomY = PAD_TOP + plotHeight
    polygonStr = `${firstX},${bottomY} ${polylineStr} ${lastX},${bottomY}`
  }

  let compPolylineStr = ''
  if (comparisonData !== undefined && comparisonData.length > 0) {
    const compPoints = comparisonData.map((pt, i) => {
      const x = getX(i, comparisonData.length)
      const y = getY(pt.value)
      return `${x},${y}`
    })
    compPolylineStr = compPoints.join(' ')
  }

  const gridSteps = [ceiling, ceiling / 2, 0]
  const gradId = `line-grad-${strokeColor.replace('#', '')}`

  return (
    <div className="relative w-full" style={{ height: chartHeight }}>
      {(currentLabel !== undefined || comparisonLabel !== undefined) && (
        <div className="mb-2 flex items-center gap-4 text-xs">
          {currentLabel !== undefined && (
            <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-200">
              <span
                className="inline-block h-2 w-4 rounded-full"
                style={{ backgroundColor: strokeColor }}
              />
              <span>{currentLabel}</span>
            </div>
          )}
          {comparisonLabel !== undefined && (
            <div className="flex items-center gap-1.5 font-medium text-zinc-500 dark:text-zinc-400">
              <span
                className="inline-block h-0.5 w-4 border-b-2 border-dashed"
                style={{ borderColor: compColor }}
              />
              <span>{comparisonLabel}</span>
            </div>
          )}
        </div>
      )}

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-full w-full overflow-visible select-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Grid lines and labels */}
        {gridSteps.map((val) => {
          const y = getY(val)
          return (
            <g key={val}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={VIEW_WIDTH - PAD_RIGHT}
                y2={y}
                stroke="currentColor"
                strokeDasharray="3 3"
                className="text-zinc-200 dark:text-white/10"
              />
              <text
                x={PAD_LEFT - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-zinc-400 text-[10px] tabular-nums dark:fill-zinc-500"
              >
                {displayValue(val)}
              </text>
            </g>
          )
        })}

        {/* Gradient fill area */}
        {polygonStr !== '' && <polygon points={polygonStr} fill={`url(#${gradId})`} />}

        {/* Comparison polyline */}
        {compPolylineStr !== '' && (
          <polyline
            points={compPolylineStr}
            fill="none"
            stroke={compColor}
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Main polyline */}
        <polyline
          points={polylineStr}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points & X labels */}
        {currentPoints.map((pt, i) => {
          const isHovered = hoverIndex === i
          let circleRadius = 4
          let circleStrokeWidth = 2
          if (isHovered) {
            circleRadius = 6
            circleStrokeWidth = 3
          }
          const showLabel =
            data.length <= 14 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1
          return (
            <g
              key={pt.pt.label + i}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={circleRadius}
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth={circleStrokeWidth}
                className="transition-all duration-150"
              />
              <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

              {showLabel && (
                <text
                  x={pt.x}
                  y={VIEW_HEIGHT - 10}
                  textAnchor="middle"
                  className="fill-zinc-400 text-[10px] tabular-nums dark:fill-zinc-500"
                >
                  {pt.pt.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Floating tooltip */}
      {hoverIndex !== null && currentPoints[hoverIndex] !== undefined && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-zinc-900/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-md dark:bg-zinc-800/95"
          style={{
            left: `${(currentPoints[hoverIndex].x / VIEW_WIDTH) * 100}%`,
            top: `${(currentPoints[hoverIndex].y / VIEW_HEIGHT) * 100 - 8}%`,
          }}
        >
          <div className="font-semibold">{currentPoints[hoverIndex].pt.label}</div>
          <div className="text-zinc-200">{displayValue(currentPoints[hoverIndex].pt.value)}</div>
          {comparisonData !== undefined && comparisonData[hoverIndex] !== undefined && (
            <div className="text-[11px] text-zinc-400">
              Kỳ trước: {displayValue(comparisonData[hoverIndex].value)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
