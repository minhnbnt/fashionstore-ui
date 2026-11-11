import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import ChatDock from './ChatDock'

import type { AgentConfig, AgentUIMessage } from '@/lib/ai/agent'
import type { ChatTransport, UIMessageChunk } from 'ai'

const mocks = vi.hoisted(() => ({
  session: {
    access_token: 'fake-jwt',
    user: { id: 'cust-1', email: 'customer@example.com', app_metadata: { role: 'customer' } },
  } as unknown,
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({ data: mocks.session }),
}))

vi.mock('@/hooks/useChatRealtime', () => ({
  useChatMessagesRealtime: vi.fn(),
  useConversationListRealtime: vi.fn(),
}))

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

vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  useReducedMotion: () => true,
}))

vi.mock('@generated/endpoints/products/products', () => ({
  useDetail1: () => ({ data: undefined }),
}))

vi.mock('@generated/endpoints/chat/chat', () => ({
  useMyConversations: vi.fn(),
  useMarkRead: () => ({ mutate: vi.fn() }),
  useSendMessage: () => ({ mutate: vi.fn() }),
  useStartConversation: () => ({ mutate: vi.fn() }),
  useMessages: () => ({ data: undefined }),
  getMyConversationsQueryKey: vi.fn(),
  getSellerConversationsQueryKey: vi.fn(),
  getMessagesQueryKey: vi.fn(),
}))

import { useMyConversations } from '@generated/endpoints/chat/chat'

function conversationsOf(unreadCount: number) {
  return {
    data: {
      status: 200,
      data: [
        {
          id: 'conv-1',
          shopId: 'shop-1',
          buyerId: 'cust-1',
          shopName: 'Test Shop',
          unreadCount,
        },
      ],
    },
  } as unknown as ReturnType<typeof useMyConversations>
}

function configFixture(): AgentConfig {
  return { baseUrl: 'https://ai.example.com/v1', apiKey: 'sk-test', model: 'test-model' }
}

function transportOf(chunks: UIMessageChunk[]): ChatTransport<AgentUIMessage> {
  return {
    sendMessages: async function () {
      return new ReadableStream<UIMessageChunk>({
        start: function (controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk)
          }
          controller.close()
        },
      })
    },
    reconnectToStream: async function () {
      return null
    },
  }
}

function renderDock(
  props: { config?: AgentConfig; transport?: ChatTransport<AgentUIMessage> } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <ChatDock config={props.config} transport={props.transport} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(function () {
  cleanup()
  mocks.session = {
    access_token: 'fake-jwt',
    user: { id: 'cust-1', email: 'customer@example.com', app_metadata: { role: 'customer' } },
  } as unknown
})

describe('ChatDock — nút nổi gộp', () => {
  it('render đúng 1 nút toggle, không còn nút trợ lý ở góc trái', () => {
    vi.mocked(useMyConversations).mockReturnValue(conversationsOf(3))

    const html = renderToString(
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(ChatDock, null)),
    )

    expect(html).toContain('id="chat-dock-toggle"')
    expect(html).not.toContain('id="search-agent-toggle"')
    expect(html).not.toContain('id="buyer-chat-widget-toggle"')
  })

  it('hiện badge unread khi có tin chưa đọc', () => {
    vi.mocked(useMyConversations).mockReturnValue(conversationsOf(3))

    const html = renderToString(
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(ChatDock, null)),
    )

    expect(html).toContain('>3</span>')
  })

  it('định dạng badge 99+ khi vượt 99 tin chưa đọc', () => {
    vi.mocked(useMyConversations).mockReturnValue(conversationsOf(120))

    const html = renderToString(
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(ChatDock, null)),
    )

    expect(html).toContain('>99+</span>')
  })

  it('ẩn badge khi không có tin chưa đọc', () => {
    vi.mocked(useMyConversations).mockReturnValue(conversationsOf(0))

    const html = renderToString(
      createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(ChatDock, null)),
    )

    expect(html).not.toContain('bg-rose-500')
  })
})

