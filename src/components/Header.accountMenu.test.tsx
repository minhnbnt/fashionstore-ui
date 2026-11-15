// @vitest-environment happy-dom
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import Header from './Header'

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: vi.fn(),
}))

vi.mock('@/hooks/useAuthMutations', () => ({
  useSignOut: vi.fn(),
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
  useMyConversations: vi.fn(() => ({ data: undefined, isLoading: false })),
}))

vi.mock('@generated/endpoints/users/users', () => ({
  useMe: vi.fn(() => ({
    data: { status: 200, data: { displayName: 'Thy Nguyễn', avatarUrl: null } },
  })),
}))

vi.mock('./NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />,
}))

import { useSignOut } from '@/hooks/useAuthMutations'
import { useSessionQuery } from '@/hooks/useSession'

function sessionFor(email: string, role?: 'shop' | 'admin') {
  const appMetadata = role === undefined ? {} : { role }
  return {
    data: {
      user: {
        id: 'user-1',
        email,
        app_metadata: appMetadata,
      },
    },
    isLoading: false,
  } as unknown as ReturnType<typeof useSessionQuery>
}

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

function openAccountMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Tài khoản' }))
  return document.getElementById('account-menu')
}

describe('Header Account Menu', () => {
  const signOutMutate = vi.fn()

  beforeEach(function () {
    vi.clearAllMocks()
    vi.mocked(useSignOut).mockReturnValue({
      mutate: signOutMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useSignOut>)
  })

  afterEach(function () {
    cleanup()
  })

  it('toggles aria-expanded and aria-controls on the avatar trigger', function () {
    vi.mocked(useSessionQuery).mockReturnValue(sessionFor('test@example.com'))

    renderWithClient(<Header />)

    const trigger = screen.getByRole('button', { name: 'Tài khoản' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-controls')).toBe('account-menu')

    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById('account-menu')).not.toBeNull()

    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('account-menu')).toBeNull()
  })

  it('shows identity card with display name and email', function () {
    vi.mocked(useSessionQuery).mockReturnValue(sessionFor('test@example.com'))

    renderWithClient(<Header />)
    const panel = openAccountMenu()
    if (panel === null) {
      throw new Error('Menu chưa mở')
    }

    const scope = within(panel)
    expect(scope.getByText('Thy Nguyễn')).not.toBeNull()
    expect(scope.getByText('test@example.com')).not.toBeNull()
  })

  it('customer sees account and orders links only', function () {
    vi.mocked(useSessionQuery).mockReturnValue(sessionFor('buyer@example.com'))

    renderWithClient(<Header />)
    const panel = openAccountMenu()
    if (panel === null) {
      throw new Error('Menu chưa mở')
    }

    const scope = within(panel)
    expect(scope.getByRole('link', { name: 'Tài khoản của tôi' }).getAttribute('href')).toBe(
      '/account',
    )
    expect(scope.getByRole('link', { name: 'Đơn hàng của tôi' }).getAttribute('href')).toBe(
      '/account/orders',
    )
    expect(scope.queryByRole('link', { name: 'Kênh người bán' })).toBeNull()
    expect(scope.queryByRole('link', { name: 'Cài đặt tài khoản & shop' })).toBeNull()
  })

  it('shop role sees seller channel and shop settings', function () {
    vi.mocked(useSessionQuery).mockReturnValue(sessionFor('seller@example.com', 'shop'))

    renderWithClient(<Header />)
    const panel = openAccountMenu()
    if (panel === null) {
      throw new Error('Menu chưa mở')
    }

    const scope = within(panel)
    expect(scope.getByRole('link', { name: 'Kênh người bán' }).getAttribute('href')).toBe('/shop')
    expect(scope.getByRole('link', { name: 'Đơn hàng của tôi' }).getAttribute('href')).toBe(
      '/account/orders',
    )
    expect(scope.getByRole('link', { name: 'Cài đặt tài khoản & shop' }).getAttribute('href')).toBe(
      '/account',
    )
  })

  it('admin sees admin dashboard link', function () {
    vi.mocked(useSessionQuery).mockReturnValue(sessionFor('admin@example.com', 'admin'))

    renderWithClient(<Header />)
    const panel = openAccountMenu()
    if (panel === null) {
      throw new Error('Menu chưa mở')
    }

    const scope = within(panel)
    expect(scope.getByRole('link', { name: 'Bảng quản trị' }).getAttribute('href')).toBe('/admin')
    expect(scope.getByRole('link', { name: 'Cài đặt tài khoản' }).getAttribute('href')).toBe(
      '/account',
    )
  })

  it('Escape closes the menu and returns focus to the trigger', function () {
    vi.mocked(useSessionQuery).mockReturnValue(sessionFor('test@example.com'))

    renderWithClient(<Header />)
    const trigger = screen.getByRole('button', { name: 'Tài khoản' })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })

  it('click outside closes the menu, click inside keeps it open', function () {
    vi.mocked(useSessionQuery).mockReturnValue(sessionFor('test@example.com'))

    renderWithClient(<Header />)
    const panel = openAccountMenu()
    if (panel === null) {
      throw new Error('Menu chưa mở')
    }

    fireEvent.pointerDown(panel)
    expect(screen.getByRole('button', { name: 'Tài khoản' }).getAttribute('aria-expanded')).toBe(
      'true',
    )

    fireEvent.pointerDown(document.body)
    expect(screen.getByRole('button', { name: 'Tài khoản' }).getAttribute('aria-expanded')).toBe(
      'false',
    )
  })

  it('sign out button calls the sign out mutation', function () {
    vi.mocked(useSessionQuery).mockReturnValue(sessionFor('test@example.com'))

    renderWithClient(<Header />)
    const panel = openAccountMenu()
    if (panel === null) {
      throw new Error('Menu chưa mở')
    }

    fireEvent.click(within(panel).getByRole('button', { name: 'Đăng xuất' }))

    expect(signOutMutate).toHaveBeenCalledTimes(1)
  })
})
