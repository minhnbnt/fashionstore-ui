import { describe, expect, it } from 'vitest'

import {
  appendTemplate,
  BUYER_REPORT_REASONS,
  canBan,
  canRestore,
  keywordError,
  priceRangeLabel,
  reasonError,
  reportSourceLabel,
  reportStatusLabel,
  statusLabel,
  VIOLATION_OPTIONS,
  violationLabel,
} from './productModeration'

describe('reasonError', () => {
  it('requires at least 5 characters after trimming', () => {
    expect(reasonError('   abc  ')).toBe('Lý do cần ít nhất 5 ký tự.')
    expect(reasonError('Hàng nhái')).toBeNull()
  })

  it('caps at 500 characters', () => {
    expect(reasonError('a'.repeat(500))).toBeNull()
    expect(reasonError('a'.repeat(501))).toBe('Lý do tối đa 500 ký tự.')
  })
})

describe('appendTemplate', () => {
  it('fills empty reason with template', () => {
    expect(appendTemplate('  ', 'Sai danh mục.')).toBe('Sai danh mục.')
  })

  it('appends without duplicating', () => {
    const once = appendTemplate('Ảnh sai.', 'Giá bất thường.')
    expect(once).toBe('Ảnh sai. Giá bất thường.')
    expect(appendTemplate(once, 'Giá bất thường.')).toBe(once)
  })
})

describe('status rules', () => {
  it('bans only active or hidden products', () => {
    expect(canBan('ACTIVE')).toBe(true)
    expect(canBan('HIDDEN')).toBe(true)
    expect(canBan('BANNED')).toBe(false)
    expect(canBan('DELETED')).toBe(false)
  })

  it('restores only banned products', () => {
    expect(canRestore('BANNED')).toBe(true)
    expect(canRestore('HIDDEN')).toBe(false)
  })

  it('labels statuses in Vietnamese', () => {
    expect(statusLabel('BANNED')).toBe('Bị gỡ')
    expect(statusLabel('DELETED')).toBe('Shop đã xóa')
  })
})

describe('violationLabel', () => {
  it('maps known types and falls back to raw code', () => {
    expect(violationLabel('COUNTERFEIT')).toBe('Hàng giả, hàng nhái')
    expect(violationLabel('NEW_TYPE')).toBe('NEW_TYPE')
    expect(violationLabel(null)).toBe('')
  })
})

describe('report labels', () => {
  it('labels report source and status', () => {
    expect(reportSourceLabel('SYSTEM')).toBe('Hệ thống')
    expect(reportSourceLabel('USER')).toBe('Người mua')
    expect(reportStatusLabel('OPEN')).toBe('Chờ xử lý')
    expect(reportStatusLabel('DISMISSED')).toBe('Không vi phạm')
  })

  it('offers every violation type to buyers', () => {
    expect(BUYER_REPORT_REASONS.map((reason) => reason.type)).toEqual(
      expect.arrayContaining(VIOLATION_OPTIONS.map((option) => option.type)),
    )
  })
})

describe('keywordError', () => {
  it('requires 2 to 100 characters after trimming', () => {
    expect(keywordError(' a ')).toBe('Từ khóa cần ít nhất 2 ký tự.')
    expect(keywordError('fake')).toBeNull()
    expect(keywordError('a'.repeat(101))).toBe('Từ khóa tối đa 100 ký tự.')
  })
})

describe('priceRangeLabel', () => {
  it('shows single price when min equals max', () => {
    expect(priceRangeLabel(100000, 100000)).not.toContain('–')
  })

  it('shows range otherwise', () => {
    expect(priceRangeLabel(100000, 150000)).toContain('–')
  })
})
