import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { createTryOnTool, tryOnInputSchema } from './tryOn'

const { connectMock, predictMock, uploadImageMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  predictMock: vi.fn(),
  uploadImageMock: vi.fn(),
}))

vi.mock('@gradio/client', () => ({ Client: { connect: connectMock } }))
vi.mock('@/lib/api/uploadImage', () => ({ uploadImage: uploadImageMock }))

// Options bắt buộc của tool execute, test không dùng tới nội dung bên trong.
function executeOptions() {
  return { toolCallId: 'tc-test', messages: [] } as never
}

/** fetch giả: luôn ok, blob png — dùng cho cả 3 lần tải (ảnh khách, ảnh sản phẩm, ảnh kết quả). */
function fetchOk() {
  return vi.fn(async function () {
    return {
      ok: true,
      blob: async function () {
        return new Blob(['anh-gia'], { type: 'image/png' })
      },
    }
  })
}

afterEach(function () {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('createTryOnTool', () => {
  it('tải 2 ảnh, gọi Space /try_on đủ tham số, lưu S3 và trả link ảnh mới', async function () {
    vi.stubEnv('VITE_ASSETS_URL', 'https://assets.example.com')
    const fetchMock = fetchOk()
    vi.stubGlobal('fetch', fetchMock)
    connectMock.mockResolvedValue({ predict: predictMock })
    predictMock.mockResolvedValue({ data: [{ url: 'https://space.example/result.png' }] })
    uploadImageMock.mockResolvedValue('tryon-1')

    const tools = createTryOnTool()
    const output = await tools.execute?.(
      {
        personImageUrl: 'https://assets.example.com/person.jpg',
        garmentImageKey: 'product-1',
        category: 'tops',
        garmentPhotoType: 'model',
      },
      executeOptions(),
    )

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://assets.example.com/person.jpg')
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://assets.example.com/product-1')
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://space.example/result.png')
    expect(connectMock).toHaveBeenCalledWith('fashn-ai/fashn-vton-1.5')
    const expectedPayload: Record<string, unknown> = {
      person_image: expect.any(Blob),
      garment_image: expect.any(Blob),
      category: 'tops',
      garment_photo_type: 'model',
      num_timesteps: 50,
      guidance_scale: 1.5,
      segmentation_free: true,
      seed: expect.any(Number),
    }
    expect(predictMock).toHaveBeenCalledWith('/try_on', expectedPayload)
    expect(uploadImageMock).toHaveBeenCalledTimes(1)
    expect(uploadImageMock.mock.calls[0]?.[0]).toBeInstanceOf(File)
    expect(output).toEqual({ image: { key: 'tryon-1', url: 'https://assets.example.com/tryon-1' } })
  })

  it('Space trả ảnh dạng chuỗi thường thì vẫn nhận được link', async function () {
    vi.stubEnv('VITE_ASSETS_URL', 'https://assets.example.com')
    vi.stubGlobal('fetch', fetchOk())
    connectMock.mockResolvedValue({ predict: predictMock })
    predictMock.mockResolvedValue({ data: ['https://space.example/result.png'] })
    uploadImageMock.mockResolvedValue('tryon-2')

    const tools = createTryOnTool()
    const output = await tools.execute?.(
      {
        personImageUrl: 'https://assets.example.com/person.jpg',
        garmentImageKey: 'product-1',
        category: 'bottoms',
        garmentPhotoType: 'flat-lay',
      },
      executeOptions(),
    )

    expect(output).toEqual({ image: { key: 'tryon-2', url: 'https://assets.example.com/tryon-2' } })
  })

  it('ảnh khách đính kèm tải thất bại thì ném lỗi thân thiện', async function () {
    vi.stubEnv('VITE_ASSETS_URL', 'https://assets.example.com')
    const fetchMock = vi.fn(async function () {
      return { ok: false, status: 404 }
    })
    vi.stubGlobal('fetch', fetchMock)
    connectMock.mockResolvedValue({ predict: predictMock })

    const tools = createTryOnTool()

    await expect(
      tools.execute?.(
        {
          personImageUrl: 'https://assets.example.com/person.jpg',
          garmentImageKey: 'product-1',
          category: 'tops',
          garmentPhotoType: 'model',
        },
        executeOptions(),
      ),
    ).rejects.toThrow('Không tải được ảnh khách đính kèm, vui lòng thử lại sau.')
  })

  it('ảnh sản phẩm tải thất bại thì ném lỗi thân thiện', async function () {
    vi.stubEnv('VITE_ASSETS_URL', 'https://assets.example.com')
    const fetchMock = vi.fn(async function (url: unknown) {
      if (url === 'https://assets.example.com/product-1') {
        return { ok: false, status: 500 }
      }
      return {
        ok: true,
        blob: async function () {
          return new Blob(['anh-gia'], { type: 'image/png' })
        },
      }
    })
    vi.stubGlobal('fetch', fetchMock)
    connectMock.mockResolvedValue({ predict: predictMock })

    const tools = createTryOnTool()

    await expect(
      tools.execute?.(
        {
          personImageUrl: 'https://assets.example.com/person.jpg',
          garmentImageKey: 'product-1',
          category: 'tops',
          garmentPhotoType: 'model',
        },
        executeOptions(),
      ),
    ).rejects.toThrow('Không tải được ảnh sản phẩm, vui lòng thử lại sau.')
  })

  it('Space lỗi thì ném lỗi thân thiện', async function () {
    vi.stubEnv('VITE_ASSETS_URL', 'https://assets.example.com')
    vi.stubGlobal('fetch', fetchOk())
    connectMock.mockResolvedValue({ predict: predictMock })
    predictMock.mockRejectedValue(new Error('GPU quota exceeded'))

    const tools = createTryOnTool()

    await expect(
      tools.execute?.(
        {
          personImageUrl: 'https://assets.example.com/person.jpg',
          garmentImageKey: 'product-1',
          category: 'tops',
          garmentPhotoType: 'model',
        },
        executeOptions(),
      ),
    ).rejects.toThrow('Tạo ảnh thử đồ thất bại, vui lòng thử lại sau.')
  })

  it('Space trả data rỗng thì ném lỗi thân thiện', async function () {
    vi.stubEnv('VITE_ASSETS_URL', 'https://assets.example.com')
    vi.stubGlobal('fetch', fetchOk())
    connectMock.mockResolvedValue({ predict: predictMock })
    predictMock.mockResolvedValue({ data: [] })

    const tools = createTryOnTool()

    await expect(
      tools.execute?.(
        {
          personImageUrl: 'https://assets.example.com/person.jpg',
          garmentImageKey: 'product-1',
          category: 'tops',
          garmentPhotoType: 'model',
        },
        executeOptions(),
      ),
    ).rejects.toThrow('Tạo ảnh thử đồ thất bại, vui lòng thử lại sau.')
  })
})

describe('tryOnInputSchema', () => {
  it('nhận đủ 4 trường hợp lệ', function () {
    const parsed = tryOnInputSchema.safeParse({
      personImageUrl: 'https://assets.example.com/person.jpg',
      garmentImageKey: 'product-1',
      category: 'one-pieces',
      garmentPhotoType: 'model',
    })

    expect(parsed.success).toBe(true)
  })

  it('chặn category ngoài enum', function () {
    const parsed = tryOnInputSchema.safeParse({
      personImageUrl: 'https://assets.example.com/person.jpg',
      garmentImageKey: 'product-1',
      category: 'shoes',
      garmentPhotoType: 'model',
    })

    expect(parsed.success).toBe(false)
  })

  it('chặn garmentPhotoType ngoài enum', function () {
    const parsed = tryOnInputSchema.safeParse({
      personImageUrl: 'https://assets.example.com/person.jpg',
      garmentImageKey: 'product-1',
      category: 'tops',
      garmentPhotoType: 'hanger',
    })

    expect(parsed.success).toBe(false)
  })
})
