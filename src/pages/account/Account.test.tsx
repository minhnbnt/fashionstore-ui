// @vitest-environment happy-dom
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import Account from './Account'

const { mockUpsertMutate, mockNotifySuccess, mockNotifyFromError } = vi.hoisted(() => ({
  mockUpsertMutate: vi.fn(),
  mockNotifySuccess: vi.fn(),
  mockNotifyFromError: vi.fn(),
}))

vi.mock('@generated/endpoints/seller-staff-roles/seller-staff-roles', () => ({
  getGetMyShopsQueryKey: vi.fn(() => ['/api/seller/my-shops'] as const),
}))

vi.mock('@generated/endpoints/users/users', () => ({
  getMeQueryKey: vi.fn(() => ['/api/users/me'] as const),
  useMe: vi.fn(),
  useUpsert: vi.fn(() => ({
    mutate: mockUpsertMutate,
    isPending: false,
  })),
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: vi.fn(),
}))

vi.mock('@/hooks/useAuthMutations', () => ({
  useSignOut: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: mockNotifySuccess,
    fromError: mockNotifyFromError,
  },
}))

vi.mock('@/components/account/AvatarUploader', () => ({
  default: () => <div data-testid="avatar-uploader" />,
}))

vi.mock('@/components/account/ChangePasswordForm', () => ({
  default: () => <div data-testid="change-password-form" />,
}))

vi.mock('@/components/account/MyShopsTab', () => ({
  default: () => <div data-testid="my-shops-tab" />,
}))

vi.mock('@/components/account/AddressBookTab', () => ({
  default: () => <div data-testid="address-book-tab" />,
}))

vi.mock('@/components/shop/ShopKycRegistrationModal', () => ({
  default: () => <div data-testid="shop-kyc-modal" />,
}))

import { useMe } from '@generated/endpoints/users/users'

import { useSessionQuery } from '@/hooks/useSession'

const PROFILE = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'an@fashionstore.local',
  displayName: 'An Nguyễn',
  avatarUrl: null,
  role: 'CUSTOMER',
  status: 'ACTIVE',
  statusReason: null,
  createdAt: '2026-01-01T00:00:00Z',
}

function renderAccount() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Account />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Account profile editing', () => {
  beforeEach(function () {
    vi.clearAllMocks()
    vi.mocked(useMe).mockReturnValue({
      data: { status: 200, data: PROFILE },
    } as unknown as ReturnType<typeof useMe>)
    vi.mocked(useSessionQuery).mockReturnValue({
      data: { user: { email: 'an@fashionstore.local' } },
    } as unknown as ReturnType<typeof useSessionQuery>)
    mockUpsertMutate.mockImplementation(function (
      _variables: unknown,
      options?: { onSuccess?: () => void },
    ) {
      options?.onSuccess?.()
    })
  })

  afterEach(function () {
    cleanup()
  })

  it('shows the display name above the email with a role badge in read mode', function () {
    renderAccount()

    expect(screen.getByText('An Nguyễn')).not.toBeNull()
    expect(screen.getByText('an@fashionstore.local')).not.toBeNull()
    expect(screen.getByText('Khách hàng')).not.toBeNull()
    expect(screen.queryByText('Khách hàng thành viên')).toBeNull()
  })

  it('reveals a display name field prefilled with the current name when edit is clicked', function () {
    renderAccount()

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))

    const input = screen.getByLabelText('Tên hiển thị') as HTMLInputElement
    expect(input.value).toBe('An Nguyễn')
  })

  it('saves the new display name with the unchanged email and closes the form', function () {
    renderAccount()

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'An Mới' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(mockUpsertMutate.mock.calls[0]?.[0]).toEqual({
      data: { email: 'an@fashionstore.local', displayName: 'An Mới' },
    })
    expect(screen.queryByLabelText('Tên hiển thị')).toBeNull()
    expect(mockNotifySuccess).toHaveBeenCalled()
  })

  it('discards the draft and closes the form when cancel is clicked', function () {
    renderAccount()

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Bị hủy' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))

    expect(screen.queryByLabelText('Tên hiển thị')).toBeNull()
    expect(mockUpsertMutate).not.toHaveBeenCalled()
  })

  it('does not save a blank display name and shows a validation message', function () {
    renderAccount()

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(mockUpsertMutate).not.toHaveBeenCalled()
    expect(screen.getByText('Tên hiển thị không được để trống')).not.toBeNull()
  })

  it('keeps the form open and reports the error when saving fails', function () {
    mockUpsertMutate.mockImplementation(function (
      _variables: unknown,
      options?: { onError?: (error: unknown) => void },
    ) {
      options?.onError?.(new Error('server down'))
    })

    renderAccount()

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'An Mới' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(screen.getByLabelText('Tên hiển thị')).not.toBeNull()
    expect(mockNotifyFromError).toHaveBeenCalled()
  })
})
