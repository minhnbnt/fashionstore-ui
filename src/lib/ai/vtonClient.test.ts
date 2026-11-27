// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { DEFAULT_VTON_API_URL, inferTryOnMode, readVtonConfig, runDirectTryOn } from './vtonClient'

const { mockConnect, mockGetSession } = vi.hoisted(function () {
  return {
    mockConnect: vi.fn(),
    mockGetSession: vi.fn(),
  }
})

vi.mock('@gradio/client', function () {
  return {
    Client: {
      connect: mockConnect,
    },
  }
})

vi.mock('@/lib/auth', function () {
  return {
    getAuthClient: function () {
      return {
        getSession: mockGetSession,
      }
    },
  }
})

function makePersonFile(): File {
  return new File(['person-bytes'], 'person.png', { type: 'image/png' })
}

beforeEach(function () {
  mockConnect.mockReset()
  mockGetSession.mockReset()
})

afterEach(function () {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('inferTryOnMode', function () {
  it('phân loại top cho áo thông thường', function () {
    expect(inferTryOnMode('Áo sơ mi lụa', 'Áo tay dài cổ đức')).toBe('top')
  })

  it('phân loại bottom cho quần và chân váy', function () {
    expect(inferTryOnMode('Quần jean ống rộng', 'Vải denim co giãn')).toBe('bottom')
    expect(inferTryOnMode('Chân váy xếp ly', 'Dáng chữ A thanh lịch')).toBe('bottom')
  })

  it('ưu tiên phân loại full cho đầm, bộ, set kể cả khi tên hoặc mô tả có chữ quần', function () {
    expect(inferTryOnMode('Đầm maxi đi biển', 'Váy liền thân họa tiết hoa')).toBe('full')
    expect(inferTryOnMode('Bộ pijama áo quần lụa', 'Mặc nhà thoáng mát')).toBe('full')
    expect(inferTryOnMode('Set vest nữ kèm quần âu', 'Thiết kế công sở')).toBe('full')
    expect(inferTryOnMode('Jumpsuit linen', 'Thiết kế ống suông')).toBe('full')
  })
})

describe('readVtonConfig', function () {
  it('đọc VITE_VTON_API_URL từ biến môi trường hoặc fallback về DEFAULT_VTON_API_URL khi rỗng', function () {
    vi.stubEnv('VITE_VTON_API_URL', 'http://localhost:8001')
    expect(readVtonConfig()).toEqual({ vtonUrl: 'http://localhost:8001' })

    vi.stubEnv('VITE_VTON_API_URL', '   ')
    expect(readVtonConfig()).toEqual({ vtonUrl: DEFAULT_VTON_API_URL })
  })
})

describe('runDirectTryOn', function () {
  it('ném lỗi khi chưa đăng nhập hoặc thiếu access_token mà không gọi fetch hay Client.connect', async function () {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      runDirectTryOn({
        personFile: makePersonFile(),
        garmentImageUrl: 'https://assets.test/garment.png',
        mode: 'top',
      }),
    ).rejects.toThrow('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')

    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockConnect).not.toHaveBeenCalled()
  })

  it('tải ảnh garment, kết nối vton-ai kèm Bearer JWT, gọi /process_images và tải ảnh kết quả dạng Blob kèm Bearer JWT', async function () {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt' } },
      error: null,
    })

    const garmentBlob = new Blob(['garment-data'], { type: 'image/jpeg' })
    const resultBlob = new Blob(['result-png-data'], { type: 'image/png' })
    const mockFetch = vi.fn(async function (url: string) {
      if (url === 'https://assets.test/garment.jpg') {
        return new Response(garmentBlob, {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        })
      }
      if (url === 'http://localhost:8001/gradio_api/file=out.png') {
        return new Response(resultBlob, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })
      }
      return new Response(null, { status: 404 })
    })
    vi.stubGlobal('fetch', mockFetch)

    const mockPredict = vi.fn().mockResolvedValue({
      data: [[{ image: { url: 'http://localhost:8001/gradio_api/file=out.png' }, caption: null }]],
    })
    mockConnect.mockResolvedValue({
      predict: mockPredict,
    })

    const personFile = makePersonFile()
    const output = await runDirectTryOn({
      personFile,
      garmentImageUrl: 'https://assets.test/garment.jpg',
      mode: 'top',
      vtonUrl: 'http://localhost:8001',
    })

    expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://assets.test/garment.jpg')
    expect(mockConnect).toHaveBeenCalledWith('http://localhost:8001', {
      headers: { Authorization: 'Bearer test-jwt' },
    })
    expect(mockPredict).toHaveBeenCalledTimes(1)
    const predictArgs = mockPredict.mock.calls[0]
    expect(predictArgs?.[0]).toBe('/process_images')
    const payload = predictArgs?.[1] as { images: File[]; mode: string }
    expect(payload.mode).toBe('top')
    expect(payload.images[0]).toBe(personFile)
    expect(payload.images[1]).toBeInstanceOf(File)
    expect(payload.images[1]?.name).toBe('garment.jpg')

    expect(mockFetch).toHaveBeenNthCalledWith(2, 'http://localhost:8001/gradio_api/file=out.png', {
      headers: { Authorization: 'Bearer test-jwt' },
    })
    expect(output.blob).toBeInstanceOf(Blob)
    expect(output.objectUrl).toMatch(/^blob:/)
  })

  it('ném lỗi tiếng Việt khi tải ảnh garment bị lỗi 404 hoặc lỗi mạng', async function () {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt' } },
      error: null,
    })
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      runDirectTryOn({
        personFile: makePersonFile(),
        garmentImageUrl: 'https://assets.test/missing.png',
        mode: 'top',
      }),
    ).rejects.toThrow('Không tải được ảnh sản phẩm, vui lòng thử lại sau.')
    expect(mockConnect).not.toHaveBeenCalled()
  })

  it('ném lỗi tiếng Việt khi Gradio connect/predict thất bại hoặc trả dữ liệu rỗng', async function () {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt' } },
      error: null,
    })
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(new Blob(['garment'], { type: 'image/png' }), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    )
    vi.stubGlobal('fetch', mockFetch)
    mockConnect.mockResolvedValue({
      predict: vi.fn().mockResolvedValue({ data: [[]] }),
    })

    await expect(
      runDirectTryOn({
        personFile: makePersonFile(),
        garmentImageUrl: 'https://assets.test/garment.png',
        mode: 'top',
      }),
    ).rejects.toThrow('Tạo ảnh thử đồ thất bại, vui lòng thử lại sau.')
  })

  it('ném lỗi tiếng Việt khi tải ảnh kết quả từ vton-ai trả về 401 hoặc 404', async function () {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt' } },
      error: null,
    })
    const mockFetch = vi.fn(async function (url: string) {
      if (url === 'https://assets.test/garment.png') {
        return new Response(new Blob(['garment'], { type: 'image/png' }), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })
      }
      return new Response(null, { status: 401 })
    })
    vi.stubGlobal('fetch', mockFetch)
    mockConnect.mockResolvedValue({
      predict: vi.fn().mockResolvedValue({
        data: [[{ url: 'http://localhost:8001/gradio_api/file=out.png' }]],
      }),
    })

    await expect(
      runDirectTryOn({
        personFile: makePersonFile(),
        garmentImageUrl: 'https://assets.test/garment.png',
        mode: 'top',
      }),
    ).rejects.toThrow('Không tải được ảnh kết quả thử đồ, vui lòng thử lại sau.')
  })
})
