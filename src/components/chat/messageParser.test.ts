import { describe, expect, it } from 'vite-plus/test'

import { extractProductSlugs, formatChatPreview, stripProductLinks } from './messageParser'

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

describe('stripProductLinks & formatChatPreview', () => {
  it('trả về chuỗi rỗng khi tin nhắn chỉ có link sản phẩm', () => {
    expect(stripProductLinks('/product/22222222-0000-0000-0001-000000000001')).toBe('')
    expect(stripProductLinks('https://shop.vn/products/22222222-0000-0000-0001-000000000001')).toBe(
      '',
    )
  })

  it('giữ lại nội dung văn bản và bỏ phần đường dẫn sản phẩm', () => {
    expect(
      stripProductLinks('Bạn xem mẫu này nhé: /product/22222222-0000-0000-0001-000000000001'),
    ).toBe('Bạn xem mẫu này nhé:')
  })

  it('không phá vỡ link markdown dạng [Tên](/product/id)', () => {
    expect(stripProductLinks('Xem [Áo sơ mi](/product/p-1) hoặc /product/p-2')).toBe(
      'Xem [Áo sơ mi](/product/p-1) hoặc',
    )
  })

  it('formatChatPreview hiển thị [Sản phẩm] cho tin nhắn chỉ có link sản phẩm', () => {
    expect(formatChatPreview('/product/22222222-0000-0000-0001-000000000001')).toBe('[Sản phẩm]')
    expect(formatChatPreview('Còn size M không /product/p-1')).toBe('Còn size M không')
  })
})
