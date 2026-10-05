import { describe, expect, it } from 'vitest'

import { fetchSession, friendlyAuthError, validateLoginInput } from './auth'

describe('validateLoginInput', () => {
  it('bat buoc nhap email', () => {
    expect(validateLoginInput('', '123456')).toBe('Vui lòng nhập email.')
  })

  it('tu choi email thieu @', () => {
    expect(validateLoginInput('khong-phai-email', '123456')).toBe('Email chưa đúng định dạng.')
  })

  it('mat khau toi thieu 6 ky tu', () => {
    expect(validateLoginInput('ban@net.vn', '123')).toBe('Mật khẩu tối thiểu 6 ký tự.')
  })

  it('chap nhan input hop le', () => {
    expect(validateLoginInput('ban@net.vn', '123456')).toBe(null)
  })
})

describe('friendlyAuthError', () => {
  it('sai thong tin dang nhap', () => {
    expect(friendlyAuthError({ message: 'Invalid login credentials' })).toBe(
      'Email hoặc mật khẩu chưa đúng.',
    )
  })

  it('email da co tai khoan', () => {
    expect(friendlyAuthError({ message: 'User already registered' })).toBe(
      'Email này đã được đăng ký. Vui lòng đăng nhập.',
    )
  })

  it('mat khau yeu', () => {
    expect(friendlyAuthError({ message: 'Password should be at least 6 characters' })).toBe(
      'Mật khẩu tối thiểu 6 ký tự.',
    )
  })

  it('loi la thi bao chung', () => {
    expect(friendlyAuthError({ message: 'Something weird' })).toBe(
      'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    )
    expect(friendlyAuthError(null)).toBe('Đã xảy ra lỗi. Vui lòng thử lại sau.')
  })
})

describe('fetchSession', () => {
  it('signal abort thi reject ngay, khong goi client', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(fetchSession(controller.signal)).rejects.toThrow('Aborted')
  })
})
