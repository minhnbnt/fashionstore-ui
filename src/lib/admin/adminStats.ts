import type { BreakdownInput, BreakdownRow, TrendMetric, TrendPoint } from '@/types/admin'
import type { AdminStatsResponse } from '@generated/model/adminStatsResponse'

export function breakdownRows(items: BreakdownInput[]): BreakdownRow[] {
  let total = 0
  for (const item of items) {
    total += item.value
  }
  return items.map(function (item) {
    if (total === 0) {
      return { ...item, share: 0 }
    }
    return { ...item, share: item.value / total }
  })
}

export function trendPoints(
  stats: AdminStatsResponse | undefined,
  metric: TrendMetric,
): TrendPoint[] {
  if (stats === undefined) {
    return []
  }
  const days = stats.dailyTrend ?? []
  return days.map(function (day) {
    return { date: day.date ?? '', value: day[metric] ?? 0 }
  })
}

/** Làm tròn lên mốc 1/2/4/5/8/10 × 10^n để trục y dễ đọc. */
export function niceCeiling(max: number): number {
  if (max <= 0) {
    return 1
  }
  const magnitude = 10 ** Math.floor(Math.log10(max))
  for (const step of [1, 2, 4, 5, 8, 10]) {
    if (step * magnitude >= max) {
      return step * magnitude
    }
  }
  return 10 * magnitude
}

function trimDecimal(n: number): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
}

export function formatCompactVnd(n: number): string {
  if (n >= 1_000_000_000) {
    return `${trimDecimal(n / 1_000_000_000)} tỷ ₫`
  }
  if (n >= 1_000_000) {
    return `${trimDecimal(n / 1_000_000)}tr ₫`
  }
  if (n >= 1_000) {
    return `${trimDecimal(n / 1_000)}k ₫`
  }
  return `${n} ₫`
}

/** "2026-10-06" → "06/10". Cắt chuỗi, không qua Date để khỏi lệch múi giờ. */
export function formatDayLabel(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) {
    return isoDate
  }
  return `${parts[2]}/${parts[1]}`
}

export interface PeriodWindow {
  current: TrendPoint[]
  previous: TrendPoint[]
  currentTotal: number
  previousTotal: number
  /** (kỳ này - kỳ trước) / kỳ trước; null khi kỳ trước bằng 0 nên không so được. */
  change: number | null
}

function sumPoints(points: TrendPoint[]): number {
  let total = 0
  for (const point of points) {
    total += point.value
  }
  return total
}

/**
 * Tách chuỗi ngày thành kỳ này (N ngày cuối, tính cả hôm nay) và kỳ trước (N ngày liền trước).
 * Backend trả 60 ngày nên N tối đa 30 vẫn đủ kỳ so sánh.
 */
export function periodWindow(
  stats: AdminStatsResponse | undefined,
  metric: TrendMetric,
  days: number,
): PeriodWindow {
  const all = trendPoints(stats, metric)
  const current = all.slice(Math.max(0, all.length - days))
  const previousEnd = all.length - current.length
  const previous = all.slice(Math.max(0, previousEnd - days), previousEnd)
  const currentTotal = sumPoints(current)
  const previousTotal = sumPoints(previous)

  return {
    current,
    previous,
    currentTotal,
    previousTotal,
    change: percentChange(currentTotal, previousTotal),
  }
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null
  }
  return (current - previous) / previous
}

export function safeRatio(part: number, whole: number): number {
  if (whole === 0) {
    return 0
  }
  return part / whole
}

/** 0.1234 → "12,3%". */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
}

/** Giờ → chữ dễ đọc: phút khi dưới 1 giờ, giờ khi dưới 2 ngày, còn lại là ngày. */
export function formatDuration(hours: number): string {
  if (hours <= 0) {
    return 'Chưa có'
  }
  if (hours * 60 < 1) {
    return 'Dưới 1 phút'
  }
  if (hours < 1) {
    return `${Math.round(hours * 60)} phút`
  }
  if (hours < 48) {
    return `${trimDecimal(hours)} giờ`
  }
  return `${trimDecimal(hours / 24)} ngày`
}
