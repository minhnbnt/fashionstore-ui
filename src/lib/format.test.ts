import { describe, expect, it } from 'vitest'

import { formatDateTime, formatVnd } from './format'

describe('formatVnd', () => {
  it('dinh dang tien Viet', () => {
    expect(formatVnd(391000)).toBe('391.000 ₫')
  })
})

describe('formatDateTime', () => {
  it('bo trong khi khong co du lieu', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('')).toBe('')
  })

  it('dinh dang dd/MM/yyyy HH:mm', () => {
    expect(formatDateTime('2026-10-18T09:30:00Z')).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
  })

  it('chuoi khong phai ngay thi tra nguyen ban', () => {
    expect(formatDateTime('khong-phai-ngay')).toBe('khong-phai-ngay')
  })
})
