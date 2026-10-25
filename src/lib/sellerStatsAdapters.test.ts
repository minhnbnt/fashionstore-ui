import { describe, expect, it } from 'vitest'

import {
  alertItems,
  customerAnalyticsData,
  dashboardData,
  orderStatusSummaryData,
  performanceData,
  productAnalyticsItems,
  revenueCategoryItems,
  revenueChartPoints,
  revenuePaymentItems,
  topCustomerItems,
} from './sellerStatsAdapters'

import type { AlertResponse } from '@generated/model/alertResponse'
import type { CustomerStatsResponse } from '@generated/model/customerStatsResponse'
import type { DailyRevenueResponse } from '@generated/model/dailyRevenueResponse'
import type { OrderStatusSummaryResponse } from '@generated/model/orderStatusSummaryResponse'
import type { ProductStatsResponse } from '@generated/model/productStatsResponse'
import type { RevenueByCategoryResponse } from '@generated/model/revenueByCategoryResponse'
import type { RevenueByPaymentResponse } from '@generated/model/revenueByPaymentResponse'
import type { ShopDashboardResponse } from '@generated/model/shopDashboardResponse'
import type { ShopPerformanceResponse } from '@generated/model/shopPerformanceResponse'
import type { TopCustomerResponse } from '@generated/model/topCustomerResponse'

describe('dashboardData', () => {
  it('tinh phan tram thay doi doanh thu chinh xac khi hom qua co doanh thu', () => {
    const res: ShopDashboardResponse = {
      todayRevenue: 120000,
      todayOrders: 12,
      pendingOrders: 3,
      shopVisits: 150,
      yesterdayRevenue: 100000,
      yesterdayOrders: 10,
    }
    const data = dashboardData(res)
    expect(data.todayRevenue).toBe(120000)
    expect(data.revenueChangePercent).toBe(20)
    expect(data.ordersChangeCount).toBe(2)
  })

  it('xu ly khi hom qua doanh thu = 0 va hom nay > 0', () => {
    const res: ShopDashboardResponse = {
      todayRevenue: 50000,
      yesterdayRevenue: 0,
      todayOrders: 5,
      yesterdayOrders: 0,
    }
    const data = dashboardData(res)
    expect(data.revenueChangePercent).toBe(100)
  })

  it('tra ve default 0 khi response null hoac undefined', () => {
    const data = dashboardData(null)
    expect(data.todayRevenue).toBe(0)
    expect(data.revenueChangePercent).toBe(0)
    expect(data.ordersChangeCount).toBe(0)
  })
})

describe('performanceData', () => {
  it('clamp cac ty le giua 0 va 1, danh gia giua 0 va 5', () => {
    const res: ShopPerformanceResponse = {
      chatResponseRate: 1.2,
      cancelRate: -0.1,
      onTimeDeliveryRate: 0.95,
      avgRating: 4.8,
    }
    const data = performanceData(res)
    expect(data.chatResponseRate).toBe(1.0)
    expect(data.cancelRate).toBe(0.0)
    expect(data.onTimeDeliveryRate).toBe(0.95)
    expect(data.avgRating).toBe(4.8)
  })

  it('tra ve 0 khi response rong', () => {
    const data = performanceData(undefined)
    expect(data.chatResponseRate).toBe(0)
    expect(data.avgRating).toBe(0)
  })
})

describe('alertItems', () => {
  it('loc bo cac canh bao co count <= 0', () => {
    const alerts: AlertResponse[] = [
      { type: 'PENDING_ORDER', message: '3 đơn cần xử lý', count: 3, severity: 'WARNING' },
      { type: 'OUT_OF_STOCK', message: 'Hết hàng', count: 0, severity: 'DANGER' },
      { type: 'RETURN_REQUEST', message: '1 yêu cầu trả hàng', count: 1, severity: 'INFO' },
    ]
    const items = alertItems(alerts)
    expect(items.length).toBe(2)
    expect(items[0]?.count).toBe(3)
    expect(items[0]?.severity).toBe('WARNING')
    expect(items[1]?.count).toBe(1)
  })

  it('chuan hoa severity khong hop le thanh INFO', () => {
    const alerts: AlertResponse[] = [
      { type: 'UNKNOWN', message: 'Test', count: 2, severity: 'OTHER' },
    ]
    const items = alertItems(alerts)
    expect(items[0]?.severity).toBe('INFO')
  })
})

