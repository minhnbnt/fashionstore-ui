import { describe, expect, it } from 'vitest'

import {
  calculateDiscountPercent,
  formatDateTime,
  formatFullAddress,
  formatSoldCount,
  formatVnd,
} from './format'

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

describe('formatFullAddress', () => {
  it('ghep dia chi day du', () => {
    const addr = {
      houseNumber: '12',
      street: 'Nguyễn Trãi',
      ward: 'Bến Thành',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
    }
    expect(formatFullAddress(addr)).toBe('12, Nguyễn Trãi, Bến Thành, Quận 1, TP. Hồ Chí Minh')
  })

  it('bo qua cac truong null hoac trong', () => {
    const addr = {
      houseNumber: null,
      street: 'Cầu Giấy',
      ward: '',
      district: 'Cầu Giấy',
      city: 'Hà Nội',
    }
    expect(formatFullAddress(addr)).toBe('Cầu Giấy, Cầu Giấy, Hà Nội')
  })

  it('tra chuoi rong khi khong co dia chi', () => {
    expect(formatFullAddress(null)).toBe('')
    expect(formatFullAddress(undefined)).toBe('')
  })
})

describe('calculateDiscountPercent', () => {
  it('tinh dung phan tram giam', () => {
    expect(calculateDiscountPercent(300000, 400000)).toBe(25)
    expect(calculateDiscountPercent(150000, 200000)).toBe(25)
  })

  it('tra ve 0 neu gia goc nho hon hoac bang gia ban', () => {
    expect(calculateDiscountPercent(400000, 300000)).toBe(0)
    expect(calculateDiscountPercent(300000, 300000)).toBe(0)
  })

  it('tra ve 0 khi gia thieu', () => {
    expect(calculateDiscountPercent(null, 400000)).toBe(0)
    expect(calculateDiscountPercent(300000, null)).toBe(0)
  })
})

describe('formatSoldCount', () => {
  it('dinh dang so ban duoi 1000', () => {
    expect(formatSoldCount(48)).toBe('48')
    expect(formatSoldCount(999)).toBe('999')
  })

  it('dinh dang so ban tu 1000 tro len', () => {
    expect(formatSoldCount(1000)).toBe('1k')
    expect(formatSoldCount(1250)).toBe('1.3k')
    expect(formatSoldCount(12000)).toBe('12k')
  })

  it('tra ve 0 neu count nho hon hoac bang 0', () => {
    expect(formatSoldCount(0)).toBe('0')
    expect(formatSoldCount(null)).toBe('0')
    expect(formatSoldCount(undefined)).toBe('0')
  })
})
