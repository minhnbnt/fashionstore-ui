import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { createReadImageTool, readImageInputSchema } from './readImage'

// Options bắt buộc của tool execute, test không dùng tới nội dung bên trong.
function executeOptions() {
  return { toolCallId: 'tc-test', messages: [] } as never
}

afterEach(function () {
  vi.unstubAllGlobals()
})

describe('createReadImageTool', () => {
  it('tải ảnh và trả data base64 + mediaType để đưa vào ngữ cảnh model', async function () {
    const fetchMock = vi.fn(async function () {
      return {
        ok: true,
        blob: async function () {
          return new Blob(['anh-gia'], { type: 'image/png' })
        },
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const tools = createReadImageTool()
    const output = await tools.execute?.(
      { url: 'https://assets.example.com/anh.png' },
      executeOptions(),
    )

    expect(fetchMock).toHaveBeenCalledWith('https://assets.example.com/anh.png')
    expect(output).toEqual({
      url: 'https://assets.example.com/anh.png',
      mediaType: 'image/png',
      data: btoa('anh-gia'),
    })
  })

  it('ảnh không khai báo mediaType thì mặc định image/png', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn(async function () {
        return {
          ok: true,
          blob: async function () {
            return new Blob(['anh-gia'])
          },
        }
      }),
    )

    const tools = createReadImageTool()
    const output = await tools.execute?.(
      { url: 'https://assets.example.com/anh' },
      executeOptions(),
    )

    expect(output).toMatchObject({ mediaType: 'image/png' })
  })

  it('ảnh quá lớn thì ném lỗi thân thiện, không đưa vào ngữ cảnh', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn(async function () {
        return {
          ok: true,
          blob: async function () {
            return new Blob([new ArrayBuffer(5 * 1024 * 1024 + 1)], { type: 'image/png' })
          },
        }
      }),
    )

    const tools = createReadImageTool()
    await expect(
      tools.execute?.({ url: 'https://assets.example.com/to.png' }, executeOptions()),
    ).rejects.toThrow('Ảnh quá lớn để xem, tối đa 5 MB.')
  })

  it('ảnh tải thất bại (không ok) thì ném lỗi thân thiện', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn(async function () {
        return { ok: false, status: 404 }
      }),
    )

    const tools = createReadImageTool()
    await expect(
      tools.execute?.({ url: 'https://assets.example.com/anh.png' }, executeOptions()),
    ).rejects.toThrow('Không tải được ảnh để xem, vui lòng thử lại sau.')
  })

  it('fetch văng lỗi mạng (CORS) thì vẫn ném lỗi thân thiện', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn(async function () {
        throw new TypeError('Failed to fetch')
      }),
    )

    const tools = createReadImageTool()
    await expect(
      tools.execute?.({ url: 'https://assets.example.com/anh.png' }, executeOptions()),
    ).rejects.toThrow('Không tải được ảnh để xem, vui lòng thử lại sau.')
  })

  it('toModelOutput đóng gói ảnh thành file data để model nhìn được', function () {
    const tools = createReadImageTool()
    const converted = tools.toModelOutput?.({
      toolCallId: 'tc-1',
      input: { url: 'https://assets.example.com/anh.png' },
      output: { url: 'https://assets.example.com/anh.png', mediaType: 'image/png', data: 'YW5o' },
    })

    expect(converted).toEqual({
      type: 'content',
      value: [
        {
          type: 'file',
          data: { type: 'data', data: 'YW5o' },
          mediaType: 'image/png',
        },
      ],
    })
  })
})

describe('readImageInputSchema', () => {
  it('nhận URL http(s)', function () {
    expect(
      readImageInputSchema.safeParse({ url: 'https://assets.example.com/anh.png' }).success,
    ).toBe(true)
  })

  it('chặn scheme lạ ngoài http(s) như javascript:', function () {
    expect(readImageInputSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('chặn chuỗi không phải URL', function () {
    expect(readImageInputSchema.safeParse({ url: 'khong-phai-url' }).success).toBe(false)
  })
})
