import type { House } from '@phosphor-icons/react'

export type SellerTabId =
  | 'OVERVIEW'
  | 'PRODUCTS'
  | 'ADD_PRODUCT'
  | 'INVENTORY'
  | 'ORDERS'
  | 'RETURNS'
  | 'REVENUE'
  | 'REVIEWS'
  | 'CHAT'
  | 'DECORATION'
  | 'STAFF'
  | 'PROFILE'

export interface MenuItem {
  id: SellerTabId
  label: string
  icon: typeof House
  badgeCount?: number
  badgeColor?: string
}

export interface MenuGroup {
  groupTitle: string
  items: MenuItem[]
}
