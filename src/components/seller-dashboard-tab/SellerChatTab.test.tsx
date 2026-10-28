import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vite-plus/test'

import SellerChatTab from './SellerChatTab'

vi.mock('@generated/endpoints/chat/chat', () => ({
  getMessagesQueryKey: vi.fn(() => ['chat-messages']),
  getSellerConversationsQueryKey: vi.fn(() => ['seller-conversations']),
  useSellerConversations: vi.fn(() => ({
    data: {
      status: 200,
      data: [
        {
          id: 'conv-1',
          shopId: 'shop-1',
          buyerId: 'buyer-1',
          lastMessageText: 'Xin chao shop',
          lastMessageAt: '2026-10-27T10:00:00Z',
          unreadCountShop: 0,
          unreadCountBuyer: 0,
        },
      ],
    },
    isLoading: false,
  })),
  useMessages: vi.fn(() => ({
    data: {
      status: 200,
      data: [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderType: 'BUYER',
          content: 'Xin chao shop',
          createdAt: '2026-10-27T10:00:00Z',
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          senderType: 'SELLER',
          content: 'Chao ban, shop co the giup gi cho ban?',
          createdAt: '2026-10-27T10:01:00Z',
        },
      ],
    },
    isLoading: false,
  })),
  useMarkRead: vi.fn(() => ({ mutate: vi.fn() })),
  useSendMessage: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@generated/endpoints/seller-orders/seller-orders', () => ({
  useList5: vi.fn(() => ({
    data: { status: 200, data: [] },
    isLoading: false,
  })),
}))

vi.mock('@generated/endpoints/shops/shops', () => ({
  getMineQueryKey: vi.fn(() => ['shops-mine']),
  useUpdateProfile: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@/hooks/useChatRealtime', () => ({
  useChatMessagesRealtime: vi.fn(),
  useConversationListRealtime: vi.fn(),
}))

describe('SellerChatTab', () => {
  it('renders chat interface with scrollable message container and pinned input bar', () => {
    const queryClient = new QueryClient()

    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(SellerChatTab, {
          shopId: 'shop-1',
          autoReplyText: 'Tin nhan tu dong',
        }),
      ),
    )

    // Check that messages and sender content are rendered
    expect(html).toContain('Xin chao shop')
    expect(html).toContain('Chao ban, shop co the giup gi cho ban?')

    // Check for message container layout classes: min-h-0 flex-1 overflow-y-auto
    expect(html).toContain('overflow-y-auto')
    expect(html).toContain('min-h-0')

    // Check for pinned input container
    expect(html).toContain('shrink-0')
    expect(html).toContain('Nhập tin nhắn trả lời khách hàng (Enter để gửi)...')
  })
})
