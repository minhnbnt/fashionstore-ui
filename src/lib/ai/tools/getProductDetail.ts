import { detail1 } from '@generated/endpoints/products/products'
import { tool } from 'ai'
import { z } from 'zod'

import { takeData } from '@/lib/api/apiAdapters'

import type { ProductResponse } from '@generated/model/productResponse'

export const getProductDetailInputSchema = z.object({
  productId: z.string().describe('Id sản phẩm khách đang xem, lấy từ ngữ cảnh hệ thống'),
})

export type ProductDetailToolInput = z.infer<typeof getProductDetailInputSchema>

/** Một dòng variant gọn cho model: chỉ dữ liệu trả lời được câu hỏi của khách. */
export interface AgentProductDetailVariant {
  size?: string
  color?: string
  price?: number
  stockQuantity?: number
}

/** ProductResponse rút gọn: bỏ ảnh, video, garment… vô ích với LLM. */
export interface AgentProductDetailOutput {
  id?: string
  name?: string
  slug?: string
  description?: string
  status?: string
  material?: string | null
  origin?: string | null
  careInstructions?: string | null
  sizeGuide?: string | null
  averageRating?: number | null
  reviewCount?: number
  variants: AgentProductDetailVariant[]
}

/** ProductResponse → bản rút gọn cho model: giữ dữ liệu trả lời được khách, bỏ ảnh/video/garment. */
export function toProductDetailOutput(payload: ProductResponse): AgentProductDetailOutput {
  return {
    id: payload.id,
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    status: payload.status,
    material: payload.material ?? null,
    origin: payload.origin ?? null,
    careInstructions: payload.careInstructions ?? null,
    sizeGuide: payload.sizeGuide ?? null,
    averageRating: payload.averageRating ?? null,
    reviewCount: payload.reviewCount,
    variants: (payload.variants ?? []).map(function (variant) {
      return {
        size: variant.size,
        color: variant.color,
        price: variant.price,
        stockQuantity: variant.stockQuantity,
      }
    }),
  }
}

/** Tool xem chi tiết sản phẩm theo id (khách đang xem ở trang chi tiết). */
export function createGetProductDetailTool() {
  return tool({
    description:
      'Xem chi tiết sản phẩm theo id: giá, size/màu còn hàng, chất liệu, mô tả, đánh giá. Dùng khi khách hỏi về sản phẩm đang xem ở trang chi tiết.',
    inputSchema: getProductDetailInputSchema,
    execute: async function (input): Promise<AgentProductDetailOutput> {
      const payload = takeData(await detail1(input.productId))
      return toProductDetailOutput(payload)
    },
  })
}
