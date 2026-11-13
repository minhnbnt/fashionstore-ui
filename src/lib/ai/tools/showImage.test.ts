import { describe, expect, it } from 'vite-plus/test'

import { createShowImageTool, showImageInputSchema } from './showImage'

// Options bắt buộc của tool execute, test không dùng tới nội dung bên trong.
function executeOptions() {
  return { toolCallId: 'tc-test', messages: [] } as never
}

describe('createShowImageTool', () => {
  it('trả lại đúng link ảnh để UI hiển thị, không chỉnh sửa gì', async function () {
    const tools = createShowImageTool()
    const output = await tools.execute?.(
      { url: 'https://assets.example.com/tryon-1' },
      executeOptions(),
    )

    expect(output).toEqual({ url: 'https://assets.example.com/tryon-1' })
  })
})

describe('showImageInputSchema', () => {
  it('nhận URL http(s)', function () {
    expect(
      showImageInputSchema.safeParse({ url: 'https://assets.example.com/a.png' }).success,
    ).toBe(true)
    expect(showImageInputSchema.safeParse({ url: 'http://localhost:9000/fs/a.png' }).success).toBe(
      true,
    )
  })

  it('chặn scheme lạ ngoài http(s) như javascript:', function () {
    expect(showImageInputSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('chặn chuỗi không phải URL', function () {
    expect(showImageInputSchema.safeParse({ url: 'khong-phai-url' }).success).toBe(false)
  })
})
