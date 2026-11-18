import { MemoryRouter, useLocation } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: vi.fn(),
}))

vi.mock('@/hooks/useAuthMutations', () => ({
  useSignOut: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@/hooks/useCart', () => ({
  useCart: vi.fn(() => ({ totalQuantity: 0 })),
}))

vi.mock('@/hooks/useWishlist', () => ({
  useWishlist: vi.fn(() => ({ count: 0 })),
}))

vi.mock('@generated/endpoints/categories/categories', () => ({
  useListCategories: vi.fn(() => ({ data: { status: 200, data: [] } })),
}))

vi.mock('@generated/endpoints/shops/shops', () => ({
  useMine: vi.fn(() => ({ data: { status: 200, data: [] } })),
}))

vi.mock('@generated/endpoints/chat/chat', () => ({
  useMyConversations: vi.fn(() => ({ data: undefined })),
}))

vi.mock('./NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />,
}))

import { useSessionQuery } from '@/hooks/useSession'

import Header from './Header'

function LocationProbe() {
  const location = useLocation()
  return <p data-testid="probe">{location.pathname + location.search}</p>
}

function renderHeader() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Header />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Header — nut tim bang anh', () => {
  beforeEach(function () {
    vi.clearAllMocks()
    vi.mocked(useSessionQuery).mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSessionQuery>)
  })

  afterEach(cleanup)

  it('nut may anh dieu huong sang /search?by-image=1', () => {
    renderHeader()

    fireEvent.click(screen.getByRole('button', { name: 'Tìm bằng ảnh' }))

    expect(screen.getByTestId('probe').textContent).toBe('/search?by-image=1')
  })
})
