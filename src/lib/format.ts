import type { AddressResponse } from '@generated/model/addressResponse'

export function formatVnd(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) {
    return '0 ₫'
  }
  return n.toLocaleString('vi-VN') + ' ₫'
}

export function priceLabel(price: number | null | undefined): string {
  if (price === null || price === undefined) {
    return 'Liên hệ'
  }
  return formatVnd(price)
}

export function formatDateTime(iso: string | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export function formatFullAddress(addr: AddressResponse | null | undefined): string {
  if (addr === null || addr === undefined) {
    return ''
  }
  const full = addr.fullAddress ?? ''
  return full.trim()
}

export function splitFullAddress(full: string): {
  detail: string
  ward: string
  province: string
} {
  const trimmed = full.trim()
  if (trimmed === '') {
    return { detail: '', ward: '', province: '' }
  }
  const parts = trimmed.split(',').map(function (p) {
    return p.trim()
  })
  if (parts.length < 3) {
    return { detail: trimmed, ward: '', province: '' }
  }
  const province = parts[parts.length - 1]
  const ward = parts[parts.length - 2]
  const detail = parts.slice(0, parts.length - 2).join(', ')
  return { detail: detail, ward: ward, province: province }
}

export function formatAddressLabel(label: string | null | undefined): string {
  switch (label) {
    case 'OFFICE':
      return 'Công ty'
    case 'OTHER':
      return 'Khác'
    case 'HOME':
    default:
      return 'Nhà riêng'
  }
}

export function calculateDiscountPercent(
  price: number | null | undefined,
  compareAtPrice: number | null | undefined,
): number {
  if (
    price === null ||
    price === undefined ||
    compareAtPrice === null ||
    compareAtPrice === undefined
  ) {
    return 0
  }
  if (compareAtPrice <= price) {
    return 0
  }
  const diff = compareAtPrice - price
  return Math.round((diff / compareAtPrice) * 100)
}

export function formatSoldCount(count: number | null | undefined): string {
  if (count === null || count === undefined || count <= 0) {
    return '0'
  }
  if (count >= 1000) {
    const k = (count / 1000).toFixed(1).replace('.0', '')
    return `${k}k`
  }
  return String(count)
}
