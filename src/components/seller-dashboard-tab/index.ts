import { lazy } from 'react'

export const SellerAddProductTab = lazy(() => import('./SellerAddProductTab'))
export const SellerEditProductTab = lazy(() => import('./SellerEditProductTab'))
export const SellerChatTab = lazy(() => import('./SellerChatTab'))
export const SellerDecorationTab = lazy(() =>
  import('./SellerDecorationTab').then((m) => ({ default: m.SellerDecorationTab })),
)
export const SellerInventoryTab = lazy(() => import('./SellerInventoryTab'))
export const SellerOrdersTab = lazy(() => import('./SellerOrdersTab'))
export const SellerOverviewTab = lazy(() => import('./SellerOverviewTab'))
export const SellerProductsTab = lazy(() => import('./SellerProductsTab'))
export const SellerProfileTab = lazy(() =>
  import('./SellerProfileTab').then((m) => ({ default: m.SellerProfileTab })),
)
export const SellerReturnsTab = lazy(() => import('./SellerReturnsTab'))
export const SellerRevenueTab = lazy(() => import('./SellerRevenueTab'))
export const SellerReviewsTab = lazy(() => import('./SellerReviewsTab'))
export const SellerStaffTab = lazy(() =>
  import('./SellerStaffTab').then((m) => ({ default: m.SellerStaffTab })),
)
export const SellerStatsRevenueTab = lazy(() => import('./SellerStatsRevenueTab'))
export const SellerStatsProductsTab = lazy(() => import('./SellerStatsProductsTab'))
export const SellerStatsCustomersTab = lazy(() => import('./SellerStatsCustomersTab'))
