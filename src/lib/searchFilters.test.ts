import { describe, expect, it } from 'vite-plus/test'

import {
  EMPTY_FILTERS,
  activeFilterCount,
  parseFilters,
  toApiParams,
  toQueryString,
  withFilter,
} from './searchFilters'

describe('parseFilters', () => {
  it('doc du tham so tu URL', () => {
    const f = parseFilters(
      new URLSearchParams(
        'q=ao&category=ao-khoac&minPrice=100000&maxPrice=500000&size=M&color=%C4%90en&sort=PRICE_ASC&page=2',
      ),
    )
    expect(f).toEqual({
      q: 'ao',
      category: 'ao-khoac',
      minPrice: 100000,
      maxPrice: 500000,
      size: 'M',
      color: 'Đen',
      sort: 'PRICE_ASC',
      page: 2,
    })
  })

  it('bo qua gia tri rac', () => {
    const f = parseFilters(new URLSearchParams('minPrice=abc&maxPrice=-5&sort=CHEAP&page=-1&q=%20'))
    expect(f).toEqual(EMPTY_FILTERS)
  })
})

describe('toQueryString', () => {
  it('chi ghi field co gia tri, bo page 0', () => {
    const qs = toQueryString({ ...EMPTY_FILTERS, category: 'ao', size: 'M' })
    expect(qs).toBe('category=ao&size=M')
  })

  it('round trip qua parseFilters', () => {
    const f = { ...EMPTY_FILTERS, q: 'áo thun', minPrice: 0, sort: 'NEWEST' as const, page: 3 }
    expect(parseFilters(new URLSearchParams(toQueryString(f)))).toEqual(f)
  })
})

describe('withFilter', () => {
  it('doi bo loc thi ve trang dau', () => {
    const next = withFilter({ ...EMPTY_FILTERS, page: 4 }, { color: 'Đen' })
    expect(next.page).toBe(0)
    expect(next.color).toBe('Đen')
  })

  it('chi doi trang thi giu trang moi', () => {
    const next = withFilter({ ...EMPTY_FILTERS, color: 'Đen' }, { page: 2 })
    expect(next).toEqual({ ...EMPTY_FILTERS, color: 'Đen', page: 2 })
  })
})

describe('toApiParams', () => {
  it('bo field null, gan limit', () => {
    expect(toApiParams({ ...EMPTY_FILTERS, category: 'ao', page: 1 }, 12)).toEqual({
      category: 'ao',
      page: 1,
      limit: 12,
    })
  })
})

describe('activeFilterCount', () => {
  it('dem bo loc, khong tinh tu khoa, sort, trang', () => {
    const f = {
      ...EMPTY_FILTERS,
      q: 'ao',
      sort: 'NEWEST' as const,
      page: 2,
      size: 'M',
      minPrice: 1,
    }
    expect(activeFilterCount(f)).toBe(2)
  })
})
