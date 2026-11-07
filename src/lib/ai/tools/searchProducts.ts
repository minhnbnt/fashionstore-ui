import { search } from '@generated/endpoints/search/search'
import { SearchSort } from '@generated/model/searchSort'
import { tool } from 'ai'
import { z } from 'zod'

import { takeData } from '@/lib/api/apiAdapters'

import type { SearchFilters } from '@/types/search'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { SearchParams } from '@generated/model/searchParams'

export const searchProductsInputSchema = z.object({
  q: z
    .string()
    .nullish()
    .describe('Từ khóa tìm kiếm bằng tiếng Việt, bỏ trống để duyệt theo bộ lọc'),
  category: z
    .string()
    .nullish()
    .describe('Slug danh mục, lấy giá trị hợp lệ từ tool listCategories'),
  minPrice: z.number().int().nonnegative().nullish().describe('Giá thấp nhất (VND)'),
  maxPrice: z.number().int().nonnegative().nullish().describe('Giá cao nhất (VND)'),
  size: z.string().nullish().describe('Size variant, khớp chính xác (S, M, L…)'),
  color: z.string().nullish().describe('Màu variant, khớp chính xác'),
  sort: z
    .enum(['RELEVANCE', 'NEWEST', 'PRICE_ASC', 'PRICE_DESC'])
    .nullish()
    .describe('Cách sắp xếp kết quả, RELEVANCE chỉ dùng khi có từ khóa'),
  limit: z.number().int().min(1).max(20).nullish().describe('Số sản phẩm tối đa trả về'),
})

export type SearchToolInput = z.infer<typeof searchProductsInputSchema>

export interface SearchToolOutput {
  total: number
  appliedParams: Partial<SearchFilters>
  items: ProductSummaryResponse[]
}

const SEARCH_SORT_VALUES: string[] = Object.values(SearchSort)
const DEFAULT_SEARCH_LIMIT = 8

function textField(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined
  }
  const trimmed = value.trim()
  if (trimmed === '') {
    return undefined
  }
  return trimmed
}

function numberField(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }
  return value
}

/** Tool input → patch bộ lọc trang tìm kiếm (dùng cho nút "Lọc trên trang"). */
export function toFilterPatch(input: SearchToolInput): Partial<SearchFilters> {
  const patch: Partial<SearchFilters> = {}
  const q = textField(input.q)
  if (q !== undefined) {
    patch.q = q
  }
  const category = textField(input.category)
  if (category !== undefined) {
    patch.category = category
  }
  const minPrice = numberField(input.minPrice)
  if (minPrice !== undefined) {
    patch.minPrice = minPrice
  }
  const maxPrice = numberField(input.maxPrice)
  if (maxPrice !== undefined) {
    patch.maxPrice = maxPrice
  }
  const size = textField(input.size)
  if (size !== undefined) {
    patch.size = size
  }
  const color = textField(input.color)
  if (color !== undefined) {
    patch.color = color
  }
  if (input.sort !== null && input.sort !== undefined && SEARCH_SORT_VALUES.includes(input.sort)) {
    patch.sort = input.sort
  }
  return patch
}

/** Tool input → SearchParams của API /api/search/products. */
export function toSearchParams(input: SearchToolInput): SearchParams {
  const params: SearchParams = { limit: input.limit ?? DEFAULT_SEARCH_LIMIT }
  const q = textField(input.q)
  if (q !== undefined) {
    params.q = q
  }
  const category = textField(input.category)
  if (category !== undefined) {
    params.category = category
  }
  const minPrice = numberField(input.minPrice)
  if (minPrice !== undefined) {
    params.minPrice = minPrice
  }
  const maxPrice = numberField(input.maxPrice)
  if (maxPrice !== undefined) {
    params.maxPrice = maxPrice
  }
  const size = textField(input.size)
  if (size !== undefined) {
    params.size = size
  }
  const color = textField(input.color)
  if (color !== undefined) {
    params.color = color
  }
  if (input.sort !== null && input.sort !== undefined && SEARCH_SORT_VALUES.includes(input.sort)) {
    params.sort = input.sort
  }
  return params
}

/** Tool tìm sản phẩm: tra dữ liệu qua /api/search/products, khách không thấy trực tiếp. */
export function createSearchProductsTool() {
  return tool({
    description:
      'Tìm sản phẩm trong cửa hàng theo từ khóa và bộ lọc (danh mục, khoảng giá, size, màu). Trả về danh sách sản phẩm khớp kèm tổng số kết quả.',
    inputSchema: searchProductsInputSchema,
    execute: async function (input): Promise<SearchToolOutput> {
      const payload = takeData(await search(toSearchParams(input)))
      return {
        total: payload.total ?? 0,
        appliedParams: toFilterPatch(input),
        items: payload.items ?? [],
      }
    },
  })
}
