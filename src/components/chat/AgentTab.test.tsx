import { MemoryRouter, useLocation } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import AgentTab from './AgentTab'

import type { AgentConfig, AgentUIMessage } from '@/lib/ai/agent'
import type { ChatTransport, UIMessageChunk } from 'ai'

// happy-dom không dựng WAAPI đủ nên animation của motion văng unhandled rejection;
// test này không đo animation nên ép nhánh reduced-motion, render div thường.
vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  useReducedMotion: () => true,
}))

const { uploadWithUrlMock } = vi.hoisted(function () {
  return { uploadWithUrlMock: vi.fn() }
})

vi.mock('@/lib/api/uploadImage', function () {
  return { uploadImageWithUrl: uploadWithUrlMock, MAX_IMAGE_BYTES: 5 * 1024 * 1024 }
})

// Ép trạng thái "chưa cấu hình" cho test tương ứng — không phụ thuộc .env của máy chạy test.
vi.mock('@/lib/ai/agent', async function (importOriginal) {
  const actual = await importOriginal<typeof import('@/lib/ai/agent')>()
  return { ...actual, readAgentConfig: () => null }
})

function configFixture(): AgentConfig {
  return { backendUrl: 'https://ai.test' }
}

// Transport giả: phát đúng các UIMessageChunk rồi đóng stream, không gọi LLM thật.
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

// Transport giả kèm ghi lại messages nhận được — để assert metadata gửi kèm tin nhắn.
function capturingTransport(
  chunks: UIMessageChunk[],
  captured: { messages: AgentUIMessage[] },
): ChatTransport<AgentUIMessage> {
  return {
    sendMessages: async function ({ messages }) {
      captured.messages = messages
      return transportOf(chunks).sendMessages({ messages, abortSignal: undefined } as never)
    },
    reconnectToStream: async function () {
      return null
    },
  }
}

/** Probe lộ location hiện tại của router để assert việc navigate. */
function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location-probe">{location.pathname + location.search}</span>
}

