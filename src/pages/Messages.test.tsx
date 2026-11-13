import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import Messages from './Messages'

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: vi.fn(),
}))

vi.mock('@generated/endpoints/chat/chat', () => ({
  useMyConversations: vi.fn(),
  useMessages: vi.fn(),
  useSendMessage: vi.fn(),
  useMarkRead: vi.fn(),
  getMessagesQueryKey: vi.fn(() => ['messages']),
  getMyConversationsQueryKey: vi.fn(() => ['my-conversations']),
}))

vi.mock('@/hooks/useAiHistory', () => ({
  useAiConversations: vi.fn(),
  useAiMessages: vi.fn(),
  useCreateAiConversation: vi.fn(),
  useDeleteAiConversation: vi.fn(),
  useSaveAiMessage: vi.fn(),
}))

vi.mock('@/components/chat/AgentTab', () => ({
  default: function DummyAgentTab(props: { activeConversationId?: string | null }) {
    return (
      <div data-testid="agent-tab-mock">
        <span>Mock AgentTab</span>
        <span data-testid="active-ai-conv-id">{props.activeConversationId ?? 'none'}</span>
      </div>
    )
  },
}))

import {
  useMyConversations,
  useMessages,
  useSendMessage,
  useMarkRead,
} from '@generated/endpoints/chat/chat'

import { useAiConversations, useDeleteAiConversation } from '@/hooks/useAiHistory'
import { useSessionQuery } from '@/hooks/useSession'

function renderWithClient(ui: React.ReactNode, initialEntries = ['/messages']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Messages Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSendMessage).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSendMessage>)
    vi.mocked(useMarkRead).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useMarkRead>)
    vi.mocked(useMessages).mockReturnValue({
      data: { status: 200, data: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useMessages>)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders guest mode with AI tab active by default and prompts login for shop tab', () => {
    vi.mocked(useSessionQuery).mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSessionQuery>)
    vi.mocked(useMyConversations).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useMyConversations>)
    vi.mocked(useAiConversations).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAiConversations>)

    renderWithClient(<Messages />)

    // Guest mode defaults to AI tab
    expect(screen.getByText('Trợ lý nét AI')).not.toBeNull()
    expect(screen.getByTestId('agent-tab-mock')).not.toBeNull()

    // Switch to Shop tab
    fireEvent.click(screen.getByRole('button', { name: /Người bán/i }))

    // Should prompt login
    expect(screen.getByText(/Đăng nhập để nhắn tin với người bán/i)).not.toBeNull()
    const loginLink = screen.getByRole('link', { name: /Đăng nhập ngay/i })
    expect(loginLink.getAttribute('href')).toBe('/login')
  })

  it('renders shop conversation list and loads thread when clicked for logged in user', () => {
    vi.mocked(useSessionQuery).mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      isLoading: false,
    } as unknown as ReturnType<typeof useSessionQuery>)

    const mockConversations = [
      {
        id: 'conv-101',
        shopId: 'shop-1',
        shopName: 'Vintage Denim',
        lastMessageText: 'Chào bạn, áo này còn size M nha!',
        lastMessageAt: '2026-11-11T10:00:00Z',
        unreadCount: 2,
      },
    ]

    vi.mocked(useMyConversations).mockReturnValue({
      data: { status: 200, data: mockConversations },
      isLoading: false,
    } as unknown as ReturnType<typeof useMyConversations>)
    vi.mocked(useAiConversations).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAiConversations>)

    renderWithClient(<Messages />)

    // User is logged in, default tab is Shop
    expect(screen.getByText('Vintage Denim')).not.toBeNull()
    expect(screen.getByText('Chào bạn, áo này còn size M nha!')).not.toBeNull()
    expect(screen.getByText('2')).not.toBeNull() // unread badge

    // Click conversation
    fireEvent.click(screen.getByText('Vintage Denim'))

    // ChatDockThread or thread container should open
    expect(screen.getByRole('button', { name: /Gửi tin nhắn/i })).not.toBeNull()
  })

  it('allows switching to AI tab and managing AI conversations', () => {
    vi.mocked(useSessionQuery).mockReturnValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      isLoading: false,
    } as unknown as ReturnType<typeof useSessionQuery>)
    vi.mocked(useMyConversations).mockReturnValue({
      data: { status: 200, data: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useMyConversations>)

    const mockAiConversations = [
      {
        id: 'ai-c-1',
        title: 'Tư vấn đồ đi tiệc cưới',
        createdAt: '2026-11-11T09:00:00Z',
        updatedAt: '2026-11-11T09:00:00Z',
      },
    ]
    const mutateDelete = vi.fn()
    vi.mocked(useAiConversations).mockReturnValue({
      data: mockAiConversations,
      isLoading: false,
    } as unknown as ReturnType<typeof useAiConversations>)
    vi.mocked(useDeleteAiConversation).mockReturnValue({
      mutate: mutateDelete,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteAiConversation>)

    renderWithClient(<Messages />, ['/messages?tab=ai'])

    expect(screen.getByText('Tư vấn đồ đi tiệc cưới')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Đoạn chat mới/i })).not.toBeNull()

    // Select conversation
    fireEvent.click(screen.getByText('Tư vấn đồ đi tiệc cưới'))
    expect(screen.getByTestId('active-ai-conv-id').textContent).toBe('ai-c-1')

    // Click delete conversation
    const deleteBtn = screen.getByRole('button', { name: /Xóa đoạn chat/i })
    fireEvent.click(deleteBtn)
    expect(mutateDelete).toHaveBeenCalledWith('ai-c-1')
  })
})
