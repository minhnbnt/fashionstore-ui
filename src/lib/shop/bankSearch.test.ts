import { describe, expect, it } from 'vite-plus/test'

import { filterBanks } from './bankSearch'

import type { BankResponse } from '@/types/bank'

const MOCK_BANKS: BankResponse[] = [
  {
    id: '17',
    name: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
    code: 'VCB',
    bin: '970436',
    shortName: 'Vietcombank',
    logo: 'https://api.vietqr.io/img/VCB.png',
    lookupSupported: true,
  },
  {
    id: '21',
    name: 'Ngân hàng TMCP Quân Đội',
    code: 'MB',
    bin: '970422',
    shortName: 'MBBank',
    logo: 'https://api.vietqr.io/img/MB.png',
    lookupSupported: true,
  },
  {
    id: '30',
    name: 'Ngân hàng TMCP Kỹ Thương Việt Nam',
    code: 'TCB',
    bin: '970407',
    shortName: 'Techcombank',
    logo: 'https://api.vietqr.io/img/TCB.png',
    lookupSupported: true,
  },
]

describe('filterBanks', () => {
  it('returns all banks when query is empty or whitespace', () => {
    expect(filterBanks(MOCK_BANKS, '')).toEqual(MOCK_BANKS)
    expect(filterBanks(MOCK_BANKS, '   ')).toEqual(MOCK_BANKS)
  })

  it('filters by shortName case-insensitively', () => {
    const res = filterBanks(MOCK_BANKS, 'vietcom')
    expect(res).toHaveLength(1)
    expect(res[0]?.code).toBe('VCB')
  })

  it('filters by code', () => {
    const res = filterBanks(MOCK_BANKS, 'tcb')
    expect(res).toHaveLength(1)
    expect(res[0]?.code).toBe('TCB')
  })

  it('filters by BIN', () => {
    const res = filterBanks(MOCK_BANKS, '970407')
    expect(res).toHaveLength(1)
    expect(res[0]?.code).toBe('TCB')
  })

  it('filters by Vietnamese name without accents', () => {
    const res = filterBanks(MOCK_BANKS, 'quan doi')
    expect(res).toHaveLength(1)
    expect(res[0]?.code).toBe('MB')
  })
})
