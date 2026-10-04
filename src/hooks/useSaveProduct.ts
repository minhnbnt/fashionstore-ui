import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createProduct, updateProduct, uploadImage } from '@/lib/api'
import type { ProductInput } from '@/lib/api'

export interface SaveProductValues {
  name: string
  description: string | null
  price: number
}

export interface SaveProductArgs {
  values: SaveProductValues
  file: File | null
  existingImageKey: string | null
}

export async function saveProduct(
  productId: number | null,
  args: SaveProductArgs,
  onStatus: (status: string | null) => void,
) {
  let imageKey = args.existingImageKey
  if (args.file !== null) {
    onStatus('Đang tải ảnh lên…')
    imageKey = await uploadImage(args.file)
  }
  onStatus('Đang lưu sản phẩm…')
  const input: ProductInput = { ...args.values, imageKey }
  if (productId !== null) {
    return updateProduct(productId, input)
  }
  return createProduct(input)
}

export function useSaveProduct(
  productId: number | null,
  options: {
    onStatus: (status: string | null) => void
    onSuccess: () => void
  },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: SaveProductArgs) => saveProduct(productId, args, options.onStatus),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      options.onSuccess()
    },
    onSettled: () => {
      options.onStatus(null)
    },
  })
}
