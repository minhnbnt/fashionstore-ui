import { EMPTY_FILTERS } from '@/lib/searchFilters'

import { createGetProductDetailTool } from './tools/getProductDetail'
import { createListCategoriesTool } from './tools/listCategories'
import { createSearchProductsTool } from './tools/searchProducts'
import { createShowProductsTool } from './tools/showProducts'

import type { SearchFilters } from '@/types/search'
import type { InferUITool, UIDataTypes, UIMessage } from 'ai'

// Re-export API của từng tool (schema, type, mapper) — facade duy nhất cho consumer.
export { searchProductsInputSchema, toFilterPatch, toSearchParams } from './tools/searchProducts'
export type { SearchToolInput, SearchToolOutput } from './tools/searchProducts'
export { getProductDetailInputSchema, toProductDetailOutput } from './tools/getProductDetail'
export type {
  AgentProductDetailOutput,
  AgentProductDetailVariant,
  ProductDetailToolInput,
} from './tools/getProductDetail'
export { showProductsInputSchema } from './tools/showProducts'
export type { ShowToolInput, ShowToolOutput } from './tools/showProducts'

// TODO(oauth): token đang hard-code qua VITE_AI_API_KEY trong .env. Về sau chuyển sang
// xác thực qua Supabase OAuth (đổi token ngắn hạn theo phiên đăng nhập) thay cho key tĩnh.
export interface AgentConfig {
  baseUrl: string
  apiKey: string
  model: string
}

/** Snapshot sản phẩm khách đang xem ở trang chi tiết: chỉ cần id, chi tiết lấy qua tool. */
export interface AgentProductContext {
  id: string
}

/** Ảnh khách đính kèm trong tin nhắn: key S3 (dành cho thay đổi sau) + url public cho model. */
export interface AgentImageContext {
  key: string
  url: string
}

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

/** System prompt tiếng Việt, nhúng bộ lọc khách đang đặt trên trang tìm kiếm,
 *  id sản phẩm khách đang xem ở trang chi tiết (nếu có) và link ảnh khách đính kèm (nếu có). */
export function buildSystemPrompt(
  filters: SearchFilters,
  product?: AgentProductContext,
  image?: AgentImageContext,
): string {
  const lines: string[] = [
    'Bạn là trợ lý mua sắm của cửa hàng thời trang "nét" — marketplace thời trang.',
    'Luôn trả lời bằng tiếng Việt, ngắn gọn, thân thiện. Giá sản phẩm tính bằng VND.',
    'Nhiệm vụ: giúp khách tìm sản phẩm trong cửa hàng.',
    '- Trước khi gợi ý sản phẩm, phải gọi tool searchProducts với bộ lọc phù hợp, không được bịa sản phẩm.',
    '- searchProducts chỉ để tra dữ liệu, khách không thấy gì; muốn hiện sản phẩm cho khách xem thì gọi tool showProducts với id lấy từ kết quả searchProducts (tối đa 8 id, chọn những sản phẩm phù hợp nhất), không được bịa id.',
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

  if (image !== undefined) {
    lines.push('')
    lines.push('Khách đã đính kèm 1 ảnh (link: ' + image.url + '). Tham khảo ảnh này khi tư vấn.')
  }

  return lines.join('\n')
}

/** Bốn tool của agent: tìm sản phẩm, tra danh mục, xem chi tiết, hiện sản phẩm cho khách.
 *  Định nghĩa từng tool nằm ở `tools/` — mỗi tool một file. */
export function createAgentTools() {
  return {
    searchProducts: createSearchProductsTool(),
    listCategories: createListCategoriesTool(),
    getProductDetail: createGetProductDetailTool(),
    showProducts: createShowProductsTool(),
  }
}

export type AgentTools = {
  searchProducts: InferUITool<ReturnType<typeof createAgentTools>['searchProducts']>
  listCategories: InferUITool<ReturnType<typeof createAgentTools>['listCategories']>
  getProductDetail: InferUITool<ReturnType<typeof createAgentTools>['getProductDetail']>
  showProducts: InferUITool<ReturnType<typeof createAgentTools>['showProducts']>
}

/** Mỗi tin nhắn user mang theo snapshot bộ lọc trang lúc gửi, kèm id sản phẩm đang xem (nếu ở PDP)
 *  và ảnh khách đính kèm (nếu có). */
export interface AgentMessageMetadata {
  filters: SearchFilters
  product?: AgentProductContext
  image?: AgentImageContext
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

/** Ảnh đính kèm: snapshot trong tin nhắn user gần nhất, thiếu thì undefined. */
export function imageFromMessages(messages: AgentUIMessage[]): AgentImageContext | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message !== undefined && message.role === 'user' && message.metadata?.image !== undefined) {
      return message.metadata.image
    }
  }
  return undefined
}