describe('ChatDock — 2 tab trong 1 panel', () => {
  it('buyer mở dock thấy cả 2 tab, mặc định ở tab Tin nhắn', async function () {
    const user = userEvent.setup()
    vi.mocked(useMyConversations).mockReturnValue(conversationsOf(0))
    renderDock()

    await user.click(screen.getByRole('button', { name: 'Mở khung chat' }))

    expect(screen.getByRole('button', { name: 'Trợ lý AI' })).toBeTruthy()
    expect(screen.getByText('Trao đổi trực tiếp với các shop bạn quan tâm')).toBeTruthy()
  })

  it('guest chỉ thấy tab Trợ lý AI, không thấy tab Tin nhắn', async function () {
    mocks.session = undefined
    const user = userEvent.setup()
    renderDock()

    await user.click(screen.getByRole('button', { name: 'Mở khung chat' }))

    expect(screen.getByRole('button', { name: 'Trợ lý AI' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Tin nhắn' })).toBeNull()
    expect(screen.queryByText('Trao đổi trực tiếp với các shop bạn quan tâm')).toBeNull()
  })

  it('buyer chuyển sang tab Trợ lý AI → hiện ô nhập agent', async function () {
    const user = userEvent.setup()
    vi.mocked(useMyConversations).mockReturnValue(conversationsOf(0))
    renderDock({ config: configFixture(), transport: transportOf([]) })

    await user.click(screen.getByRole('button', { name: 'Mở khung chat' }))
    await user.click(screen.getByRole('button', { name: 'Trợ lý AI' }))

    // Chunk agent lazy-load — full-suite chạy song song có thể chậm hơn 1s mặc định
    expect(
      await screen.findByPlaceholderText('Mô tả món bạn muốn tìm…', {}, { timeout: 5000 }),
    ).toBeTruthy()
    // Nội dung tab Tin nhắn không còn hiển thị cùng lúc
    expect(screen.queryByText('Trao đổi trực tiếp với các shop bạn quan tâm')).toBeNull()
  })

  it('chuyển qua lại giữa 2 tab mà không mất nội dung', async function () {
    const user = userEvent.setup()
    vi.mocked(useMyConversations).mockReturnValue(conversationsOf(0))
    renderDock({ config: configFixture(), transport: transportOf([]) })

    await user.click(screen.getByRole('button', { name: 'Mở khung chat' }))
    await user.click(screen.getByRole('button', { name: 'Trợ lý AI' }))
    await screen.findByPlaceholderText('Mô tả món bạn muốn tìm…', {}, { timeout: 5000 })
    await user.click(screen.getByRole('button', { name: 'Tin nhắn' }))

    expect(screen.getByText('Trao đổi trực tiếp với các shop bạn quan tâm')).toBeTruthy()
  })

  it('panel chat: cao như cũ 68dvh/tối đa 540px, rộng 560px trên desktop', async function () {
    const user = userEvent.setup()
    vi.mocked(useMyConversations).mockReturnValue(conversationsOf(0))
    renderDock()

    await user.click(screen.getByRole('button', { name: 'Mở khung chat' }))

    const panel = screen
      .getByText('Trao đổi trực tiếp với các shop bạn quan tâm')
      .closest('.rounded-3xl')
    expect(panel?.className).toContain('h-[min(68dvh,540px)]')
    expect(panel?.className).toContain('md:w-[560px]')
    expect(panel?.className).not.toContain('640px')
    expect(panel?.className).not.toContain('480px')
  })

  it('sự kiện open-chat với shopId → mở dock ở tab Tin nhắn, vào thẳng hội thoại', async function () {
    vi.mocked(useMyConversations).mockReturnValue(conversationsOf(0))
    renderDock()

    await act(async function () {
      window.dispatchEvent(
        new CustomEvent('fashionstore:open-chat', { detail: { shopId: 'shop-1' } }),
      )
    })

    // Có sẵn hội thoại với shop → vào thẳng thread
    expect(screen.getByText('Test Shop')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quay lại danh sách hội thoại' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Đóng khung chat' })).toBeTruthy()
  })
})
