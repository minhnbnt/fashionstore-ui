import { ApiError } from './apiFetch'

import type { ProductResponse } from '@generated/model/productResponse'

export const PLACEHOLDER_IMAGE = 'https://picsum.photos/seed/net-noimage/600/750'

export function imageUrl(s3Key: string | null | undefined): string {
  if (s3Key === null || s3Key === undefined || s3Key === '') {
    // TODO(mock): backend chưa có ảnh thì dùng placeholder; có ảnh đầy đủ thì bỏ nhánh này
    return PLACEHOLDER_IMAGE
  }
  const base = import.meta.env.VITE_ASSETS_URL as string | undefined
  if (base === undefined || base === '') {
    throw new Error('Thiếu VITE_ASSETS_URL trong .env')
  }
  return `${base}/${s3Key}`
}

export interface PriceInfo {
  minPrice: number | null
  maxCompareAt: number | null
  sizes: string[]
  colors: string[]
  totalStock: number
}

export function priceInfo(product: ProductResponse): PriceInfo {
  const variants = product.variants ?? []
  let minPrice: number | null = null
  let maxCompareAt: number | null = null
  const sizes: string[] = []
  const colors: string[] = []
  let totalStock = 0
  for (const v of variants) {
    if (v.price !== undefined && (minPrice === null || v.price < minPrice)) {
      minPrice = v.price
    }
    if (v.compareAtPrice !== undefined && v.compareAtPrice !== null) {
      if (maxCompareAt === null || v.compareAtPrice > maxCompareAt) {
        maxCompareAt = v.compareAtPrice
      }
    }
    if (v.size !== undefined && sizes.includes(v.size) === false) {
      sizes.push(v.size)
    }
    if (v.color !== undefined && colors.includes(v.color) === false) {
      colors.push(v.color)
    }
    totalStock += v.stockQuantity ?? 0
  }
  return { minPrice, maxCompareAt, sizes, colors, totalStock }
}

type SuccessStatus = 200 | 201

export function takeData<U extends { data: unknown; status: number }>(
  response: U,
): Extract<U, { status: SuccessStatus }>['data'] {
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Unexpected response status ${response.status}`)
  }
  return (response as Extract<U, { status: SuccessStatus }>)['data']
}

const ERROR_MESSAGES: Record<string, Record<number, string>> = {
  productDetail: {
    404: 'Sản phẩm không tồn tại hoặc đã gỡ.',
    401: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
  },
  search: {
    400: 'Từ khóa tìm kiếm chưa hợp lệ.',
  },
}

export function apiErrorMessage(endpoint: string, status: number): string {
  if (status === 401) {
    return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
  }
  const byEndpoint = ERROR_MESSAGES[endpoint]
  const message = byEndpoint?.[status]
  if (message !== undefined) {
    return message
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
}

export function hookErrorMessage(endpoint: string, error: unknown): string {
  if (error instanceof ApiError) {
    return apiErrorMessage(endpoint, error.status)
  }
  return apiErrorMessage(endpoint, 0)
}
