import { MemoryRouter, Route, Routes } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import VirtualTryOn from './VirtualTryOn'

import type { DirectTryOnInput, DirectTryOnResult } from '@/lib/ai/vtonClient'
import type { ProductResponse } from '@generated/model/productResponse'

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

function renderTryOnPage(
  props: {
    vtonUrl?: string
    runTryOn?: (input: DirectTryOnInput) => Promise<DirectTryOnResult>
    productId?: string
  } = {},
) {
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
            element={<VirtualTryOn vtonUrl={props.vtonUrl} runTryOn={props.runTryOn} />}
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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('VirtualTryOn — Trang Phòng Thử Đồ Ảo AI (/try-on/:id)', function () {
  it('hiển thị ảnh garment trang phục và vùng kéo-thả ảnh mà không hiển thị tên/giá hay bắt chọn loại trang phục thủ công', function () {
    renderTryOnPage()

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
    renderTryOnPage()

    expect(screen.getByText('Sản phẩm này chưa hỗ trợ Thử đồ ảo AI')).toBeTruthy()
    const backLink = screen.getByRole('link', { name: /Quay lại trang sản phẩm/i })
    expect(backLink.getAttribute('href')).toBe('/product/p-1')
  })

  it('kéo-thả một file ảnh hợp lệ vào vùng dropzone → hiện ngay ảnh preview và bật nút Bắt đầu Thử Đồ Ảo AI mà không gọi uploadImageWithUrl lên S3', async function () {
    renderTryOnPage()

    const dropzone = screen.getByTestId('tryon-dropzone')
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeImageFile()] },
    })

    expect(await screen.findByAltText('Ảnh cá nhân của bạn')).toBeTruthy()
    expect(uploadWithUrlMock).not.toHaveBeenCalled()
    const startBtn = screen.getByRole('button', {
      name: /Bắt đầu Thử Đồ Ảo AI/i,
    }) as HTMLButtonElement
    expect(startBtn.disabled).toBe(false)
  })

  it('kéo-thả file không phải ảnh hoặc ảnh > 5MB → hiển thị thông báo lỗi và giữ nút bắt đầu disabled', async function () {
    renderTryOnPage()
    const dropzone = screen.getByTestId('tryon-dropzone')

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [makeImageFile('note.txt', 'text/plain')] },
    })
    expect(await screen.findByText('Chỉ nhận file ảnh.')).toBeTruthy()
    const startBtn = screen.getByRole('button', {
      name: /Bắt đầu Thử Đồ Ảo AI/i,
    }) as HTMLButtonElement
    expect(startBtn.disabled).toBe(true)

    const bigImage = makeImageFile('big.png', 'image/png')
    Object.defineProperty(bigImage, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [bigImage] },
    })
    expect(await screen.findByText('Ảnh tối đa 5 MB.')).toBeTruthy()
    expect(startBtn.disabled).toBe(true)
  })

  it('bấm Bắt đầu Thử Đồ Ảo AI → hiện trạng thái chờ kèm thanh progressbar và các bước tiến trình khi runTryOn đang chạy', async function () {
    const runTryOnMock = vi.fn(function () {
      return new Promise<DirectTryOnResult>(function () {
        // giữ pending để kiểm tra UI loading
      })
    })
    const user = userEvent.setup()
    renderTryOnPage({ runTryOn: runTryOnMock })

    fireEvent.drop(screen.getByTestId('tryon-dropzone'), {
      dataTransfer: { files: [makeImageFile()] },
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

  it('khi runTryOn trả về kết quả → truyền đúng tham số, hiện Ảnh kết quả thử đồ, hỗ trợ So sánh Trước / Sau, Phóng to ảnh và Tải ảnh về máy', async function () {
    const runTryOnMock = vi.fn().mockResolvedValue({
      objectUrl: 'blob:https://assets.test/tryon-res',
      blob: new Blob(['fake-png-bytes'], { type: 'image/png' }),
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {})

    const user = userEvent.setup()
    renderTryOnPage({ runTryOn: runTryOnMock })

    const personFile = makeImageFile()
    fireEvent.drop(screen.getByTestId('tryon-dropzone'), {
      dataTransfer: { files: [personFile] },
    })

    await user.click(screen.getByRole('button', { name: /Bắt đầu Thử Đồ Ảo AI/i }))

    expect(runTryOnMock).toHaveBeenCalledWith({
      personFile,
      garmentImageUrl: 'https://assets.test/garment-p1.png',
      mode: 'top',
      vtonUrl: undefined,
    })

    const resultImg = (await screen.findByAltText('Ảnh kết quả thử đồ')) as HTMLImageElement
    expect(resultImg.getAttribute('src')).toBe('blob:https://assets.test/tryon-res')

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
      expect(clickSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('khi sản phẩm có nhiều ảnh Garment → hiển thị danh sách mẫu trang phục và gửi đúng garmentImageUrl của mẫu đã chọn cho runTryOn', async function () {
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
    const runTryOnMock = vi.fn().mockResolvedValue({
      objectUrl: 'blob:https://assets.test/tryon-black',
      blob: new Blob(['fake-png-bytes'], { type: 'image/png' }),
    })
    const user = userEvent.setup()
    renderTryOnPage({ runTryOn: runTryOnMock })

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

    const personFile = makeImageFile()
    fireEvent.drop(screen.getByTestId('tryon-dropzone'), {
      dataTransfer: { files: [personFile] },
    })
    await user.click(screen.getByRole('button', { name: /Bắt đầu Thử Đồ Ảo AI/i }))

    expect(runTryOnMock).toHaveBeenCalledWith({
      personFile,
      garmentImageUrl: 'https://assets.test/garment-black.png',
      mode: 'top',
      vtonUrl: undefined,
    })
  })

  it('khi runTryOn reject lỗi → hiển thị thông báo lỗi role="alert" và thoát trạng thái loading', async function () {
    const runTryOnMock = vi
      .fn()
      .mockRejectedValue(new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'))
    const user = userEvent.setup()
    renderTryOnPage({ runTryOn: runTryOnMock })

    fireEvent.drop(screen.getByTestId('tryon-dropzone'), {
      dataTransfer: { files: [makeImageFile()] },
    })
    await user.click(screen.getByRole('button', { name: /Bắt đầu Thử Đồ Ảo AI/i }))

    const alertEl = await screen.findByRole('alert')
    expect(alertEl.textContent).toContain('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
    expect(screen.queryByText('Đang tạo ảnh thử đồ, chờ chút nhé…')).toBeNull()
  })
})
