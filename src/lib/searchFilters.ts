import { SearchSort } from '@generated/model/searchSort'

import type { PricePreset, SearchFilters } from '@/types/search'
import type { SearchParams } from '@generated/model/searchParams'

// Trạng thái trang tìm kiếm sống trên URL (?q=&category=...) để chia sẻ link, back/forward đúng.
export const EMPTY_FILTERS: SearchFilters = {
  q: null,
  category: null,
  minPrice: null,
  maxPrice: null,
  size: null,
  color: null,
  sort: null,
  page: 0,
}

export const SORT_LABELS: Record<SearchSort, string> = {
  RELEVANCE: 'Phù hợp nhất',
  NEWEST: 'Mới nhất',
  PRICE_ASC: 'Giá thấp → cao',
  PRICE_DESC: 'Giá cao → thấp',
}

export const PRICE_PRESETS: PricePreset[] = [
  { label: 'Dưới 300k', min: null, max: 300000 },
  { label: '300k – 500k', min: 300000, max: 500000 },
  { label: '500k – 1 triệu', min: 500000, max: 1000000 },
  { label: 'Trên 1 triệu', min: 1000000, max: null },
]

function text(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)
  if (value === null) {
    return null
  }
  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }
  return trimmed
}

function nonNegativeInt(params: URLSearchParams, key: string): number | null {
  const value = text(params, key)
  if (value === null) {
    return null
  }
  const n = Number(value)
  if (Number.isInteger(n) === false || n < 0) {
    return null
  }
  return n
}

function sortOf(params: URLSearchParams): SearchSort | null {
  const value = text(params, 'sort')
  if (value === null) {
    return null
  }
  const known = Object.values(SearchSort) as string[]
  if (known.includes(value) === false) {
    return null
  }
  return value as SearchSort
}

export function parseFilters(params: URLSearchParams): SearchFilters {
  return {
    q: text(params, 'q'),
    category: text(params, 'category'),
    minPrice: nonNegativeInt(params, 'minPrice'),
    maxPrice: nonNegativeInt(params, 'maxPrice'),
    size: text(params, 'size'),
    color: text(params, 'color'),
    sort: sortOf(params),
    page: nonNegativeInt(params, 'page') ?? 0,
  }
}

export function toQueryString(filters: SearchFilters): string {
  const params = new URLSearchParams()
  if (filters.q !== null) {
    params.set('q', filters.q)
  }
  if (filters.category !== null) {
    params.set('category', filters.category)
  }
  if (filters.minPrice !== null) {
    params.set('minPrice', String(filters.minPrice))
  }
  if (filters.maxPrice !== null) {
    params.set('maxPrice', String(filters.maxPrice))
  }
  if (filters.size !== null) {
    params.set('size', filters.size)
  }
  if (filters.color !== null) {
    params.set('color', filters.color)
  }
  if (filters.sort !== null) {
    params.set('sort', filters.sort)
  }
  if (filters.page > 0) {
    params.set('page', String(filters.page))
  }
  return params.toString()
}

// Đổi bất kỳ bộ lọc nào thì quay về trang đầu, chỉ đổi trang thì giữ trang mới.
export function withFilter(filters: SearchFilters, patch: Partial<SearchFilters>): SearchFilters {
  const next = { ...filters, ...patch }
  if (patch.page === undefined) {
    next.page = 0
  }
  return next
}

export function toApiParams(filters: SearchFilters, limit: number): SearchParams {
  const params: SearchParams = { limit }
  if (filters.q !== null) {
    params.q = filters.q
  }
  if (filters.category !== null) {
    params.category = filters.category
  }
  if (filters.minPrice !== null) {
    params.minPrice = filters.minPrice
  }
  if (filters.maxPrice !== null) {
    params.maxPrice = filters.maxPrice
  }
  if (filters.size !== null) {
    params.size = filters.size
  }
  if (filters.color !== null) {
    params.color = filters.color
  }
  if (filters.sort !== null) {
    params.sort = filters.sort
  }
  if (filters.page > 0) {
    params.page = filters.page
  }
  return params
}

// Số bộ lọc đang bật (danh mục, giá, size, màu), dùng cho badge nút "Bộ lọc" trên mobile.
export function activeFilterCount(filters: SearchFilters): number {
  let count = 0
  if (filters.category !== null) {
    count += 1
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    count += 1
  }
  if (filters.size !== null) {
    count += 1
  }
  if (filters.color !== null) {
    count += 1
  }
  return count
}
