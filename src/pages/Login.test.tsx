import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Login from '@/pages/Login'
import { supabase } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  supabase: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
  },
  useSession: vi.fn(() => ({ session: null, loading: false })),
  signOut: vi.fn(),
}))

const signInMock = vi.mocked(supabase.signInWithPassword)
const signUpMock = vi.mocked(supabase.signUp)

function renderLogin(from?: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: from === undefined ? undefined : { from } }]}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/san-pham" element={<div>danh sách sản phẩm</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  signInMock.mockReset()
  signUpMock.mockReset()
})

describe('Login', () => {
  it('renders email and password fields with submit button', () => {
    renderLogin()

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('toggles to sign-up mode', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Chưa có tài khoản? Tạo tài khoản' }))

    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeInTheDocument()
  })

  it('signs in and navigates back to the attempted page', async () => {
    const user = userEvent.setup()
    signInMock.mockResolvedValue({
      data: { user: {} as never, session: { access_token: 'tok' } as never },
      error: null,
    })
    renderLogin('/san-pham')

    await user.type(screen.getByLabelText('Email'), 'minh@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: 'minh@example.com',
        password: 'secret123',
      })
      expect(screen.getByText('danh sách sản phẩm')).toBeInTheDocument()
    })
  })

  it('signs up when in sign-up mode', async () => {
    const user = userEvent.setup()
    signUpMock.mockResolvedValue({
      data: { user: {} as never, session: { access_token: 'tok' } as never },
      error: null,
    })
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Chưa có tài khoản? Tạo tài khoản' }))
    await user.type(screen.getByLabelText('Email'), 'moi@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Đăng ký' }))

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith({
        email: 'moi@example.com',
        password: 'secret123',
      })
    })
  })

  it('shows a focused error summary when credentials are wrong', async () => {
    const user = userEvent.setup()
    signInMock.mockResolvedValue({
      data: { user: {} as never, session: null },
      error: { message: 'Invalid login credentials' } as never,
    })
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'minh@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'sai-mat-khau')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('Invalid login credentials')
    expect(summary).toHaveFocus()
  })

  it('shows an inline error on blur for an empty email', async () => {
    const user = userEvent.setup()
    renderLogin()

    const email = screen.getByLabelText('Email')
    await user.click(email)
    await user.tab()

    expect(await screen.findByText('Email không được để trống')).toBeInTheDocument()
  })
})
