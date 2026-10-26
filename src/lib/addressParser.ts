export interface ParsedAddress {
  detail: string
  ward: string
  province: string
}

const PROVINCE_PREFIXES = ['tỉnh ', 'thành phố ', 'tp. ', 'tp ']
const WARD_PREFIXES = ['phường ', 'xã ', 'thị trấn ']

export function isLikelyProvince(str: string, knownProvinces: string[] = []): boolean {
  const s = str.trim().toLowerCase()
  if (s === '') {
    return false
  }
  if (PROVINCE_PREFIXES.some((prefix) => s.startsWith(prefix))) {
    return true
  }
  return knownProvinces.some((p) => p.trim().toLowerCase() === s)
}

export function isLikelyWard(str: string): boolean {
  const s = str.trim().toLowerCase()
  if (s === '') {
    return false
  }
  return WARD_PREFIXES.some((prefix) => s.startsWith(prefix))
}

export function parseAddressForSelector(
  raw: string,
  knownProvinces: string[] = [],
): ParsedAddress {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return { detail: '', ward: '', province: '' }
  }

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length >= 3) {
    const province = parts[parts.length - 1] ?? ''
    const ward = parts[parts.length - 2] ?? ''
    const detail = parts.slice(0, parts.length - 2).join(', ')
    return { detail, ward, province }
  }

  if (parts.length === 2) {
    const part0 = parts[0] ?? ''
    const part1 = parts[1] ?? ''

    if (isLikelyProvince(part1, knownProvinces)) {
      if (isLikelyWard(part0)) {
        return { detail: '', ward: part0, province: part1 }
      }
      return { detail: part0, ward: '', province: part1 }
    }

    if (isLikelyWard(part0)) {
      return { detail: '', ward: part0, province: part1 }
    }

    return { detail: trimmed, ward: '', province: '' }
  }

  if (parts.length === 1) {
    const single = parts[0] ?? ''
    if (isLikelyProvince(single, knownProvinces)) {
      return { detail: '', ward: '', province: single }
    }
    if (isLikelyWard(single)) {
      return { detail: '', ward: single, province: '' }
    }
    return { detail: single, ward: '', province: '' }
  }

  return { detail: '', ward: '', province: '' }
}
