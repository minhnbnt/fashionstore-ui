import { describe, expect, it } from 'vitest'

import {
  appendTemplate,
  canBan,
  canRestore,
  priceRangeLabel,
  reasonError,
  statusLabel,
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

describe('priceRangeLabel', () => {
  it('shows single price when min equals max', () => {
    expect(priceRangeLabel(100000, 100000)).not.toContain('–')
  })

  it('shows range otherwise', () => {
    expect(priceRangeLabel(100000, 150000)).toContain('–')
  })
})
