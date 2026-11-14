// @vitest-environment happy-dom
import { useState } from 'react'
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import type { AgentConfig, AgentUIMessage } from '@/lib/ai/agent'
import type { ChatTransport, UIMessageChunk } from 'ai'

const { customFetchMock } = vi.hoisted(() => ({
  customFetchMock: vi.fn<(url: string, options?: RequestInit) => Promise<unknown>>(),
}))

vi.mock('@/lib/api/apiFetch', () => ({
  customFetch: (url: string, options?: RequestInit) => customFetchMock(url, options),
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({
    data: { user: { id: 'user-1', email: 'buyer@example.com' } },
  }),
}))

vi.mock('@generated/endpoints/products/products', () => ({
  useDetail1: (id: string, opts?: { query?: { enabled?: boolean } }) => {
    if (opts?.query?.enabled === false) {
      return { data: undefined, isPending: false }
    }
    let productName = 'Sản phẩm gợi ý'
    if (id === 'p-999') {
      productName = 'Áo Khoác Tweed'
    }
    return {
      isPending: false,
      data: {
        status: 200,
        data: {
          id,
          name: productName,
          slug: id,
          images: [{ s3Key: 'products/tweed.jpg' }],
          variants: [{ price: 620000 }],
        },
      },
    }
  },
}))

import AgentTab from './AgentTab'

const CONFIG: AgentConfig = {
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'test-key',
  model: 'gemini-2.5-flash',
}

function createChunkTransport(chunks: UIMessageChunk[]): ChatTransport<AgentUIMessage> {
  return {
    sendMessages: async () =>
      new ReadableStream<UIMessageChunk>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk)
          }
          controller.close()
        },
      }),
    reconnectToStream: async () => null,
  }
}

