import type { SearchFilters } from '@/types/search'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { UIDataTypes, UIMessage } from 'ai'

// Contract types còn lại sau khi chuyển agent sang ai-backend.
// Chỉ type + đọc config — mọi schema/execute/prompt nằm ở server.

/** Ảnh khách đính kèm: URL public để ai-backend fetch qua tool readImage. */
export interface AgentImageContext {
  url: string
  mediaType?: string
}

/** Context trang gửi tươi theo từng request, agent kéo vào qua tool getPageContext. */
export interface AgentContext {
  route: string
  filters: SearchFilters
  productId?: string
  image?: AgentImageContext
}

export interface SearchToolOutput {
  total: number
  appliedParams: Partial<SearchFilters>
  items: ProductSummaryResponse[]
}

export interface ShowToolOutput {
  items: ProductSummaryResponse[]
}

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
  variants: Array<{
    size?: string
    color?: string
    price?: number
    stockQuantity?: number
  }>
}

/** I/O thuần của 5 tool — ToolUIPart<AgentTools> nhận trực tiếp shape này. */
// type alias (không phải interface) để có index signature thỏa constraint UITools.
export type AgentTools = {
  getPageContext: {
    input: Record<string, never>
    output: AgentContext
  }
  searchProducts: {
    input: {
      q?: string | null
      category?: string | null
      minPrice?: number | null
      maxPrice?: number | null
      size?: string | null
      color?: string | null
      sort?: string | null
      limit?: number | null
    }
    output: SearchToolOutput
  }
  listCategories: {
    input: Record<string, never>
    output: { categories: Array<{ slug: string; name: string }> }
  }
  getProductDetail: {
    input: { productId: string }
    output: AgentProductDetailOutput
  }
  showProducts: {
    input: { productIds: string[] }
    output: ShowToolOutput
  }
}

export type AgentUIMessage = UIMessage<unknown, UIDataTypes, AgentTools>

export interface AgentConfig {
  backendUrl: string
}

/** Đọc địa chỉ ai-backend; thiếu hoặc rỗng thì coi như chưa cấu hình. */
export function readAgentConfig(): AgentConfig | null {
  const backendUrl = import.meta.env.VITE_AI_BACKEND_URL as string | undefined
  if (backendUrl === undefined || backendUrl === '') {
    return null
  }
  return { backendUrl }
}
