export interface DonutChartItem {
  label: string
  value: number
  color: string
}

export interface DonutChartProps {
  data: DonutChartItem[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
  formatValue?: (val: number) => string
}

export function DonutChart({
  data,
  size,
  thickness,
  centerLabel,
  centerValue,
  formatValue,
}: DonutChartProps) {
  let chartSize = 180
  if (size !== undefined && size > 0) {
    chartSize = size
  }

  let strokeWidth = 22
  if (thickness !== undefined && thickness > 0) {
    strokeWidth = thickness
  }

  function displayValue(val: number): string {
    if (formatValue !== undefined) {
      return formatValue(val)
    }
    return val.toLocaleString('vi-VN')
  }

  let total = 0
  for (const item of data) {
    total += item.value
  }

  const radius = (chartSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = chartSize / 2

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
        <div
          className="flex items-center justify-center rounded-full border-4 border-dashed border-zinc-200 dark:border-white/10"
          style={{ width: chartSize, height: chartSize }}
        >
          Trống
        </div>
        <p className="mt-3 text-xs">Chưa có dữ liệu phân loại</p>
      </div>
    )
  }

  const segments: Array<{
    item: DonutChartItem
    percentage: number
    strokeDasharray: string
    strokeDashoffset: number
  }> = []

  let cumulativeFraction = 0
  for (const item of data) {
    const fraction = item.value / total
    const strokeDasharray = `${fraction * circumference} ${circumference}`
    const strokeDashoffset = -cumulativeFraction * circumference
    cumulativeFraction += fraction
    const percentage = Math.round(fraction * 100 * 10) / 10

    segments.push({
      item,
      percentage,
      strokeDasharray,
      strokeDashoffset,
    })
  }

  let finalCenterValue = displayValue(total)
  if (centerValue !== undefined && centerValue !== '') {
    finalCenterValue = centerValue
  }

  let finalCenterLabel = 'Tổng cộng'
  if (centerLabel !== undefined && centerLabel !== '') {
    finalCenterLabel = centerLabel
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-around">
      {/* SVG Donut */}
      <div className="relative shrink-0" style={{ width: chartSize, height: chartSize }}>
        <svg
          width={chartSize}
          height={chartSize}
          className="-rotate-90 transform"
        >
          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-100 dark:text-white/5"
          />

          {/* Slices */}
          {segments.map((seg, i) => (
            <circle
              key={seg.item.label + i}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={seg.item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="butt"
              className="transition-all duration-500"
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            {finalCenterLabel}
          </span>
          <span className="max-w-[110px] truncate px-1 text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
            {finalCenterValue}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="flex flex-1 flex-col gap-2.5">
        {segments.map((seg, i) => (
          <div key={seg.item.label + i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden pr-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.item.color }}
              />
              <span className="truncate text-zinc-600 dark:text-zinc-300">
                {seg.item.label}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-zinc-900 tabular-nums dark:text-white">
                {displayValue(seg.item.value)}
              </span>
              <span className="w-10 text-right text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500">
                {seg.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
