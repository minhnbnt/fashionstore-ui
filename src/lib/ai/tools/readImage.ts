import { tool } from 'ai'
import { z } from 'zod'

import { MAX_IMAGE_BYTES } from '@/lib/api/uploadImage'

export const readImageInputSchema = z.object({
  url: z
    .url()
    .refine(
      function (value) {
        return value.startsWith('https://') || value.startsWith('http://')
      },
      { message: 'Chỉ nhận link ảnh http(s).' },
    )
    .describe('Link ảnh http(s) muốn xem nội dung'),
})

export type ReadImageToolInput = z.infer<typeof readImageInputSchema>

export interface ReadImageToolOutput {
  url: string
  mediaType: string
  data: string
}

/** Blob → base64, chia khúc để tránh stack overflow khi ảnh lớn. */
function blobToBase64(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then(function (buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let start = 0; start < bytes.length; start += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000))
    }
    return btoa(binary)
  })
}

/** Tải ảnh theo link; mọi lỗi mạng lẫn HTTP không ok đều gộp thành một lỗi thân thiện. */
async function loadBlob(url: string): Promise<Blob> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('not-ok')
    }
    return await response.blob()
  } catch {
    throw new Error('Không tải được ảnh để xem, vui lòng thử lại sau.')
  }
}

/** Tool đọc nội dung ảnh: tải ảnh theo link và trả bytes base64 kèm mediaType,
 *  qua toModelOutput ảnh được đưa thẳng vào ngữ cảnh để model tự nhìn thấy.
 *  Tool trung tính — không biết gì về nguồn ảnh hay mục đích đọc. */
export function createReadImageTool() {
  return tool({
    description:
      'Xem nội dung một ảnh theo link http(s) (kết quả trả về chỉ cho bạn nhìn thấy, khách không thấy). Dùng khi cần mô tả ảnh, kiểm tra ảnh thử đồ giống sản phẩm hay không…',
    inputSchema: readImageInputSchema,
    execute: async function (input): Promise<ReadImageToolOutput> {
      const blob = await loadBlob(input.url)
      if (blob.size > MAX_IMAGE_BYTES) {
        throw new Error('Ảnh quá lớn để xem, tối đa 5 MB.')
      }
      const data = await blobToBase64(blob)
      let mediaType = blob.type
      if (mediaType === '') {
        mediaType = 'image/png'
      }
      return { url: input.url, mediaType, data }
    },
    toModelOutput: function ({ output }) {
      return {
        type: 'content',
        value: [
          {
            type: 'file',
            data: { type: 'data', data: output.data },
            mediaType: output.mediaType,
          },
        ],
      }
    },
  })
}
