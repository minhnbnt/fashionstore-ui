import type { CartItemResponse } from '@generated/model/cartItemResponse'

export interface CartShopGroup {
  shopId: string
  shopName: string
  items: CartItemResponse[]
}

export interface CartSelectionState {
  selectedVariantIds: Set<string>
}
