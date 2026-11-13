import { describe, expect, it } from 'vite-plus/test'

import {
  formatDay,
  holidayNameError,
  kindLabel,
  sourceLabel,
  syncResultMessage,
  weekdayLabel,
  yearOptions,
} from './holidays'

describe('labels', () => {
  it('maps kind and source to Vietnamese', () => {
    expect(kindLabel('HOLIDAY')).toBe('Nghỉ lễ')
    expect(kindLabel('WORKING_DAY')).toBe('Đi làm bù')
    expect(sourceLabel('CALENDARIFIC')).toBe('Calendarific')
    expect(sourceLabel('MANUAL')).toBe('Sửa tay')
    expect(sourceLabel('SEED')).toBe('Có sẵn')
  })
})

describe('dates', () => {
  it('reads yyyy-MM-dd without timezone drift', () => {
    expect(formatDay('2026-11-24')).toBe('24/11/2026')
    expect(weekdayLabel('2026-11-24')).toBe('Thứ Ba')
    expect(weekdayLabel('2026-10-18')).toBe('Chủ nhật')
  })

  it('offers previous, current and next year', () => {
    expect(yearOptions(2026)).toEqual([2025, 2026, 2027])
  })
})

describe('holidayNameError', () => {
  it('requires a name up to 200 characters', () => {
    expect(holidayNameError('  ')).toBe('Nhập tên ngày nghỉ.')
    expect(holidayNameError('a'.repeat(201))).toBe('Tên tối đa 200 ký tự.')
    expect(holidayNameError('Nghỉ bù')).toBeNull()
  })
})

describe('syncResultMessage', () => {
  it('summarises counts', () => {
    expect(syncResultMessage({ year: 2027, added: 3, updated: 1, removed: 0, keptManual: 2 })).toBe(
      'Đã đồng bộ năm 2027: thêm 3, cập nhật 1, xóa 0, giữ 2 ngày sửa tay.',
    )
  })
})
