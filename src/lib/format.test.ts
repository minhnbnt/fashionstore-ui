import { describe, expect, it } from 'vite-plus/test'

import {
  calculateDiscountPercent,
  formatAddressLabel,
  formatDateTime,
  formatFullAddress,
  formatSoldCount,
  formatVnd,
  priceLabel,
  splitFullAddress,
} from './format'

describe('priceLabel', () => {
  it('tra ve gia khi co du lieu', () => {
    expect(priceLabel(391000)).toBe('391.000 ₫')
  })

  it('tra ve Lien he khi null hoac undefined', () => {
    expect(priceLabel(null)).toBe('Liên hệ')
    expect(priceLabel(undefined)).toBe('Liên hệ')
  })
})

describe('formatVnd', () => {
  it('dinh dang tien Viet', () => {
    expect(formatVnd(391000)).toBe('391.000 ₫')
  })

  it('an toan khi truyen null hoac undefined hoac NaN', () => {
    expect(formatVnd(null)).toBe('0 ₫')
    expect(formatVnd(undefined)).toBe('0 ₫')
    expect(formatVnd(NaN)).toBe('0 ₫')
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
  it('tra fullAddress san co', () => {
    expect(formatFullAddress({ fullAddress: 'Số 18 Duy Tân, Phường Dịch Vọng, Hà Nội' })).toBe(
      'Số 18 Duy Tân, Phường Dịch Vọng, Hà Nội',
    )
  })

  it('trim khoang trang thua', () => {
    expect(formatFullAddress({ fullAddress: '  Số 18 Duy Tân  ' })).toBe('Số 18 Duy Tân')
  })

  it('tra chuoi rong khi khong co dia chi', () => {
    expect(formatFullAddress(null)).toBe('')
    expect(formatFullAddress(undefined)).toBe('')
    expect(formatFullAddress({})).toBe('')
  })
})

describe('splitFullAddress', () => {
  it('tach theo format detail, xa/phuong, tinh/thanh', () => {
    const parts = splitFullAddress('Số 18 Duy Tân, Phường Dịch Vọng, Hà Nội')
    expect(parts.detail).toBe('Số 18 Duy Tân')
    expect(parts.ward).toBe('Phường Dịch Vọng')
    expect(parts.province).toBe('Hà Nội')
  })

  it('detail chua dau phay van tach dung', () => {
    const parts = splitFullAddress('Số 18, Tòa Keangnam, Phường Mễ Trì, Hà Nội')
    expect(parts.detail).toBe('Số 18, Tòa Keangnam')
    expect(parts.ward).toBe('Phường Mễ Trì')
    expect(parts.province).toBe('Hà Nội')
  })

  it('chung duoi 3 phan thi roi vao detail', () => {
    const parts = splitFullAddress('Hà Nội')
    expect(parts.detail).toBe('Hà Nội')
    expect(parts.ward).toBe('')
    expect(parts.province).toBe('')
  })

  it('chuoi rong tra 3 phan rong', () => {
    expect(splitFullAddress('')).toEqual({ detail: '', ward: '', province: '' })
  })
})

describe('formatAddressLabel', () => {
  it('dich dung cac loai nhan', () => {
    expect(formatAddressLabel('HOME')).toBe('Nhà riêng')
    expect(formatAddressLabel('OFFICE')).toBe('Công ty')
    expect(formatAddressLabel('OTHER')).toBe('Khác')
    expect(formatAddressLabel(null)).toBe('Nhà riêng')
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
