// @vitest-environment happy-dom
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import ChatDock from '@/components/chat/ChatDock'
import Header from '@/components/Header'
import { createShowProductsTool } from '@/lib/ai/tools/showProducts'
import Messages from '@/pages/Messages'
import ProductDetail from '@/pages/ProductDetail'

import AgentTab from './AgentTab'

import type { AgentConfig, AgentUIMessage } from '@/lib/ai/agent'
import type { ChatTransport, UIMessageChunk } from 'ai'

vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  useReducedMotion: () => true,
}))

vi.mock('@/lib/api/websocket', () => ({
  createChatSocketClient: async () => ({
    activate: () => {},
    deactivate: async () => {},
    subscribe: () => ({ unsubscribe: () => {} }),
    connected: false,
  }),
}))

const sessionState: {
  current: {
    user: { id: string; email: string; user_metadata: { role: string; full_name: string } }
  } | null
} = {
  current: null,
}

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => ({ data: sessionState.current, isLoading: false }),
}))

const PRODUCT_ID = 'eb574129-6b38-4170-b2ec-724707042c99'
const SHOP_ID = '0f26ceb1-7542-4831-9764-77a8e46cb91f'
const CATEGORY_ID = 'bc5f4acc-2933-460c-afee-2c577de82dbc'

const REAL_PRODUCT_JSON = {
  id: PRODUCT_ID,
  shopId: SHOP_ID,
  categoryId: CATEGORY_ID,
  name: 'Áo khoác parka layer',
  slug: 'ao-khoac-parka',
  description: 'Phối caro, đi mưa đi nắng đều ổn.',
  status: 'ACTIVE',
  variants: [
    {
      id: 'd3071a3b-da85-4260-ace1-82c71b53191c',
      sku: 'AO-KHOAC-PARKA-M',
      size: 'M',
      color: 'Rêu',
      price: 980000,
      compareAtPrice: null,
      stockQuantity: 4,
      defaultVariant: true,
      updatedAt: '2026-10-20T16:51:22.092960Z',
    },
  ],
  images: [
    {
      id: 'a7549788-f0a7-49d5-98e9-11498d5804df',
      variantId: null,
      s3Key: 'demo/ao-khoac-parka-1.jpg',
      sortOrder: 0,
    },
  ],
  updatedAt: '2026-10-20T16:51:17.931205Z',
  averageRating: null,
  reviewCount: 0,
  videoKey: null,
  garmentKey: null,
  tryOnEnabled: false,
  material: null,
  origin: null,
  careInstructions: null,
  sizeGuide: null,
  weightGrams: null,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
}

const REAL_SHOP_JSON = {
  id: SHOP_ID,
  name: 'nét lab',
  slug: 'net-lab',
  description: 'Mặc đẹp là nét riêng của bạn.',
  logoKey: null,
  bannerKey: null,
  status: 'APPROVED',
  statusReason: null,
  phone: '0901234567',
  address: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
  returnPolicy: 'Đổi trả trong 7 ngày nếu sản phẩm có lỗi từ nhà sản xuất.',
  processingDays: 2,
  sellerType: 'INDIVIDUAL',
  rating: null,
  ratingCount: 0,
  followerCount: 0,
  workingHours: '{"mon":"08:00-21:30"}',
  kycStatus: 'VERIFIED',
  isTrusted: true,
  createdAt: '2026-10-20T16:51:13.171709Z',
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }
  if (input instanceof URL) {
    return input.toString()
  }
  return input.url
}

