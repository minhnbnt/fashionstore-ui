// @vitest-environment happy-dom
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { WebSocketContext } from '@/hooks/useWebSocket'

import ChatDock from './ChatDock'

import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { ChatMessageResponse } from '@generated/model/chatMessageResponse'
import type { Client } from '@stomp/stompjs'

const { customFetchMock, uploadImageMock } = vi.hoisted(() => ({
  customFetchMock: vi.fn<(url: string, options?: RequestInit) => Promise<unknown>>(),
  uploadImageMock: vi.fn().mockResolvedValue('chat/uploaded-key.jpg'),
}))

vi.mock('@/lib/api/apiFetch', async function (importOriginal) {
  const actual = await importOriginal<typeof import('@/lib/api/apiFetch')>()
  return { ...actual, customFetch: customFetchMock }
})

vi.mock('@/lib/api/uploadImage', () => ({
  uploadImage: (file: File) => uploadImageMock(file),
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({
    data: {
      access_token: 'test-token',
      user: { id: 'buyer-1', app_metadata: { role: 'customer' } },
    },
  }),
}))

vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  useReducedMotion: () => true,
}))

vi.mock('@generated/endpoints/products/products', () => ({
  useDetail1: vi.fn().mockReturnValue({
    data: {
      status: 200,
      data: {
        id: 'prod-1',
        name: 'Áo Sơ Mi Nam',
        slug: 'ao-so-mi',
        images: [{ s3Key: 'products/ao.jpg' }],
        variants: [{ price: 200000 }],
      },
    },
    isPending: false,
  }),
}))

function conversationFixture(): ChatConversationResponse {
  return {
    id: 'conv-1',
    shopId: 'shop-1',
    shopName: 'Áo Trắng Store',
    lastMessageText: 'Chào bạn',
    lastMessageAt: '2026-10-27T09:02:00Z',
    unreadCount: 0,
  }
}

function messagesFixture(): ChatMessageResponse[] {
  return [
    {
      id: 'm-img',
      conversationId: 'conv-1',
      senderId: 'buyer-1',
      senderType: 'BUYER',
      content: 'Ảnh sản phẩm mẫu',
      imageKey: 'chat/sample-photo.jpg',
      sentAt: '2026-10-27T09:01:00Z',
      isRead: false,
    },
    {
      id: 'm-link',
      conversationId: 'conv-1',
      senderId: 'shop-1',
      senderType: 'SELLER',
      content: 'Bạn xem mẫu này nhé: /product/ao-so-mi',
      imageKey: undefined,
      sentAt: '2026-10-27T09:02:00Z',
      isRead: true,
    },
  ]
}

function envelope(data: unknown) {
  return { status: 200, data, headers: new Headers() }
}

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
}

