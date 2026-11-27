import { describe, expect, it } from 'vite-plus/test'

import {
  breakdownRows,
  formatDuration,
  formatPercent,
  percentChange,
  periodWindow,
  safeRatio,
  formatCompactVnd,
  formatDayLabel,
  niceCeiling,
  trendPoints,
} from './adminStats'

import type { AdminStatsResponse } from '@generated/model/adminStatsResponse'

const STATS: AdminStatsResponse = {
  totalUsers: 10,
  lockedUsers: 1,
  customerUsers: 6,
  sellerUsers: 3,
  adminUsers: 1,
  totalShops: 8,
  pendingShops: 2,
  approvedShops: 5,
  suspendedShops: 1,
  rejectedShops: 0,
  totalOrders: 17,
  pendingOrders: 4,
  confirmedOrders: 3,
  shippingOrders: 2,
  deliveredOrders: 7,
  cancelledOrders: 1,
  grossMerchandiseValue: 1_600_000,
  collectedRevenue: 700_000,
  dailyTrend: [
    { date: '2026-10-15', newUsers: 1, newShops: 0, orders: 3, orderValue: 450_000 },
    { date: '2026-10-16', newUsers: 2, newShops: 1 },
  ],
}

describe('breakdownRows', () => {
  it('tinh ti le theo tong, giu thu tu khai bao', () => {
    const rows = breakdownRows([
      { label: 'A', value: 3 },
      { label: 'B', value: 1 },
    ])
    expect(rows.map((row) => row.share)).toEqual([0.75, 0.25])
    expect(rows[0].label).toBe('A')
  })

  it('tong bang 0 thi ti le bang 0, khong NaN', () => {
    const rows = breakdownRows([{ label: 'A', value: 0 }])
    expect(rows[0].share).toBe(0)
  })
})

describe('trendPoints', () => {
  it('lay dung chi so, field thieu tinh la 0', () => {
    expect(trendPoints(STATS, 'orders').map((point) => point.value)).toEqual([3, 0])
    expect(trendPoints(STATS, 'newShops').map((point) => point.value)).toEqual([0, 1])
  })

  it('stats chua co thi tra mang rong', () => {
    expect(trendPoints(undefined, 'orders')).toEqual([])
  })
})

describe('niceCeiling', () => {
  it('lam tron len moc de doc', () => {
    expect(niceCeiling(0)).toBe(1)
    expect(niceCeiling(3)).toBe(4)
    expect(niceCeiling(7)).toBe(8)
    expect(niceCeiling(13)).toBe(20)
    expect(niceCeiling(450_000)).toBe(500_000)
  })
})

describe('formatCompactVnd', () => {
  it('rut gon trieu / nghin', () => {
    expect(formatCompactVnd(0)).toBe('0 ₫')
    expect(formatCompactVnd(450_000)).toBe('450k ₫')
    expect(formatCompactVnd(1_600_000)).toBe('1,6tr ₫')
    expect(formatCompactVnd(2_500_000_000)).toBe('2,5 tỷ ₫')
  })
})

describe('formatDayLabel', () => {
  it('dinh dang ngay/thang, khong lech mui gio', () => {
    expect(formatDayLabel('2026-10-06')).toBe('06/10')
  })
})

function trendOf(values: number[]): AdminStatsResponse {
  return {
    dailyTrend: values.map(function (value, idx) {
      const day = String(idx + 1).padStart(2, '0')
      return {
        date: `2026-10-${day}`,
        orders: value,
        orderValue: value * 1000,
        newUsers: 0,
        newShops: 0,
      }
    }),
  }
}

describe('periodWindow', () => {
  it('lay N ngay cuoi lam ky nay va N ngay lien truoc lam ky truoc', () => {
    const stats = trendOf([1, 2, 3, 4, 5, 6])
    const win = periodWindow(stats, 'orders', 3)

    expect(win.current.map((p) => p.value)).toEqual([4, 5, 6])
    expect(win.previous.map((p) => p.value)).toEqual([1, 2, 3])
    expect(win.currentTotal).toBe(15)
    expect(win.previousTotal).toBe(6)
    expect(win.change).toBeCloseTo(1.5)
  })

  it('thieu du lieu ky truoc thi ky truoc ngan hon, change null khi ky truoc bang 0', () => {
    const stats = trendOf([0, 2, 3])
    const win = periodWindow(stats, 'orders', 2)

    expect(win.current.map((p) => p.value)).toEqual([2, 3])
    expect(win.previous.map((p) => p.value)).toEqual([0])
    expect(win.change).toBeNull()
  })

  it('stats undefined thi rong', () => {
    const win = periodWindow(undefined, 'orderValue', 7)

    expect(win.current).toEqual([])
    expect(win.previous).toEqual([])
    expect(win.currentTotal).toBe(0)
    expect(win.change).toBeNull()
  })
})

describe('percentChange', () => {
  it('tinh ti le thay doi so voi ky truoc', () => {
    expect(percentChange(120, 100)).toBeCloseTo(0.2)
    expect(percentChange(50, 100)).toBeCloseTo(-0.5)
  })

  it('ky truoc 0 thi khong so sanh duoc', () => {
    expect(percentChange(10, 0)).toBeNull()
    expect(percentChange(0, 0)).toBeNull()
  })
})

describe('formatPercent', () => {
  it('lam tron 1 chu so thap phan theo vi-VN', () => {
    expect(formatPercent(0.1234)).toBe('12,3%')
    expect(formatPercent(1)).toBe('100%')
    expect(formatPercent(0)).toBe('0%')
  })
})

describe('formatDuration', () => {
  it('duoi 1 gio hien phut, duoi 48 gio hien gio, con lai hien ngay', () => {
    expect(formatDuration(0.5)).toBe('30 phút')
    expect(formatDuration(0.001)).toBe('Dưới 1 phút')
    expect(formatDuration(5.25)).toBe('5,3 giờ')
    expect(formatDuration(72)).toBe('3 ngày')
  })

  it('0 thi chua co du lieu', () => {
    expect(formatDuration(0)).toBe('Chưa có')
  })
})

describe('safeRatio', () => {
  it('mau 0 thi tra 0 thay vi NaN', () => {
    expect(safeRatio(3, 4)).toBeCloseTo(0.75)
    expect(safeRatio(3, 0)).toBe(0)
  })
})