describe('AgentTab product detail cards & AI history persistence', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('hiển thị ChatProductCard với nút Xem chi tiết cho showProducts và link /product/... trong text AI', async () => {
    const user = userEvent.setup()

    customFetchMock.mockImplementation(async function (url: string, opts?: RequestInit) {
      const method = opts?.method ?? 'GET'
      if (url === '/api/ai/conversations' && method === 'GET') {
        return { status: 200, data: [] }
      }
      if (url === '/api/ai/conversations' && method === 'POST') {
        return {
          status: 201,
          data: { id: 'conv-1', title: 'gợi ý váy', createdAt: '', updatedAt: '' },
        }
      }
      if (url.endsWith('/messages') && method === 'GET') {
        return { status: 200, data: [] }
      }
      if (url.endsWith('/messages') && method === 'POST') {
        return { status: 201, data: { id: 'm-1' } }
      }
      return { status: 200, data: null }
    })

    const transport = createChunkTransport([
      { type: 'start', messageId: 'a-1' },
      { type: 'tool-input-start', toolCallId: 'c1', toolName: 'showProducts' },
      {
        type: 'tool-input-available',
        toolCallId: 'c1',
        toolName: 'showProducts',
        input: { productIds: ['p-show'] },
      },
      {
        type: 'tool-output-available',
        toolCallId: 'c1',
        output: {
          items: [
            {
              id: 'p-show',
              name: 'Váy Lụa Dự Tiệc',
              slug: 'vay-lua-du-tiec',
              minPrice: 550000,
              defaultImageUrl: 'products/vay-lua.jpg',
            },
          ],
        },
      },
      { type: 'text-start', id: 't1' },
      {
        type: 'text-delta',
        id: 't1',
        delta: 'Bạn xem thêm mẫu /product/p-999 này nhé!',
      },
      { type: 'text-end', id: 't1' },
      { type: 'finish', finishReason: 'stop' },
    ])

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AgentTab config={CONFIG} transport={transport} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const input = screen.getByPlaceholderText('Mô tả món bạn muốn tìm…')
    await user.type(input, 'gợi ý váy')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    await waitFor(() => {
      expect(screen.getAllByTestId('chat-product-card').length).toBe(2)
    })

    expect(screen.getByText('Váy Lụa Dự Tiệc')).toBeTruthy()
    expect(screen.getByText('Áo Khoác Tweed')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Xem chi tiết' }).length).toBe(2)
    expect(screen.queryByText(/\/product\/p-999/)).toBeNull()
  })

  it('lưu tuần tự user rồi assistant vào DB và không bị query lịch sử ghi đè mất câu trả lời AI', async () => {
    const user = userEvent.setup()
    const savedMessages: Array<{ role: string; content: string; headers?: HeadersInit }> = []
    const dbMessages: Array<Record<string, unknown>> = []

    customFetchMock.mockImplementation(async function (url: string, opts?: RequestInit) {
      const method = opts?.method ?? 'GET'
      if (url === '/api/ai/conversations' && method === 'GET') {
        return { status: 200, data: [] }
      }
      if (url === '/api/ai/conversations' && method === 'POST') {
        expect(opts?.headers).toEqual({ 'Content-Type': 'application/json' })
        return {
          status: 201,
          data: {
            id: 'conv-new',
            title: 'Tìm váy hoa',
            createdAt: '2026-01-01T10:00:00Z',
            updatedAt: '2026-01-01T10:00:00Z',
          },
        }
      }
      if (url === '/api/ai/conversations/conv-new/messages' && method === 'POST') {
        expect(opts?.headers).toEqual({ 'Content-Type': 'application/json' })
        let rawBody = '{}'
        if (typeof opts?.body === 'string') {
          rawBody = opts.body
        }
        const body = JSON.parse(rawBody) as { role: string; content: string }
        savedMessages.push({ role: body.role, content: body.content, headers: opts?.headers })
        const record = {
          id: 'db-' + String(savedMessages.length),
          role: body.role,
          content: body.content,
          metadata: null,
          sentAt: '2026-01-01T10:00:00Z',
        }
        dbMessages.push(record)
        return { status: 201, data: record }
      }
      if (url === '/api/ai/conversations/conv-new/messages' && method === 'GET') {
        // Mô phỏng query DB chỉ kịp thấy user message đầu tiên (nguyên nhân race bug cũ)
        let snapshotData: Array<Record<string, unknown>> = [
          {
            id: 'db-only-user',
            role: 'user',
            content: 'Tìm váy hoa',
            metadata: null,
            sentAt: '2026-01-01T10:00:00Z',
          },
        ]
        if (dbMessages.length > 0) {
          snapshotData = [dbMessages[0]]
        }
        return {
          status: 200,
          data: snapshotData,
        }
      }
      return { status: 200, data: null }
    })

    const transport = createChunkTransport([
      { type: 'start', messageId: 'a-live' },
      { type: 'text-start', id: 't1' },
      { type: 'text-delta', id: 't1', delta: 'Gợi ý cho bạn chiếc váy hoa xinh!' },
      { type: 'text-end', id: 't1' },
      { type: 'finish', finishReason: 'stop' },
    ])

    function ControlledHost() {
      const [convId, setConvId] = useState<string | null>(null)
      return (
        <AgentTab
          config={CONFIG}
          transport={transport}
          activeConversationId={convId}
          onSelectConversation={setConvId}
        />
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ControlledHost />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'Tìm váy hoa')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Gợi ý cho bạn chiếc váy hoa xinh!')).toBeTruthy()

    await waitFor(() => {
      expect(savedMessages.length).toBe(2)
    })

    expect(savedMessages[0]?.role).toBe('user')
    expect(savedMessages[0]?.content).toBe('Tìm váy hoa')
    expect(savedMessages[1]?.role).toBe('assistant')
    expect(savedMessages[1]?.content).toContain('Gợi ý cho bạn chiếc váy hoa xinh!')
    // Câu trả lời AI vẫn còn nguyên trên màn hình sau khi GET messages hoàn tất
    expect(screen.getByText('Gợi ý cho bạn chiếc váy hoa xinh!')).toBeTruthy()
  })

  it('hydrate cuộc trò chuyện cũ từ DB và xóa sạch khung chat khi chuyển sang Đoạn chat mới', async () => {
    const user = userEvent.setup()

    customFetchMock.mockImplementation(async function (url: string) {
      if (url === '/api/ai/conversations') {
        return {
          status: 200,
          data: [
            {
              id: 'conv-old',
              title: 'Lịch sử cũ',
              createdAt: '2026-01-01T10:00:00Z',
              updatedAt: '2026-01-01T10:00:00Z',
            },
          ],
        }
      }
      if (url === '/api/ai/conversations/conv-old/messages') {
        return {
          status: 200,
          data: [
            {
              id: 'old-u1',
              role: 'user',
              content: 'Cho xem áo sơ mi',
              metadata: JSON.stringify({
                parts: [{ type: 'text', text: 'Cho xem áo sơ mi' }],
              }),
              sentAt: '2026-01-01T10:00:00Z',
            },
            {
              id: 'old-a1',
              role: 'assistant',
              content: 'Đây là gợi ý cho bạn',
              metadata: JSON.stringify({
                parts: [
                  { type: 'text', text: 'Đây là gợi ý cho bạn' },
                  {
                    type: 'tool-showProducts',
                    toolCallId: 'tc-1',
                    state: 'output-available',
                    input: { productIds: ['p-old'] },
                    output: {
                      items: [
                        {
                          id: 'p-old',
                          name: 'Áo Sơ Mi Cổ Đức',
                          slug: 'ao-so-mi-co-duc',
                          minPrice: 290000,
                          defaultImageUrl: 'products/ao-so-mi.jpg',
                        },
                      ],
                    },
                  },
                ],
              }),
              sentAt: '2026-01-01T10:00:05Z',
            },
          ],
        }
      }
      return { status: 200, data: null }
    })

    const transport = createChunkTransport([])

    function HostWithNewButton() {
      const [convId, setConvId] = useState<string | null>('conv-old')
      return (
        <div>
          <button type="button" onClick={() => setConvId(null)}>
            Sidebar New Chat
          </button>
          <AgentTab
            config={CONFIG}
            transport={transport}
            activeConversationId={convId}
            onSelectConversation={setConvId}
          />
        </div>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HostWithNewButton />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Cho xem áo sơ mi')).toBeTruthy()
    expect(await screen.findByText('Áo Sơ Mi Cổ Đức')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Xem chi tiết' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Sidebar New Chat' }))

    await waitFor(() => {
      expect(screen.queryByText('Cho xem áo sơ mi')).toBeNull()
    })
    expect(screen.queryByText('Áo Sơ Mi Cổ Đức')).toBeNull()
  })
})
