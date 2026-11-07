import { tool } from 'ai'
import { z } from 'zod'

export const showImageInputSchema = z.object({
  url: z
    .url()
    .refine(
      function (value) {
        return value.startsWith('https://') || value.startsWith('http://')
      },
      { message: 'Chỉ nhận link ảnh http(s).' },
    )
    .describe('Link ảnh http(s) muốn hiển thị cho khách trong khung chat, không được bịa link'),
})

export type ShowImageToolInput = z.infer<typeof showImageInputSchema>

export interface ShowImageToolOutput {
  url: string
}

/** Tool hiển thị một ảnh cho khách trong khung chat qua link — tool trung tính,
 *  không biết gì về nguồn ảnh; ai có link ảnh hợp lệ đều hiện được. */
export function createShowImageTool() {
  return tool({
    description:
      'Hiển thị một ảnh cho khách trong khung chat. Truyền link ảnh http(s) có thật (ví dụ link ảnh trả về từ tool tạo ảnh thử đồ), không được bịa link.',
    inputSchema: showImageInputSchema,
    execute: async function (input): Promise<ShowImageToolOutput> {
      return { url: input.url }
    },
  })
}