function installBackendFetchStub(options?: { allowProductSlug?: boolean }) {
  vi.stubGlobal('fetch', async function (input: RequestInfo | URL) {
    const url = urlOf(input)
    if (url.endsWith('/api/categories')) {
      return jsonResponse([{ id: CATEGORY_ID, name: 'Áo khoác', slug: 'ao-khoac' }])
    }
    if (url.includes('/api/search/products')) {
      return jsonResponse({ items: [], total: 0, page: 0, limit: 20 })
    }
    if (url.endsWith('/api/products/' + PRODUCT_ID + '/reviews')) {
      return jsonResponse([])
    }
    if (url.endsWith('/api/products/' + PRODUCT_ID)) {
      return jsonResponse(REAL_PRODUCT_JSON)
    }
    if (url.endsWith('/api/products/ao-khoac-parka')) {
      if (options?.allowProductSlug) {
        return jsonResponse(REAL_PRODUCT_JSON)
      }
      return jsonResponse({ status: 400, title: 'Bad Request' }, 400)
    }
    if (url.endsWith('/api/products/ao-khoac-parka/reviews')) {
      if (options?.allowProductSlug) {
        return jsonResponse([])
      }
      return jsonResponse({ status: 400, title: 'Bad Request' }, 400)
    }
    if (url.endsWith('/api/shops/' + SHOP_ID)) {
      return jsonResponse(REAL_SHOP_JSON)
    }
    if (url.endsWith('/api/cart')) {
      return jsonResponse({ items: [], subtotal: 0 })
    }
    if (url.endsWith('/api/wishlist')) {
      return jsonResponse([])
    }
    if (url.includes('/api/notifications')) {
      return jsonResponse({ items: [], unreadCount: 0 })
    }
    if (url.endsWith('/api/chat/conversations')) {
      return jsonResponse([])
    }
    if (url.endsWith('/api/ai/conversations')) {
      return jsonResponse([
        {
          id: 'conv-1',
          title: 'Tư vấn parka',
          createdAt: '2026-11-11T13:00:00Z',
          updatedAt: '2026-11-11T13:05:00Z',
        },
      ])
    }
    if (url.includes('/api/ai/conversations/conv-1/messages')) {
      return jsonResponse([
        {
          id: 'msg-u1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'tôi muốn mua áo khoác',
          sentAt: '2026-11-11T13:04:00Z',
          metadata: JSON.stringify({ parts: [{ type: 'text', text: 'tôi muốn mua áo khoác' }] }),
        },
        {
          id: 'msg-a1',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Dạ, em gửi bạn mẫu áo khoác hiện có ở cửa hàng nhé:',
          sentAt: '2026-11-11T13:05:00Z',
          metadata: JSON.stringify({
            parts: [
              {
                type: 'tool-showProducts',
                toolCallId: 'c-show',
                state: 'output-available',
                input: { productIds: [PRODUCT_ID] },
                output: {
                  items: [
                    {
                      id: PRODUCT_ID,
                      name: 'Áo khoác parka layer',
                      slug: 'ao-khoac-parka',
                      shopId: SHOP_ID,
                      minPrice: 980000,
                      defaultImageUrl: 'demo/ao-khoac-parka-1.jpg',
                      rank: null,
                    },
                  ],
                },
              },
              {
                type: 'text',
                text: 'Dạ, em gửi bạn mẫu áo khoác hiện có ở cửa hàng nhé:',
                state: 'done',
              },
            ],
          }),
        },
      ])
    }
    if (url.endsWith('/api/me/follows')) {
      return jsonResponse([])
    }
    return jsonResponse({}, 404)
  })
}

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="location-probe">{loc.pathname}</div>
}

