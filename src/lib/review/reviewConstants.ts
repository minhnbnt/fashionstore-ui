export const REVIEW_QUICK_TAGS = [
  'Chất lượng tốt',
  'Đúng mô tả',
  'Giao hàng nhanh',
  'Đóng gói cẩn thận',
  'Size đúng chuẩn',
] as const

export const MIN_REVIEW_COMMENT_LENGTH = 10
export const MAX_REVIEW_COMMENT_LENGTH = 2000
export const MAX_REVIEW_IMAGES = 5
export const MAX_REVIEW_VIDEO_SECONDS = 30

export function reviewOrderProductKey(orderId: string, productId: string): string {
  return `${orderId}:${productId}`
}

/**
 * Che tên người mua kiểu Shopee (ví dụ "Minh Nguyễn" -> "M***n", "An" -> "A***").
 */
export function maskDisplayNamePreview(displayName: string): string {
  const trimmed = displayName.trim()
  if (trimmed === '') {
    return '***'
  }
  const chars = Array.from(trimmed)
  const first = chars[0]
  if (chars.length <= 2) {
    return `${first}***`
  }
  const last = chars[chars.length - 1]
  return `${first}***${last}`
}
