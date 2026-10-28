import { describe, expect, it } from 'vite-plus/test'

import { reorderBlocks } from './decoration'

describe('reorderBlocks', () => {
  const blocks = ['A', 'B', 'C', 'D']

  it('kéo tiến xuống dưới: 0 -> 2', () => {
    expect(reorderBlocks(blocks, 0, 2)).toEqual(['B', 'C', 'A', 'D'])
  })

  it('kéo lùi lên trên: 3 -> 0', () => {
    expect(reorderBlocks(blocks, 3, 0)).toEqual(['D', 'A', 'B', 'C'])
  })

  it('đổi chỗ 2 khối kề nhau: 1 -> 0', () => {
    expect(reorderBlocks(blocks, 1, 0)).toEqual(['B', 'A', 'C', 'D'])
  })

  it('cùng index thì giữ nguyên thứ tự', () => {
    expect(reorderBlocks(blocks, 1, 1)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('source ngoài phạm vi thì không đổi', () => {
    expect(reorderBlocks(blocks, 9, 0)).toEqual(['A', 'B', 'C', 'D'])
    expect(reorderBlocks(blocks, -1, 2)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('target ngoài phạm vi thì không đổi', () => {
    expect(reorderBlocks(blocks, 0, 9)).toEqual(['A', 'B', 'C', 'D'])
    expect(reorderBlocks(blocks, 0, -1)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('không mutate mảng gốc', () => {
    const original = ['A', 'B', 'C']
    const result = reorderBlocks(original, 0, 2)
    expect(original).toEqual(['A', 'B', 'C'])
    expect(result).toEqual(['B', 'C', 'A'])
    expect(result).not.toBe(original)
  })

  it('mảng 1 phần tử hoặc rỗng', () => {
    expect(reorderBlocks(['X'], 0, 0)).toEqual(['X'])
    expect(reorderBlocks([], 0, 0)).toEqual([])
  })
})
