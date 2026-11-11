import { batchProductSummaries } from '@generated/endpoints/products/products'
import { tool } from 'ai'
import { z } from 'zod'

import { takeData } from '@/lib/api/apiAdapters'

import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'

export const showProductsInputSchema = z.object({
  productIds: z
    .array(z.string().min(1))
    .min(1)
    .max(8)
    .describe('Id sản phẩm lấy từ kết quả tool searchProducts, không được bịa id'),
})

export type ShowToolInput = z.infer<typeof showProductsInputSchema>

export interface ShowToolOutput {
  items: ProductSummaryResponse[]
}

/** Tool hiện sản phẩm cho khách trong khung chat: render card từ id đã tìm. */
export function createShowProductsTool() {
  return tool({
    description:
      'Hiển thị danh sách sản phẩm cho khách trong khung chat. Gọi sau khi đã tìm bằng searchProducts; truyền id các sản phẩm phù hợp nhất từ kết quả tìm kiếm, không được bịa id.',
    inputSchema: showProductsInputSchema,
    execute: async function (input): Promise<ShowToolOutput> {
      const items = takeData(await batchProductSummaries({ ids: input.productIds }))
      return { items: items ?? [] }
    },
  })
}
