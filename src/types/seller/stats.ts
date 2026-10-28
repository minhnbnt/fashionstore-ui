export interface DashboardData {
  todayRevenue: number
  todayOrders: number
  pendingOrders: number
  shopVisits: number
  yesterdayRevenue: number
  yesterdayOrders: number
  revenueChangePercent: number
  ordersChangeCount: number
}

export interface PerformanceData {
  chatResponseRate: number
  cancelRate: number
  onTimeDeliveryRate: number
  avgRating: number
}

export interface AlertData {
  type: string
  message: string
  count: number
  severity: 'INFO' | 'WARNING' | 'DANGER'
}

export interface RevenueChartPoint {
  label: string
  value: number
  orders: number
}

export interface RevenueCategoryItem {
  categoryId: string
  categoryName: string
  revenue: number
  quantity: number
  percentage: number
}

export interface RevenuePaymentItem {
  paymentMethod: string
  revenue: number
  orderCount: number
}

export interface OrderStatusSummaryData {
  completedOrders: number
  completedValue: number
  cancelledOrders: number
  cancelledValue: number
  returnedOrders: number
  returnedValue: number
}

export interface ProductAnalyticsItem {
  productId: string
  productName: string
  imageKey: string | null
  totalSold: number
  totalRevenue: number
  viewCount: number
  conversionRate: number
  currentStock: number
}

export interface CustomerAnalyticsData {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  retentionRate: number
  avgOrderValue: number
  totalFollowers: number
  followerChange: number
}

export interface TopCustomerItem {
  buyerId: string
  buyerName: string
  totalSpent: number
  orderCount: number
  lastOrderAt: string
}
