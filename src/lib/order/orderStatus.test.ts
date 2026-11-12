import { describe, expect, it } from 'vite-plus/test'

import {
  BUYER_ORDER_TABS,
  canCancel,
  canConfirmReceipt,
  orderItemSummary,
  orderStatusMeta,
  paymentStatusLabel,
  returnStatusMeta,
} from './orderStatus'

describe('orderStatusMeta', () => {
  it('PENDING cua don hang la Cho xac nhan, khong phai Cho duyet', () => {
    expect(orderStatusMeta('PENDING').label).toBe('Chờ xác nhận')
  })

  it('map nhan cac trang thai don hang', () => {
    expect(orderStatusMeta('CONFIRMED').label).toBe('Shop đang chuẩn bị hàng')
    expect(orderStatusMeta('SHIPPING').label).toBe('Đang giao')
    expect(orderStatusMeta('DELIVERED').label).toBe('Hoàn thành')
    expect(orderStatusMeta('CANCELLED').label).toBe('Đã hủy')
  })

  it('status la tra ve label goc, null tra ve Khong ro', () => {
    expect(orderStatusMeta('WEIRD').label).toBe('WEIRD')
    expect(orderStatusMeta(null).label).toBe('Không rõ')
  })
})

describe('orderItemSummary', () => {
  it('mot san pham thi hien ten', () => {
    expect(orderItemSummary([{ productName: 'Áo thun' }])).toBe('Áo thun')
  })

  it('nhieu san pham thi hien ten dau tien kem so con lai', () => {
    const items = [
      { productName: 'Áo thun' },
      { productName: 'Quần jean' },
      { productName: 'Mũ lưỡi trai' },
    ]
    expect(orderItemSummary(items)).toBe('Áo thun +2 sản phẩm khác')
  })

  it('don khong co item tra ve chuoi rong', () => {
    expect(orderItemSummary([])).toBe('')
    expect(orderItemSummary(undefined)).toBe('')
  })
})

describe('canCancel', () => {
  it('chi huy duoc khi PENDING', () => {
    expect(canCancel('PENDING')).toBe(true)
  })

  it('khong huy duoc khi don da di tiep', () => {
    expect(canCancel('CONFIRMED')).toBe(false)
    expect(canCancel('SHIPPING')).toBe(false)
    expect(canCancel('DELIVERED')).toBe(false)
    expect(canCancel('CANCELLED')).toBe(false)
    expect(canCancel(undefined)).toBe(false)
  })
})

describe('paymentStatusLabel', () => {
  it('map trang thai thanh toan COD', () => {
    expect(paymentStatusLabel('UNPAID')).toBe('Chưa thanh toán')
    expect(paymentStatusLabel('COLLECTED')).toBe('Đã thu tiền')
  })

  it('map trang thai thanh toan loi FAILED', () => {
    expect(paymentStatusLabel('FAILED')).toBe('Thanh toán lỗi')
  })

  it('trang thai la thi hien nguyen van', () => {
    expect(paymentStatusLabel('REFUNDED')).toBe('REFUNDED')
  })
})

describe('BUYER_ORDER_TABS', () => {
  it('co du 7 tab dong bo 1-1 voi shop', () => {
    expect(BUYER_ORDER_TABS.map((t) => [t.key, t.label])).toEqual([
      ['ALL', 'Tất cả'],
      ['PENDING', 'Chờ xác nhận'],
      ['CONFIRMED', 'Đang chuẩn bị'],
      ['SHIPPING', 'Đang giao'],
      ['DELIVERED', 'Hoàn thành'],
      ['CANCELLED', 'Đã hủy'],
      ['RETURNS', 'Đổi trả'],
    ])
  })
})

describe('canConfirmReceipt va returnStatusMeta', () => {
  it('chi cho xac nhan da nhan khi don DELIVERED, chua receivedAt va khong bi doi tra chan', () => {
    expect(canConfirmReceipt('DELIVERED', null, null)).toBe(true)
    expect(canConfirmReceipt('DELIVERED', undefined, 'REJECTED')).toBe(true)
    expect(canConfirmReceipt('DELIVERED', '2026-10-20T00:00:00Z', null)).toBe(false)
    expect(canConfirmReceipt('DELIVERED', null, 'REQUESTED')).toBe(false)
    expect(canConfirmReceipt('DELIVERED', null, 'APPROVED')).toBe(false)
    expect(canConfirmReceipt('DELIVERED', null, 'COMPLETED')).toBe(false)
    expect(canConfirmReceipt('SHIPPING', null, null)).toBe(false)
  })

  it('map nhan trang thai doi tra dong bo', () => {
    expect(returnStatusMeta('REQUESTED')?.label).toBe('Đang yêu cầu đổi trả')
    expect(returnStatusMeta('APPROVED')?.label).toBe('Shop đã duyệt đổi trả')
    expect(returnStatusMeta('COMPLETED')?.label).toBe('Đã hoàn tất đổi trả')
    expect(returnStatusMeta('REJECTED')?.label).toBe('Yêu cầu đổi trả bị từ chối')
    expect(returnStatusMeta(null)).toBeNull()
  })
})
