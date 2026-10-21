import {
  getViewQueryKey,
  useAddItem,
  useCheckout1,
  useClear,
  useRemoveItem,
  useUpdateQuantity,
  useView,
} from '@generated/endpoints/cart/cart'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'

import { useSessionQuery } from './useSession'

import type { CartItemResponse } from '@generated/model/cartItemResponse'
import type { CartResponse } from '@generated/model/cartResponse'

export function useCart() {
  const queryClient = useQueryClient()
  const { data: session } = useSessionQuery()
  const isLoggedIn = session !== null && session !== undefined

  const cartQuery = useView({
    query: {
      enabled: isLoggedIn,
    },
  })

  let cartData: CartResponse | null = null
  let items: CartItemResponse[] = []
  let totalQuantity = 0
  let subtotal = 0

  if (cartQuery.data !== undefined) {
    cartData = takeData(cartQuery.data)
    items = cartData.items ?? []
    subtotal = cartData.subtotal ?? 0
    for (const item of items) {
      totalQuantity += item.quantity ?? 0
    }
  }

  const addItemMutation = useAddItem({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      },
    },
  })

  const updateQuantityMutation = useUpdateQuantity({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      },
    },
  })

  const removeItemMutation = useRemoveItem({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      },
    },
  })

  const clearCartMutation = useClear({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      },
    },
  })

  const checkoutMutation = useCheckout1({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      },
    },
  })

  return {
    isLoggedIn,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    cart: cartData,
    items,
    totalQuantity,
    totalCount: totalQuantity,
    subtotal,
    addItem: addItemMutation,
    updateQuantity: updateQuantityMutation,
    removeItem: removeItemMutation,
    clearCart: clearCartMutation,
    checkout: checkoutMutation,
    refetch: cartQuery.refetch,
  }
}
