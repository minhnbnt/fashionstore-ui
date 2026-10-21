import { describe, expect, it } from 'vitest'

import { ratingSummary } from './ratingSummary'

import type { ReviewResponse } from '@generated/model/reviewResponse'

function review(stars: number): ReviewResponse {
  return { stars }
}

describe('ratingSummary', () => {
  it('danh sach rong thi chua co danh gia', () => {
    const summary = ratingSummary([])
    expect(summary.value).toBeNull()
    expect(summary.count).toBe(0)
    expect(summary.breakdown).toEqual([0, 0, 0, 0, 0])
  })

  it('tinh dung diem trung binh va phan bo', () => {
    const summary = ratingSummary([review(5), review(5), review(4), review(1)])
    expect(summary.count).toBe(4)
    expect(summary.value).toBeCloseTo(3.75)
    expect(summary.breakdown[0]).toBe(50)
    expect(summary.breakdown[1]).toBe(25)
    expect(summary.breakdown[4]).toBe(25)
  })

  it('mot sao duy nhat', () => {
    const summary = ratingSummary([review(1)])
    expect(summary.value).toBe(1)
    expect(summary.breakdown).toEqual([0, 0, 0, 0, 100])
  })

  it('bo qua star khong hop le khi tinh phan bo nhung van tinh tong', () => {
    const summary = ratingSummary([review(5), review(0)])
    expect(summary.count).toBe(2)
    expect(summary.value).toBeCloseTo(2.5)
    expect(summary.breakdown[0]).toBe(50)
  })
})
