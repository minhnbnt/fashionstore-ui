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

/** Ảnh đưa vào ngữ cảnh model bị co về tối đa 1024px cạnh dài rồi encode JPEG:
 *  ảnh điện thoại 5MB nếu đưa nguyên bản, base64 phình cả triệu token. */
const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.8

/** Co kích thước giữ tỷ lệ để cạnh dài tối đa maxDimension, không nhỏ hơn 1px. */
export function fitDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }
  const scale = maxDimension / Math.max(width, height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Thu nhỏ ảnh qua canvas và encode JPEG (nền trắng cho vùng trong suốt). Best-effort:
 *  môi trường thiếu canvas hay ảnh decode hỏng thì trả blob gốc, không làm gục tool. */
async function downscaleToJpeg(blob: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob)
    const { width, height } = fitDimensions(bitmap.width, bitmap.height, MAX_DIMENSION)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (context === null) {
      throw new Error('Không có canvas 2d')
    }
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const encoded = await new Promise<Blob | null>(function (resolve) {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (encoded === null) {
      throw new Error('Không encode được ảnh')
    }
    return encoded
  } catch {
    return blob
  }
}

/** Tool đọc nội dung ảnh: tải ảnh theo link, thu nhỏ về tối đa 1024px (JPEG q0.8) rồi trả
 *  bytes base64 kèm mediaType — qua toModelOutput ảnh được đưa thẳng vào ngữ cảnh để model
 *  tự nhìn thấy. Ảnh nguyên bản (điện thoại 5MB) nếu đưa thẳng sẽ phình token vượt trần
 *  context, nên bắt buộc phải co trước. Tool trung tính — không biết gì về nguồn ảnh. */
export function createReadImageTool() {
  return tool({
    description:
      'Xem nội dung một ảnh theo link http(s) (kết quả trả về chỉ cho bạn nhìn thấy, khách không thấy). Dùng khi cần mô tả ảnh, kiểm tra ảnh thử đồ giống sản phẩm hay không…',
    inputSchema: readImageInputSchema,
    execute: async function (input): Promise<ReadImageToolOutput> {
      const original = await loadBlob(input.url)
      const blob = await downscaleToJpeg(original)
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
