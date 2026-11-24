// @vitest-environment happy-dom
import { createElement } from 'react'

import { getMeQueryKey } from '@generated/endpoints/users/users'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { useSignOut } from './useAuthMutations'

const { signOutMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
}))

vi.mock('../lib/auth', () => ({
  signOutEverywhere: signOutMock,
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  updateUserPassword: vi.fn(),
}))

describe('useSignOut', () => {
  let queryClient: QueryClient

  beforeEach(function () {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
    signOutMock.mockResolvedValue(undefined)
  })

  function wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }

  it('clears the cached profile on logout so the next user is fetched fresh', async function () {
    queryClient.setQueryData(getMeQueryKey(), {
      status: 200,
      data: { id: 'u-1', displayName: 'Old User', role: 'CUSTOMER' },
    })

    const { result } = renderHook(() => useSignOut(), { wrapper })
    await result.current.mutateAsync()

    expect(queryClient.getQueryData(getMeQueryKey())).toBeUndefined()
  })
})
