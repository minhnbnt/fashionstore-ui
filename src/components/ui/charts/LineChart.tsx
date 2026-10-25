import { useEffect, useRef, useState } from 'react'

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

const PAD_LEFT = 65
const PAD_RIGHT = 24
const PAD_TOP = 24
const PAD_BOTTOM = 38

function formatAxisLabel(label: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const parts = label.split('-')
    const day = parts[2] ?? ''
    const month = parts[1] ?? ''
    return `${day}/${month}`
  }
  if (/^\d{4}-W\d{2}$/.test(label)) {
    const parts = label.split('-W')
    return `T${parts[1] ?? ''}`
  }
  if (/^\d{4}-\d{2}$/.test(label)) {
    const parts = label.split('-')
    return `T${parts[1] ?? ''}`
  }
  return label
}

function formatCompactAxis(val: number): string {
  if (val >= 1_000_000_000) {
    const b = val / 1_000_000_000
    let bStr = b.toFixed(1)
    if (b % 1 === 0) {
      bStr = b.toString()
    }
    return `${bStr} tỷ`
  }
  if (val >= 1_000_000) {
    const m = val / 1_000_000
    let mStr = m.toFixed(1)
    if (m % 1 === 0) {
      mStr = m.toString()
    }
    return `${mStr} tr`
  }
  if (val >= 1_000) {
    const k = Math.round(val / 1_000)
    return `${k} k`
  }
  if (val === 0) {
    return '0 ₫'
  }
  return `${val} ₫`
}

function createSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return ''
  }
  const first = points[0]
  if (points.length === 1 && first !== undefined) {
    return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`
  }
  if (first === undefined) {
    return ''
  }
  let path = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    if (p0 !== undefined && p1 !== undefined) {
      const dx = p1.x - p0.x
      const cp1x = p0.x + dx * 0.4
      const cp1y = p0.y
      const cp2x = p0.x + dx * 0.6
      const cp2y = p1.y
      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
    }
  }
  return path
}

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
  const containerRef = useRef<HTMLDivElement | null>(null)

  let strokeColor = '#6366f1'
  if (color !== undefined && color !== '') {
    strokeColor = color
  }

  let compColor = '#94a3b8'
  if (comparisonColor !== undefined && comparisonColor !== '') {
    compColor = comparisonColor
  }

  let chartHeight = 240
  if (height !== undefined && height > 0) {
    chartHeight = height
  }

  let initialH = 200
  if (chartHeight > 40) {
    initialH = chartHeight - 40
  }

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 700,
    height: initialH,
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) {
      return
    }

    function updateSize() {
      if (el) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          })
        }
      }
    }

    updateSize()

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width > 0 && height > 0) {
            setDimensions({
              width: Math.round(width),
              height: Math.round(height),
            })
          }
        }
      })
      ro.observe(el)
      return () => {
        ro.disconnect()
      }
    }

    window.addEventListener('resize', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  function displayValue(val: number): string {
    if (formatValue !== undefined) {
      return formatValue(val)
    }
    return val.toLocaleString('vi-VN') + ' ₫'
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

  const viewWidth = Math.max(300, dimensions.width)
  const viewHeight = Math.max(120, dimensions.height)
  const plotWidth = Math.max(10, viewWidth - PAD_LEFT - PAD_RIGHT)
  const plotHeight = Math.max(10, viewHeight - PAD_TOP - PAD_BOTTOM)

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
    const ratio = Math.max(0, Math.min(1, value / ceiling))
    return PAD_TOP + (1 - ratio) * plotHeight
  }

  const currentPoints = data.map((pt, i) => ({
    x: getX(i, data.length),
    y: getY(pt.value),
    pt,
  }))

  const smoothPathStr = createSmoothPath(currentPoints)

  let polygonPathStr = ''
  if (currentPoints.length > 1) {
    const first = currentPoints[0]
    const last = currentPoints[currentPoints.length - 1]
    const bottomY = PAD_TOP + plotHeight
    if (first !== undefined && last !== undefined) {
      polygonPathStr = `${smoothPathStr} L ${last.x.toFixed(1)} ${bottomY.toFixed(1)} L ${first.x.toFixed(1)} ${bottomY.toFixed(1)} Z`
    }
  }

  let compPoints: Array<{ x: number; y: number }> = []
  if (comparisonData !== undefined && comparisonData.length > 0) {
    compPoints = comparisonData.map((pt, i) => ({
      x: getX(i, comparisonData.length),
      y: getY(pt.value),
    }))
  }
  const compSmoothPathStr = createSmoothPath(compPoints)

  const gridSteps = [ceiling, Math.round(ceiling / 2), 0]
  const gradId = `line-grad-${strokeColor.replace('#', '')}`

  const hasHeader = currentLabel !== undefined || comparisonLabel !== undefined

  let tooltipNode = null
  if (hoverIndex !== null && currentPoints[hoverIndex] !== undefined) {
    const activePoint = currentPoints[hoverIndex]
    let isNearTop = false
    if (activePoint.y < 55) {
      isNearTop = true
    }

    let transformClass = '-translate-x-1/2 -translate-y-full -mt-2'
    if (isNearTop) {
      transformClass = '-translate-x-1/2 mt-3'
    }
    if (activePoint.x < 70) {
      if (isNearTop) {
        transformClass = 'translate-x-0 mt-3'
      } else {
        transformClass = 'translate-x-0 -translate-y-full -mt-2'
      }
    }
    if (activePoint.x > viewWidth - 70) {
      if (isNearTop) {
        transformClass = '-translate-x-full mt-3'
      } else {
        transformClass = '-translate-x-full -translate-y-full -mt-2'
      }
    }

    let compValueNode = null
    if (comparisonData !== undefined && comparisonData[hoverIndex] !== undefined) {
      compValueNode = (
        <div className="mt-0.5 text-[10px] text-zinc-400">
          Kỳ trước: {displayValue(comparisonData[hoverIndex].value)}
        </div>
      )
    }

    tooltipNode = (
      <div
        className={`pointer-events-none absolute z-20 rounded-2xl border border-white/20 bg-zinc-900/90 px-3.5 py-2 text-xs text-white shadow-2xl backdrop-blur-md transition-all duration-75 dark:border-white/10 dark:bg-zinc-800/95 ${transformClass}`}
        style={{
          left: `${(activePoint.x / viewWidth) * 100}%`,
          top: `${(activePoint.y / viewHeight) * 100}%`,
        }}
      >
        <div className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
          {activePoint.pt.label}
        </div>
        <div className="mt-0.5 text-sm font-black text-white">
          {displayValue(activePoint.pt.value)}
        </div>
        {compValueNode}
      </div>
    )
  }

  return (
    <div
      className="relative flex w-full flex-col overflow-hidden select-none"
      style={{ height: chartHeight }}
    >
      {hasHeader && (
        <div className="mb-2 flex shrink-0 items-center gap-4 text-xs">
          {currentLabel !== undefined && (
            <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: strokeColor }}
              />
              <span>{currentLabel}</span>
            </div>
          )}
          {comparisonLabel !== undefined && (
            <div className="flex items-center gap-1.5 font-medium text-zinc-500 dark:text-zinc-400">
              <span
                className="inline-block h-0.5 w-3.5 border-b-2 border-dashed"
                style={{ borderColor: compColor }}
              />
              <span>{comparisonLabel}</span>
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className="relative min-h-0 w-full flex-1 overflow-hidden">
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          className="block h-full w-full overflow-hidden"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
              <stop offset="60%" stopColor={strokeColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="3"
                floodColor={strokeColor}
                floodOpacity="0.3"
              />
            </filter>
          </defs>

          {/* Y Grid lines and labels */}
          {gridSteps.map((val) => {
            const y = getY(val)
            return (
              <g key={val}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={viewWidth - PAD_RIGHT}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-zinc-200/80 dark:text-white/10"
                />
                <text
                  x={PAD_LEFT - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-zinc-400 text-[11px] font-medium tabular-nums dark:fill-zinc-500"
                >
                  {formatCompactAxis(val)}
                </text>
              </g>
            )
          })}

          {/* Gradient area fill */}
          {polygonPathStr !== '' && <path d={polygonPathStr} fill={`url(#${gradId})`} />}

          {/* Comparison smooth line */}
          {compSmoothPathStr !== '' && (
            <path
              d={compSmoothPathStr}
              fill="none"
              stroke={compColor}
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Main smooth line with subtle glow */}
          {smoothPathStr !== '' && (
            <path
              d={smoothPathStr}
              fill="none"
              stroke={strokeColor}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Hover vertical crosshair */}
          {hoverIndex !== null && currentPoints[hoverIndex] !== undefined && (
            <line
              x1={currentPoints[hoverIndex].x}
              y1={PAD_TOP}
              x2={currentPoints[hoverIndex].x}
              y2={PAD_TOP + plotHeight}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeOpacity="0.6"
            />
          )}

          {/* Data points & X-axis labels */}
          {currentPoints.map((pt, i) => {
            const isHovered = hoverIndex === i
            let circleRadius = 4
            let circleStrokeWidth = 2
            if (isHovered) {
              circleRadius = 5.5
              circleStrokeWidth = 3
            }
            const showLabel =
              data.length <= 14 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1

            return (
              <g
                key={pt.pt.label + i}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle cx={pt.x} cy={pt.y} r="12" fill={strokeColor} fillOpacity="0.18" />
                )}

                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={circleRadius}
                  fill="#ffffff"
                  stroke={strokeColor}
                  strokeWidth={circleStrokeWidth}
                  className="transition-all duration-150"
                />
                <circle cx={pt.x} cy={pt.y} r="20" fill="transparent" />

                {showLabel && (
                  <text
                    x={pt.x}
                    y={viewHeight - 12}
                    textAnchor="middle"
                    className="fill-zinc-500 text-[11px] font-semibold tabular-nums dark:fill-zinc-400"
                  >
                    {formatAxisLabel(pt.pt.label)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {tooltipNode}
      </div>
    </div>
  )
}
