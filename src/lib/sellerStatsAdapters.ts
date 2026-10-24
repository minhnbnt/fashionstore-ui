import type {
  AlertData,
  CustomerAnalyticsData,
  DashboardData,
  OrderStatusSummaryData,
  PerformanceData,
  ProductAnalyticsItem,
  RevenueCategoryItem,
  RevenueChartPoint,
  RevenuePaymentItem,
  TopCustomerItem,
} from '@/types/seller'
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

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) {
    if (current > 0) {
      return 100
    }
    return 0
  }
  const percent = ((current - previous) / previous) * 100
  return Math.round(percent * 10) / 10
}

export function dashboardData(res?: ShopDashboardResponse | null): DashboardData {
  const todayRevenue = res?.todayRevenue ?? 0
  const yesterdayRevenue = res?.yesterdayRevenue ?? 0
  const todayOrders = res?.todayOrders ?? 0
  const yesterdayOrders = res?.yesterdayOrders ?? 0

  return {
    todayRevenue,
    todayOrders,
    pendingOrders: res?.pendingOrders ?? 0,
    shopVisits: res?.shopVisits ?? 0,
    yesterdayRevenue,
    yesterdayOrders,
    revenueChangePercent: calculateChangePercent(todayRevenue, yesterdayRevenue),
    ordersChangeCount: todayOrders - yesterdayOrders,
  }
}

export function performanceData(res?: ShopPerformanceResponse | null): PerformanceData {
  return {
    chatResponseRate: clamp(res?.chatResponseRate ?? 0, 0, 1),
    cancelRate: clamp(res?.cancelRate ?? 0, 0, 1),
    onTimeDeliveryRate: clamp(res?.onTimeDeliveryRate ?? 0, 0, 1),
    avgRating: clamp(res?.avgRating ?? 0, 0, 5),
  }
}

function normalizeSeverity(severity: string | undefined): 'INFO' | 'WARNING' | 'DANGER' {
  if (severity === 'WARNING') {
    return 'WARNING'
  }
  if (severity === 'DANGER') {
    return 'DANGER'
  }
  return 'INFO'
}

export function alertItems(alerts?: AlertResponse[] | null): AlertData[] {
  if (alerts === null || alerts === undefined) {
    return []
  }
  const result: AlertData[] = []
  for (const item of alerts) {
    const count = item.count ?? 0
    if (count > 0) {
      result.push({
        type: item.type ?? '',
        message: item.message ?? '',
        count,
        severity: normalizeSeverity(item.severity),
      })
    }
  }
  return result
}

export function revenueChartPoints(list?: DailyRevenueResponse[] | null): RevenueChartPoint[] {
  if (list === null || list === undefined) {
    return []
  }
  return list.map((item) => ({
    label: item.date ?? '',
    value: item.revenue ?? 0,
    orders: item.orderCount ?? 0,
  }))
}

export function revenueCategoryItems(
  list?: RevenueByCategoryResponse[] | null,
): RevenueCategoryItem[] {
  if (list === null || list === undefined) {
    return []
  }
  let totalRevenue = 0
  for (const item of list) {
    totalRevenue += item.revenue ?? 0
  }
  return list.map((item) => {
    let percentage = 0
    if (totalRevenue > 0) {
      const rev = item.revenue ?? 0
      percentage = Math.round((rev / totalRevenue) * 100 * 10) / 10
    }
    return {
      categoryId: item.categoryId ?? '',
      categoryName: item.categoryName ?? '',
      revenue: item.revenue ?? 0,
      quantity: item.quantity ?? 0,
      percentage,
    }
  })
}

export function revenuePaymentItems(
  list?: RevenueByPaymentResponse[] | null,
): RevenuePaymentItem[] {
  if (list === null || list === undefined) {
    return []
  }
  return list.map((item) => ({
    paymentMethod: item.paymentMethod ?? '',
    revenue: item.revenue ?? 0,
    orderCount: item.orderCount ?? 0,
  }))
}

export function orderStatusSummaryData(
  res?: OrderStatusSummaryResponse | null,
): OrderStatusSummaryData {
  return {
    completedOrders: res?.completedOrders ?? 0,
    completedValue: res?.completedValue ?? 0,
    cancelledOrders: res?.cancelledOrders ?? 0,
    cancelledValue: res?.cancelledValue ?? 0,
    returnedOrders: res?.returnedOrders ?? 0,
    returnedValue: res?.returnedValue ?? 0,
  }
}

export function productAnalyticsItems(
  list?: ProductStatsResponse[] | null,
): ProductAnalyticsItem[] {
  if (list === null || list === undefined) {
    return []
  }
  return list.map((item) => ({
    productId: item.productId ?? '',
    productName: item.productName ?? '',
    imageKey: item.imageKey ?? null,
    totalSold: item.totalSold ?? 0,
    totalRevenue: item.totalRevenue ?? 0,
    viewCount: item.viewCount ?? 0,
    conversionRate: item.conversionRate ?? 0,
    currentStock: item.currentStock ?? 0,
  }))
}

export function customerAnalyticsData(res?: CustomerStatsResponse | null): CustomerAnalyticsData {
  return {
    totalCustomers: res?.totalCustomers ?? 0,
    newCustomers: res?.newCustomers ?? 0,
    returningCustomers: res?.returningCustomers ?? 0,
    retentionRate: res?.retentionRate ?? 0,
    avgOrderValue: res?.avgOrderValue ?? 0,
    totalFollowers: res?.totalFollowers ?? 0,
    followerChange: res?.followerChange ?? 0,
  }
}

export function topCustomerItems(list?: TopCustomerResponse[] | null): TopCustomerItem[] {
  if (list === null || list === undefined) {
    return []
  }
  return list.map((item) => ({
    buyerId: item.buyerId ?? '',
    buyerName: item.buyerName ?? '',
    totalSpent: item.totalSpent ?? 0,
    orderCount: item.orderCount ?? 0,
    lastOrderAt: item.lastOrderAt ?? '',
  }))
}
