import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { createReadImageTool, fitDimensions, readImageInputSchema } from './readImage'

// Options bắt buộc của tool execute, test không dùng tới nội dung bên trong.
function executeOptions() {
  return { toolCallId: 'tc-test', messages: [] } as never
}

/** Canvas pixel-op không có thật trong Node — mock đúng biên browser API,
 *  assert cách readImage dùng nó (kích thước đã co, nền trắng, encode JPEG). */
function stubCanvasEnv(options?: {
  bitmapWidth?: number
  bitmapHeight?: number
  throwOnBitmap?: boolean
}) {
  const bitmap = {
    width: options?.bitmapWidth ?? 4000,
    height: options?.bitmapHeight ?? 3000,
    close: vi.fn(),
  }
  const drawImageMock = vi.fn()
  const fillRectMock = vi.fn()
  const toBlobMock = vi.fn(function (callback: (blob: Blob | null) => void) {
    callback(new Blob(['jpeg-nho'], { type: 'image/jpeg' }))
  })
  const context = { fillStyle: '', fillRect: fillRectMock, drawImage: drawImageMock }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(function () {
      return context
    }),
    toBlob: toBlobMock,
  }
  vi.stubGlobal('document', {
    createElement: vi.fn(function () {
      return canvas
    }),
  })
  vi.stubGlobal(
    'createImageBitmap',
    options?.throwOnBitmap === true
      ? vi.fn(async function () {
          throw new TypeError('not an image')
        })
      : vi.fn(async function () {
          return bitmap
        }),
  )
  return { bitmap, canvas, drawImageMock, fillRectMock, toBlobMock }
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

  it('ảnh lớn bị thu về tối đa 1024px và encode JPEG trước khi đưa vào context', async function () {
    const env = stubCanvasEnv()
    vi.stubGlobal(
      'fetch',
      vi.fn(async function () {
        return {
          ok: true,
          blob: async function () {
            return new Blob([new ArrayBuffer(2048)], { type: 'image/png' })
          },
        }
      }),
    )

    const tools = createReadImageTool()
    const output = await tools.execute?.(
      { url: 'https://assets.example.com/lon.png' },
      executeOptions(),
    )

    // Canvas nhận kích thước đã co giữ tỷ lệ, vẽ bitmap lên nền trắng, encode JPEG q0.8.
    expect(env.canvas.width).toBe(1024)
    expect(env.canvas.height).toBe(768)
    expect(env.fillRectMock).toHaveBeenCalledWith(0, 0, 1024, 768)
    expect(env.drawImageMock).toHaveBeenCalledWith(env.bitmap, 0, 0, 1024, 768)
    expect(env.toBlobMock).toHaveBeenCalledWith(expect.anything(), 'image/jpeg', 0.8)
    expect(output).toMatchObject({ mediaType: 'image/jpeg', data: btoa('jpeg-nho') })
  })

  it('decode ảnh thất bại (ảnh lạ) thì giữ ảnh gốc, không vỡ flow', async function () {
    stubCanvasEnv({ throwOnBitmap: true })
    vi.stubGlobal(
      'fetch',
      vi.fn(async function () {
        return {
          ok: true,
          blob: async function () {
            return new Blob(['anh-gia'], { type: 'image/png' })
          },
        }
      }),
    )

    const tools = createReadImageTool()
    const output = await tools.execute?.(
      { url: 'https://assets.example.com/anh.png' },
      executeOptions(),
    )

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

describe('fitDimensions', () => {
  it('ảnh nhỏ hơn giới hạn thì giữ nguyên kích thước', function () {
    expect(fitDimensions(800, 600, 1024)).toEqual({ width: 800, height: 600 })
  })

  it('ảnh ngang quá lớn thì co về cạnh dài 1024, giữ tỷ lệ', function () {
    expect(fitDimensions(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 })
  })

  it('ảnh dọc quá lớn thì co về cạnh dài 1024, giữ tỷ lệ', function () {
    expect(fitDimensions(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 })
  })
})