describe('revenueChartPoints', () => {
  it('chuyen doi DailyRevenueResponse thanh RevenueChartPoint', () => {
    const list: DailyRevenueResponse[] = [
      { date: '2026-10-24', revenue: 500000, orderCount: 5 },
      { date: '2026-10-25', revenue: 750000, orderCount: 8 },
    ]
    const points = revenueChartPoints(list)
    expect(points.length).toBe(2)
    expect(points[0]?.label).toBe('2026-10-24')
    expect(points[0]?.value).toBe(500000)
    expect(points[0]?.orders).toBe(5)
  })

  it('chuyen doi Point (RevenueDetailResponse) thanh RevenueChartPoint', () => {
    const list = [
      { label: '2026-W43', revenue: 1200000, orders: 12 },
      { label: '2026-W44', revenue: 1500000, orders: 15 },
    ]
    const points = revenueChartPoints(list)
    expect(points.length).toBe(2)
    expect(points[0]?.label).toBe('2026-W43')
    expect(points[0]?.value).toBe(1200000)
    expect(points[0]?.orders).toBe(12)
  })
})

describe('revenueCategoryItems', () => {
  it('chuyen doi RevenueByCategoryResponse danh sach va tinh percentage', () => {
    const list: RevenueByCategoryResponse[] = [
      { categoryId: 'c1', categoryName: 'Áo Nam', revenue: 600000, quantity: 6 },
      { categoryId: 'c2', categoryName: 'Quần Jeans', revenue: 400000, quantity: 4 },
    ]
    const items = revenueCategoryItems(list)
    expect(items[0]?.categoryName).toBe('Áo Nam')
    expect(items[0]?.percentage).toBe(60)
    expect(items[1]?.categoryName).toBe('Quần Jeans')
    expect(items[1]?.percentage).toBe(40)
  })
})

describe('revenuePaymentItems', () => {
  it('chuyen doi RevenueByPaymentResponse danh sach', () => {
    const list: RevenueByPaymentResponse[] = [
      { paymentMethod: 'COD', revenue: 400000, orderCount: 4 },
    ]
    const items = revenuePaymentItems(list)
    expect(items[0]?.paymentMethod).toBe('COD')
    expect(items[0]?.revenue).toBe(400000)
  })
})

describe('orderStatusSummaryData', () => {
  it('chuyen doi OrderStatusSummaryResponse thanh OrderStatusSummaryData', () => {
    const res: OrderStatusSummaryResponse = {
      completedOrders: 10,
      completedValue: 2000000,
      cancelledOrders: 1,
      cancelledValue: 200000,
      returnedOrders: 0,
      returnedValue: 0,
    }
    const data = orderStatusSummaryData(res)
    expect(data.completedOrders).toBe(10)
    expect(data.completedValue).toBe(2000000)
    expect(data.cancelledOrders).toBe(1)
  })
})

describe('productAnalyticsItems', () => {
  it('chuyen doi ProductStatsResponse danh sach', () => {
    const list: ProductStatsResponse[] = [
      {
        productId: 'p1',
        productName: 'Áo Thun Basic',
        imageKey: 'img/ao.jpg',
        totalSold: 50,
        totalRevenue: 5000000,
        viewCount: 200,
        conversionRate: 0.25,
        currentStock: 15,
      },
    ]
    const items = productAnalyticsItems(list)
    expect(items[0]?.productId).toBe('p1')
    expect(items[0]?.conversionRate).toBe(0.25)
  })
})

describe('customerAnalyticsData & topCustomerItems', () => {
  it('chuyen doi CustomerStatsResponse', () => {
    const res: CustomerStatsResponse = {
      totalCustomers: 100,
      newCustomers: 70,
      returningCustomers: 30,
      retentionRate: 0.3,
      avgOrderValue: 250000,
      totalFollowers: 500,
      followerChange: 15,
    }
    const data = customerAnalyticsData(res)
    expect(data.retentionRate).toBe(0.3)
    expect(data.avgOrderValue).toBe(250000)
  })

  it('chuyen doi TopCustomerResponse danh sach', () => {
    const list: TopCustomerResponse[] = [
      {
        buyerId: 'u1',
        buyerName: 'Nguyen Van A',
        totalSpent: 1500000,
        orderCount: 6,
        lastOrderAt: '2026-10-24T10:00:00Z',
      },
    ]
    const items = topCustomerItems(list)
    expect(items[0]?.buyerName).toBe('Nguyen Van A')
    expect(items[0]?.totalSpent).toBe(1500000)
  })
})