describe('ChatDock Media & Product Link Enhancements', () => {
  let queryClient: QueryClient
  let fakeClient: FakeStompClient

  beforeEach(() => {
    fakeClient = new FakeStompClient()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })

    customFetchMock.mockImplementation(async function (url, options) {
      if (typeof url === 'string' && url.includes('/api/conversations/mine')) {
        return envelope([conversationFixture()])
      }
      if (typeof url === 'string' && url.includes('/api/conversations/conv-1/messages')) {
        if (options?.method === 'POST') {
          return { status: 201, data: { id: 'm-new', content: 'sent' }, headers: new Headers() }
        }
        return envelope(messagesFixture())
      }
      return envelope([])
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('hiển thị ChatImageBubble khi tin nhắn có imageKey và ChatProductCard khi có link', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WebSocketContext.Provider value={fakeClient as unknown as Client}>
            <ChatDock />
          </WebSocketContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Mở dock
    const toggleButton = screen.getByRole('button', { name: 'Mở khung chat' })
    await user.click(toggleButton)

    // Chọn conversation
    await waitFor(() => {
      expect(screen.getByText('Áo Trắng Store')).toBeTruthy()
    })
    await user.click(screen.getByText('Áo Trắng Store'))

    // Xác nhận render ChatImageBubble
    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'Ảnh đính kèm' }) as HTMLImageElement
      expect(img).toBeTruthy()
      expect(img.src).toContain('chat/sample-photo.jpg')
    })

    // Xác nhận render ChatProductCard
    await waitFor(() => {
      expect(screen.getByTestId('chat-product-card')).toBeTruthy()
    })
  })

  it('đính kèm ảnh và gửi tin nhắn ảnh thành công', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WebSocketContext.Provider value={fakeClient as unknown as Client}>
            <ChatDock />
          </WebSocketContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const toggleButton = screen.getByRole('button', { name: 'Mở khung chat' })
    await user.click(toggleButton)

    await waitFor(() => {
      expect(screen.getByText('Áo Trắng Store')).toBeTruthy()
    })
    await user.click(screen.getByText('Áo Trắng Store'))

    // Upload file
    const fileInput = screen.getByLabelText('Chọn file ảnh') as HTMLInputElement
    const file = new File(['dummy content'], 'photo.png', { type: 'image/png' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Ảnh đính kèm chuẩn bị gửi' })).toBeTruthy()
    })

    // Click Gửi
    const sendBtn = screen.getByRole('button', { name: 'Gửi tin nhắn' })
    await user.click(sendBtn)

    await waitFor(() => {
      expect(customFetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations/conv-1/messages'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: '', imageKey: 'chat/uploaded-key.jpg' }),
        }),
      )
    })
  })

  it('ẩn link /product/... thô và chỉ hiện card chi tiết sản phẩm cùng preview [Sản phẩm]', async () => {
    const user = userEvent.setup()
    const prevImpl = customFetchMock.getMockImplementation()
    customFetchMock.mockImplementation(async function (url: string, opts?: RequestInit) {
      const res = (await prevImpl?.(url, opts)) as { status: number; data: unknown } | undefined
      const method = opts?.method ?? 'GET'
      if (
        url.includes('/api/conversations') &&
        !url.includes('/messages') &&
        method === 'GET' &&
        res !== undefined &&
        Array.isArray(res.data)
      ) {
        const list = res.data as Array<Record<string, unknown>>
        if (list[0]) {
          list[0] = {
            ...list[0],
            lastMessageText: '/product/22222222-0000-0000-0001-000000000001',
          }
        }
        return res
      }
      if (
        url.includes('/api/conversations/conv-1/messages') &&
        method === 'GET' &&
        res !== undefined
      ) {
        return {
          ...res,
          data: [
            {
              id: 'msg-standalone',
              senderType: 'BUYER',
              content: '/product/22222222-0000-0000-0001-000000000001',
              sentAt: '2026-01-01T10:00:00Z',
            },
            {
              id: 'msg-mixed',
              senderType: 'SELLER',
              content: 'Bạn xem mẫu này nhé: /product/ao-so-mi',
              sentAt: '2026-01-01T10:01:00Z',
            },
          ],
        }
      }
      return res
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WebSocketContext.Provider value={fakeClient as unknown as Client}>
            <ChatDock />
          </WebSocketContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Mở khung chat' }))

    await waitFor(() => {
      expect(screen.getByText('[Sản phẩm]')).toBeTruthy()
    })
    expect(screen.queryByText(/\/product\/22222222/)).toBeNull()

    await user.click(screen.getByText('Áo Trắng Store'))

    await waitFor(() => {
      expect(screen.getAllByTestId('chat-product-card').length).toBe(2)
    })
    expect(screen.getByText('Bạn xem mẫu này nhé:')).toBeTruthy()
    expect(screen.queryByText(/\/product\/22222222-0000-0000-0001-000000000001/)).toBeNull()
    expect(screen.queryByText(/\/product\/ao-so-mi/)).toBeNull()
  })
})
