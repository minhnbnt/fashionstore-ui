import { MemoryRouter } from 'react-router'

// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import SearchAgentWidget from './SearchAgentWidget'

import type { AgentConfig, AgentUIMessage } from '@/lib/ai/agent'
import type { SearchFilters } from '@/types/search'
import type { ChatTransport, UIMessageChunk } from 'ai'

// happy-dom không dựng WAAPI đủ nên animation của motion văng unhandled rejection;
// test này không đo animation nên ép nhánh reduced-motion, render div thường.
vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  useReducedMotion: () => true,
}))

function filtersFixture(): SearchFilters {
  return {
    q: null,
    category: null,
    minPrice: null,
    maxPrice: null,
    size: null,
    color: null,
    sort: null,
    page: 0,
  }
}

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

function renderWidget(props: {
  config?: AgentConfig
  transport?: ChatTransport<AgentUIMessage>
  onApplyFilters?: (patch: Partial<SearchFilters>) => void
}) {
  return render(
    <MemoryRouter>
      <SearchAgentWidget
        filters={filtersFixture()}
        onApplyFilters={props.onApplyFilters ?? vi.fn()}
        config={props.config}
        transport={props.transport}
      />
    </MemoryRouter>,
  )
}

afterEach(function () {
  cleanup()
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
  { type: 'finish-step' },
  { type: 'start-step' },
  { type: 'text-start', id: 'tx1' },
  { type: 'text-delta', id: 'tx1', delta: 'Mình tìm được 1 sản phẩm nhé.' },
  { type: 'text-end', id: 'tx1' },
  { type: 'finish-step' },
  { type: 'finish' },
]

describe('SearchAgentWidget', () => {
  it('mặc định đóng, chỉ hiện nút mở trợ lý', function () {
    renderWidget({ config: configFixture() })

    expect(screen.getByRole('button', { name: 'Mở trợ lý tìm kiếm' })).toBeTruthy()
    expect(screen.queryByPlaceholderText('Mô tả món bạn muốn tìm…')).toBeNull()
  })

  it('bấm nút thì mở panel nhập câu hỏi', async function () {
    const user = userEvent.setup()
    renderWidget({ config: configFixture() })

    await user.click(screen.getByRole('button', { name: 'Mở trợ lý tìm kiếm' }))

    expect(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…')).toBeTruthy()
  })

  it('thiếu cấu hình thì panel báo chưa cấu hình và khóa ô nhập', async function () {
    const user = userEvent.setup()
    renderWidget({})

    await user.click(screen.getByRole('button', { name: 'Mở trợ lý tìm kiếm' }))

    expect(screen.getByText('Chưa cấu hình trợ lý AI. Thêm VITE_AI_* vào .env nhé.')).toBeTruthy()
    const input = screen.getByPlaceholderText('Mô tả món bạn muốn tìm…') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  it('gửi câu hỏi → hiện tin nhắn user, lời đáp assistant và sản phẩm từ tool', async function () {
    const user = userEvent.setup()
    renderWidget({
      config: configFixture(),
      transport: transportOf(TOOL_RESULT_CHUNKS),
    })

    await user.click(screen.getByRole('button', { name: 'Mở trợ lý tìm kiếm' }))
    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy hoa dưới 500k')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('váy hoa dưới 500k')).toBeTruthy()
    expect(await screen.findByText('Mình tìm được 1 sản phẩm nhé.')).toBeTruthy()
    expect(screen.getByText('Váy hoa nhí')).toBeTruthy()
  })

  it('nút Lọc trên trang áp dụng appliedParams của tool lên trang', async function () {
    const user = userEvent.setup()
    const onApplyFilters = vi.fn()
    renderWidget({
      config: configFixture(),
      transport: transportOf(TOOL_RESULT_CHUNKS),
      onApplyFilters,
    })

    await user.click(screen.getByRole('button', { name: 'Mở trợ lý tìm kiếm' }))
    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy hoa')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    await screen.findByText('Váy hoa nhí')

    await user.click(screen.getByRole('button', { name: 'Lọc trên trang' }))

    expect(onApplyFilters).toHaveBeenCalledWith({ q: 'váy hoa', maxPrice: 500000 })
  })

  it('tool đang chạy mà chưa có kết quả thì hiện trạng thái đang tìm', async function () {
    const user = userEvent.setup()
    renderWidget({
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

    await user.click(screen.getByRole('button', { name: 'Mở trợ lý tìm kiếm' }))
    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'áo')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await screen.findByText('Đang tìm sản phẩm…')).toBeTruthy()
  })

  it('sản phẩm trong chat dẫn tới trang chi tiết sản phẩm', async function () {
    const user = userEvent.setup()
    renderWidget({
      config: configFixture(),
      transport: transportOf(TOOL_RESULT_CHUNKS),
    })

    await user.click(screen.getByRole('button', { name: 'Mở trợ lý tìm kiếm' }))
    await user.type(screen.getByPlaceholderText('Mô tả món bạn muốn tìm…'), 'váy')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    const link = await screen.findByRole('link', { name: /Váy hoa nhí/ })
    expect(link.getAttribute('href')).toBe('/product/p1')
  })
})
