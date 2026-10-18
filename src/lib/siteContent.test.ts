import { describe, expect, it } from 'vitest'

import {
  fromLocalInput,
  groupBy,
  isSafeLink,
  isPopupDue,
  markPopupSeen,
  pickPopup,
  queryKeyStartsWith,
  scheduleError,
  slugify,
  toLocalInput,
} from './siteContent'

import type { PopupCandidate, SeenStore } from './siteContent'

function memoryStore(): SeenStore {
  const local = new Map<string, string>()
  const session = new Map<string, string>()
  return {
    getLocal: (key) => local.get(key) ?? null,
    setLocal: (key, value) => {
      local.set(key, value)
    },
    getSession: (key) => session.get(key) ?? null,
    setSession: (key, value) => {
      session.set(key, value)
    },
  }
}

function popup(id: string, overrides: Partial<PopupCandidate> = {}): PopupCandidate {
  return { id, audience: 'ALL', frequency: 'ONCE_PER_DAY', ...overrides }
}

const NOON = new Date('2026-10-18T12:00:00+07:00')

describe('isPopupDue', () => {
  it('every visit is always due', () => {
    const store = memoryStore()
    markPopupSeen(popup('a', { frequency: 'EVERY_VISIT' }), store, NOON)
    expect(isPopupDue(popup('a', { frequency: 'EVERY_VISIT' }), store, NOON)).toBe(true)
  })

  it('once per session uses session storage', () => {
    const store = memoryStore()
    const candidate = popup('a', { frequency: 'ONCE_PER_SESSION' })
    expect(isPopupDue(candidate, store, NOON)).toBe(true)
    markPopupSeen(candidate, store, NOON)
    expect(isPopupDue(candidate, store, NOON)).toBe(false)
  })

  it('once per day comes back after 24 hours', () => {
    const store = memoryStore()
    const candidate = popup('a', { frequency: 'ONCE_PER_DAY' })
    markPopupSeen(candidate, store, NOON)
    expect(isPopupDue(candidate, store, new Date(NOON.getTime() + 23 * 3600_000))).toBe(false)
    expect(isPopupDue(candidate, store, new Date(NOON.getTime() + 24 * 3600_000))).toBe(true)
  })

  it('once never comes back', () => {
    const store = memoryStore()
    const candidate = popup('a', { frequency: 'ONCE' })
    markPopupSeen(candidate, store, NOON)
    expect(isPopupDue(candidate, store, new Date('2030-01-01'))).toBe(false)
  })
})

describe('pickPopup', () => {
  it('takes the first popup matching audience and frequency', () => {
    const store = memoryStore()
    const members = popup('members', { audience: 'MEMBER' })
    const seen = popup('seen', { frequency: 'ONCE' })
    const guests = popup('guests', { audience: 'GUEST' })
    markPopupSeen(seen, store, NOON)

    expect(pickPopup([members, seen, guests], false, store, NOON)?.id).toBe('guests')
    expect(pickPopup([members, seen, guests], true, store, NOON)?.id).toBe('members')
  })

  it('returns null when nothing is eligible', () => {
    expect(pickPopup([popup('m', { audience: 'MEMBER' })], false, memoryStore(), NOON)).toBeNull()
  })
})

describe('slugify', () => {
  it('strips Vietnamese marks and joins words with dashes', () => {
    expect(slugify('Chính sách đổi trả')).toBe('chinh-sach-doi-tra')
    expect(slugify('  Điều khoản & Bảo mật!! ')).toBe('dieu-khoan-bao-mat')
  })
})

describe('isSafeLink', () => {
  it('accepts internal paths and http(s) URLs only', () => {
    expect(isSafeLink('')).toBe(true)
    expect(isSafeLink('/search?q=ao')).toBe(true)
    expect(isSafeLink('https://example.com')).toBe(true)
    expect(isSafeLink('//evil.example')).toBe(false)
    expect(isSafeLink('javascript:alert(1)')).toBe(false)
    expect(isSafeLink('/có khoảng trắng')).toBe(false)
  })
})

describe('local datetime inputs', () => {
  it('round-trips through ISO', () => {
    const iso = '2026-10-20T01:30:00.000Z'
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso)
  })

  it('treats empty input as no date', () => {
    expect(toLocalInput(null)).toBe('')
    expect(fromLocalInput('')).toBeNull()
  })
})

describe('scheduleError', () => {
  it('only checks when both ends are set', () => {
    expect(scheduleError({ active: true, startsAt: '', endsAt: '2026-10-01T10:00' })).toBeNull()
    expect(
      scheduleError({ active: true, startsAt: '2026-10-01T10:00', endsAt: '2026-10-01T10:00' }),
    ).toBe('Giờ kết thúc phải sau giờ bắt đầu.')
    expect(
      scheduleError({ active: true, startsAt: '2026-10-01T10:00', endsAt: '2026-10-02T10:00' }),
    ).toBeNull()
  })
})

describe('queryKeyStartsWith', () => {
  it('matches orval URL keys by prefix', () => {
    expect(
      queryKeyStartsWith(
        ['/api/public/banners', { placement: 'HOME_STRIP' }],
        ['/api/public/banners'],
      ),
    ).toBe(true)
    expect(queryKeyStartsWith(['/api/admin/products'], ['/api/admin/banners'])).toBe(false)
    expect(queryKeyStartsWith([42], ['/api'])).toBe(false)
  })
})

describe('groupBy', () => {
  it('keeps the given key order and drops empty groups', () => {
    const grouped = groupBy(
      [
        { key: 'B', n: 1 },
        { key: 'A', n: 2 },
        { key: 'B', n: 3 },
      ],
      ['A', 'B', 'C'],
      (item) => item.key,
    )
    expect(grouped.map((group) => group.key)).toEqual(['A', 'B'])
    expect(grouped[1]?.items.map((item) => item.n)).toEqual([1, 3])
  })
})
