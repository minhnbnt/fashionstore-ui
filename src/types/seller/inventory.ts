export interface ProductItem {
  id: string
  name: string
  slug: string
  sku: string
  category: string
  price: number
  originalPrice: number
  stock: number
  sold: number
  status: 'ACTIVE' | 'PENDING' | 'HIDDEN' | 'INACTIVE' | 'BANNED' | 'DELETED'
  violationType?: string | null
  statusReason?: string | null
  image: string
  createdAt?: string
  categoryId?: string | null
  variants: {
    id: string
    size: string
    color: string
    sku: string
    price: number
    stock: number
    lowStockThreshold: number
  }[]
}

export interface StockMovementItem {
  id: string
  variantSku: string
  productName: string
  changeQty: number
  /** API khong luu stock truoc/sau, chi co voi du lieu local */
  previousStock: number | null
  newStock: number | null
  reason: 'RESTOCK' | 'DAMAGE' | 'RETURN' | 'AUDIT' | 'MANUAL' | 'ORDER_SHIP' | 'SELLER_CANCEL'
  note: string
  createdBy: string
  createdAt: string
}

export interface VariantInput {
  id: string
  size: string
  color: string
  sku: string
  price: number
  stock: number
  lowStockThreshold: number
}