function renderWithRoutes(transport: ChatTransport<AgentUIMessage>) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/messages']}>
        <LocationProbe />
        <Routes>
          <Route
            path="/messages"
            element={<AgentTab config={configFixture()} transport={transport} variant="page" />}
          />
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(function () {
  sessionState.current = null
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('AiProductClickFlow — click card sản phẩm AI gợi ý', () => {
  it('click card từ showProducts (UUID) điều hướng tới ProductDetail không lỗi', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_ASSETS_URL', 'http://localhost:9000/fashionstore')
    installBackendFetchStub()
    const user = userEvent.setup()
    const transport = transportOf([
      { type: 'start', messageId: 'm-1' },
      {
        type: 'tool-input-available',
        toolCallId: 'c-show',
        toolName: 'showProducts',
        input: { productIds: [PRODUCT_ID] },
      },
      {
        type: 'tool-output-available',
        toolCallId: 'c-show',
        output: {
          items: [
            {
              id: PRODUCT_ID,
              name: 'Áo khoác parka layer',
              slug: 'ao-khoac-parka',
              shopId: SHOP_ID,
              minPrice: 980000,
              defaultImageUrl: 'demo/ao-khoac-parka-1.jpg',
              rank: null,
            },
          ],
        },
      },
      { type: 'text-start', id: 't-1' },
      { type: 'text-delta', id: 't-1', delta: 'Bạn xem mẫu áo khoác này nhé:' },
      { type: 'text-end', id: 't-1' },
      { type: 'finish' },
    ])

    renderWithRoutes(transport)

    const textbox = screen.getByRole('textbox')
    await user.type(textbox, 'áo khoác{enter}')

    const detailLink = await screen.findByRole('link', { name: 'Xem chi tiết' })
    await user.click(detailLink)

    expect(screen.getByTestId('location-probe').textContent).toBe('/product/' + PRODUCT_ID)
    await waitFor(function () {
      expect(screen.getByRole('heading', { name: 'Áo khoác parka layer' })).toBeTruthy()
    })
    expect(screen.queryByText(/Đã xảy ra lỗi/)).toBeNull()
  })

  it('click card trong trang Messages + Header + ChatDock khi đã đăng nhập', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_ASSETS_URL', 'http://localhost:9000/fashionstore')
    sessionState.current = {
      user: {
        id: 'fe86bc9b-8bbf-4268-93ce-c327f8d727c9',
        email: 'buyer@example.com',
        user_metadata: { role: 'customer', full_name: 'Buyer' },
      },
    }
    installBackendFetchStub()
    const user = userEvent.setup()
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/messages?tab=ai']}>
          <Header />
          <LocationProbe />
          <Routes>
            <Route path="/messages" element={<Messages />} />
            <Route path="/product/:id" element={<ProductDetail />} />
          </Routes>
          <ChatDock />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const convBtn = await screen.findByRole('button', { name: /Tư vấn parka/ })
    await user.click(convBtn)

    const detailLink = await screen.findByRole('link', { name: 'Xem chi tiết' })
    await user.click(detailLink)

    expect(screen.getByTestId('location-probe').textContent).toBe('/product/' + PRODUCT_ID)
    await waitFor(function () {
      expect(screen.getByRole('heading', { name: 'Áo khoác parka layer' })).toBeTruthy()
    })
    expect(screen.queryByText(/Đã xảy ra lỗi/)).toBeNull()
  })

  it('click card từ showProducts trong ChatDock drawer (khách đã đăng nhập) điều hướng tới ProductDetail không lỗi', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_ASSETS_URL', 'http://localhost:9000/fashionstore')
    sessionState.current = {
      user: {
        id: 'fe86bc9b-8bbf-4268-93ce-c327f8d727c9',
        email: 'buyer@example.com',
        user_metadata: { role: 'customer', full_name: 'Buyer' },
      },
    }
    installBackendFetchStub()
    const user = userEvent.setup()
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/']}>
          <LocationProbe />
          <Routes>
            <Route path="/" element={<div>Trang chủ</div>} />
            <Route path="/product/:id" element={<ProductDetail />} />
          </Routes>
          <ChatDock config={configFixture()} transport={transportOf([])} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const openBtn = await screen.findByRole('button', { name: 'Mở khung chat' })
    await user.click(openBtn)
    await user.click(screen.getByRole('button', { name: 'Trợ lý AI' }))
    const historyBtn = await screen.findByRole('button', { name: /Cuộc trò chuyện mới/ })
    await user.click(historyBtn)
    await user.click(await screen.findByRole('button', { name: 'Tư vấn parka' }))

    const detailLink = await screen.findByRole('link', { name: 'Xem chi tiết' })
    await user.click(detailLink)

    expect(screen.getByTestId('location-probe').textContent).toBe('/product/' + PRODUCT_ID)
    await waitFor(function () {
      expect(screen.getByRole('heading', { name: 'Áo khoác parka layer' })).toBeTruthy()
    })
    expect(screen.queryByText(/Đã xảy ra lỗi/)).toBeNull()
  })

  it('chuyển activeConversationId không lưu nhầm tin nhắn assistant của hội thoại cũ sang hội thoại mới', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_ASSETS_URL', 'http://localhost:9000/fashionstore')
    sessionState.current = {
      user: {
        id: 'fe86bc9b-8bbf-4268-93ce-c327f8d727c9',
        email: 'buyer@example.com',
        user_metadata: { role: 'customer', full_name: 'Buyer' },
      },
    }
    const savedCalls: Array<{ url: string; body: unknown }> = []
    vi.stubGlobal('fetch', async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = urlOf(input)
      if (url.endsWith('/api/ai/conversations')) {
        return jsonResponse([
          {
            id: 'conv-1',
            title: 'Hội thoại 1',
            createdAt: '2026-11-11T13:00:00Z',
            updatedAt: '2026-11-11T13:05:00Z',
          },
          {
            id: 'conv-2',
            title: 'Hội thoại 2',
            createdAt: '2026-11-11T13:01:00Z',
            updatedAt: '2026-11-11T13:02:00Z',
          },
        ])
      }
      if (
        url.endsWith('/api/ai/conversations/conv-1/messages') &&
        (!init?.method || init.method === 'GET')
      ) {
        return jsonResponse([])
      }
      if (
        url.endsWith('/api/ai/conversations/conv-2/messages') &&
        (!init?.method || init.method === 'GET')
      ) {
        return jsonResponse([
          {
            id: 'msg-u2',
            conversationId: 'conv-2',
            role: 'user',
            content: 'hello',
            sentAt: '2026-11-11T13:02:00Z',
            metadata: JSON.stringify({ parts: [{ type: 'text', text: 'hello' }] }),
          },
        ])
      }
      if (url.includes('/messages') && init?.method === 'POST') {
        let parsedBody: unknown = {}
        if (typeof init.body === 'string') {
          parsedBody = JSON.parse(init.body)
        }
        savedCalls.push({ url, body: parsedBody })
        return jsonResponse({ id: 'saved-1' }, 201)
      }
      return jsonResponse({}, 404)
    })

    const user = userEvent.setup()
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const transport = transportOf([
      { type: 'start', messageId: 'm-live-1' },
      { type: 'text-start', id: 't-live' },
      { type: 'text-delta', id: 't-live', delta: 'Kết quả của hội thoại 1' },
      { type: 'text-end', id: 't-live' },
      { type: 'finish' },
    ])

    const rendered = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/messages']}>
          <AgentTab
            config={configFixture()}
            transport={transport}
            activeConversationId="conv-1"
            variant="page"
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.type(screen.getByRole('textbox'), 'tìm áo{enter}')
    expect(await screen.findByText('Kết quả của hội thoại 1')).toBeTruthy()

    rendered.rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/messages']}>
          <AgentTab
            config={configFixture()}
            transport={transport}
            activeConversationId="conv-2"
            variant="page"
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(function () {
      expect(screen.getByText('hello')).toBeTruthy()
    })

    const leakedSave = savedCalls.find(function (c) {
      return c.url.includes('/conv-2/messages')
    })
    expect(leakedSave).toBeUndefined()
  })

  it('không crash khi tin nhắn lịch sử có tool-showProducts output-available thiếu output.items', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_ASSETS_URL', 'http://localhost:9000/fashionstore')
    sessionState.current = {
      user: {
        id: 'fe86bc9b-8bbf-4268-93ce-c327f8d727c9',
        email: 'buyer@example.com',
        user_metadata: { role: 'customer', full_name: 'Buyer' },
      },
    }
    vi.stubGlobal('fetch', async function (input: RequestInfo | URL) {
      const url = urlOf(input)
      if (url.endsWith('/api/ai/conversations')) {
        return jsonResponse([
          {
            id: 'conv-bad',
            title: 'Lịch sử thiếu output',
            createdAt: '2026-11-11T13:00:00Z',
            updatedAt: '2026-11-11T13:05:00Z',
          },
        ])
      }
      if (url.includes('/api/ai/conversations/conv-bad/messages')) {
        return jsonResponse([
          {
            id: 'msg-a-bad',
            conversationId: 'conv-bad',
            role: 'assistant',
            content: 'Mình gửi sản phẩm bên dưới nhé.',
            sentAt: '2026-11-11T13:05:00Z',
            metadata: JSON.stringify({
              parts: [
                {
                  type: 'tool-showProducts',
                  toolCallId: 'c-bad',
                  state: 'output-available',
                  input: { productIds: [PRODUCT_ID] },
                },
                { type: 'text', text: 'Mình gửi sản phẩm bên dưới nhé.', state: 'done' },
              ],
            }),
          },
        ])
      }
      return jsonResponse({}, 404)
    })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/messages']}>
          <AgentTab
            config={configFixture()}
            transport={transportOf([])}
            activeConversationId="conv-bad"
            variant="page"
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Mình gửi sản phẩm bên dưới nhé.')).toBeTruthy()
  })

  it('click card hoặc link /product/<slug> (khi AI dùng slug thay UUID) không bị lỗi 400 trên ProductDetail', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_ASSETS_URL', 'http://localhost:9000/fashionstore')
    installBackendFetchStub({ allowProductSlug: true })
    const user = userEvent.setup()
    const transport = transportOf([
      { type: 'start', messageId: 'm-2' },
      { type: 'text-start', id: 't-2' },
      {
        type: 'text-delta',
        id: 't-2',
        delta: 'Bạn xem mẫu [Áo khoác parka layer](/product/ao-khoac-parka) nhé!',
      },
      { type: 'text-end', id: 't-2' },
      { type: 'finish' },
    ])

    renderWithRoutes(transport)

    await user.type(screen.getByRole('textbox'), 'áo khoác{enter}')
    const mdLink = await screen.findByRole('link', { name: 'Áo khoác parka layer' })
    await user.click(mdLink)

    expect(screen.getByTestId('location-probe').textContent).toBe('/product/ao-khoac-parka')
    await waitFor(function () {
      expect(screen.getByRole('heading', { name: 'Áo khoác parka layer' })).toBeTruthy()
    })
    expect(screen.queryByText(/Đã xảy ra lỗi/)).toBeNull()
  })

  it('showProducts tự fallback sang detail khi AI truyền slug thay UUID', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_ASSETS_URL', 'http://localhost:9000/fashionstore')
    vi.stubGlobal('fetch', async function (input: RequestInfo | URL) {
      const url = urlOf(input)
      if (url.includes('/api/products/batch')) {
        return jsonResponse({ status: 400 }, 400)
      }
      if (url.endsWith('/api/products/ao-khoac-parka')) {
        return jsonResponse(REAL_PRODUCT_JSON)
      }
      return jsonResponse({}, 404)
    })

    const tool = createShowProductsTool()
    const output = await tool.execute!(
      { productIds: ['ao-khoac-parka'] },
      { toolCallId: 'c-slug', messages: [], context: {} },
    )
    expect('items' in output && output.items).toHaveLength(1)
    if ('items' in output) {
      expect(output.items[0]?.id).toBe(PRODUCT_ID)
      expect(output.items[0]?.minPrice).toBe(980000)
    }
  })
})
