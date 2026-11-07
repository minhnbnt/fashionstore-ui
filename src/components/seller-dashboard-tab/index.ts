import { lazy } from 'react'

export const SellerAddProductTab = lazy(() => import('./products/SellerAddProductTab'))
export const SellerEditProductTab = lazy(() => import('./products/SellerEditProductTab'))
export const SellerChatTab = lazy(() => import('./SellerChatTab'))
export const SellerDecorationTab = lazy(() =>
  import('./SellerDecorationTab').then((m) => ({ default: m.SellerDecorationTab })),
)
export const SellerInventoryTab = lazy(() => import('./products/SellerInventoryTab'))
export const SellerOrdersTab = lazy(() => import('./orders/SellerOrdersTab'))
export const SellerOverviewTab = lazy(() => import('./stats/SellerOverviewTab'))
export const SellerProductsTab = lazy(() => import('./products/SellerProductsTab'))
export const SellerProfileTab = lazy(() =>
  import('./SellerProfileTab').then((m) => ({ default: m.SellerProfileTab })),
)
export const SellerReturnsTab = lazy(() => import('./orders/SellerReturnsTab'))
export const SellerRevenueTab = lazy(() => import('./stats/SellerRevenueTab'))
export const SellerReviewsTab = lazy(() => import('./stats/SellerReviewsTab'))
export const SellerStaffTab = lazy(() =>
  import('./SellerStaffTab').then((m) => ({ default: m.SellerStaffTab })),
)
export const SellerStatsRevenueTab = lazy(() => import('./stats/SellerStatsRevenueTab'))
export const SellerStatsProductsTab = lazy(() => import('./stats/SellerStatsProductsTab'))
export const SellerStatsCustomersTab = lazy(() => import('./stats/SellerStatsCustomersTab'))
