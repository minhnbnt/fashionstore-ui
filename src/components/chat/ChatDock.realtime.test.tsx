import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { WebSocketContext } from '@/hooks/useWebSocket'

import ChatDock from './ChatDock'

import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { ChatMessageResponse } from '@generated/model/chatMessageResponse'
import type { Client } from '@stomp/stompjs'

const { customFetchMock } = vi.hoisted(() => ({
  customFetchMock: vi.fn<(url: string, options?: RequestInit) => Promise<unknown>>(),
}))

// Giữ nguyên các export khác của apiFetch, chỉ thay customFetch để bắt HTTP
vi.mock('@/lib/apiFetch', async function (importOriginal) {
  const actual = await importOriginal<typeof import('@/lib/apiFetch')>()
  return { ...actual, customFetch: customFetchMock }
})

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({
    data: {
      access_token: 'test-token',
      user: { id: 'buyer-1', app_metadata: { role: 'customer' } },
    },
  }),
}))

// happy-dom không dựng WAAPI đủ nên animation của motion văng unhandled rejection;
// test này không đo animation nên ép nhánh reduced-motion, render div thường.
vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  useReducedMotion: () => true,
}))

function conversationFixture(): ChatConversationResponse {
  return {
    id: 'conv-1',
    shopId: 'shop-1',
    shopName: 'Áo Trắng Store',
    lastMessageText: 'Còn bạn ơi, bạn đặt nhé',
    lastMessageAt: '2026-10-27T09:02:00Z',
    unreadCount: 2,
  }
}

function initialMessages(): ChatMessageResponse[] {
  return [
    {
      id: 'm-1',
      conversationId: 'conv-1',
      senderId: 'buyer-1',
      senderType: 'BUYER',
      content: 'Cho mình hỏi còn size M không?',
      sentAt: '2026-10-27T09:01:00Z',
      isRead: false,
    },
    {
      id: 'm-2',
      conversationId: 'conv-1',
      senderId: 'shop-1',
      senderType: 'SELLER',
      content: 'Còn bạn ơi, bạn đặt nhé',
      sentAt: '2026-10-27T09:02:00Z',
      isRead: true,
    },
  ]
}

function pushedMessage(): ChatMessageResponse {
  return {
    id: 'm-3',
    conversationId: 'conv-1',
    senderId: 'shop-1',
    senderType: 'SELLER',
    content: 'Shop trả lời realtime đây',
    sentAt: '2026-10-27T09:03:00Z',
    isRead: false,
  }
}

function envelope(data: unknown) {
  return { status: 200, data, headers: new Headers() }
}

/** Client STOMP giả: ghi nhận subscription, publish đẩy thẳng frame vào callback. */
class FakeStompClient {
  handlers = new Map<string, (message: { body: string }) => void>()

  subscribe(destination: string, callback: (message: { body: string }) => void) {
    this.handlers.set(destination, callback)
    return {
      unsubscribe: () => {
        this.handlers.delete(destination)
      },
    }
  }

  publish(destination: string, payload: unknown) {
    const handler = this.handlers.get(destination)
    if (handler !== undefined) {
      handler({ body: JSON.stringify(payload) })
    }
  }
}

function countFetches(url: string, method: string) {
  return customFetchMock.mock.calls.filter(function (call) {
    return call[0] === url && (call[1]?.method ?? 'GET') === method
  }).length
}

function renderChat(): FakeStompClient {
  const fakeClient = new FakeStompClient()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <WebSocketContext.Provider value={fakeClient as unknown as Client}>
          <ChatDock />
        </WebSocketContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return fakeClient
}

async function openThread() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Mở khung chat' }))
  await user.click(screen.getByText('Áo Trắng Store'))
  await screen.findByText('Cho mình hỏi còn size M không?')
}

