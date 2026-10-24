export interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  label: string
  subLabel?: string
  color?: string
  formatDisplay?: (val: number) => string
}

export function CircularProgress({
  value,
  max,
  size,
  strokeWidth,
  label,
  subLabel,
  color,
  formatDisplay,
}: CircularProgressProps) {
  let gaugeSize = 90
  if (size !== undefined && size > 0) {
    gaugeSize = size
  }

  let stroke = 8
  if (strokeWidth !== undefined && strokeWidth > 0) {
    stroke = strokeWidth
  }

  let maxValue = 1
  if (max !== undefined && max > 0) {
    maxValue = max
  }

  let strokeColor = '#10b981' // emerald-500
  if (color !== undefined && color !== '') {
    strokeColor = color
  }

  const radius = (gaugeSize - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const center = gaugeSize / 2

  let ratio = 0
  if (maxValue > 0) {
    ratio = Math.min(1, Math.max(0, value / maxValue))
  }
  const strokeDashoffset = circumference * (1 - ratio)

  function displayValue(): string {
    if (formatDisplay !== undefined) {
      return formatDisplay(value)
    }
    if (maxValue === 1) {
      return `${Math.round(value * 100)}%`
    }
    return value.toLocaleString('vi-VN')
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: gaugeSize, height: gaugeSize }}>
        <svg width={gaugeSize} height={gaugeSize} className="-rotate-90 transform">
          {/* Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-zinc-100 dark:text-white/5"
          />

          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
            {displayValue()}
          </span>
        </div>
      </div>

      <span className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      {subLabel !== undefined && subLabel !== '' && (
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{subLabel}</span>
      )}
    </div>
  )
}
