import { getViewQueryKey, previewCheckout } from '@generated/endpoints/cart/cart'
import { queryOptions, useQuery } from '@tanstack/react-query'

import { takeData } from '@/lib/api/apiAdapters'

import type { CheckoutPreviewResponse } from '@generated/model/checkoutPreviewResponse'

function normalizeShopVouchers(raw?: Record<string, string>): Record<string, string> | undefined {
  if (raw === undefined) {
    return undefined
  }
  const cleaned: Record<string, string> = {}
  let hasEntry = false
  for (const [shopId, code] of Object.entries(raw)) {
    const trimmedShopId = shopId.trim()
    const trimmedCode = code.trim()
    if (trimmedShopId !== '' && trimmedCode !== '') {
      cleaned[trimmedShopId] = trimmedCode
      hasEntry = true
    }
  }
  if (!hasEntry) {
    return undefined
  }
  return cleaned
}

/**
 * Xem trước tiền từng đơn (mỗi shop 1 đơn) với phí ship do server tính.
 * Key nằm dưới key giỏ hàng nên mọi mutation giỏ (đổi số lượng, xoá món) tự làm mới bản xem trước.
 * `variantIds` rỗng = cả giỏ (giống checkout); muốn tắt thì truyền `enabled = false`.
 */
export function useCheckoutPreview(
  variantIds: string[],
  enabled: boolean,
  shopVouchers?: Record<string, string>,
) {
  const normalizedVouchers = normalizeShopVouchers(shopVouchers)
  const query = useQuery(
    queryOptions({
      queryKey: [...getViewQueryKey(), 'checkout-preview', variantIds, normalizedVouchers ?? {}],
      queryFn: function ({ signal }) {
        if (normalizedVouchers !== undefined) {
          return previewCheckout({ variantIds, shopVouchers: normalizedVouchers }, { signal })
        }
        return previewCheckout({ variantIds }, { signal })
      },
      enabled,
    }),
  )

  let preview: CheckoutPreviewResponse | null = null
  if (query.data !== undefined) {
    preview = takeData(query.data)
  }

  return {
    preview,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
