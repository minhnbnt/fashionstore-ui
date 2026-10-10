import { describe, expect, it } from 'vitest'

import { PRODUCTS, getProductById, getRelated } from './products'

describe('getProductById', () => {
  it('tim thay SP id 2', () => {
    expect(getProductById(2)?.name).toBe('Váy midi xếp ly')
  })

  it('id dang chuoi van tim thay', () => {
    expect(getProductById('2')?.id).toBe(2)
  })

  it('id sai tra undefined', () => {
    expect(getProductById(999)).toBeUndefined()
  })
})

describe('getRelated', () => {
  it('tra ve cung category, tru chinh no, toi da 4', () => {
    const main = PRODUCTS[0]
    const rel = getRelated(main, 4)
    expect(rel.length).toBeLessThanOrEqual(4)
    for (const r of rel) {
      expect(r.id).not.toBe(main.id)
    }
  })

  it('SP co du field moi', () => {
    const p = PRODUCTS[0]
    expect(p.sizes.length).toBeGreaterThan(0)
    expect(p.gallery.length).toBeGreaterThan(0)
    expect(p.stock).toBeGreaterThanOrEqual(0)
  })
})
