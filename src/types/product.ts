export interface DemoReview {
  name: string
  rating: number
  text: string
  date: string
}

export interface DemoRating {
  value: number
  count: number
  breakdown: number[]
}

export interface PriceInfo {
  minPrice: number | null
  maxCompareAt: number | null
  sizes: string[]
  colors: string[]
  totalStock: number
}

export type SuccessStatus = 200 | 201

export type OptionKind = 'size' | 'color'

export type Tab = 'mo-ta' | 'thong-so' | 'danh-gia'
