import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RequireAuth from '@/components/RequireAuth'
import { useSession } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

const useSessionMock = vi.mocked(useSession)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route
          path="/protected"
          element={
            <RequireAuth>
              <div>protected content</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useSessionMock.mockReset()
})

describe('RequireAuth', () => {
  it('renders nothing but a loading state while the session is being restored', () => {
    useSessionMock.mockReturnValue({
      session: null,
      loading: true,
    })

    renderAt('/protected')

    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated visitors to /login keeping the attempted path', () => {
    useSessionMock.mockReturnValue({
      session: null,
      loading: false,
    })

    renderAt('/protected')

    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('renders children once a session exists', () => {
    useSessionMock.mockReturnValue({
      session: { access_token: 'tok' } as never,
      loading: false,
    })

    renderAt('/protected')

    expect(screen.getByText('protected content')).toBeInTheDocument()
  })
})
