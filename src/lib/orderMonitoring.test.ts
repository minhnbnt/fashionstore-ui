import { describe, expect, it } from 'vitest'

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
