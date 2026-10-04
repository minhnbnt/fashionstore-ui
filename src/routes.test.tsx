import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppRoutes from '@/routes'
import { useSession } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

const useSessionMock = vi.mocked(useSession)

beforeEach(() => {
  useSessionMock.mockReset()
  useSessionMock.mockReturnValue({
    session: { access_token: 'tok' } as never,
    loading: false,
  })
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  it('shows the cart placeholder for /cart', async () => {
    renderAt('/cart')

    expect(await screen.findByText('Giỏ hàng')).toBeInTheDocument()
    expect(screen.getByText(/ra mắt/)).toBeInTheDocument()
  })

  it('shows the orders placeholder for /orders', async () => {
    renderAt('/orders')

    expect(await screen.findByText('Đơn hàng')).toBeInTheDocument()
  })

  it('renders the brand in the header', async () => {
    renderAt('/cart')

    expect(await screen.findByRole('link', { name: 'FashionStore' })).toBeInTheDocument()
  })

  it('shows a 404 page for unknown routes', async () => {
    renderAt('/khong-ton-tai')

    expect(await screen.findByText('404')).toBeInTheDocument()
  })
})
