import {
  getViewQueryKey,
  useAddItem,
  useCheckout1,
  useClear,
  useRemoveItem,
  useUpdateQuantity,
  useView,
} from '@generated/endpoints/cart/cart'
import { getMine3QueryKey, type mine3Response } from '@generated/endpoints/orders/orders'
import { getList5QueryKey } from '@generated/endpoints/seller-orders/seller-orders'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/api/apiAdapters'

import { useSessionQuery } from './useSession'

import type { CartItemResponse } from '@generated/model/cartItemResponse'
import type { CartResponse } from '@generated/model/cartResponse'
import type { OrderResponse } from '@generated/model/orderResponse'

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
      onSuccess: function (response) {
        if (response.status === 200) {
          queryClient.setQueryData(getViewQueryKey(), response)
        }
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      },
    },
  })

  const updateQuantityMutation = useUpdateQuantity({
    mutation: {
      onSuccess: function (response) {
        if (response.status === 200) {
          queryClient.setQueryData(getViewQueryKey(), response)
        }
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      },
    },
  })

  const removeItemMutation = useRemoveItem({
    mutation: {
      onSuccess: function (response) {
        if (response.status === 200) {
          queryClient.setQueryData(getViewQueryKey(), response)
        }
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      },
    },
  })

  const clearCartMutation = useClear({
    mutation: {
      onSuccess: function (response) {
        if (response.status === 200) {
          queryClient.setQueryData(getViewQueryKey(), response)
        }
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
      },
    },
  })

  const checkoutMutation = useCheckout1({
    mutation: {
      onSuccess: function (response) {
        const createdOrders = takeData(response)
        if (Array.isArray(createdOrders) && createdOrders.length > 0) {
          queryClient.setQueryData<mine3Response>(getMine3QueryKey(), function (prev) {
            if (prev === undefined || prev.status !== 200 || !Array.isArray(prev.data)) {
              return {
                status: 200,
                data: createdOrders,
                headers: response.headers,
              }
            }
            const createdIds = new Set<string>()
            for (const ord of createdOrders) {
              if (ord.id !== undefined) {
                createdIds.add(ord.id)
              }
            }
            const remaining: OrderResponse[] = prev.data.filter(function (existing) {
              if (existing.id === undefined) {
                return true
              }
              return !createdIds.has(existing.id)
            })
            return {
              ...prev,
              data: [...createdOrders, ...remaining],
            }
          })
        }
        void queryClient.invalidateQueries({ queryKey: getViewQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getMine3QueryKey() })
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
      },
    },
  })

  return {
    isLoggedIn,
    isLoading: cartQuery.isLoading,
    isFetching: cartQuery.isFetching,
    isError: cartQuery.isError,
    error: cartQuery.error,
    cart: cartData,
    items,
    totalQuantity,
    subtotal,
    addItem: addItemMutation,
    updateQuantity: updateQuantityMutation,
    removeItem: removeItemMutation,
    clearCart: clearCartMutation,
    checkout: checkoutMutation,
    refetch: cartQuery.refetch,
  }
}
