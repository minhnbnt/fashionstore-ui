import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import { describe, expect, it, vi } from 'vitest'

import { ApiError, getProduct, listProducts } from '@/lib/api'
import { CartProvider } from '@/hooks/useCart'
import ProductDetail from '@/pages/ProductDetail'

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    readonly status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  getProduct: vi.fn(),
  listProducts: vi.fn(),
}))

const getMock = vi.mocked(getProduct)
const listMock = vi.mocked(listProducts)

const SHIRT = {
  id: 1,
  name: 'Áo sơ mi lụa trắng',
  description: 'Lụa tơ tằm.',
  price: 890000,
  imageKey: 'mock/ao.jpg',
  createdAt: '2026-10-04T00:00:00Z',
  updatedAt: '2026-10-04T00:00:00Z',
}

function renderDetail(id: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/products/${id}`]}>
        <Toaster />
        <CartProvider>
          <Routes>
            <Route path="/products/:id" element={<ProductDetail />} />
          </Routes>
        </CartProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProductDetail', () => {
  it('renders buy box and adds to cart with a toast', async () => {
    const user = userEvent.setup()
    getMock.mockResolvedValue(SHIRT)
    listMock.mockResolvedValue([])
    renderDetail('1')

    expect(await screen.findByText('890.000 ₫')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Thêm vào giỏ' }))

    expect(await screen.findByText('Đã thêm vào giỏ')).toBeInTheDocument()
  })

  it('shows not-found for unknown ids', async () => {
    getMock.mockRejectedValue(new ApiError(404, 'Không tìm thấy sản phẩm'))
    listMock.mockResolvedValue([])
    renderDetail('999')

    expect(await screen.findByText('Trang bạn tìm không tồn tại.')).toBeInTheDocument()
  })
})
