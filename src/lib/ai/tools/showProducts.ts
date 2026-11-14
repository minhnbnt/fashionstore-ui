import { batchProductSummaries, detail1 } from '@generated/endpoints/products/products'
import { tool } from 'ai'
import { z } from 'zod'

import { priceInfo, takeData } from '@/lib/api/apiAdapters'

import type { ProductResponse } from '@generated/model/productResponse'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toSummaryFromDetail(product: ProductResponse): ProductSummaryResponse {
  const pricing = priceInfo(product)
  let defaultImageUrl: string | null = null
  if (product.images !== undefined && product.images.length > 0) {
    defaultImageUrl = product.images[0]?.url ?? null
  }
  return {
    id: product.id,
    shopId: product.shopId,
    name: product.name,
    slug: product.slug,
    minPrice: pricing.minPrice ?? undefined,
    defaultImageUrl,
    rank: null,
  }
}

export const showProductsInputSchema = z.object({
  productIds: z
    .array(z.string().min(1))
    .min(1)
    .max(8)
    .describe(
      'Danh sách id sản phẩm lấy từ kết quả tool searchProducts (chọn 3 sản phẩm phù hợp nhất nếu đủ, hoặc tất cả nếu ít hơn 3), không được bịa id',
    ),
})

export type ShowToolInput = z.infer<typeof showProductsInputSchema>

export interface ShowToolOutput {
  items: ProductSummaryResponse[]
}

/** Tool hiện sản phẩm cho khách trong khung chat: render card từ id đã tìm. */
export function createShowProductsTool() {
  return tool({
    description:
      'Hiển thị danh sách sản phẩm cho khách trong khung chat. Gọi sau khi đã tìm bằng searchProducts; truyền 3 id sản phẩm phù hợp nhất từ kết quả tìm kiếm nếu có đủ (hoặc toàn bộ nếu ít hơn 3), không được bịa id.',
    inputSchema: showProductsInputSchema,
    execute: async function (input): Promise<ShowToolOutput> {
      const uniqueIds = Array.from(new Set(input.productIds))
      try {
        const items = takeData(await batchProductSummaries({ ids: uniqueIds }))
        return { items: items ?? [] }
      } catch (err) {
        const uuidIds = uniqueIds.filter(function (id) {
          return UUID_PATTERN.test(id)
        })
        const slugIds = uniqueIds.filter(function (id) {
          return !UUID_PATTERN.test(id)
        })
        if (slugIds.length === 0) {
          throw err
        }
        const byIdentifier = new Map<string, ProductSummaryResponse>()
        if (uuidIds.length > 0) {
          const batchItems = takeData(await batchProductSummaries({ ids: uuidIds }))
          for (const item of batchItems ?? []) {
            if (item.id !== undefined) {
              byIdentifier.set(item.id, item)
            }
          }
        }
        const detailResults = await Promise.all(
          slugIds.map(async function (slug) {
            try {
              const res = takeData(await detail1(slug))
              return { slug, summary: toSummaryFromDetail(res) }
            } catch {
              return null
            }
          }),
        )
        for (const resolved of detailResults) {
          if (resolved !== null) {
            byIdentifier.set(resolved.slug, resolved.summary)
          }
        }
        const items: ProductSummaryResponse[] = []
        for (const id of uniqueIds) {
          const matched = byIdentifier.get(id)
          if (matched !== undefined) {
            items.push(matched)
          }
        }
        return { items }
      }
    },
  })
}
