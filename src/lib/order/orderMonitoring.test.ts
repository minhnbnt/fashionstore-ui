import { describe, expect, it } from 'vite-plus/test'

import {
  actorLabel,
  alertLabel,
  canAdminCancel,
  cancelledByLabel,
  cancelReasonLabel,
  dateRangeError,
  elapsedLabel,
  statusLabel,
  tabCount,
  timelineTitle,
} from './orderMonitoring'

describe('canAdminCancel', () => {
  it('allows only orders not yet handed over to carrier', () => {
    expect(canAdminCancel('PENDING')).toBe(true)
    expect(canAdminCancel('CONFIRMED')).toBe(true)
    expect(canAdminCancel('SHIPPING')).toBe(false)
    expect(canAdminCancel('DELIVERED')).toBe(false)
    expect(canAdminCancel('CANCELLED')).toBe(false)
    expect(canAdminCancel(undefined)).toBe(false)
  })
})

describe('labels', () => {
  it('maps statuses, alerts and actors to Vietnamese', () => {
    expect(statusLabel('PENDING')).toBe('Chờ xác nhận')
    expect(statusLabel('SHIPPING')).toBe('Đang giao')
    expect(alertLabel('HANDOVER_LATE')).toBe('Chậm bàn giao vận chuyển')
    expect(alertLabel(null)).toBe('')
    expect(actorLabel('SELLER')).toBe('Người bán')
    expect(cancelledByLabel('ADMIN')).toBe('Quản trị sàn')
  })

  it('keeps unknown cancel reasons as typed by seller', () => {
    expect(cancelReasonLabel('FRAUD_SUSPECTED')).toBe('Nghi gian lận, đơn ảo')
    expect(cancelReasonLabel('OUT_OF_STOCK')).toBe('OUT_OF_STOCK')
    expect(cancelReasonLabel(undefined)).toBe('')
  })

  it('maps buyer cancel reasons and distinguishes BUYER OTHER vs ADMIN OTHER', () => {
    expect(cancelReasonLabel('CHANGE_MIND', 'BUYER')).toBe('Đổi ý')
    expect(cancelReasonLabel('FOUND_CHEAPER', 'BUYER')).toBe('Tìm được giá rẻ hơn')
    expect(cancelReasonLabel('ORDERED_BY_MISTAKE', 'BUYER')).toBe('Đặt nhầm')
    expect(cancelReasonLabel('OTHER', 'BUYER')).toBe('Khác')
    expect(cancelReasonLabel('OTHER', 'ADMIN')).toBe('Lý do khác')
    expect(cancelReasonLabel('OTHER')).toBe('Lý do khác')
    expect(actorLabel('SYSTEM')).toBe('Hệ thống')
    expect(cancelledByLabel('SYSTEM')).toBe('Hệ thống')
  })

  it('formats timelineTitle for normal transitions and receipt confirmation', () => {
    expect(timelineTitle(null, 'PENDING', 'BUYER')).toBe('Tạo đơn hàng')
    expect(timelineTitle('PENDING', 'CONFIRMED', 'SELLER')).toBe('Shop xác nhận đơn')
    expect(timelineTitle('CONFIRMED', 'SHIPPING', 'SELLER')).toBe('Bàn giao cho đơn vị vận chuyển')
    expect(timelineTitle('SHIPPING', 'DELIVERED', 'SELLER')).toBe('Hoàn tất giao hàng')
    expect(timelineTitle('DELIVERED', 'DELIVERED', 'BUYER')).toBe('Người mua xác nhận đã nhận hàng')
    expect(timelineTitle('DELIVERED', 'DELIVERED', 'SYSTEM')).toBe(
      'Hệ thống tự động xác nhận hoàn thành sau 7 ngày',
    )
    expect(timelineTitle('PENDING', 'CANCELLED', 'BUYER')).toBe('Hủy đơn')
  })
})

describe('tabCount', () => {
  const summary = {
    total: 9,
    pending: 3,
    confirmed: 2,
    shipping: 1,
    delivered: 2,
    cancelled: 1,
  }

  it('reads the matching counter, ALL is total', () => {
    expect(tabCount(summary, 'ALL')).toBe(9)
    expect(tabCount(summary, 'PENDING')).toBe(3)
    expect(tabCount(summary, 'CANCELLED')).toBe(1)
  })

  it('is undefined while summary is loading', () => {
    expect(tabCount(undefined, 'PENDING')).toBeUndefined()
  })
})

describe('dateRangeError', () => {
  it('rejects from after to', () => {
    expect(dateRangeError('2026-10-18', '2026-10-01')).toBe(
      'Ngày bắt đầu phải trước ngày kết thúc.',
    )
  })

  it('accepts open or ordered ranges', () => {
    expect(dateRangeError('', '2026-10-01')).toBeNull()
    expect(dateRangeError('2026-10-01', '')).toBeNull()
    expect(dateRangeError('2026-10-01', '2026-10-01')).toBeNull()
  })
})

describe('elapsedLabel', () => {
  const now = new Date('2026-10-18T12:00:00Z')

  it('picks the largest whole unit', () => {
    expect(elapsedLabel('2026-10-18T11:59:30Z', now)).toBe('vừa xong')
    expect(elapsedLabel('2026-10-18T11:15:00Z', now)).toBe('45 phút')
    expect(elapsedLabel('2026-10-18T02:00:00Z', now)).toBe('10 giờ')
    expect(elapsedLabel('2026-10-15T11:00:00Z', now)).toBe('3 ngày')
  })

  it('is empty without a timestamp', () => {
    expect(elapsedLabel(undefined, now)).toBe('')
  })
})
