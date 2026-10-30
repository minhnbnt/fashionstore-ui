import { SearchSort } from '@generated/model/searchSort'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { EMPTY_FILTERS } from '@/lib/searchFilters'

import {
  buildSystemPrompt,
  createSearchTools,
  filtersFromMessages,
  readAgentConfig,
  searchProductsInputSchema,
  toFilterPatch,
  toSearchParams,
} from './agent'

import type { AgentUIMessage } from './agent'
import type { SearchFilters } from '@/types/search'

const { searchMock, listCategoriesMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  listCategoriesMock: vi.fn(),
}))

vi.mock('@generated/endpoints/search/search', () => ({ search: searchMock }))
vi.mock('@generated/endpoints/categories/categories', () => ({
  listCategories: listCategoriesMock,
}))

function filtersFixture(): SearchFilters {
  return {
    q: 'váy hoa',
    category: 'van-nu',
    minPrice: 300000,
    maxPrice: 500000,
    size: 'M',
    color: 'Hồng',
    sort: SearchSort.RELEVANCE,
    page: 0,
  }
}

// Options bắt buộc của tool execute, test không dùng tới nội dung bên trong.
function executeOptions() {
  return { toolCallId: 'tc-test', messages: [] } as never
}

afterEach(function () {
  vi.unstubAllEnvs()
})

describe('readAgentConfig', () => {
  it('đủ 3 biến env thì trả cấu hình agent', function () {
    vi.stubEnv('VITE_AI_BASE_URL', 'https://ai.example.com/v1')
    vi.stubEnv('VITE_AI_API_KEY', 'sk-test')
    vi.stubEnv('VITE_AI_MODEL', 'gpt-test')

    expect(readAgentConfig()).toEqual({
      baseUrl: 'https://ai.example.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-test',
    })
  })

  it('thiếu một biến env thì trả null', function () {
    vi.stubEnv('VITE_AI_BASE_URL', 'https://ai.example.com/v1')
    vi.stubEnv('VITE_AI_MODEL', 'gpt-test')

    expect(readAgentConfig()).toBeNull()
  })

  it('biến env rỗng tính là thiếu', function () {
    vi.stubEnv('VITE_AI_BASE_URL', 'https://ai.example.com/v1')
    vi.stubEnv('VITE_AI_API_KEY', '')
    vi.stubEnv('VITE_AI_MODEL', 'gpt-test')

    expect(readAgentConfig()).toBeNull()
  })
})

describe('buildSystemPrompt', () => {
  it('nhúng bộ lọc hiện tại của trang vào prompt', function () {
    const prompt = buildSystemPrompt(filtersFixture())

    expect(prompt).toContain('váy hoa')
    expect(prompt).toContain('van-nu')
    expect(prompt).toContain('300000')
    expect(prompt).toContain('500000')
    expect(prompt).toContain('M')
    expect(prompt).toContain('Hồng')
  })

  it('luôn nhắc tool searchProducts trong prompt', function () {
    const prompt = buildSystemPrompt(filtersFixture())

    expect(prompt).toContain('searchProducts')
  })

  it('bộ lọc trống thì báo không có bộ lọc, không crash', function () {
    const prompt = buildSystemPrompt({
      q: null,
      category: null,
      minPrice: null,
      maxPrice: null,
      size: null,
      color: null,
      sort: null,
      page: 0,
    })

    expect(prompt).toContain('searchProducts')
    expect(prompt).toContain('Không có bộ lọc nào đang bật')
  })
})

describe('toFilterPatch', () => {
  it('chỉ giữ field có giá trị, bỏ limit và field rỗng', function () {
    const patch = toFilterPatch({
      q: 'áo polo',
      minPrice: 100000,
      maxPrice: null,
      category: null,
      size: null,
      color: null,
      sort: null,
      limit: 8,
    })

    expect(patch).toEqual({ q: 'áo polo', minPrice: 100000 })
  })

  it('bỏ sort không nằm trong SearchSort', function () {
    const patch = toFilterPatch({ sort: 'RANDOM' as SearchSort })

    expect(patch.sort).toBeUndefined()
  })

  it('giữ sort hợp lệ', function () {
    const patch = toFilterPatch({ sort: SearchSort.PRICE_ASC })

    expect(patch).toEqual({ sort: SearchSort.PRICE_ASC })
  })
})

