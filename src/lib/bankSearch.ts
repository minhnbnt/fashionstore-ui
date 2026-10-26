import type { BankResponse } from '@/types/bank'

export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

export function filterBanks(banks: BankResponse[], query: string): BankResponse[] {
  const q = removeVietnameseAccents(query.trim())
  if (q === '') {
    return banks
  }

  return banks.filter((b) => {
    const codeMatch = (b.code ?? '').toLowerCase().includes(q)
    const binMatch = (b.bin ?? '').includes(q)
    const shortNameMatch = removeVietnameseAccents(b.shortName ?? '').includes(q)
    const nameMatch = removeVietnameseAccents(b.name ?? '').includes(q)
    return codeMatch || binMatch || shortNameMatch || nameMatch
  })
}
