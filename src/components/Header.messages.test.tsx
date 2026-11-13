import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import Header from './Header'

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
  useMyConversations: vi.fn(),
}))

vi.mock('./NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />,
}))

import { useMyConversations } from '@generated/endpoints/chat/chat'

import { useSessionQuery } from '@/hooks/useSession'

function renderWithClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Header Messages Link & Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders link to /messages without badge when user is guest', () => {
    vi.mocked(useSessionQuery).mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSessionQuery>)
    vi.mocked(useMyConversations).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useMyConversations>)

    renderWithClient(<Header />)

    const link = screen.getByRole('link', { name: /Tin nhắn/i })
    expect(link.getAttribute('href')).toBe('/messages')
    expect(screen.queryByTestId('header-messages-badge')).toBeNull()
  })

  it('renders unread badge when logged in and unread messages exist', () => {
    vi.mocked(useSessionQuery).mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      isLoading: false,
    } as unknown as ReturnType<typeof useSessionQuery>)
    vi.mocked(useMyConversations).mockReturnValue({
      data: {
        status: 200,
        data: [
          { id: 'conv-1', unreadCount: 3 },
          { id: 'conv-2', unreadCount: 5 },
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useMyConversations>)

    renderWithClient(<Header />)

    const badge = screen.getByTestId('header-messages-badge')
    expect(badge.textContent).toBe('8')
  })
})
