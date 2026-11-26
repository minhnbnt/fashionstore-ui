import { MemoryRouter, Route, Routes } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import VirtualTryOn from './VirtualTryOn'

import type { AgentConfig, AgentUIMessage } from '@/lib/ai/agent'
import type { ProductResponse } from '@generated/model/productResponse'
import type { ChatTransport, UIMessageChunk } from 'ai'

const { uploadWithUrlMock, useDetail1Mock } = vi.hoisted(function () {
  return {
    uploadWithUrlMock: vi.fn(),
    useDetail1Mock: vi.fn(),
  }
})

vi.mock('@/lib/api/uploadImage', function () {
  return { uploadImageWithUrl: uploadWithUrlMock, MAX_IMAGE_BYTES: 5 * 1024 * 1024 }
})

vi.mock('@generated/endpoints/products/products', function () {
  return {
    useDetail1: useDetail1Mock,
  }
})

function configFixture(): AgentConfig {
  return { backendUrl: 'https://ai.test' }
}

function makeProduct(overrides?: Partial<ProductResponse>): ProductResponse {
  return {
    id: 'p-1',
    name: 'Áo Sơ Mi Lụa',
    slug: 'ao-so-mi-lua',
    description: 'Áo sơ mi lụa tơ tằm cao cấp',
    tryOnEnabled: true,
    garmentUrl: 'https://assets.test/garment-p1.png',
    images: [{ id: 'img-1', url: 'https://assets.test/cover-p1.png', sortOrder: 0 }],
    variants: [{ id: 'v-1', color: 'Trắng', size: 'M', price: 299000, stockQuantity: 5 }],
    ...overrides,
  }
}

function transportOf(chunks: UIMessageChunk[]): ChatTransport<AgentUIMessage> {
  return {
    sendMessages: async function () {
      return new ReadableStream<UIMessageChunk>({
        start: function (controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk)
          }
          controller.close()
        },
      })
    },
    reconnectToStream: async function () {
      return null
    },
  }
}

