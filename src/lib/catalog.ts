import type { Product } from '@/lib/api'

export interface Category {
  id: string
  label: string
}

export const CATEGORIES: Category[] = [
  { id: 'ao', label: 'Áo' },
  { id: 'vay-dam', label: 'Váy & Đầm' },
  { id: 'khoac', label: 'Áo khoác' },
  { id: 'quan', label: 'Quần' },
  { id: 'phu-kien', label: 'Phụ kiện' },
]

// TẠM: backend chưa có field category nên suy từ tên.
// Khi API có category thật, thay đúng hàm này, giữ nguyên chữ ký.
export function categoryOf(product: Product): string {
  const name = product.name.toLowerCase()
  if (name.includes('khoác')) {
    return 'khoac'
  }
  if (name.includes('váy') || name.includes('đầm')) {
    return 'vay-dam'
  }
  if (name.includes('quần')) {
    return 'quan'
  }
  if (name.includes('túi')) {
    return 'phu-kien'
  }
  if (name.includes('áo')) {
    return 'ao'
  }
  return 'khac'
}

export function categoryLabel(id: string): string {
  const found = CATEGORIES.find((category) => category.id === id)
  if (found === undefined) {
    return 'Khác'
  }
  return found.label
}

const NEW_DAYS = 30

export function isNew(product: Product, now: Date = new Date()): boolean {
  const created = new Date(product.createdAt).getTime()
  if (Number.isNaN(created)) {
    return false
  }
  const ageMs = now.getTime() - created
  if (ageMs < 0) {
    return false
  }
  return ageMs < NEW_DAYS * 24 * 60 * 60 * 1000
}

// TẠM: curated cứng theo mock ban đầu, backend có số liệu bán thì thay.
const BESTSELLER_IDS = [1, 2, 3]

export function isBestseller(product: Product): boolean {
  return BESTSELLER_IDS.includes(product.id)
}
