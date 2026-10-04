import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listProducts } from '@/lib/api'
import type { Product } from '@/lib/api'
import ProductList from '@/pages/ProductList'

vi.mock('@/lib/api', () => ({
  listProducts: vi.fn(),
}))

const listProductsMock = vi.mocked(listProducts)

function renderList() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/products/new" element={<div>form tạo sản phẩm</div>} />
          <Route path="/products/:id/edit" element={<div>form sửa sản phẩm</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const SAMPLE: Product[] = [
  {
    id: 1,
    name: 'Áo thun basic',
    description: 'Cotton 100%',
    price: 350000,
    imageKey: 'mock/ao-thun.jpg',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Quần jeans slim',
    description: null,
    price: 790000,
    imageKey: 'mock/jeans.jpg',
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  },
]

beforeEach(() => {
  listProductsMock.mockReset()
})

describe('ProductList', () => {
  it('shows a busy loading state while fetching', () => {
    listProductsMock.mockImplementation(() => new Promise(() => {}))

    renderList()

    const busy = screen.getByLabelText('Đang tải sản phẩm')
    expect(busy).toHaveAttribute('aria-busy', 'true')
  })

  it('renders one card per product with lazy image, name and formatted price', async () => {
    listProductsMock.mockResolvedValue(SAMPLE)
    renderList()

    expect(await screen.findByText('Áo thun basic')).toBeInTheDocument()
    expect(screen.getByText('Quần jeans slim')).toBeInTheDocument()
    expect(screen.getByText('350.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('790.000 ₫')).toBeInTheDocument()

    const image = screen.getByAltText('Áo thun basic')
    expect(image).toHaveAttribute('loading', 'lazy')

    expect(screen.getByRole('link', { name: 'Sửa Áo thun basic' })).toHaveAttribute(
      'href',
      '/products/1/edit',
    )
    // Nút Xoá + hộp thoại xác nhận thuộc Task 8 (test riêng).
  })

  it('shows an empty state with a create call-to-action', async () => {
    listProductsMock.mockResolvedValue([])
    renderList()

    expect(await screen.findByText('Chưa có sản phẩm nào')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Thêm sản phẩm đầu tiên' }),
    ).toHaveAttribute('href', '/products/new')
  })

  it('shows an error state and retries on demand', async () => {
    const user = userEvent.setup()
    listProductsMock.mockRejectedValueOnce(new Error('Mất kết nối'))
    listProductsMock.mockResolvedValueOnce(SAMPLE)
    renderList()

    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối')

    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    await waitFor(() => {
      expect(listProductsMock).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Áo thun basic')).toBeInTheDocument()
    })
  })

  it('navigates to the create form from the header button', async () => {
    const user = userEvent.setup()
    listProductsMock.mockResolvedValue(SAMPLE)
    renderList()

    await user.click(screen.getByRole('link', { name: 'Thêm sản phẩm' }))

    expect(await screen.findByText('form tạo sản phẩm')).toBeInTheDocument()
  })
})
