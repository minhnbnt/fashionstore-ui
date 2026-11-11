import type { ProductResponse } from '@generated/model/productResponse'

export interface ChatProductItem {
  id?: string
  name?: string
  slug?: string
  defaultImageKey?: string | null
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
  const s3Key = firstImage?.s3Key ?? undefined

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
    defaultImageKey: s3Key,
    minPrice,
    maxPrice,
  }
}
