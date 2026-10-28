import { describe, expect, it } from 'vite-plus/test'

import { adminErrorMessage, formatDateTime, pageCount, roleLabel, statusMeta } from './admin'
import { ApiError } from './apiFetch'

describe('admin helpers', () => {
  it('dịch trạng thái và vai trò sang tiếng Việt', () => {
    expect(statusMeta('PENDING').label).toBe('Chờ duyệt')
    expect(statusMeta('LOCKED').label).toBe('Đã khóa')
    expect(roleLabel('SHOP')).toBe('Người bán')
  })

  it('tính tổng số trang', () => {
    expect(pageCount(41, 20)).toBe(3)
    expect(pageCount(0, 20)).toBe(0)
  })

  it('xử lý thời gian rỗng hoặc sai', () => {
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('sai')).toBe('—')
  })

  it('giải thích lỗi xung đột nghiệp vụ', () => {
    expect(adminErrorMessage(new ApiError(409, 'conflict'))).toContain('Trạng thái đã thay đổi')
  })
})
