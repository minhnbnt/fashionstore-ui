import { describe, expect, it } from 'vite-plus/test'

import { isLikelyProvince, isLikelyWard, parseAddressForSelector } from './addressParser'

describe('addressParser', () => {
  const KNOWN_PROVINCES = ['Thành phố Hà Nội', 'Hà Nội', 'Thành phố Hồ Chí Minh', 'Đà Nẵng']

  describe('isLikelyProvince', () => {
    it('nhan dien dung cac tien to Tinh/Thanh pho', () => {
      expect(isLikelyProvince('Thành phố Hà Nội')).toBe(true)
      expect(isLikelyProvince('Tỉnh Bắc Ninh')).toBe(true)
      expect(isLikelyProvince('TP. Hồ Chí Minh')).toBe(true)
      expect(isLikelyProvince('TP Đà Nẵng')).toBe(true)
    })

    it('nhan dien qua danh sach knownProvinces', () => {
      expect(isLikelyProvince('Hà Nội', KNOWN_PROVINCES)).toBe(true)
      expect(isLikelyProvince('Đà Nẵng', KNOWN_PROVINCES)).toBe(true)
      expect(isLikelyProvince('Phường Hàng Bài', KNOWN_PROVINCES)).toBe(false)
    })
  })

  describe('isLikelyWard', () => {
    it('nhan dien dung cac tien to Phuong/Xa/Thi tran', () => {
      expect(isLikelyWard('Phường Dịch Vọng Hậu')).toBe(true)
      expect(isLikelyWard('Xã Kim Chung')).toBe(true)
      expect(isLikelyWard('Thị trấn Phùng')).toBe(true)
      expect(isLikelyWard('Số 18 Duy Tân')).toBe(false)
    })
  })

  describe('parseAddressForSelector', () => {
    it('chuoi chi co Tinh/TP thi phai vao province, detail va ward phai rong', () => {
      const p1 = parseAddressForSelector('Thành phố Hà Nội')
      expect(p1.province).toBe('Thành phố Hà Nội')
      expect(p1.ward).toBe('')
      expect(p1.detail).toBe('')

      const p2 = parseAddressForSelector('Tỉnh Quảng Ninh')
      expect(p2.province).toBe('Tỉnh Quảng Ninh')
      expect(p2.ward).toBe('')
      expect(p2.detail).toBe('')

      const p3 = parseAddressForSelector('Hà Nội', KNOWN_PROVINCES)
      expect(p3.province).toBe('Hà Nội')
      expect(p3.ward).toBe('')
      expect(p3.detail).toBe('')
    })

    it('chuoi chi co Phuong va Tinh (2 phan) phai vao ward va province', () => {
      const res = parseAddressForSelector('Phường Dịch Vọng Hậu, Thành phố Hà Nội')
      expect(res.province).toBe('Thành phố Hà Nội')
      expect(res.ward).toBe('Phường Dịch Vọng Hậu')
      expect(res.detail).toBe('')
    })

    it('chuoi chi co So nha va Tinh (2 phan) phai vao detail va province', () => {
      const res = parseAddressForSelector('Số 18 Duy Tân, Thành phố Hà Nội')
      expect(res.province).toBe('Thành phố Hà Nội')
      expect(res.ward).toBe('')
      expect(res.detail).toBe('Số 18 Duy Tân')
    })

    it('chuoi day du 3 phan tach dung', () => {
      const res = parseAddressForSelector('Số 18 Duy Tân, Phường Dịch Vọng Hậu, Thành phố Hà Nội')
      expect(res.province).toBe('Thành phố Hà Nội')
      expect(res.ward).toBe('Phường Dịch Vọng Hậu')
      expect(res.detail).toBe('Số 18 Duy Tân')
    })

    it('chuoi rong tra ve rong', () => {
      expect(parseAddressForSelector('')).toEqual({ detail: '', ward: '', province: '' })
      expect(parseAddressForSelector('   ')).toEqual({ detail: '', ward: '', province: '' })
    })
  })
})
