import type { DecorationBlock } from '@/types/seller'

/**
 * Di chuyển một phần tử từ vị trí `from` tới vị trí `to` (ngôn ngữ của drag & drop:
 * bỏ phần tử ra khỏi `from`, chèn vào `to` trong mảng còn lại). Trả về mảng mới,
 * không mutate mảng gốc. Index ngoài phạm vi hoặc from === to thì trả về bản sao nguyên thứ tự.
 */
export function reorderBlocks<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items]
  if (from === to || from < 0 || to < 0 || from >= copy.length || to >= copy.length) {
    return copy
  }
  const [moved] = copy.splice(from, 1)
  if (moved === undefined) {
    return copy
  }
  copy.splice(to, 0, moved)
  return copy
}

/**
 * Link banner do seller nhập: chỉ cho đường dẫn nội bộ (`/...`) hoặc http(s).
 * Mọi scheme khác (javascript:, data:...) và URL "//host" đều bị bỏ để không thành link.
 */
export function safeBannerLink(raw: string | null | undefined): string {
  const link = (raw ?? '').trim()
  if (link === '') {
    return ''
  }
  if (link.startsWith('/')) {
    if (link.startsWith('//')) {
      return ''
    }
    return link
  }
  if (/^https?:\/\//i.test(link)) {
    return link
  }
  return ''
}

/** Bố cục khách thấy khi shop chưa xuất bản khối nào đang bật: hàng mới, danh mục, bán chạy. */
export const DEFAULT_STOREFRONT_BLOCKS: DecorationBlock[] = [
  {
    id: 'default-new',
    type: 'PRODUCT_COLLECTION',
    title: 'Hàng mới về',
    enabled: true,
    collectionType: 'NEW_ARRIVALS',
    itemLimit: 8,
    displayStyle: 'GRID',
  },
  { id: 'default-categories', type: 'CATEGORY_GRID', title: 'Mua theo danh mục', enabled: true },
  {
    id: 'default-best',
    type: 'PRODUCT_COLLECTION',
    title: 'Được mua nhiều',
    enabled: true,
    collectionType: 'BEST_SELLER',
    itemLimit: 8,
    displayStyle: 'SLIDER',
  },
]

export function storefrontBlocks(published: DecorationBlock[]): DecorationBlock[] {
  const hasEnabled = published.some((block) => block.enabled)
  if (hasEnabled) {
    return published
  }
  return DEFAULT_STOREFRONT_BLOCKS
}
