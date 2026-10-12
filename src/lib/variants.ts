import type { VariantResponse } from '@generated/model/variantResponse'

export type OptionKind = 'size' | 'color'

function otherKind(kind: OptionKind): OptionKind {
  if (kind === 'size') {
    return 'color'
  }
  return 'size'
}

// Lựa chọn còn bấm được khi có ít nhất một biến thể còn hàng khớp nó và lựa chọn bên kia (nếu đã chọn).
export function isOptionAvailable(
  variants: VariantResponse[],
  kind: OptionKind,
  value: string,
  otherSelected: string | null,
): boolean {
  const other = otherKind(kind)
  return variants.some(function (v) {
    if (v[kind] !== value) {
      return false
    }
    if (otherSelected !== null && v[other] !== otherSelected) {
      return false
    }
    return (v.stockQuantity ?? 0) > 0
  })
}

// Biến thể khớp lựa chọn hiện tại; chọn một nửa thì lấy biến thể đầu tiên khớp phần đã chọn.
export function findVariant(
  variants: VariantResponse[],
  size: string | null,
  color: string | null,
): VariantResponse | undefined {
  return variants.find(function (v) {
    const sizeOk = size === null || v.size === size
    const colorOk = color === null || v.color === color
    return sizeOk && colorOk
  })
}
