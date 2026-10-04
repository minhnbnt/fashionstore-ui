import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { useSession } from '@/lib/auth'
import AppRoutes from '@/routes'

vi.mock('@/lib/auth', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  listProducts: vi.fn().mockResolvedValue([]),
  getProduct: vi.fn(),
}))

// Page thật tồn tại dưới dạng shell tối thiểu (Task 5-7 thay bằng nội dung thật):
// test này chỉ kiểm cấu trúc route + layout, nội dung page do test của từng task giữ.

const sessionMock = vi.mocked(useSession)

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('routes', () => {
  it('shows the storefront to guests', async () => {
    sessionMock.mockReturnValue({ session: null, loading: false })
    renderAt('/')

    expect(await screen.findByText('Miễn phí vận chuyển đơn từ 500K')).toBeInTheDocument()
    expect(screen.getByText('Mặc đẹp mỗi ngày, tối giản mà sang')).toBeInTheDocument()
  })

  it('redirects guests away from /admin to /login', async () => {
    sessionMock.mockReturnValue({ session: null, loading: false })
    renderAt('/admin')

    expect(
      await screen.findByRole('button', { name: 'Đăng nhập' }),
    ).toBeInTheDocument()
  })

  it('shows not-found for unknown paths', async () => {
    sessionMock.mockReturnValue({ session: null, loading: false })
    renderAt('/khong-ton-tai')

    expect(await screen.findByText('Trang bạn tìm không tồn tại.')).toBeInTheDocument()
  })
})
