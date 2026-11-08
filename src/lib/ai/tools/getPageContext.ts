import { tool } from 'ai'
import { z } from 'zod'

export const getPageContextInputSchema = z.object({})

export type PageName =
  | 'home'
  | 'product'
  | 'shop'
  | 'search'
  | 'cart'
  | 'wishlist'
  | 'checkout'
  | 'orders'
  | 'order-detail'
  | 'account'
  | 'other'

export interface PageContextOutput {
  page: PageName
  productId?: string
  shopSlug?: string
  orderId?: string
  /** Chỉ có khi route không nằm trong map — model tự suy từ path gốc. */
  path?: string
}

/** Map route hiện tại của browser thành ngữ cảnh trang cho model: trang gì kèm
 *  tham số chính (id sản phẩm, slug shop, id đơn hàng). Route lạ trả path gốc. */
export function pageContextFromPath(pathname: string): PageContextOutput {
  const product = pathname.match(/^\/product\/([^/]+)$/)
  if (product !== null) {
    return { page: 'product', productId: product[1] }
  }
  const shop = pathname.match(/^\/shops\/([^/]+)$/)
  if (shop !== null) {
    return { page: 'shop', shopSlug: shop[1] }
  }
  const orderDetail = pathname.match(/^\/account\/orders\/([^/]+)$/)
  if (orderDetail !== null) {
    return { page: 'order-detail', orderId: orderDetail[1] }
  }
  if (pathname === '/') {
    return { page: 'home' }
  }
  if (pathname === '/search') {
    return { page: 'search' }
  }
  if (pathname === '/cart') {
    return { page: 'cart' }
  }
  if (pathname === '/wishlist') {
    return { page: 'wishlist' }
  }
  if (pathname === '/checkout') {
    return { page: 'checkout' }
  }
  if (pathname === '/account/orders') {
    return { page: 'orders' }
  }
  if (pathname.startsWith('/account')) {
    return { page: 'account' }
  }
  return { page: 'other', path: pathname }
}

/** Tool xem khách đang ở trang nào: đọc pathname của browser lúc model gọi,
 *  nên luôn phản ánh trang hiện tại — kể cả những trang prompt không nhúng sẵn. */
export function createGetPageContextTool() {
  return tool({
    description:
      'Xem khách đang ở trang nào của cửa hàng (trang chủ, tìm kiếm, chi tiết sản phẩm, shop, giỏ hàng, đơn hàng…). Dùng khi không rõ ngữ cảnh trang hiện tại của khách trước khi trả lời.',
    inputSchema: getPageContextInputSchema,
    execute: async function (): Promise<PageContextOutput> {
      return pageContextFromPath(window.location.pathname)
    },
  })
}
