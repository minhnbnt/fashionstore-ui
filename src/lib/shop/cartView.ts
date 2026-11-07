import type { CartItemResponse } from '@generated/model/cartItemResponse'

export interface CartShopGroup {
  shopId: string
  shopName: string
  items: CartItemResponse[]
}

export function groupCartByShop(items: CartItemResponse[]): CartShopGroup[] {
  const groups = new Map<string, CartShopGroup>()
  for (const item of items) {
    const shopId = item.shopId ?? ''
    let group = groups.get(shopId)
    if (group === undefined) {
      group = { shopId, shopName: item.shopName ?? '', items: [] }
      groups.set(shopId, group)
    }
    group.items.push(item)
  }
  return Array.from(groups.values())
}

export type PriceChangeDirection = 'decreased' | 'increased'

export function classifyPriceChange(
  input: Pick<CartItemResponse, 'priceAtAdded' | 'unitPrice'>,
): PriceChangeDirection | null {
  const unitPrice = input.unitPrice ?? 0
  const priceAtAdded = input.priceAtAdded ?? 0
  if (unitPrice <= 0 || priceAtAdded <= 0) {
    return null
  }
  if (unitPrice < priceAtAdded) {
    return 'decreased'
  }
  if (unitPrice > priceAtAdded) {
    return 'increased'
  }
  return null
}

export type StockState = 'out' | 'low' | 'ok'

export function stockState(item: Pick<CartItemResponse, 'quantity' | 'stockQuantity'>): StockState {
  const stock = item.stockQuantity
  if (stock === undefined) {
    return 'ok'
  }
  if (stock <= 0) {
    return 'out'
  }
  if ((item.quantity ?? 0) >= stock) {
    return 'low'
  }
  return 'ok'
}
