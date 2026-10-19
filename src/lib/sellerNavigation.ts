import type { SellerTabId } from '@/types/seller'

const SELLER_TAB_IDS: readonly SellerTabId[] = [
  'OVERVIEW',
  'PRODUCTS',
  'ADD_PRODUCT',
  'INVENTORY',
  'ORDERS',
  'RETURNS',
  'REVENUE',
  'REVIEWS',
  'CHAT',
  'DECORATION',
  'STAFF',
  'PROFILE',
]

// Đọc tab từ URL (?tab=...): thiếu/không hợp lệ thì về OVERVIEW
export function parseSellerTab(value: string | null): SellerTabId {
  if (value === null || value === '') {
    return 'OVERVIEW'
  }
  const candidate = value.toUpperCase()
  for (const tab of SELLER_TAB_IDS) {
    if (tab === candidate) {
      return tab
    }
  }
  return 'OVERVIEW'
}

// OVERVIEW là mặc định nên không cần param, URL giữ gọn /shop
// Param viết lowercase cho đỡ chói (/shop?tab=orders) — parse vẫn đọc được cả HOA
export function sellerTabParam(tab: SellerTabId): string | null {
  if (tab === 'OVERVIEW') {
    return null
  }
  return tab.toLowerCase()
}
