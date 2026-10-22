import type { AddressResponse } from '@generated/model/addressResponse'

export function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' ₫'
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
  const parts: string[] = []
  if (
    addr.detailAddress !== null &&
    addr.detailAddress !== undefined &&
    addr.detailAddress.trim() !== ''
  ) {
    parts.push(addr.detailAddress.trim())
  } else {
    if (
      addr.houseNumber !== null &&
      addr.houseNumber !== undefined &&
      addr.houseNumber.trim() !== ''
    ) {
      parts.push(addr.houseNumber.trim())
    }
    if (addr.street !== null && addr.street !== undefined && addr.street.trim() !== '') {
      parts.push(addr.street.trim())
    }
  }
  if (addr.ward !== null && addr.ward !== undefined && addr.ward.trim() !== '') {
    parts.push(addr.ward.trim())
  }
  if (addr.district !== null && addr.district !== undefined && addr.district.trim() !== '') {
    parts.push(addr.district.trim())
  }
  if (addr.city !== null && addr.city !== undefined && addr.city.trim() !== '') {
    parts.push(addr.city.trim())
  }
  return parts.join(', ')
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