beforeEach(() => {
  customFetchMock.mockReset()
  customFetchMock.mockImplementation(function (url: string, options?: RequestInit) {
    const method = options?.method ?? 'GET'
    if (url === '/api/conversations/mine' && method === 'GET') {
      return Promise.resolve(envelope([conversationFixture()]))
    }
    if (url === '/api/conversations/conv-1/messages' && method === 'GET') {
      return Promise.resolve(envelope(initialMessages()))
    }
    return Promise.resolve(envelope(null))
  })
})

afterEach(cleanup)

describe('ChatDock — luồng realtime (DOM)', () => {
  it('tin nhắn đẩy realtime hiện trong thread mà không cần refetch', async () => {
    const client = renderChat()
    await openThread()
    expect(countFetches('/api/conversations/conv-1/messages', 'GET')).toBe(1)

    await act(async function () {
      client.publish('/user/queue/chat/conv-1', pushedMessage())
    })

    expect(await screen.findByText('Shop trả lời realtime đây')).toBeTruthy()
    // Tin mới vào thẳng cache — không refetch GET messages
    expect(countFetches('/api/conversations/conv-1/messages', 'GET')).toBe(1)
  })

  it('tin nhắn của đối tác → widget tự gọi markRead', async () => {
    const client = renderChat()
    await openThread()

    await act(async function () {
      client.publish('/user/queue/chat/conv-1', pushedMessage())
    })

    expect(countFetches('/api/conversations/conv-1/read', 'PATCH')).toBeGreaterThanOrEqual(2)
  })

  it('read receipt của shop → tin nhắn của mình đổi thành Đã xem', async () => {
    const client = renderChat()
    await openThread()
    expect(screen.queryByText(/Đã xem/)).toBeNull()

    await act(async function () {
      client.publish('/user/queue/chat/conv-1/read', {
        conversationId: 'conv-1',
        readerId: 'shop-1',
        readAt: '2026-10-27T09:05:00Z',
      })
    })

    await waitFor(function () {
      expect(screen.getByText(/Đã xem/)).toBeTruthy()
    })
  })

  it('echo trùng id không nhân đôi tin nhắn', async () => {
    const client = renderChat()
    await openThread()

    await act(async function () {
      client.publish('/user/queue/chat/conv-1', pushedMessage())
      client.publish('/user/queue/chat/conv-1', pushedMessage())
    })

    await waitFor(function () {
      expect(screen.getAllByText('Shop trả lời realtime đây')).toHaveLength(1)
    })
  })

  it('gửi tin nhắn → POST kèm nội dung, xoá ô nhập', async () => {
    renderChat()
    await openThread()
    const user = userEvent.setup()

    const input = screen.getByPlaceholderText('Nhập tin nhắn cho shop...')
    await user.type(input, 'Chào shop ơi')
    await user.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(countFetches('/api/conversations/conv-1/messages', 'POST')).toBe(1)
    const sendCall = customFetchMock.mock.calls.find(function (call) {
      return (
        call[0] === '/api/conversations/conv-1/messages' && (call[1]?.method ?? 'GET') === 'POST'
      )
    })
    const rawBody = sendCall?.[1]?.body
    expect(typeof rawBody === 'string' && rawBody.includes('"content":"Chào shop ơi"')).toBe(true)
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('sự kiện hội thoại tổng hợp → refetch danh sách hội thoại', async () => {
    const client = renderChat()
    const user = userEvent.setup()
    // Chờ fetch đầu resolve xong — invalidate lúc đang in-flight sẽ bị dedupe
    await user.click(screen.getByRole('button', { name: 'Mở khung chat' }))
    await screen.findByText('Áo Trắng Store')
    expect(countFetches('/api/conversations/mine', 'GET')).toBe(1)

    await act(async function () {
      client.publish('/user/queue/conversations', {
        conversationId: 'conv-1',
        type: 'NEW_MESSAGE',
      })
    })

    await waitFor(function () {
      expect(countFetches('/api/conversations/mine', 'GET')).toBe(2)
    })
  })
})
