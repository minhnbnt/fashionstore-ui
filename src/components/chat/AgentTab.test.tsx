import { MemoryRouter, useLocation } from 'react-router'

// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

// Upload ảnh phải mock: test không PUT file thật lên S3.
const { uploadImageMock } = vi.hoisted(() => ({ uploadImageMock: vi.fn() }))
vi.mock('@/lib/api/uploadImage', async function (importOriginal) {
  const actual = await importOriginal<typeof import('@/lib/api/uploadImage')>()
  return { ...actual, uploadImage: uploadImageMock }
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
  return render(
    <MemoryRouter initialEntries={[props.route ?? '/']}>
      <LocationProbe />
      <AgentTab config={props.config} transport={props.transport} />
    </MemoryRouter>,
  )
}

afterEach(function () {
  cleanup()
  uploadImageMock.mockReset()
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

  it('đang ở trang chi tiết thì tin nhắn mang id sản phẩm đang xem', async function () {
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
    expect(last?.metadata?.product).toEqual({ id: 'p-123' })
  })

  it('không ở trang chi tiết thì metadata không có product', async function () {
    const user = userEvent.setup()
    const captured: { messages: AgentUIMessage[] } = { messages: [] }
    renderTab({
      config: configFixture(),
      transport: capturingTransport([], captured),
    })

    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy hoa')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    await screen.findByText('váy hoa')
    const last = captured.messages[captured.messages.length - 1]
    expect(last?.metadata?.product).toBeUndefined()
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

  // File ảnh giả đủ dùng cho upload flow — test không đọc nội dung file.
  function imageFile(): File {
    return new File(['anh-gia'], 'do-dep.png', { type: 'image/png' })
  }

  function sendButton(): HTMLButtonElement {
    return screen.getByRole('button', { name: 'Gửi câu hỏi' }) as HTMLButtonElement
  }

  describe('đính kèm ảnh', () => {
    it('chọn ảnh → upload lên S3, hiện preview và gửi kèm file part + metadata.image', async function () {
      uploadImageMock.mockResolvedValue('chat-img-1')
      const user = userEvent.setup()
      const captured: { messages: AgentUIMessage[] } = { messages: [] }
      renderTab({ config: configFixture(), transport: capturingTransport([], captured) })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())
      await screen.findByAltText('Ảnh sẽ gửi kèm')
      await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'món này còn không')
      // Upload xong thì nút gửi mở lại
      await waitFor(function () {
        expect(sendButton().disabled).toBe(false)
      })
      await user.click(sendButton())

      await screen.findByText('món này còn không')
      const last = captured.messages[captured.messages.length - 1]
      expect(uploadImageMock).toHaveBeenCalledTimes(1)
      expect(last?.metadata?.image?.key).toBe('chat-img-1')
      expect(last?.metadata?.image?.url).toContain('chat-img-1')
      const filePart = last?.parts.find(function (part) {
        return part.type === 'file'
      })
      expect(filePart).toMatchObject({ type: 'file', mediaType: 'image/png' })
      if (filePart?.type === 'file') {
        expect(filePart.url).toContain('chat-img-1')
      }
    })

    it('chưa chọn chữ nhưng có ảnh thì vẫn gửi được tin nhắn', async function () {
      uploadImageMock.mockResolvedValue('chat-img-1')
      const user = userEvent.setup()
      const captured: { messages: AgentUIMessage[] } = { messages: [] }
      renderTab({ config: configFixture(), transport: capturingTransport([], captured) })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())
      await waitFor(function () {
        expect(sendButton().disabled).toBe(false)
      })
      await user.click(sendButton())

      const last = await waitFor(function () {
        const message = captured.messages[captured.messages.length - 1]
        expect(
          message?.parts.some(function (part) {
            return part.type === 'file'
          }),
        ).toBe(true)
        return message
      })
      expect(last.metadata?.image?.key).toBe('chat-img-1')
    })

    it('đang upload thì khóa nút gửi, xong thì mở lại', async function () {
      let resolveUpload: (key: string) => void = function () {}
      uploadImageMock.mockReturnValue(
        new Promise<string>(function (resolve) {
          resolveUpload = resolve
        }),
      )
      const user = userEvent.setup()
      renderTab({ config: configFixture(), transport: transportOf([]) })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())
      expect(sendButton().disabled).toBe(true)

      resolveUpload('chat-img-1')
      await waitFor(function () {
        expect(sendButton().disabled).toBe(false)
      })
    })

    it('file không phải ảnh thì báo lỗi và không upload', async function () {
      renderTab({ config: configFixture(), transport: transportOf([]) })

      // userEvent.upload tôn trọng accept="image/*" nên bắn change trực tiếp,
      // mô phỏng khách ép chọn file lạ qua "All files"/drag-drop.
      const input = screen.getByLabelText('Đính kèm ảnh') as HTMLInputElement
      fireEvent.change(input, {
        target: { files: [new File(['tailieu'], 'tai-lieu.pdf', { type: 'application/pdf' })] },
      })

      expect(await screen.findByText('Chỉ nhận file ảnh.')).toBeTruthy()
      expect(uploadImageMock).not.toHaveBeenCalled()
    })

    it('ảnh quá 5MB thì báo lỗi và không upload', async function () {
      const user = userEvent.setup()
      renderTab({ config: configFixture(), transport: transportOf([]) })

      await user.upload(
        screen.getByLabelText('Đính kèm ảnh'),
        new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], 'to.png', { type: 'image/png' }),
      )

      expect(await screen.findByText('Ảnh tối đa 5 MB.')).toBeTruthy()
      expect(uploadImageMock).not.toHaveBeenCalled()
    })

    it('upload thất bại thì hiện thông báo lỗi', async function () {
      uploadImageMock.mockRejectedValue(new Error('Upload ảnh thất bại, thử lại sau.'))
      const user = userEvent.setup()
      renderTab({ config: configFixture(), transport: transportOf([]) })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())

      expect(await screen.findByText('Không gửi được ảnh, thử ảnh khác nhé.')).toBeTruthy()
    })

    it('nút gỡ ảnh xóa preview khỏi khung soạn tin', async function () {
      uploadImageMock.mockResolvedValue('chat-img-1')
      const user = userEvent.setup()
      renderTab({ config: configFixture(), transport: transportOf([]) })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())
      await screen.findByAltText('Ảnh sẽ gửi kèm')
      await user.click(screen.getByRole('button', { name: 'Gỡ ảnh' }))

      expect(screen.queryByAltText('Ảnh sẽ gửi kèm')).toBeNull()
    })

    it('ảnh đã gửi hiện thumbnail trong tin nhắn user với link S3', async function () {
      uploadImageMock.mockResolvedValue('chat-img-1')
      const user = userEvent.setup()
      renderTab({ config: configFixture(), transport: transportOf([]) })

      await user.upload(screen.getByLabelText('Đính kèm ảnh'), imageFile())
      await waitFor(function () {
        expect(sendButton().disabled).toBe(false)
      })
      await user.click(sendButton())

      const img = (await screen.findByAltText('Ảnh bạn đã gửi')) as HTMLImageElement
      expect(img.src).toContain('chat-img-1')
    })
  })
})
