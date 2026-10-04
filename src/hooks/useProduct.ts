import { useQuery } from '@tanstack/react-query'

import { getProduct } from '@/lib/api'

export function useProduct(productId: number | null) {
  return useQuery({
    queryKey: ['products', productId],
    queryFn: ({ signal }) => {
      if (productId === null) {
        throw new Error('Thiếu id sản phẩm')
      }
      return getProduct(productId, signal)
    },
    enabled: productId !== null,
  })
}
