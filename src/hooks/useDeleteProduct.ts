import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteProduct } from '@/lib/api'

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
