import { detail1 } from '@generated/endpoints/products/products'
import { tool } from 'ai'
import { z } from 'zod'

import { imageUrl, takeData } from '@/lib/api/apiAdapters'

import type { ImageResponse } from '@generated/model/imageResponse'
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

/** ProductResponse rút gọn: giữ dữ liệu trả lời được khách + key ảnh cho thử đồ ảo,
 *  bỏ video, variant id/sku… vô ích với LLM. */
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
  /** Key ảnh đại diện (sortOrder nhỏ nhất), null nếu sản phẩm chưa có ảnh. */
  defaultImageKey?: string | null
  /** Link ảnh đại diện đầy đủ (ghép từ VITE_ASSETS_URL), null khi không có key. */
  defaultImageUrl?: string | null
  /** Key ảnh garment dành cho thử đồ ảo, null nếu backend chưa tạo. */
  garmentKey?: string | null
  /** Link ảnh garment đầy đủ, null khi không có key. */
  garmentUrl?: string | null
  /** Sản phẩm có hỗ trợ thử đồ ảo hay không. */
  tryOnEnabled?: boolean
  variants: AgentProductDetailVariant[]
}

/** Ảnh có key, ưu tiên sortOrder nhỏ nhất — thay cho defaultImageKey mà detail API không trả sẵn. */
function defaultImageKey(images: ImageResponse[]): string | null {
  let best: ImageResponse | undefined
  for (const image of images) {
    if (image.s3Key === undefined || image.s3Key === '') {
      continue
    }
    if (best === undefined || (image.sortOrder ?? 0) < (best.sortOrder ?? 0)) {
      best = image
    }
  }
  return best?.s3Key ?? null
}

/** Key → link đầy đủ cho model; không có key thì null (không dùng placeholder để khỏi misleading). */
function assetUrl(key: string | null | undefined): string | null {
  if (key === null || key === undefined || key === '') {
    return null
  }
  return imageUrl(key)
}

/** ProductResponse → bản rút gọn cho model: giữ dữ liệu trả lời được khách và key ảnh thử đồ,
 *  bỏ video và dữ liệu thừa. */
export function toProductDetailOutput(payload: ProductResponse): AgentProductDetailOutput {
  const imageKey = defaultImageKey(payload.images ?? [])
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
    defaultImageKey: imageKey,
    defaultImageUrl: assetUrl(imageKey),
    garmentKey: payload.garmentKey ?? null,
    garmentUrl: assetUrl(payload.garmentKey),
    tryOnEnabled: payload.tryOnEnabled,
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
