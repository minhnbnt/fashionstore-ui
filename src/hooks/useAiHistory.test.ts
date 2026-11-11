// @vitest-environment happy-dom
import { createElement } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import {
  useAiConversations,
  useAiMessages,
  useCreateAiConversation,
  useSaveAiMessage,
} from './useAiHistory'

const { customFetchMock } = vi.hoisted(() => ({
  customFetchMock: vi.fn<(url: string, options?: RequestInit) => Promise<unknown>>(),
}))

vi.mock('@/lib/api/apiFetch', () => ({
  customFetch: (url: string, options?: RequestInit) => customFetchMock(url, options),
}))

describe('useAiHistory hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    vi.clearAllMocks()
  })

  function wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }

  it('useAiConversations fetch danh sách cuộc trò chuyện', async () => {
    customFetchMock.mockResolvedValueOnce({
      status: 200,
      data: [{ id: 'c-1', title: 'Tư vấn mua sắm', createdAt: '', updatedAt: '' }],
    })

    const { result } = renderHook(() => useAiConversations(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]?.title).toBe('Tư vấn mua sắm')
  })

  it('useCreateAiConversation gửi POST tạo mới', async () => {
    customFetchMock.mockResolvedValueOnce({
      status: 201,
      data: { id: 'c-2', title: 'Cuộc trò chuyện mới', createdAt: '', updatedAt: '' },
    })

    const { result } = renderHook(() => useCreateAiConversation(), { wrapper })

    result.current.mutate('Cuộc trò chuyện mới')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(customFetchMock).toHaveBeenCalledWith(
      '/api/ai/conversations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Cuộc trò chuyện mới' }),
      }),
    )
  })

  it('useAiMessages fetch tin nhắn theo conversationId', async () => {
    customFetchMock.mockResolvedValueOnce({
      status: 200,
      data: [
        {
          id: 'm-1',
          conversationId: 'c-1',
          role: 'user',
          content: 'Xin chào',
          sentAt: '2026-11-11T10:00:00Z',
        },
      ],
    })

    const { result } = renderHook(() => useAiMessages('c-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]?.content).toBe('Xin chào')
  })

  it('useSaveAiMessage gửi POST lưu tin nhắn', async () => {
    customFetchMock.mockResolvedValueOnce({
      status: 201,
      data: {
        id: 'm-2',
        conversationId: 'c-1',
        role: 'user',
        content: 'Tìm áo',
        metadata: '{}',
      },
    })

    const { result } = renderHook(() => useSaveAiMessage(), { wrapper })

    result.current.mutate({
      conversationId: 'c-1',
      role: 'user',
      content: 'Tìm áo',
      metadata: '{}',
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(customFetchMock).toHaveBeenCalledWith(
      '/api/ai/conversations/c-1/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
          content: 'Tìm áo',
          metadata: '{}',
        }),
      }),
    )
  })
})
