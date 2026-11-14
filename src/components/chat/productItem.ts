import type { ProductResponse } from '@generated/model/productResponse'

export interface ChatProductItem {
  id?: string
  name?: string
  slug?: string
  defaultImageUrl?: string | null
  minPrice?: number | null
  maxPrice?: number | null
}

/** Chuyển ProductResponse (cùng định dạng API chi tiết & catalog shop) thành item hiển thị card chat. */
export function productResponseToChatItem(data: ProductResponse): ChatProductItem {
  const prices = (data.variants ?? [])
    .map(function (v) {
      return v.price
    })
    .filter(function (p): p is number {
      return typeof p === 'number'
    })

  const firstImage = data.images?.[0]
  const firstImageUrl = firstImage?.url ?? undefined

  let minPrice: number | undefined
  let maxPrice: number | undefined
  if (prices.length > 0) {
    minPrice = Math.min(...prices)
    maxPrice = Math.max(...prices)
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    defaultImageUrl: firstImageUrl,
    minPrice,
    maxPrice,
  }
}
