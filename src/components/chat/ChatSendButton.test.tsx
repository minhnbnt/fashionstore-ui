// @vitest-environment happy-dom
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import SellerChatTab from '@/components/seller-dashboard-tab/SellerChatTab'

import AgentTab from './AgentTab'
import { ChatDockThread } from './ChatDock'

import type { AgentConfig, AgentUIMessage } from '@/lib/ai/agent'
import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { ChatTransport, UIMessageChunk } from 'ai'

vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  useReducedMotion: () => true,
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({
    data: {
      access_token: 'test-token',
      user: { id: 'user-1', email: 'u@example.com', app_metadata: { role: 'customer' } },
    },
  }),
}))

vi.mock('@/hooks/useChatRealtime', () => ({
  useChatMessagesRealtime: vi.fn(),
  useConversationListRealtime: vi.fn(),
}))

vi.mock('@/hooks/useAiHistory', () => ({
  useAiConversations: () => ({ data: [] }),
  useAiMessages: () => ({ data: undefined }),
  useCreateAiConversation: () => ({ mutateAsync: vi.fn() }),
  useDeleteAiConversation: () => ({ mutate: vi.fn() }),
  useSaveAiMessage: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@generated/endpoints/products/products', () => ({
  useDetail1: () => ({ data: undefined }),
}))

vi.mock('@generated/endpoints/chat/chat', () => ({
  getMessagesQueryKey: (id: string) => ['messages', id],
  getMyConversationsQueryKey: () => ['my-conversations'],
  getSellerConversationsQueryKey: (params: unknown) => ['seller-conversations', params],
  useMyConversations: () => ({ data: { status: 200, data: [] } }),
  useSellerConversations: () => ({
    data: {
      status: 200,
      data: [
        {
          id: 'conv-1',
          shopId: 'shop-1',
          buyerId: 'buyer-1',
          shopName: 'Test Shop',
          lastMessageText: 'Xin chào',
          lastMessageAt: '2026-10-27T10:00:00Z',
          unreadCount: 0,
        },
      ],
    },
    isLoading: false,
  }),
  useMessages: () => ({ data: { status: 200, data: [] }, isLoading: false }),
  useMarkRead: () => ({ mutate: vi.fn() }),
  useSendMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useStartConversation: () => ({ mutate: vi.fn() }),
}))

vi.mock('@generated/endpoints/seller-orders/seller-orders', () => ({
  useList5: () => ({ data: { status: 200, data: [] }, isLoading: false }),
}))

vi.mock('@generated/endpoints/seller-products-inventory/seller-products-inventory', () => ({
  useListProducts: () => ({ data: { status: 200, data: { content: [] } }, isPending: false }),
}))

vi.mock('@generated/endpoints/shops/shops', () => ({
  getMineQueryKey: () => ['shops-mine'],
  useUpdateProfile: () => ({ mutate: vi.fn(), isPending: false }),
}))

function dummyConfig(): AgentConfig {
  return { baseUrl: 'https://ai.example.com/v1', apiKey: 'sk-test', model: 'test-model' }
}

function dummyTransport(): ChatTransport<AgentUIMessage> {
  return {
    sendMessages: async function () {
      return new ReadableStream<UIMessageChunk>({
        start: function (controller) {
          controller.close()
        },
      })
    },
    reconnectToStream: async function () {
      return null
    },
  }
}

function assertHighContrastBlueSendButton(button: HTMLElement) {
  expect(button.className).toContain('bg-blue-800')
  expect(button.className).toContain('text-white')
  expect(button.className).toContain('disabled:bg-blue-700')
  expect(button.className).toContain('dark:bg-blue-700')
  expect(button.className).not.toContain('disabled:opacity-40')
  expect(button.className).not.toContain('btn-primary')

  const svg = button.querySelector('svg')
  expect(svg).not.toBeNull()
  expect(svg?.getAttribute('width')).toBe('18')
  expect(svg?.getAttribute('height')).toBe('18')
}

afterEach(function () {
  cleanup()
})

describe('Chat send button contrast & deep blue styling', function () {
  it('hiển thị nút gửi màu xanh blue đậm, rõ nét trong AgentTab', function () {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AgentTab
            config={dummyConfig()}
            transport={dummyTransport()}
            activeConversationId={null}
            onSelectConversation={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    assertHighContrastBlueSendButton(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
  })

  it('hiển thị nút gửi màu xanh blue đậm, rõ nét trong ChatDockThread', function () {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    const conversation: ChatConversationResponse = {
      id: 'conv-1',
      shopId: 'shop-1',
      shopName: 'Test Shop',
      lastMessageText: 'Chào bạn',
      lastMessageAt: '2026-10-27T10:00:00Z',
      unreadCount: 0,
    }
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatDockThread conversation={conversation} onBack={vi.fn()} variant="page" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    assertHighContrastBlueSendButton(screen.getByRole('button', { name: 'Gửi tin nhắn' }))
  })

  it('hiển thị nút gửi màu xanh blue đậm, rõ nét trong SellerChatTab', function () {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SellerChatTab shopId="shop-1" autoReplyText="" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    assertHighContrastBlueSendButton(screen.getByRole('button', { name: 'Gửi tin nhắn' }))
  })
})
