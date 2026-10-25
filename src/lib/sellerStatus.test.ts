import { describe, expect, it } from 'vitest'

import { sellerProductStatusMeta, sellerStatusMeta } from './sellerStatus'

describe('sellerStatusMeta', () => {
  it('PENDING cua don hang la Cho xac nhan', () => {
    expect(sellerStatusMeta('PENDING').label).toBe('Chờ xác nhận')
  })

  it('map dung nhãn trang thai san pham va don hang', () => {
    expect(sellerStatusMeta('ACTIVE').label).toBe('Đang bán')
    expect(sellerStatusMeta('HIDDEN').label).toBe('Đã ẩn')
    expect(sellerStatusMeta('BANNED').label).toBe('Bị gỡ')
    expect(sellerStatusMeta('DELETED').label).toBe('Đã xóa')
    expect(sellerStatusMeta('DELIVERED').label).toBe('Đã giao (Đã thu COD)')
  })

  it('status khong biet tra ve label goc, null tra ve Khong ro', () => {
    expect(sellerStatusMeta('WEIRD').label).toBe('WEIRD')
    expect(sellerStatusMeta(null).label).toBe('Không rõ')
  })
})

describe('sellerProductStatusMeta', () => {
  it('PENDING cua san pham la Cho duyet, khong phai Cho xac nhan', () => {
    expect(sellerProductStatusMeta('PENDING').label).toBe('Chờ duyệt')
  })

  it('cac trang thai san pham khac deu theo sellerStatusMeta', () => {
    expect(sellerProductStatusMeta('ACTIVE').label).toBe('Đang bán')
    expect(sellerProductStatusMeta('HIDDEN').label).toBe('Đã ẩn')
    expect(sellerProductStatusMeta('BANNED').label).toBe('Bị gỡ')
    expect(sellerProductStatusMeta('DELETED').label).toBe('Đã xóa')
  })
})