function renderTryOnPage(props: {
  config?: AgentConfig
  transport?: ChatTransport<AgentUIMessage>
  productId?: string
}) {
  let pid = 'p-1'
  if (props.productId !== undefined) {
    pid = props.productId
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/try-on/' + pid]}>
        <Routes>
          <Route
            path="/try-on/:id"
            element={<VirtualTryOn config={props.config} transport={props.transport} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function makeImageFile(name = 'person.png', type = 'image/png'): File {
  return new File(['fake-person-image'], name, { type })
}

beforeEach(function () {
  uploadWithUrlMock.mockReset()
  useDetail1Mock.mockReset()
  useDetail1Mock.mockReturnValue({
    isPending: false,
    isError: false,
    data: { status: 200, data: makeProduct() },
  })
})

afterEach(function () {
  cleanup()
  vi.unstubAllGlobals()
})

const TRYON_INPUT = {
  personImageUrl: 'https://assets.test/person.png',
  garmentImageUrl: 'https://assets.test/garment-p1.png',
  category: 'tops',
  garmentPhotoType: 'flat-lay',
}

const TRYON_PENDING_CHUNKS: UIMessageChunk[] = [
  { type: 'start', messageId: 'a1' },
  { type: 'start-step' },
  {
    type: 'tool-input-available',
    toolCallId: 'tc1',
    toolName: 'tryOn',
    input: TRYON_INPUT,
  },
  { type: 'finish-step' },
  { type: 'finish' },
]

const TRYON_DONE_CHUNKS: UIMessageChunk[] = [
  { type: 'start', messageId: 'a1' },
  { type: 'start-step' },
  {
    type: 'tool-input-available',
    toolCallId: 'tc1',
    toolName: 'tryOn',
    input: TRYON_INPUT,
  },
  {
    type: 'tool-output-available',
    toolCallId: 'tc1',
    output: { image: { key: 'tryon/res.png', url: 'https://assets.test/tryon/res.png' } },
  },
  {
    type: 'tool-input-available',
    toolCallId: 'tc2',
    toolName: 'showImage',
    input: { url: 'https://assets.test/tryon/res.png' },
  },
  {
    type: 'tool-output-available',
    toolCallId: 'tc2',
    output: { url: 'https://assets.test/tryon/res.png' },
  },
  { type: 'finish-step' },
  { type: 'finish' },
]

describe('VirtualTryOn — Trang Phòng Thử Đồ Ảo AI (/try-on/:id)', function () {
  it('hiển thị ảnh garment trang phục và vùng kéo-thả ảnh mà không hiển thị tên/giá hay bắt chọn loại trang phục thủ công', function () {
    renderTryOnPage({ config: configFixture() })

    expect(screen.getByText('1. Trang phục đang thử')).toBeTruthy()
    expect(screen.queryByText('Áo Sơ Mi Lụa')).toBeNull()
    expect(screen.getByTestId('tryon-dropzone')).toBeTruthy()
    const backLink = screen.getByRole('link', { name: /Quay lại trang sản phẩm/i })
    expect(backLink.getAttribute('href')).toBe('/product/p-1')
    const startBtn = screen.getByRole('button', {
      name: /Bắt đầu Thử Đồ Ảo AI/i,
    }) as HTMLButtonElement
    expect(startBtn.disabled).toBe(true)
    const mainEl = screen.getByRole('main')
    expect(mainEl.className).toContain('max-w-7xl')
    expect(mainEl.className).toContain('min-h-[calc(100dvh-2rem)]')
    const productImg = screen.getByAltText('Áo Sơ Mi Lụa')
    expect(productImg.getAttribute('src')).toBe('https://assets.test/garment-p1.png')
    expect(productImg.className).toContain('max-h-80')
    expect(productImg.className).toContain('object-contain')
  })

  it('sản phẩm chưa bật tryOnEnabled thì hiển thị thông báo và nút quay lại trang sản phẩm', function () {
    useDetail1Mock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { status: 200, data: makeProduct({ tryOnEnabled: false }) },
    })
    renderTryOnPage({ config: configFixture() })

    expect(screen.getByText('Sản phẩm này chưa hỗ trợ Thử đồ ảo AI')).toBeTruthy()
    const backLink = screen.getByRole('link', { name: /Quay lại trang sản phẩm/i })
    expect(backLink.getAttribute('href')).toBe('/product/p-1')
  })

  it('kéo-thả một file ảnh hợp lệ vào vùng dropzone → gọi uploadImageWithUrl, hiện ảnh preview và bật nút Bắt đầu Thử Đồ Ảo AI', async function () {
    uploadWithUrlMock.mockResolvedValue({
      uploadId: 'up-person-1',
      publicUrl: 'https://assets.test/person.png',
    })
    renderTryOnPage({ config: configFixture() })

    const dropzone = screen.getByTestId('tryon-dropzone')
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeImageFile()] },
    })

    expect(await screen.findByAltText('Ảnh cá nhân của bạn')).toBeTruthy()
    expect(uploadWithUrlMock).toHaveBeenCalledTimes(1)
    await waitFor(function () {
      const startBtn = screen.getByRole('button', {
        name: /Bắt đầu Thử Đồ Ảo AI/i,
      }) as HTMLButtonElement
      expect(startBtn.disabled).toBe(false)
    })
  })

  it('kéo-thả file không phải ảnh hoặc ảnh > 5MB → hiển thị thông báo lỗi và không upload', async function () {
    renderTryOnPage({ config: configFixture() })
    const dropzone = screen.getByTestId('tryon-dropzone')

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeImageFile('note.txt', 'text/plain')] },
    })
    expect(await screen.findByText('Chỉ nhận file ảnh.')).toBeTruthy()
    expect(uploadWithUrlMock).not.toHaveBeenCalled()

    const bigImage = makeImageFile('big.png', 'image/png')
    Object.defineProperty(bigImage, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [bigImage] },
    })
    expect(await screen.findByText('Ảnh tối đa 5 MB.')).toBeTruthy()
    expect(uploadWithUrlMock).not.toHaveBeenCalled()
  })

  it('bấm Bắt đầu Thử Đồ Ảo AI → hiện trạng thái chờ khi tryOn đang chạy', async function () {
    uploadWithUrlMock.mockResolvedValue({
      uploadId: 'up-person-1',
      publicUrl: 'https://assets.test/person.png',
    })
    const user = userEvent.setup()
    renderTryOnPage({
      config: configFixture(),
      transport: transportOf(TRYON_PENDING_CHUNKS),
    })

    fireEvent.drop(screen.getByTestId('tryon-dropzone'), {
      dataTransfer: { files: [makeImageFile()] },
    })
    await waitFor(function () {
      const startBtn = screen.getByRole('button', {
        name: /Bắt đầu Thử Đồ Ảo AI/i,
      }) as HTMLButtonElement
      expect(startBtn.disabled).toBe(false)
    })

    await user.click(screen.getByRole('button', { name: /Bắt đầu Thử Đồ Ảo AI/i }))
    expect(await screen.findByText('Đang tạo ảnh thử đồ, chờ chút nhé…')).toBeTruthy()
    const progressBar = screen.getByRole('progressbar', {
      name: 'Tiến trình tạo ảnh thử đồ AI',
    }) as HTMLProgressElement
    expect(progressBar).toBeTruthy()
    expect(Number(progressBar.getAttribute('value'))).toBeGreaterThan(0)
    expect(screen.getByText(/Phân tích dáng người & tư thế ảnh cá nhân/)).toBeTruthy()
  })

  it('khi có kết quả thử đồ → hiện Ảnh kết quả thử đồ, hỗ trợ So sánh Trước / Sau, phóng to và Tải ảnh về máy', async function () {
    uploadWithUrlMock.mockResolvedValue({
      uploadId: 'up-person-1',
      publicUrl: 'https://assets.test/person.png',
    })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['fake-png-bytes'], { type: 'image/png' }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderTryOnPage({
      config: configFixture(),
      transport: transportOf(TRYON_DONE_CHUNKS),
    })

    fireEvent.drop(screen.getByTestId('tryon-dropzone'), {
      dataTransfer: { files: [makeImageFile()] },
    })
    await waitFor(function () {
      const startBtn = screen.getByRole('button', {
        name: /Bắt đầu Thử Đồ Ảo AI/i,
      }) as HTMLButtonElement
      expect(startBtn.disabled).toBe(false)
    })

    await user.click(screen.getByRole('button', { name: /Bắt đầu Thử Đồ Ảo AI/i }))

    const resultImg = (await screen.findByAltText('Ảnh kết quả thử đồ')) as HTMLImageElement
    expect(resultImg.getAttribute('src')).toBe('https://assets.test/tryon/res.png')

    // Bật So sánh Trước / Sau
    const compareBtn = screen.getByRole('button', { name: /So sánh Trước \/ Sau/i })
    await user.click(compareBtn)
    expect(screen.getByText('Ảnh gốc của bạn')).toBeTruthy()
    expect(screen.getByText('Kết quả mặc thử AI')).toBeTruthy()

    // Phóng to ảnh
    const zoomBtn = screen.getByRole('button', { name: /Phóng to ảnh/i })
    await user.click(zoomBtn)
    expect(await screen.findByAltText('Ảnh kết quả thử đồ (phóng to)')).toBeTruthy()

    // Tải ảnh về máy
    const downloadBtn = screen.getByRole('button', { name: /Tải ảnh về máy/i })
    await user.click(downloadBtn)
    await waitFor(function () {
      expect(fetchMock).toHaveBeenCalledWith('https://assets.test/tryon/res.png')
    })
  })

  it('khi sản phẩm có nhiều ảnh Garment → hiển thị danh sách mẫu trang phục và cho phép người mua bấm đổi ảnh Garment để thử', async function () {
    useDetail1Mock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        status: 200,
        data: makeProduct({
          garmentUrl: 'https://assets.test/garment-white.png',
          garments: [
            {
              id: 'g-1',
              uploadId: 'u-1',
              url: 'https://assets.test/garment-white.png',
              sortOrder: 0,
            },
            {
              id: 'g-2',
              uploadId: 'u-2',
              url: 'https://assets.test/garment-black.png',
              sortOrder: 1,
            },
          ],
        }),
      },
    })
    const user = userEvent.setup()
    renderTryOnPage({ config: configFixture() })

    const productImg = screen.getByAltText('Áo Sơ Mi Lụa')
    expect(productImg.getAttribute('src')).toBe('https://assets.test/garment-white.png')

    const thumb1 = screen.getByRole('button', { name: 'Chọn mẫu trang phục 1' })
    const thumb2 = screen.getByRole('button', { name: 'Chọn mẫu trang phục 2' })
    expect(thumb1.getAttribute('aria-pressed')).toBe('true')
    expect(thumb2.getAttribute('aria-pressed')).toBe('false')

    await user.click(thumb2)

    expect(productImg.getAttribute('src')).toBe('https://assets.test/garment-black.png')
    expect(thumb2.getAttribute('aria-pressed')).toBe('true')
    expect(thumb1.getAttribute('aria-pressed')).toBe('false')
  })
})