describe('toSearchParams', () => {
  it('mặc định limit 8, bỏ từ khóa rỗng', function () {
    const params = toSearchParams({ q: '', category: 'ao-thun' })

    expect(params).toEqual({ category: 'ao-thun', limit: 8 })
  })

  it('giữ limit model truyền vào và sort hợp lệ', function () {
    const params = toSearchParams({ q: 'quần', limit: 5, sort: SearchSort.PRICE_ASC })

    expect(params).toEqual({ q: 'quần', limit: 5, sort: SearchSort.PRICE_ASC })
  })

  it('bỏ các field null/undefined', function () {
    const params = toSearchParams({ q: 'áo', minPrice: null, size: undefined })

    expect(params).toEqual({ q: 'áo', limit: 8 })
  })
})

describe('searchProductsInputSchema', () => {
  it('nhận mọi giá trị SearchSort của generated enum', function () {
    for (const sort of Object.values(SearchSort)) {
      expect(searchProductsInputSchema.safeParse({ sort }).success).toBe(true)
    }
  })

  it('chặn sort lạ ngoài enum', function () {
    expect(searchProductsInputSchema.safeParse({ sort: 'RANDOM' }).success).toBe(false)
  })
})

describe('filtersFromMessages', () => {
  it('lấy bộ lọc từ metadata của tin nhắn user gần nhất', function () {
    const filters = filtersFixture()
    const messages = [
      { id: 'u1', role: 'user', parts: [], metadata: { filters: { ...filters, q: 'áo cũ' } } },
      { id: 'a1', role: 'assistant', parts: [] },
      { id: 'u2', role: 'user', parts: [], metadata: { filters: { ...filters, q: 'váy mới' } } },
    ] as unknown as AgentUIMessage[]

    expect(filtersFromMessages(messages).q).toBe('váy mới')
  })

  it('không có metadata nào thì trả về bộ lọc rỗng', function () {
    const messages = [
      { id: 'u1', role: 'user', parts: [] },
      { id: 'a1', role: 'assistant', parts: [] },
    ] as unknown as AgentUIMessage[]

    expect(filtersFromMessages(messages)).toEqual(EMPTY_FILTERS)
  })
})

describe('createSearchTools', () => {
  it('searchProducts gọi API search với SearchParams và trả kết quả gọn', async function () {
    searchMock.mockResolvedValue({
      status: 200,
      data: { items: [{ id: 'p1', name: 'Áo polo', minPrice: 250000 }], total: 1 },
    })

    const tools = createSearchTools()
    const output = await tools.searchProducts.execute?.({ q: 'áo polo' }, executeOptions())

    expect(searchMock).toHaveBeenCalledWith({ q: 'áo polo', limit: 8 })
    expect(output).toEqual({
      total: 1,
      appliedParams: { q: 'áo polo' },
      items: [{ id: 'p1', name: 'Áo polo', minPrice: 250000 }],
    })
  })

  it('searchProducts áp dụng đủ bộ lọc model truyền vào', async function () {
    searchMock.mockResolvedValue({ status: 200, data: { items: [], total: 0 } })

    const tools = createSearchTools()
    await tools.searchProducts.execute?.(
      { category: 'van-nu', maxPrice: 500000, size: 'M', limit: 4 },
      executeOptions(),
    )

    expect(searchMock).toHaveBeenCalledWith({
      category: 'van-nu',
      maxPrice: 500000,
      size: 'M',
      limit: 4,
    })
  })

  it('listCategories trả danh sách slug + name gọn', async function () {
    listCategoriesMock.mockResolvedValue({
      status: 200,
      data: [{ id: '1', slug: 'ao', name: 'Áo', productCount: 5 }],
    })

    const tools = createSearchTools()
    const output = await tools.listCategories.execute?.({}, executeOptions())

    expect(output).toEqual({ categories: [{ slug: 'ao', name: 'Áo' }] })
  })
})
