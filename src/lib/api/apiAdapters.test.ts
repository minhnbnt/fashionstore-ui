import { describe, expect, it } from 'vite-plus/test'

import {
  apiErrorMessage,
  apiErrorText,
  hookErrorMessage,
  imageUrl,
  priceInfo,
  takeData,
} from './apiAdapters'
import { ApiError } from './apiFetch'

import type { ProductResponse } from '@generated/model/productResponse'
import type { VariantResponse } from '@generated/model/variantResponse'

function variant(over: Partial<VariantResponse>): VariantResponse {
  return {
    id: 'v1',
    size: 'M',
    color: 'Trắng',
    price: 391000,
    compareAtPrice: null,
    stockQuantity: 5,
    ...over,
  }
}

function product(variants: VariantResponse[]): ProductResponse {
  return { id: 'p1', name: 'Áo demo', variants }
}

describe('imageUrl', () => {
  it('key null thi tra placeholder', () => {
    expect(imageUrl(null)).toContain('picsum')
  })

  it('key S3 thi ghep voi base URL', () => {
    const base = import.meta.env.VITE_ASSETS_URL as string
    expect(imageUrl('shops/a/img.jpg')).toBe(`${base}/shops/a/img.jpg`)
  })
})

describe('priceInfo', () => {
  it('lay gia thap nhat va tong ton kho', () => {
    const info = priceInfo(
      product([
        variant({ id: 'v1', price: 500000, stockQuantity: 3 }),
        variant({ id: 'v2', price: 391000, stockQuantity: 7 }),
      ]),
    )
    expect(info.minPrice).toBe(391000)
    expect(info.totalStock).toBe(10)
  })

  it('gom size va mau khong trung', () => {
    const info = priceInfo(
      product([
        variant({ id: 'v1', size: 'M', color: 'Trắng' }),
        variant({ id: 'v2', size: 'M', color: 'Đen' }),
        variant({ id: 'v3', size: 'L', color: 'Trắng' }),
      ]),
    )
    expect(info.sizes).toEqual(['M', 'L'])
    expect(info.colors).toEqual(['Trắng', 'Đen'])
  })

  it('khong co variant thi gia null, ton 0', () => {
    const info = priceInfo(product([]))
    expect(info.minPrice).toBe(null)
    expect(info.totalStock).toBe(0)
  })
})

describe('takeData', () => {
  it('rut data tu response success', () => {
    const p = product([])
    expect(takeData({ data: p, status: 200 })).toBe(p)
  })

  it('chap nhan 201 cho checkout', () => {
    const p = product([])
    expect(takeData({ data: p, status: 201 })).toBe(p)
  })

  it('status loi thi nem loi', () => {
    expect(function () {
      takeData({ data: { title: 'Not found' }, status: 404 })
    }).toThrow()
  })
})

describe('apiErrorMessage', () => {
  it('404 PDP thi bao khong tim thay', () => {
    expect(apiErrorMessage('productDetail', 404)).toBe('Sản phẩm không tồn tại hoặc đã gỡ.')
  })

  it('401 thi bao het phien dang nhap', () => {
    expect(apiErrorMessage('productDetail', 401)).toBe(
      'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
    )
  })

  it('ma la thi bao chung', () => {
    expect(apiErrorMessage('search', 500)).toBe('Đã xảy ra lỗi. Vui lòng thử lại sau.')
  })
})

describe('hookErrorMessage', () => {
  it('ApiError thi map theo status', () => {
    expect(hookErrorMessage('productDetail', new ApiError(404, 'x'))).toBe(
      'Sản phẩm không tồn tại hoặc đã gỡ.',
    )
  })

  it('loi khac thi bao chung', () => {
    expect(hookErrorMessage('search', new Error('down'))).toBe(
      'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    )
  })
})

describe('apiErrorText', () => {
  it('ApiError thi tra ve message BE (detail/message da duoc map trong apiFetch)', () => {
    expect(apiErrorText(new ApiError(409, 'Vai trò đang có thành viên, không thể xóa'), 'F')).toBe(
      'Vai trò đang có thành viên, không thể xóa',
    )
  })

  it('khong phai ApiError thi tra ve fallback', () => {
    expect(apiErrorText(new Error('network down'), 'Fallback')).toBe('Fallback')
    expect(apiErrorText(undefined, 'Fallback')).toBe('Fallback')
  })

  it('ApiError message rong thi tra ve fallback', () => {
    expect(apiErrorText(new ApiError(500, ''), 'Fallback')).toBe('Fallback')
  })
})
