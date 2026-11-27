import { describe, expect, it } from 'vite-plus/test'

import { reorderBlocks, safeBannerLink, storefrontBlocks } from './decoration'

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

describe('safeBannerLink', () => {
  it('giu duong dan noi bo va link http(s)', () => {
    expect(safeBannerLink('/search?q=ao')).toBe('/search?q=ao')
    expect(safeBannerLink('https://example.com/sale')).toBe('https://example.com/sale')
    expect(safeBannerLink('http://example.com')).toBe('http://example.com')
  })

  it('bo link nguy hiem hoac khong hop le', () => {
    expect(safeBannerLink('javascript:alert(1)')).toBe('')
    expect(safeBannerLink(' JavaScript:alert(1)')).toBe('')
    expect(safeBannerLink('data:text/html,hi')).toBe('')
    expect(safeBannerLink('//evil.example')).toBe('')
    expect(safeBannerLink('ftp://x')).toBe('')
    expect(safeBannerLink(undefined)).toBe('')
  })
})

describe('storefrontBlocks', () => {
  it('shop chua xuat ban khoi nao dang bat thi dung bo cuc mac dinh', () => {
    const blocks = storefrontBlocks([])
    expect(blocks.map((b) => b.type)).toEqual([
      'PRODUCT_COLLECTION',
      'CATEGORY_GRID',
      'PRODUCT_COLLECTION',
    ])
    expect(blocks.every((b) => b.enabled)).toBe(true)
  })

  it('tat ca khoi deu tat cung dung mac dinh', () => {
    const blocks = storefrontBlocks([{ id: 'x', type: 'VIDEO', title: 'v', enabled: false }])
    expect(blocks[0]?.collectionType).toBe('NEW_ARRIVALS')
  })

  it('co khoi dang bat thi giu nguyen bo cuc cua shop', () => {
    const own = [{ id: 'a', type: 'CATEGORY_GRID' as const, title: 'Danh muc', enabled: true }]
    expect(storefrontBlocks(own)).toBe(own)
  })
})
