import { getShopProducts } from '@generated/endpoints/shops-catalog/shops-catalog'
import { queryOptions, useQuery } from '@tanstack/react-query'

import { productResponseToChatItem } from '@/components/chat/productItem'
import { takeData } from '@/lib/api/apiAdapters'

import type { ChatProductItem } from '@/components/chat/productItem'

const SHOP_PRODUCTS_PAGE_LIMIT = 50
const MAX_PRODUCT_PAGES = 40

/** Lấy toàn bộ sản phẩm đang hoạt động của shop bằng cách duyệt hết các trang catalog (tối đa 50 sp/trang). */
export async function fetchAllShopProducts(
  shopId: string,
  signal?: AbortSignal,
): Promise<ChatProductItem[]> {
  const allItems: ChatProductItem[] = []
  for (let page = 0; page < MAX_PRODUCT_PAGES; page += 1) {
    const response = await getShopProducts(
      shopId,
      { page, limit: SHOP_PRODUCTS_PAGE_LIMIT },
      { signal },
    )
    const pageData = takeData(response)
    const batch = pageData.items ?? []
    for (const item of batch) {
      allItems.push(productResponseToChatItem(item))
    }
    if (batch.length === 0 || batch.length < SHOP_PRODUCTS_PAGE_LIMIT) {
      break
    }
    if (pageData.total !== undefined && allItems.length >= pageData.total) {
      break
    }
  }
  return allItems
}

/** Query options tải toàn bộ sản phẩm công khai của một shop cho picker trong khung chat. */
export function allShopProductsQueryOptions(shopId: string, enabled: boolean) {
  return queryOptions({
    queryKey: ['shop-all-chat-products', shopId],
    queryFn: function ({ signal }) {
      return fetchAllShopProducts(shopId, signal)
    },
    enabled: shopId !== '' && enabled,
  })
}

/** Hook React Query tải toàn bộ sản phẩm công khai của một shop để chọn gửi trong khung chat. */
export function useAllShopProducts(shopId: string, enabled: boolean) {
  return useQuery(allShopProductsQueryOptions(shopId, enabled))
}
