// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test'

import { ApiError } from '@/lib/api/apiFetch'

const { mutateAsync, onClear, onResults, pendingState } = vi.hoisted(function () {
  return {
    mutateAsync: vi.fn(),
    onClear: vi.fn(),
    onResults: vi.fn(),
    pendingState: { isPending: false },
  }
})

vi.mock('@generated/endpoints/search/search', () => ({
  useByImage: () => ({ mutateAsync, isPending: pendingState.isPending }),
}))

import ImageSearchPanel from './ImageSearchPanel'

const createObjectURL = vi.fn(() => 'blob:preview')
const revokeObjectURL = vi.fn()

beforeAll(function () {
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
})

afterEach(function () {
  cleanup()
  vi.clearAllMocks()
  pendingState.isPending = false
})

function png(name: string, size: number): File {
  const file = new File([new Uint8Array(Math.min(size, 16))], name, { type: 'image/png' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function renderPanel() {
  return render(<ImageSearchPanel onResults={onResults} onClear={onClear} />)
}

function input(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

describe('ImageSearchPanel', () => {
  it('tu choi file khong phai anh', () => {
    renderPanel()
    fireEvent.change(input(), {
      target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    })
    expect(screen.getByText('Chỉ nhận file ảnh.')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('tu choi SVG va anh qua 8MB', () => {
    renderPanel()
    fireEvent.change(input(), {
      target: { files: [new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })] },
    })
    expect(screen.getByText('Chỉ nhận file ảnh.')).toBeTruthy()

    fireEvent.change(input(), {
      target: { files: [png('big.png', 8 * 1024 * 1024 + 1)] },
    })
    expect(screen.getByText('Ảnh tối đa 8 MB.')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('gui dung file va limit, nhan items ve cho cha', async () => {
    mutateAsync.mockResolvedValueOnce({ data: { items: [{ id: 'p1' }] }, status: 200 })
    renderPanel()
    const file = png('ao.png', 2048)
    fireEvent.change(input(), { target: { files: [file] } })

    fireEvent.click(screen.getByRole('button', { name: 'Tìm sản phẩm giống ảnh' }))

    await waitFor(function () {
      expect(mutateAsync).toHaveBeenCalledWith({ data: { file }, params: { limit: 20 } })
    })
    expect(onResults).toHaveBeenCalledWith([{ id: 'p1' }])
  })

  it('hien thong diep 413 va 503', async () => {
    renderPanel()
    fireEvent.change(input(), { target: { files: [png('ao.png', 2048)] } })

    mutateAsync.mockRejectedValueOnce(new ApiError(413, ''))
    fireEvent.click(screen.getByRole('button', { name: 'Tìm sản phẩm giống ảnh' }))
    await screen.findByText('Ảnh quá lớn. Dung lượng tối đa là 8 MB.')

    mutateAsync.mockRejectedValueOnce(new ApiError(503, ''))
    fireEvent.click(screen.getByRole('button', { name: 'Tìm sản phẩm giống ảnh' }))
    await screen.findByText('Dịch vụ tìm kiếm đang bận. Vui lòng thử lại sau.')
  })

  it('goi onClear khi chon anh moi de xoa ket qua cu', () => {
    renderPanel()
    fireEvent.change(input(), { target: { files: [png('a.png', 100)] } })
    fireEvent.change(input(), { target: { files: [png('b.png', 200)] } })
    expect(onClear).toHaveBeenCalledTimes(2)
  })

  it('drop nhieu file thi chi lay file dau va bao loi', () => {
    const { container } = renderPanel()
    const zone = container.querySelector('[data-testid="image-dropzone"]') as HTMLElement
    const data = {
      files: [png('a.png', 100), png('b.png', 100)],
    }
    fireEvent.dragOver(zone)
    fireEvent.drop(zone, { dataTransfer: data })
    expect(screen.getByText('Chỉ hỗ trợ một ảnh mỗi lần tìm.')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('revoke object URL khi xoa anh', () => {
    renderPanel()
    fireEvent.change(input(), { target: { files: [png('a.png', 100)] } })
    fireEvent.click(screen.getByRole('button', { name: 'Xóa ảnh' }))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('dang tim thi hien spinner va khoa cac nut', () => {
    pendingState.isPending = true
    renderPanel()
    fireEvent.change(input(), { target: { files: [png('a.png', 100)] } })

    expect(screen.getByText('Đang tìm…')).toBeTruthy()
    const submit = screen.getByRole('button', { name: 'Đang tìm…' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    const dropzone = screen.getByTestId('image-dropzone') as HTMLButtonElement
    expect(dropzone.disabled).toBe(true)
  })

  it('nut X tren preview xoa anh va revoke object URL', () => {
    renderPanel()
    fireEvent.change(input(), { target: { files: [png('a.png', 100)] } })
    expect(screen.getByAltText('Ảnh đã chọn để tìm')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Xóa ảnh đã chọn' }))

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    expect(screen.queryByAltText('Ảnh đã chọn để tìm')).toBeNull()
    expect(onClear).toHaveBeenCalled()
  })
})
