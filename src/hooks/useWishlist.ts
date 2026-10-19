import {
  getList2QueryKey,
  useList2,
  useRemove,
  useToggle,
} from '@generated/endpoints/wishlist/wishlist'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'

import { useSessionQuery } from './useSession'

import type { WishlistItemResponse } from '@generated/model/wishlistItemResponse'

export function useWishlist() {
  const queryClient = useQueryClient()
  const { data: session } = useSessionQuery()
  const isLoggedIn = session !== null && session !== undefined

  const wishlistQuery = useList2({
    query: {
      enabled: isLoggedIn,
    },
  })

  let items: WishlistItemResponse[] = []
  if (wishlistQuery.data !== undefined) {
    items = takeData(wishlistQuery.data)
  }

  const toggleMutation = useToggle({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList2QueryKey() })
      },
    },
  })

  const removeMutation = useRemove({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList2QueryKey() })
      },
    },
  })

  function isFavorited(productId: string | undefined): boolean {
    if (productId === undefined || productId === '') {
      return false
    }
    for (const item of items) {
      if (item.productId === productId) {
        return true
      }
    }
    return false
  }

  return {
    isLoggedIn,
    isLoading: wishlistQuery.isLoading,
    items,
    count: items.length,
    isFavorited,
    toggle: toggleMutation,
    remove: removeMutation,
    refetch: wishlistQuery.refetch,
  }
}
