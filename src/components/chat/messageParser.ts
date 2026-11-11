const PRODUCT_LINK_OR_MARKDOWN_REGEX =
  /(\[[^\]]*\]\([^)]*\))|(?:https?:\/\/[^\s/]+)?\/products?\/[a-zA-Z0-9_-]+/g

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

/**
 * Xóa các đường dẫn URL /product/... hoặc /products/... thô khỏi nội dung tin nhắn,
 * giữ nguyên link markdown dạng [tên](/product/...) và phần văn bản còn lại của người dùng.
 */
export function stripProductLinks(text?: string | null): string {
  if (!text) return ''
  return text
    .replace(PRODUCT_LINK_OR_MARKDOWN_REGEX, function (_match, markdownLink: string | undefined) {
      if (markdownLink !== undefined) {
        return markdownLink
      }
      return ''
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Định dạng đoạn xem trước tin nhắn cuối cho danh sách hội thoại:
 * nếu tin nhắn chỉ chứa link sản phẩm thì hiển thị "[Sản phẩm]".
 */
export function formatChatPreview(text?: string | null): string {
  if (!text) return ''
  const hasLinks = extractProductSlugs(text).length > 0
  if (!hasLinks) {
    return text.trim()
  }
  const stripped = stripProductLinks(text)
  if (stripped === '') {
    return '[Sản phẩm]'
  }
  return stripped
}
