import { listCategories } from '@generated/endpoints/categories/categories'
import { detail1 } from '@generated/endpoints/products/products'
import { search } from '@generated/endpoints/search/search'
import { SearchSort } from '@generated/model/searchSort'
import { tool } from 'ai'
import { z } from 'zod'

import { takeData } from '@/lib/apiAdapters'
import { EMPTY_FILTERS } from '@/lib/searchFilters'

import type { SearchFilters } from '@/types/search'
import type { ProductResponse } from '@generated/model/productResponse'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { SearchParams } from '@generated/model/searchParams'
import type { InferUITool, UIDataTypes, UIMessage } from 'ai'

// TODO(oauth): token đang hard-code qua VITE_AI_API_KEY trong .env. Về sau chuyển sang
// xác thực qua Supabase OAuth (đổi token ngắn hạn theo phiên đăng nhập) thay cho key tĩnh.
export interface AgentConfig {
  baseUrl: string
  apiKey: string
  model: string
}

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

/** Snapshot sản phẩm khách đang xem ở trang chi tiết: chỉ cần id, chi tiết lấy qua tool. */
export interface AgentProductContext {
  id: string
}

const SEARCH_SORT_VALUES: string[] = Object.values(SearchSort)
const DEFAULT_SEARCH_LIMIT = 8

/** Đọc cấu hình LLM từ env; thiếu hoặc rỗng biến nào thì coi như chưa cấu hình. */
export function readAgentConfig(): AgentConfig | null {
  const baseUrl = import.meta.env.VITE_AI_BASE_URL as string | undefined
  const apiKey = import.meta.env.VITE_AI_API_KEY as string | undefined
  const model = import.meta.env.VITE_AI_MODEL as string | undefined
  if (
    baseUrl === undefined ||
    baseUrl === '' ||
    apiKey === undefined ||
    apiKey === '' ||
    model === undefined ||
    model === ''
  ) {
    return null
  }
  return { baseUrl, apiKey, model }
}

/** System prompt tiếng Việt, nhúng bộ lọc khách đang đặt trên trang tìm kiếm
 *  và id sản phẩm khách đang xem ở trang chi tiết (nếu có). */
export function buildSystemPrompt(filters: SearchFilters, product?: AgentProductContext): string {
  const lines: string[] = [
    'Bạn là trợ lý mua sắm của cửa hàng thời trang "nét" — marketplace thời trang.',
    'Luôn trả lời bằng tiếng Việt, ngắn gọn, thân thiện. Giá sản phẩm tính bằng VND.',
    'Nhiệm vụ: giúp khách tìm sản phẩm trong cửa hàng.',
    '- Trước khi gợi ý sản phẩm, phải gọi tool searchProducts với bộ lọc phù hợp, không được bịa sản phẩm.',
    '- Chưa biết slug danh mục thì gọi tool listCategories trước.',
    '- Mỗi lần tìm tối đa 8 sản phẩm. Nếu không có kết quả, gợi ý khách nới bớt bộ lọc.',
    '',
    'Bộ lọc khách đang đặt trên trang tìm kiếm:',
  ]
  const filterLineCount = lines.length

  if (filters.q !== null) {
    lines.push(`- Từ khóa: "${filters.q}"`)
  }
  if (filters.category !== null) {
    lines.push(`- Danh mục: ${filters.category}`)
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    lines.push(`- Giá: ${filters.minPrice ?? 0} – ${filters.maxPrice ?? 'không giới hạn'} VND`)
  }
  if (filters.size !== null) {
    lines.push(`- Size: ${filters.size}`)
  }
  if (filters.color !== null) {
    lines.push(`- Màu: ${filters.color}`)
  }
  if (lines.length === filterLineCount) {
    lines.push('Không có bộ lọc nào đang bật.')
  }

  if (product !== undefined) {
    lines.push('')
    lines.push('Khách đang xem trang chi tiết sản phẩm (id: ' + product.id + ').')
    lines.push(
      'Muốn biết giá, size/màu còn hàng, chất liệu hoặc mô tả của sản phẩm này thì gọi tool getProductDetail với id trên, không được bịa thông tin.',
    )
  }

  return lines.join('\n')
}

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

/** Ba tool của agent: tìm sản phẩm qua API có sẵn, tra danh mục, xem chi tiết sản phẩm. */
export function createAgentTools() {
  return {
    searchProducts: tool({
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
    }),
    listCategories: tool({
      description:
        'Liệt kê danh mục sản phẩm của cửa hàng (slug + tên) để biết giá trị danh mục hợp lệ.',
      inputSchema: z.object({}),
      execute: async function (): Promise<{
        categories: Array<{ slug: string; name: string }>
      }> {
        const categories = takeData(await listCategories())
        return {
          categories: categories.map(function (category) {
            return { slug: category.slug ?? '', name: category.name ?? '' }
          }),
        }
      },
    }),
    getProductDetail: tool({
      description:
        'Xem chi tiết sản phẩm theo id: giá, size/màu còn hàng, chất liệu, mô tả, đánh giá. Dùng khi khách hỏi về sản phẩm đang xem ở trang chi tiết.',
      inputSchema: getProductDetailInputSchema,
      execute: async function (input): Promise<AgentProductDetailOutput> {
        const payload = takeData(await detail1(input.productId))
        return toProductDetailOutput(payload)
      },
    }),
  }
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

export type AgentTools = {
  searchProducts: InferUITool<ReturnType<typeof createAgentTools>['searchProducts']>
  listCategories: InferUITool<ReturnType<typeof createAgentTools>['listCategories']>
  getProductDetail: InferUITool<ReturnType<typeof createAgentTools>['getProductDetail']>
}

/** Mỗi tin nhắn user mang theo snapshot bộ lọc trang lúc gửi, kèm id sản phẩm đang xem (nếu ở PDP). */
export interface AgentMessageMetadata {
  filters: SearchFilters
  product?: AgentProductContext
}

export type AgentUIMessage = UIMessage<AgentMessageMetadata, UIDataTypes, AgentTools>

/** Bộ lọc đang có hiệu lực: snapshot trong tin nhắn user gần nhất, thiếu thì rỗng. */
export function filtersFromMessages(messages: AgentUIMessage[]): SearchFilters {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (
      message !== undefined &&
      message.role === 'user' &&
      message.metadata?.filters !== undefined
    ) {
      return message.metadata.filters
    }
  }
  return { ...EMPTY_FILTERS }
}

/** Sản phẩm đang xem: snapshot trong tin nhắn user gần nhất, thiếu thì undefined. */
export function productFromMessages(messages: AgentUIMessage[]): AgentProductContext | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (
      message !== undefined &&
      message.role === 'user' &&
      message.metadata?.product !== undefined
    ) {
      return message.metadata.product
    }
  }
  return undefined
}
