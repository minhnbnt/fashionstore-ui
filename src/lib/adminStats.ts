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
