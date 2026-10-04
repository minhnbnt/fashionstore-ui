import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProduct,
  getProduct,
  updateProduct,
  uploadImage,
} from '@/lib/api'
import ProductForm from '@/pages/ProductForm'

vi.mock('@/lib/api', () => ({
  getProduct: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  uploadImage: vi.fn(),
}))

const getProductMock = vi.mocked(getProduct)
const createProductMock = vi.mocked(createProduct)
const updateProductMock = vi.mocked(updateProduct)
const uploadImageMock = vi.mocked(uploadImage)

const EXISTING = {
  id: 1,
  name: 'Áo thun basic',
  description: 'Cotton 100%',
  price: 350000,
  imageKey: 'mock/ao-thun.jpg',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
}

function renderForm(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/" element={<div>danh sách sản phẩm</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  getProductMock.mockReset()
  createProductMock.mockReset()
  updateProductMock.mockReset()
  uploadImageMock.mockReset()
})

describe('ProductForm create mode', () => {
  it('renders name, price, description and image fields', () => {
    renderForm('/products/new')

    expect(screen.getByLabelText('Tên sản phẩm')).toBeInTheDocument()
    expect(screen.getByLabelText('Giá (VND)')).toBeInTheDocument()
    expect(screen.getByLabelText('Mô tả')).toBeInTheDocument()
    expect(screen.getByLabelText('Ảnh sản phẩm')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo sản phẩm' })).toBeInTheDocument()
    expect(getProductMock).not.toHaveBeenCalled()
  })

  it('blocks submit when the name is empty', async () => {
    const user = userEvent.setup()
    renderForm('/products/new')

    await user.type(screen.getByLabelText('Giá (VND)'), '350000')
    await user.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }))

    expect(await screen.findByText('Tên sản phẩm không được để trống')).toBeInTheDocument()
    expect(createProductMock).not.toHaveBeenCalled()
  })

  it('blocks submit when the price is not a positive number', async () => {
    const user = userEvent.setup()
    renderForm('/products/new')

    await user.type(screen.getByLabelText('Tên sản phẩm'), 'Áo mới')
    await user.type(screen.getByLabelText('Giá (VND)'), '0')
    await user.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }))

    expect(await screen.findByText('Giá phải là số lớn hơn 0')).toBeInTheDocument()
    expect(createProductMock).not.toHaveBeenCalled()
  })

  it('rejects non-image files', async () => {
    // user-event mô phỏng picker tôn trọng accept nên không fire change;
    // dùng fireEvent cho đường bypass (kéo-thả, chọn All files)
    renderForm('/products/new')

    const bad = new File(['hello'], 'note.txt', { type: 'text/plain' })
    fireEvent.change(screen.getByLabelText('Ảnh sản phẩm'), { target: { files: [bad] } })

    expect(await screen.findByText('Chỉ nhận file ảnh (tối đa 5 MB)')).toBeInTheDocument()
  })

  it('creates with imageKey null when no file is chosen and navigates home', async () => {
    const user = userEvent.setup()
    createProductMock.mockResolvedValue({ ...EXISTING, id: 7, name: 'Áo mới' })
    renderForm('/products/new')

    await user.type(screen.getByLabelText('Tên sản phẩm'), 'Áo mới')
    await user.type(screen.getByLabelText('Giá (VND)'), '350000')
    await user.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }))

    await waitFor(() => {
      expect(createProductMock).toHaveBeenCalledWith({
        name: 'Áo mới',
        description: null,
        price: 350000,
        imageKey: null,
      })
      expect(uploadImageMock).not.toHaveBeenCalled()
      expect(screen.getByText('danh sách sản phẩm')).toBeInTheDocument()
    })
  })

  it('uploads the chosen file first, then creates with the returned key', async () => {
    const user = userEvent.setup()
    uploadImageMock.mockResolvedValue('uploads/abc.png')
    createProductMock.mockResolvedValue({ ...EXISTING, id: 7 })
    renderForm('/products/new')

    await user.type(screen.getByLabelText('Tên sản phẩm'), 'Áo mới')
    await user.type(screen.getByLabelText('Giá (VND)'), '350000')
    const file = new File(['png'], 'ao.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), file)
    await user.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }))

    await waitFor(() => {
      expect(uploadImageMock).toHaveBeenCalledWith(file)
      expect(createProductMock).toHaveBeenCalledWith({
        name: 'Áo mới',
        description: null,
        price: 350000,
        imageKey: 'uploads/abc.png',
      })
      expect(screen.getByText('danh sách sản phẩm')).toBeInTheDocument()
    })
  })

  it('shows a focused error summary when saving fails', async () => {
    const user = userEvent.setup()
    createProductMock.mockRejectedValue(new Error('Tên đã tồn tại'))
    renderForm('/products/new')

    await user.type(screen.getByLabelText('Tên sản phẩm'), 'Áo trùng')
    await user.type(screen.getByLabelText('Giá (VND)'), '350000')
    await user.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }))

    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('Tên đã tồn tại')
    expect(summary).toHaveFocus()
  })
})

describe('ProductForm edit mode', () => {
  it('prefills fields from the loaded product', async () => {
    getProductMock.mockResolvedValue(EXISTING)
    renderForm('/products/1/edit')

    expect(await screen.findByDisplayValue('Áo thun basic')).toBeInTheDocument()
    expect(screen.getByDisplayValue('350000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Cotton 100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeInTheDocument()
  })

  it('updates and navigates home, keeping the old image when no file is chosen', async () => {
    const user = userEvent.setup()
    getProductMock.mockResolvedValue(EXISTING)
    updateProductMock.mockResolvedValue({ ...EXISTING, name: 'Áo thun premium' })
    renderForm('/products/1/edit')

    const name = await screen.findByDisplayValue('Áo thun basic')
    await user.clear(name)
    await user.type(name, 'Áo thun premium')
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => {
      expect(updateProductMock).toHaveBeenCalledWith(1, {
        name: 'Áo thun premium',
        description: 'Cotton 100%',
        price: 350000,
        imageKey: 'mock/ao-thun.jpg',
      })
      expect(uploadImageMock).not.toHaveBeenCalled()
      expect(screen.getByText('danh sách sản phẩm')).toBeInTheDocument()
    })
  })

  it('shows an error state with a back link when the product fails to load', async () => {
    getProductMock.mockRejectedValue(new Error('Không tìm thấy'))
    renderForm('/products/999/edit')

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy')
    expect(screen.getByRole('link', { name: 'Về danh sách' })).toHaveAttribute('href', '/')
  })
})
