import { describe, expect, it } from 'vite-plus/test'

import { pageWindow } from './pagination'

describe('pageWindow', () => {
  it('it trang thi hien het', () => {
    expect(pageWindow(0, 3)).toEqual([0, 1, 2])
  })

  it('gom khoang giua thanh dau ba cham', () => {
    expect(pageWindow(5, 10)).toEqual([0, null, 4, 5, 6, null, 9])
  })

  it('trang dau khong co ba cham ben trai', () => {
    expect(pageWindow(0, 6)).toEqual([0, 1, null, 5])
  })
})