function renderTab(props: {
  config?: AgentConfig
  transport?: ChatTransport<AgentUIMessage>
  route?: string
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[props.route ?? '/']}>
        <LocationProbe />
        <AgentTab config={props.config} transport={props.transport} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(function () {
  uploadWithUrlMock.mockReset()
})

afterEach(function () {
  cleanup()
  vi.unstubAllGlobals()
})

const TOOL_RESULT_CHUNKS: UIMessageChunk[] = [
  { type: 'start', messageId: 'a1' },
  { type: 'start-step' },
  {
    type: 'tool-input-available',
    toolCallId: 'tc1',
    toolName: 'searchProducts',
    input: { q: 'váy hoa' },
  },
  {
    type: 'tool-output-available',
    toolCallId: 'tc1',
    output: {
      total: 1,
      appliedParams: { q: 'váy hoa', maxPrice: 500000 },
      items: [{ id: 'p1', name: 'Váy hoa nhí', minPrice: 450000 }],
    },
  },
  {
    type: 'tool-input-available',
    toolCallId: 'tc2',
    toolName: 'showProducts',
    input: { productIds: ['p1'] },
  },
  {
    type: 'tool-output-available',
    toolCallId: 'tc2',
    output: {
      items: [{ id: 'p1', name: 'Váy hoa nhí', minPrice: 450000 }],
    },
  },
  { type: 'finish-step' },
  { type: 'start-step' },
  { type: 'text-start', id: 'tx1' },
  { type: 'text-delta', id: 'tx1', delta: 'Mình tìm được 1 sản phẩm nhé.' },
  { type: 'text-end', id: 'tx1' },
  { type: 'finish-step' },
  { type: 'finish' },
]

// Chỉ tìm kiếm, chưa show — khách chỉ được thấy pill tổng số, không thấy card.
const SEARCH_ONLY_CHUNKS: UIMessageChunk[] = [
  { type: 'start', messageId: 'a1' },
  { type: 'start-step' },
  {
    type: 'tool-input-available',
    toolCallId: 'tc1',
    toolName: 'searchProducts',
    input: { q: 'váy hoa' },
  },
  {
    type: 'tool-output-available',
    toolCallId: 'tc1',
    output: {
      total: 1,
      appliedParams: { q: 'váy hoa', maxPrice: 500000 },
      items: [{ id: 'p1', name: 'Váy hoa nhí', minPrice: 450000 }],
    },
  },
  { type: 'finish-step' },
  { type: 'finish' },
]

const TRYON_INPUT = {
  personImageUrl: 'https://assets.test/person.png',
  garmentImageUrl: 'https://assets.test/garment.png',
  category: 'tops',
  garmentPhotoType: 'model',
}

// tryOn đang chạy — khách thấy pill chờ, chưa thấy ảnh.
const TRYON_PENDING_CHUNKS: UIMessageChunk[] = [
  { type: 'start', messageId: 'a1' },
  { type: 'start-step' },
  {
    type: 'tool-input-available',
    toolCallId: 'tc1',
    toolName: 'tryOn',
    input: TRYON_INPUT,
  },
  { type: 'finish-step' },
  { type: 'finish' },
]

// tryOn xong rồi model gọi showImage — khách thấy ảnh kết quả trong khung chat.
const TRYON_DONE_CHUNKS: UIMessageChunk[] = [
  { type: 'start', messageId: 'a1' },
  { type: 'start-step' },
  {
    type: 'tool-input-available',
    toolCallId: 'tc1',
    toolName: 'tryOn',
    input: TRYON_INPUT,
  },
  {
    type: 'tool-output-available',
    toolCallId: 'tc1',
    output: { image: { key: 'tryon/x.png', url: 'https://assets.test/tryon/x.png' } },
  },
  {
    type: 'tool-input-available',
    toolCallId: 'tc2',
    toolName: 'showImage',
    input: { url: 'https://assets.test/tryon/x.png' },
  },
  {
    type: 'tool-output-available',
    toolCallId: 'tc2',
    output: { url: 'https://assets.test/tryon/x.png' },
  },
  { type: 'finish-step' },
  { type: 'finish' },
]

describe('AgentTab — tab trợ lý AI trong ChatDock', () => {
  it('hiện sẵn ô nhập câu hỏi (không còn nút launcher riêng)', function () {
    renderTab({ config: configFixture() })

    expect(screen.queryByRole('button', { name: 'Mở trợ lý tìm kiếm' })).toBeNull()
    expect(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…')).toBeTruthy()
  })

  it('thiếu cấu hình thì panel báo chưa cấu hình và khóa ô nhập', function () {
    renderTab({})

    expect(screen.getByText('Chưa cấu hình trợ lý AI. Thêm VITE_AI_* vào .env nhé.')).toBeTruthy()
    const input = screen.getByPlaceholderText('Mô tả món bạn muốn tìm…') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  it('gửi câu hỏi → hiện tin nhắn user, lời đáp assistant và sản phẩm từ tool', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf(TOOL_RESULT_CHUNKS),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy hoa dưới 500k')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('váy hoa dưới 500k')).toBeTruthy()
    expect(await screen.findByText('Mình tìm được 1 sản phẩm nhé.')).toBeTruthy()
    expect(screen.getByText('Váy hoa nhí')).toBeTruthy()
  })

  it('tryOn đang chạy thì hiện pill chờ, chưa hiện ảnh', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf(TRYON_PENDING_CHUNKS),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'thử đồ cái áo này')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Đang tạo ảnh thử đồ, chờ chút nhé…')).toBeTruthy()
    expect(screen.queryByAltText('Ảnh kết quả thử đồ')).toBeNull()
  })

  it('showImage trả kết quả thì hiện ảnh thử đồ cho khách', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf(TRYON_DONE_CHUNKS),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'thử đồ cái áo này')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    const image = (await screen.findByAltText('Ảnh kết quả thử đồ')) as HTMLImageElement
    expect(image.getAttribute('src')).toBe('https://assets.test/tryon/x.png')
    expect(screen.queryByText('Đang tạo ảnh thử đồ, chờ chút nhé…')).toBeNull()
  })

  it('tin nhắn user giữ bubble indigo bên phải', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf([]),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'áo khoác')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    const bubble = await screen.findByText('áo khoác')
    expect(bubble.className).toContain('bg-indigo-600')
    expect(bubble.className).toContain('max-w-[78%]')
  })

  it('tin nhắn agent: markdown, tràn toàn bộ khung, không còn bubble', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf([
        { type: 'start', messageId: 'a1' },
        { type: 'start-step' },
        { type: 'text-start', id: 'tx1' },
        { type: 'text-delta', id: 'tx1', delta: 'Gợi ý cho bạn: **váy hoa** đang giảm 20%.' },
        { type: 'text-end', id: 'tx1' },
        { type: 'finish-step' },
        { type: 'finish' },
      ]),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    const strong = await screen.findByText('váy hoa')
    expect(strong.tagName).toBe('STRONG')
    const article = strong.closest('article')
    expect(article).not.toBeNull()
    expect(article?.className).toContain('max-w-none')
    expect(article?.className).not.toContain('bg-zinc-100')
    expect(article?.className).not.toContain('max-w-[78%]')
  })

  it('khối kết quả tìm kiếm của tool tràn toàn bộ khung', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf(TOOL_RESULT_CHUNKS),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    await screen.findByText('Váy hoa nhí')

    const card = screen.getByText('Váy hoa nhí').closest('div.rounded-2xl')
    expect(card?.className).toContain('w-full')
    expect(card?.className).not.toContain('max-w-[86%]')
  })

  it('tool searchProducts chỉ hiện pill tổng số, không đổ card và không có nút lọc', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf(SEARCH_ONLY_CHUNKS),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Tìm thấy 1 sản phẩm')).toBeTruthy()
    expect(screen.queryByText('Váy hoa nhí')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Lọc trên trang' })).toBeNull()
  })

  it('tool showProducts đang chạy thì hiện trạng thái chuẩn bị', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf([
        { type: 'start', messageId: 'a1' },
        { type: 'start-step' },
        {
          type: 'tool-input-available',
          toolCallId: 'tc1',
          toolName: 'showProducts',
          input: { productIds: ['p1'] },
        },
        { type: 'finish-step' },
        { type: 'finish' },
      ]),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Đang chuẩn bị sản phẩm…')).toBeTruthy()
  })

  it('tool showProducts trả items rỗng thì hiện pill báo không hiển thị được', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf([
        { type: 'start', messageId: 'a1' },
        { type: 'start-step' },
        {
          type: 'tool-input-available',
          toolCallId: 'tc1',
          toolName: 'showProducts',
          input: { productIds: ['p1'] },
        },
        {
          type: 'tool-output-available',
          toolCallId: 'tc1',
          output: { items: [] },
        },
        { type: 'finish-step' },
        { type: 'finish' },
      ]),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Không hiển thị được sản phẩm.')).toBeTruthy()
  })

  it('các khối trong tin nhắn agent có khoảng cách, không dính sát nhau', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf([
        { type: 'start', messageId: 'a1' },
        { type: 'start-step' },
        { type: 'text-start', id: 'tx0' },
        { type: 'text-delta', id: 'tx0', delta: 'Để mình tìm nhé.' },
        { type: 'text-end', id: 'tx0' },
        { type: 'finish-step' },
        {
          type: 'tool-input-available',
          toolCallId: 'tc1',
          toolName: 'searchProducts',
          input: { q: 'váy hoa' },
        },
        {
          type: 'tool-output-available',
          toolCallId: 'tc1',
          output: {
            total: 1,
            appliedParams: { q: 'váy hoa' },
            items: [{ id: 'p1', name: 'Váy hoa nhí', minPrice: 450000 }],
          },
        },
        { type: 'finish-step' },
        { type: 'finish' },
      ]),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    await screen.findByText('Tìm thấy 1 sản phẩm')

    // Wrapper của tin nhắn agent tách các part (text ↔ khối tool) bằng space-y
    const article = screen.getByText('Để mình tìm nhé.').closest('article')
    expect(article?.parentElement?.className).toContain('space-y-4')
    // Khoảng cách giữa các tin nhắn nới rộng hơn mặc định
    const scroller = article?.closest('.overflow-y-auto')
    expect(scroller?.className).toContain('space-y-4')
  })

  it('nút Lọc trên trang đưa về /search kèm bộ lọc của tool', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf(TOOL_RESULT_CHUNKS),
      route: '/product/p1',
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy hoa')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    await screen.findByText('Váy hoa nhí')

    await user.click(screen.getByRole('button', { name: 'Lọc trên trang' }))

    const location = screen.getByTestId('location-probe').textContent ?? ''
    expect(location.startsWith('/search?')).toBe(true)
    const query = new URLSearchParams(location.slice('/search?'.length))
    expect(query.get('maxPrice')).toBe('500000')
    expect(query.get('q')).toBe('váy hoa')
  })

  it('đang ở /search thì giữ nguyên path, chỉ đổi query', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf(TOOL_RESULT_CHUNKS),
      route: '/search?size=M',
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy hoa')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    await screen.findByText('Váy hoa nhí')

    await user.click(screen.getByRole('button', { name: 'Lọc trên trang' }))

    const location = screen.getByTestId('location-probe').textContent ?? ''
    expect(location.startsWith('/search?')).toBe(true)
    expect(location).toContain('maxPrice=500000')
  })

  it('tool đang chạy mà chưa có kết quả thì hiện trạng thái đang tìm', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf([
        { type: 'start', messageId: 'a1' },
        { type: 'start-step' },
        {
          type: 'tool-input-available',
          toolCallId: 'tc1',
          toolName: 'searchProducts',
          input: { q: 'áo' },
        },
        { type: 'finish-step' },
        { type: 'finish' },
      ]),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'áo')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Đang tìm sản phẩm…')).toBeTruthy()
  })

  it('sản phẩm trong chat dẫn tới trang chi tiết sản phẩm', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf(TOOL_RESULT_CHUNKS),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    const link = await screen.findByRole('link', { name: /Váy hoa nhí/ })
    expect(link.getAttribute('href')).toBe('/product/p1')
  })

  it('tin nhắn không còn mang metadata context (context đi theo request)', async function () {
    const user = userEvent.setup()
    const captured: { messages: AgentUIMessage[] } = { messages: [] }
    renderTab({
      config: configFixture(),
      transport: capturingTransport([], captured),
      route: '/product/p-123',
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'còn size L không')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    await screen.findByText('còn size L không')
    const last = captured.messages[captured.messages.length - 1]
    expect(last?.role).toBe('user')
    expect(last?.metadata).toBeUndefined()
  })

  it('request mang context từ location hiện tại, không phải snapshot trong message', async function () {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('data: {"type":"start"}\n\ndata: [DONE]\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderTab({ config: configFixture(), route: '/product/p-123' })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'còn size L không')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    await screen.findByText('còn size L không')
    const call = fetchMock.mock.calls[0]
    const body = JSON.parse(String(call[1]?.body)) as unknown as {
      context: { route: string; productId?: string }
      messages: AgentUIMessage[]
    }
    expect(body.context.route).toBe('/product/p-123')
    expect(body.context.productId).toBe('p-123')
    expect(body.messages[body.messages.length - 1].metadata).toBeUndefined()
    vi.unstubAllGlobals()
  })

  it('tool getProductDetail đang chạy thì hiện trạng thái đang tra cứu', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf([
        { type: 'start', messageId: 'a1' },
        { type: 'start-step' },
        {
          type: 'tool-input-available',
          toolCallId: 'tc1',
          toolName: 'getProductDetail',
          input: { productId: 'p-123' },
        },
        { type: 'finish-step' },
        { type: 'finish' },
      ]),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'áo này chất gì')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Đang tra cứu sản phẩm…')).toBeTruthy()
  })

  it('tool getProductDetail lỗi thì hiện trạng thái lỗi', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf([
        { type: 'start', messageId: 'a1' },
        { type: 'start-step' },
        {
          type: 'tool-input-available',
          toolCallId: 'tc1',
          toolName: 'getProductDetail',
          input: { productId: 'p-123' },
        },
        { type: 'tool-output-error', toolCallId: 'tc1', errorText: '404' },
        { type: 'finish-step' },
        { type: 'finish' },
      ]),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'áo này chất gì')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Có lỗi khi tra cứu sản phẩm.')).toBeTruthy()
  })

  it('tool getProductDetail xong thì giữ dấu vết tra cứu kèm tên sản phẩm', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf([
        { type: 'start', messageId: 'a1' },
        { type: 'start-step' },
        {
          type: 'tool-input-available',
          toolCallId: 'tc1',
          toolName: 'getProductDetail',
          input: { productId: 'p-123' },
        },
        {
          type: 'tool-output-available',
          toolCallId: 'tc1',
          output: { id: 'p-123', name: 'Áo Sơ Mi Lụa', variants: [] },
        },
        { type: 'finish-step' },
        { type: 'finish' },
      ]),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'áo này chất gì')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Đã tra cứu sản phẩm: Áo Sơ Mi Lụa')).toBeTruthy()
  })

  it('khách vãng lai (guest) thấy banner nhắc đăng nhập để lưu lịch sử AI', function () {
    renderTab({ config: configFixture() })
    expect(screen.getByText('Đăng nhập để lưu lại lịch sử tư vấn AI.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeTruthy()
  })

  it('click gợi ý hỏi nhanh sẽ gửi luôn câu hỏi cho trợ lý AI', async function () {
    const user = userEvent.setup()
    renderTab({
      config: configFixture(),
      transport: transportOf(TOOL_RESULT_CHUNKS),
    })

    const chip = screen.getByRole('button', { name: 'Váy hoa dự tiệc dưới 500k' })
    await user.click(chip)

    expect(await screen.findByText('Váy hoa dự tiệc dưới 500k')).toBeTruthy()
    expect(await screen.findByText('Mình tìm được 1 sản phẩm nhé.')).toBeTruthy()
  })

  it('variant page ẩn nút Đoạn chat mới lặp lại và hiện header trang toàn màn hình', function () {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/messages?tab=ai']}>
          <AgentTab config={configFixture()} variant="page" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.queryByRole('button', { name: 'Đoạn chat mới' })).toBeNull()
    expect(screen.queryByText('Đăng nhập để lưu lại lịch sử tư vấn AI.')).toBeNull()
    expect(screen.getByText(/Trợ lý nét AI · Gợi ý phối đồ/)).toBeTruthy()
  })

  describe('đính kèm ảnh', function () {
    function imageFile(name = 'ao.png', type = 'image/png'): File {
      return new File(['fake-image'], name, { type })
    }

    function sendButton(): HTMLButtonElement {
      return screen.getByRole('button', { name: 'Gửi câu hỏi' }) as HTMLButtonElement
    }

    function streamFetchMock() {
      return vi.fn().mockResolvedValue(
        new Response('data: {"type":"start"}\n\ndata: [DONE]\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      )
    }

    function requestBodyOf(fetchMock: ReturnType<typeof vi.fn>): {
      context: { image?: { url: string; mediaType?: string } }
      messages: AgentUIMessage[]
    } {
      const call = fetchMock.mock.calls[0]
      return JSON.parse(String(call[1]?.body)) as {
        context: { image?: { url: string; mediaType?: string } }
        messages: AgentUIMessage[]
      }
    }

    it('gửi ảnh → context.image.url là publicUrl từ presign, không đính FileUIPart vào message', async function () {
      uploadWithUrlMock.mockResolvedValue({
        uploadId: 'chat-img-1',
        publicUrl: 'https://assets.test/chat-img-1.jpeg',
      })
      const fetchMock = streamFetchMock()
      vi.stubGlobal('fetch', fetchMock)
      const user = userEvent.setup()
      renderTab({ config: configFixture() })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())
      expect(await screen.findByAltText('Ảnh sẽ gửi kèm')).toBeTruthy()
      await waitFor(function () {
        expect(sendButton().disabled).toBe(false)
      })
      await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'món này còn không')
      await user.click(sendButton())

      expect(await screen.findByText('món này còn không')).toBeTruthy()
      const body = requestBodyOf(fetchMock)
      expect(body.context.image?.url).toBe('https://assets.test/chat-img-1.jpeg')
      const last = body.messages[body.messages.length - 1]
      expect(
        last?.parts.some(function (part) {
          return part.type === 'file'
        }),
      ).toBe(false)
    })

    it('chỉ có ảnh, không có chữ thì vẫn gửi được', async function () {
      uploadWithUrlMock.mockResolvedValue({
        uploadId: 'chat-img-2',
        publicUrl: 'https://assets.test/chat-img-2.jpeg',
      })
      const fetchMock = streamFetchMock()
      vi.stubGlobal('fetch', fetchMock)
      const user = userEvent.setup()
      renderTab({ config: configFixture() })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())
      await waitFor(function () {
        expect(sendButton().disabled).toBe(false)
      })
      await user.click(sendButton())

      await waitFor(function () {
        expect(fetchMock).toHaveBeenCalled()
      })
      expect(requestBodyOf(fetchMock).context.image?.url).toBe(
        'https://assets.test/chat-img-2.jpeg',
      )
    })

    it('file không phải ảnh thì báo lỗi và không upload', function () {
      renderTab({ config: configFixture() })

      // userEvent.upload lọc theo accept="image/*" nên dùng fireEvent để test handler.
      fireEvent.change(screen.getByLabelText('Đính kèm ảnh'), {
        target: { files: [imageFile('a.txt', 'text/plain')] },
      })

      return screen.findByText('Chỉ nhận file ảnh.').then(function () {
        expect(uploadWithUrlMock).not.toHaveBeenCalled()
      })
    })

    it('ảnh quá 5MB thì báo lỗi và không upload', async function () {
      const big = imageFile()
      Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
      const user = userEvent.setup()
      renderTab({ config: configFixture() })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), big)

      expect(await screen.findByText('Ảnh tối đa 5 MB.')).toBeTruthy()
      expect(uploadWithUrlMock).not.toHaveBeenCalled()
    })

    it('upload thất bại thì hiện lỗi và khóa nút gửi', async function () {
      uploadWithUrlMock.mockRejectedValue(new Error('lỗi mạng'))
      const user = userEvent.setup()
      renderTab({ config: configFixture() })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())

      expect(await screen.findByText('Không gửi được ảnh, thử ảnh khác nhé.')).toBeTruthy()
      expect(sendButton().disabled).toBe(true)
    })

    it('gỡ ảnh thì bỏ preview và không gửi image trong context', async function () {
      uploadWithUrlMock.mockResolvedValue({
        uploadId: 'chat-img-3',
        publicUrl: 'https://assets.test/chat-img-3.jpeg',
      })
      const fetchMock = streamFetchMock()
      vi.stubGlobal('fetch', fetchMock)
      const user = userEvent.setup()
      renderTab({ config: configFixture() })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())
      expect(await screen.findByAltText('Ảnh sẽ gửi kèm')).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'Gỡ ảnh' }))
      expect(screen.queryByAltText('Ảnh sẽ gửi kèm')).toBeNull()

      await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'không có ảnh nha')
      await user.click(sendButton())

      await waitFor(function () {
        expect(fetchMock).toHaveBeenCalled()
      })
      const body = requestBodyOf(fetchMock)
      expect(body.context.image).toBeUndefined()
      expect(Object.keys(body.context)).not.toContain('image')
    })

    it('ảnh đã gửi hiện thumbnail trong tin nhắn user', async function () {
      uploadWithUrlMock.mockResolvedValue({
        uploadId: 'chat-img-4',
        publicUrl: 'https://assets.test/chat-img-4.jpeg',
      })
      const captured: { messages: AgentUIMessage[] } = { messages: [] }
      const user = userEvent.setup()
      renderTab({ config: configFixture(), transport: capturingTransport([], captured) })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())
      await waitFor(function () {
        expect(sendButton().disabled).toBe(false)
      })
      await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'đây là ảnh')
      await user.click(sendButton())

      expect(await screen.findByAltText('Ảnh bạn đã gửi')).toBeTruthy()
    })
  })
})
