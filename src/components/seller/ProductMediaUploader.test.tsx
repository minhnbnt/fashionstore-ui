// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { uploadImage } from '@/lib/api/uploadImage'

import ProductMediaUploader, {
  type ProductMediaItem,
  type ProductMediaValue,
} from './ProductMediaUploader'

vi.mock('@/lib/api/uploadImage', () => ({
  uploadImage: vi.fn(),
  uploadVideo: vi.fn(),
  checkVideoDuration: vi.fn(),
}))

afterEach(function () {
  cleanup()
  vi.mocked(uploadImage).mockReset()
  vi.unstubAllGlobals()
})

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'image/webp' })
}

function renderUploader(images: ProductMediaItem[] = []) {
  const props = {
    images,
    onImagesChange: vi.fn(),
    video: null as ProductMediaValue | null,
    onVideoChange: vi.fn(),
    tryOnEnabled: false,
    onTryOnToggle: vi.fn(),
    garment: null as ProductMediaValue | null,
    onGarmentChange: vi.fn(),
  }
  render(<ProductMediaUploader {...props} />)
  return props
}

function selectImageInput(): HTMLInputElement {
  // Input ảnh là input file duy nhất có thuộc tính multiple trong component
  const input = document.querySelector('input[type="file"][multiple]')
  expect(input).not.toBeNull()
  return input as HTMLInputElement
}

function chooseFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('ProductMediaUploader - upload nhiều ảnh', () => {
  it('chọn 3 ảnh cùng lúc → onImagesChange nhận đủ 3 MediaItem đúng thứ tự', async function () {
    vi.mocked(uploadImage).mockImplementation(async function (file: File) {
      return `u-${file.name}`
    })
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:test-preview',
      revokeObjectURL: () => undefined,
    })

    const props = renderUploader()
    const input = selectImageInput()
    chooseFiles(input, [makeFile('a.webp'), makeFile('b.webp'), makeFile('c.webp')])

    await waitFor(function () {
      expect(props.onImagesChange).toHaveBeenCalledTimes(1)
    })

    const calls = props.onImagesChange.mock.calls as unknown as ProductMediaItem[][][]
    const items = calls[0][0]
    expect(items).toHaveLength(3)
    expect(
      items.map(function (item) {
        return item.uploadId
      }),
    ).toEqual(['u-a.webp', 'u-b.webp', 'u-c.webp'])
    for (const item of items) {
      // Preview mới = object URL local, không ghép từ S3 key
      expect(item.url).toBe('blob:test-preview')
    }
  })

  it('đã có 8 ảnh, chọn thêm 2 ảnh thì chặn và không đổi gallery', async function () {
    vi.mocked(uploadImage).mockResolvedValue('u-new')
    const existing: ProductMediaItem[] = Array.from({ length: 8 }, function (_, i) {
      return { uploadId: `u-${i}`, url: `https://s3.test/img-${i}.jpg` }
    })

    const props = renderUploader(existing)
    const input = selectImageInput()
    chooseFiles(input, [makeFile('x.webp'), makeFile('y.webp')])

    await waitFor(function () {
      expect(screen.getByText('Sản phẩm chỉ được tải lên tối đa 9 ảnh.')).toBeTruthy()
    })
    expect(props.onImagesChange).not.toHaveBeenCalled()
  })

  it('upload ảnh lỗi giữa chừng thì báo lỗi và giữ nguyên gallery cũ', async function () {
    vi.mocked(uploadImage).mockRejectedValue(new Error('S3 lỗi'))
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:test-preview',
      revokeObjectURL: () => undefined,
    })

    const props = renderUploader()
    const input = selectImageInput()
    chooseFiles(input, [makeFile('a.webp')])

    await waitFor(function () {
      expect(screen.getByText('S3 lỗi')).toBeTruthy()
    })
    expect(props.onImagesChange).not.toHaveBeenCalled()
  })
})
