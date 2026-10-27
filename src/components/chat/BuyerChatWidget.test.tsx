import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import BuyerChatWidget from './BuyerChatWidget'

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  }
})

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: vi.fn(() => ({
    data: {
      access_token: 'fake-jwt',
      user: { id: 'cust-1', email: 'customer@example.com', role: 'customer' },
    },
  })),
}))

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}))

vi.mock('@generated/endpoints/products/products', () => ({
  useDetail1: vi.fn(() => ({ data: undefined })),
}))

vi.mock('@generated/endpoints/chat/chat', () => ({
  useMyConversations: vi.fn(() => ({
    data: {
      status: 200,
      data: [
        {
          id: 'conv-1',
          shopId: 'shop-uuid-1',
          shopName: 'nét Boutique',
          lastMessageText: 'Chào bạn!',
          lastMessageAt: '2026-10-27T10:00:00Z',
          unreadCount: 0,
        },
      ],
    },
  })),
  useMarkRead: vi.fn(() => ({ mutate: vi.fn() })),
  useSendMessage: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useStartConversation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useMessages: vi.fn(() => ({ data: { status: 200, data: [] } })),
  getMyConversationsQueryKey: vi.fn(() => ['my-conversations']),
  getSellerConversationsQueryKey: vi.fn(() => ['seller-conversations']),
  getMessagesQueryKey: vi.fn(() => ['messages']),
}))

vi.mock('@/hooks/useChatRealtime', () => ({
  useChatMessagesRealtime: vi.fn(),
  useConversationListRealtime: vi.fn(),
}))

import { useMyConversations } from '@generated/endpoints/chat/chat'

describe('BuyerChatWidget', () => {
  it('renders unread badge when customer has unread messages', () => {
    vi.mocked(useMyConversations).mockReturnValue({
      data: {
        status: 200,
        data: [
          {
            id: 'conv-1',
            shopId: 'shop-1',
            buyerId: 'cust-1',
            shopName: 'Test Shop',
            unreadCount: 3,
          },
        ],
      },
    } as unknown as ReturnType<typeof useMyConversations>)

    const html = renderToString(
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(BuyerChatWidget, null)),
    )

    expect(html).toContain('id="buyer-chat-widget-toggle"')
    expect(html).toContain('>3</span>')
  })

  it('hides unread badge when customer has 0 unread messages', () => {
    vi.mocked(useMyConversations).mockReturnValue({
      data: {
        status: 200,
        data: [
          {
            id: 'conv-1',
            shopId: 'shop-1',
            buyerId: 'cust-1',
            shopName: 'Test Shop',
            unreadCount: 0,
          },
        ],
      },
    } as unknown as ReturnType<typeof useMyConversations>)

    const html = renderToString(
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(BuyerChatWidget, null)),
    )

    expect(html).toContain('id="buyer-chat-widget-toggle"')
    expect(html).not.toContain('bg-rose-500')
  })

  it('formats badge as 99+ when total unread exceeds 99', () => {
    vi.mocked(useMyConversations).mockReturnValue({
      data: {
        status: 200,
        data: [
          {
            id: 'conv-1',
            shopId: 'shop-1',
            buyerId: 'cust-1',
            shopName: 'Test Shop',
            unreadCount: 120,
          },
        ],
      },
    } as unknown as ReturnType<typeof useMyConversations>)

    const html = renderToString(
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(BuyerChatWidget, null)),
    )

    expect(html).toContain('>99+</span>')
  })

  it('render nút mở khung chat khi buyer đã đăng nhập trên storefront /shops/net-boutique', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ['/shops/net-boutique'] },
          createElement(BuyerChatWidget),
        ),
      ),
    )

    expect(html).toContain('Mở khung chat')
  })
})
