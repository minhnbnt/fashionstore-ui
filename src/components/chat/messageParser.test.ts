import { describe, expect, it } from 'vite-plus/test'

import { extractProductSlugs } from './messageParser'

describe('extractProductSlugs', () => {
  it('trả về mảng rỗng khi text rỗng hoặc null', () => {
    expect(extractProductSlugs('')).toEqual([])
    expect(extractProductSlugs(null)).toEqual([])
    expect(extractProductSlugs(undefined)).toEqual([])
  })

  it('trích xuất slug từ đường dẫn tương đối', () => {
    const text = 'Bạn xem qua mẫu này nhé: /products/ao-so-mi-nam-oxford hoặc /product/quan-jean'
    expect(extractProductSlugs(text)).toEqual(['ao-so-mi-nam-oxford', 'quan-jean'])
  })

  it('trích xuất slug từ URL tuyệt đối', () => {
    const text =
      'Sản phẩm tại http://localhost:5173/products/quan-tay-au và https://shop.vn/products/ao-thun'
    expect(extractProductSlugs(text)).toEqual(['quan-tay-au', 'ao-thun'])
  })

  it('loại bỏ các slug trùng lặp', () => {
    const text = 'Xem /products/ao-len rồi xem lại https://store.com/products/ao-len'
    expect(extractProductSlugs(text)).toEqual(['ao-len'])
  })

  it('bỏ qua text thông thường không chứa link sản phẩm', () => {
    const text = 'Xin chào shop, shop có ship COD không?'
    expect(extractProductSlugs(text)).toEqual([])
  })
})
