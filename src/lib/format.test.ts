import { describe, expect, it } from 'vitest'

import { formatVnd } from './format'

describe('formatVnd', () => {
  it('dinh dang tien Viet', () => {
    expect(formatVnd(391000)).toBe('391.000 ₫')
  })
})
