import type { SearchSort } from '@generated/model/searchSort'

export interface SearchFilters {
  q: string | null
  category: string | null
  minPrice: number | null
  maxPrice: number | null
  size: string | null
  color: string | null
  sort: SearchSort | null
  page: number
}

export interface PricePreset {
  label: string
  min: number | null
  max: number | null
}
