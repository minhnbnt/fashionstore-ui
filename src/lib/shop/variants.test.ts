import { describe, expect, it } from 'vite-plus/test'

import { findVariant, isOptionAvailable } from './variants'

import type { VariantResponse } from '@generated/model/variantResponse'

const variants: VariantResponse[] = [
  { id: 'a', size: 'S', color: 'Đen', price: 100, stockQuantity: 3 },
  { id: 'b', size: 'L', color: 'Đen', price: 120, stockQuantity: 0 },
  { id: 'c', size: 'L', color: 'Trắng', price: 130, stockQuantity: 2 },
]

describe('isOptionAvailable', () => {
  it('chua chon ben kia thi chi can con hang o bat ky bien the nao', () => {
    expect(isOptionAvailable(variants, 'size', 'L', null)).toBe(true)
  })

  it('size het hang voi mau dang chon thi khong chon duoc', () => {
    expect(isOptionAvailable(variants, 'size', 'L', 'Đen')).toBe(false)
    expect(isOptionAvailable(variants, 'size', 'L', 'Trắng')).toBe(true)
  })

  it('to hop khong ton tai thi khong chon duoc', () => {
    expect(isOptionAvailable(variants, 'color', 'Trắng', 'S')).toBe(false)
  })
})

describe('findVariant', () => {
  it('khop dung bien the khi chon du size va mau', () => {
    expect(findVariant(variants, 'L', 'Trắng')?.id).toBe('c')
  })

  it('tra undefined khi to hop khong ton tai', () => {
    expect(findVariant(variants, 'S', 'Trắng')).toBeUndefined()
  })
})
