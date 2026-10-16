import { describe, expect, it } from 'vitest'

import {
  breakdownRows,
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
