import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import BuyerChatWidget from './BuyerChatWidget'

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: vi.fn(() => ({
    data: {
      user: { id: 'user-buyer-1', email: 'buyer@test.local' },
      access_token: 'fake-token',
    },
  })),
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
  getMyConversationsQueryKey: vi.fn(() => ['my-conversations']),
  getMessagesQueryKey: vi.fn(() => ['messages']),
  useStartConversation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useMarkRead: vi.fn(() => ({
    mutate: vi.fn(),
  })),
  useMessages: vi.fn(() => ({
    data: { status: 200, data: [] },
  })),
  useSendMessage: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@generated/endpoints/products/products', () => ({
  useDetail1: vi.fn(() => ({
    data: undefined,
  })),
}))

vi.mock('@/hooks/useChatRealtime', () => ({
  useChatMessagesRealtime: vi.fn(),
  useConversationListRealtime: vi.fn(),
}))

describe('BuyerChatWidget', () => {
  it('render nút mở khung chat khi buyer đã đăng nhập', () => {
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
