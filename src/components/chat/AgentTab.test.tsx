import { MemoryRouter, useLocation } from 'react-router'

// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import AgentTab from './AgentTab'

import type { AgentConfig, AgentUIMessage } from '@/lib/ai/agent'
import type { ChatTransport, UIMessageChunk } from 'ai'

// happy-dom không dựng WAAPI đủ nên animation của motion văng unhandled rejection;
// test này không đo animation nên ép nhánh reduced-motion, render div thường.
vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  useReducedMotion: () => true,
}))

// Ép trạng thái "chưa cấu hình" cho test tương ứng — không phụ thuộc .env của máy chạy test.
vi.mock('@/lib/ai/agent', async function (importOriginal) {
  const actual = await importOriginal<typeof import('@/lib/ai/agent')>()
  return { ...actual, readAgentConfig: () => null }
})

function configFixture(): AgentConfig {
  return { baseUrl: 'https://ai.example.com/v1', apiKey: 'sk-test', model: 'test-model' }
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
  return render(
    <MemoryRouter initialEntries={[props.route ?? '/']}>
      <LocationProbe />
      <AgentTab config={props.config} transport={props.transport} />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

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
  { type: 'finish-step' },
  { type: 'start-step' },
  { type: 'text-start', id: 'tx1' },
  { type: 'text-delta', id: 'tx1', delta: 'Mình tìm được 1 sản phẩm nhé.' },
  { type: 'text-end', id: 'tx1' },
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

    const card = screen.getByText('Tìm thấy 1 sản phẩm').closest('div')
    expect(card?.className).toContain('w-full')
    expect(card?.className).not.toContain('max-w-[86%]')
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
    await screen.findByText('Váy hoa nhí')

    // Wrapper của tin nhắn agent tách các part (text ↔ card tool) bằng space-y
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
})
