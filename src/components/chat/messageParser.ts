/**
 * Trích xuất danh sách slug hoặc ID sản phẩm từ nội dung tin nhắn.
 * Hỗ trợ cả URL tuyệt đối (https://.../product/slug hoặc /products/slug) và tương đối.
 */
export function extractProductSlugs(text?: string | null): string[] {
  if (!text) return []
  const regex = /(?:https?:\/\/[^\s/]+)?\/products?\/([a-zA-Z0-9_-]+)/g
  const slugs = new Set<string>()
  let match: RegExpExecArray | null = null
  while ((match = regex.exec(text)) !== null) {
    const slug = match[1]?.trim()
    if (slug) {
      slugs.add(slug)
    }
  }
  return Array.from(slugs)
}
