import { describe, expect, it } from 'vitest'

import { hasAddressContent } from './address'

describe('hasAddressContent', () => {
  it('is false when every field is null, undefined or blank', () => {
    expect(hasAddressContent({})).toBe(false)
    expect(
      hasAddressContent({
        houseNumber: null,
        street: '   ',
        ward: '',
        district: undefined,
        city: null,
      }),
    ).toBe(false)
  })

  it('is true when at least one field has text', () => {
    expect(hasAddressContent({ city: 'Hà Nội' })).toBe(true)
    expect(hasAddressContent({ houseNumber: '12', street: '  ' })).toBe(true)
  })
})
