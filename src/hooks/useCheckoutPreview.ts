import { getViewQueryKey, previewCheckout } from '@generated/endpoints/cart/cart'
import { queryOptions, useQuery } from '@tanstack/react-query'

import { takeData } from '@/lib/api/apiAdapters'

import type { CheckoutPreviewResponse } from '@generated/model/checkoutPreviewResponse'

/**
 * Xem trước tiền từng đơn (mỗi shop 1 đơn) với phí ship do server tính.
 * Key nằm dưới key giỏ hàng nên mọi mutation giỏ (đổi số lượng, xoá món) tự làm mới bản xem trước.
 * `variantIds` rỗng = cả giỏ (giống checkout); muốn tắt thì truyền `enabled = false`.
 */
export function useCheckoutPreview(variantIds: string[], enabled: boolean) {
  const query = useQuery(
    queryOptions({
      queryKey: [...getViewQueryKey(), 'checkout-preview', variantIds],
      queryFn: function ({ signal }) {
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
