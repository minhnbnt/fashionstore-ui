import { describe, expect, it, vi } from 'vite-plus/test'

import { createAgentTransport, MAX_AGENT_STEPS } from './chatTransport'

import type { AgentConfig } from './agent'

// Giữ thật convertToModelMessages/stepCountIs (cần chạy toModelOutput của tool),
// chỉ giả streamText (bắt tham số) và toUIMessageStream (trả stream giả).
vi.mock('ai', async function (importOriginal) {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    streamText: vi.fn(),
    toUIMessageStream: vi.fn(),
  }
})

import { streamText, toUIMessageStream } from 'ai'

function configFixture(): AgentConfig {
  return { baseUrl: 'https://ai.example.com/v1', apiKey: 'sk-test', model: 'test-model' }
}

/** Lịch sử chat có tool-readImage đã chạy xong — kiểu thật cần tool đăng ký xong mới khớp. */
function readImageMessagesFixture() {
  return [
    {
      id: 'msg-user',
      role: 'user',
      parts: [{ type: 'text', text: 'xem ảnh này giúp tôi' }],
    },
    {
      id: 'msg-assistant',
      role: 'assistant',
      parts: [
        { type: 'step-start' },
        {
          type: 'tool-readImage',
          toolCallId: 'tc-read-1',
          state: 'output-available',
          input: { url: 'https://assets.example.com/anh.png' },
          output: {
            url: 'https://assets.example.com/anh.png',
            mediaType: 'image/png',
            data: 'YW5o',
          },
        },
        { type: 'text', text: 'Tôi đã xem ảnh.' },
      ],
    },
  ]
}

describe('createAgentTransport', () => {
  it('trả transport có sendMessages và reconnectToStream', function () {
    const transport = createAgentTransport({ config: configFixture() })

    expect(typeof transport.sendMessages).toBe('function')
    expect(typeof transport.reconnectToStream).toBe('function')
  })

  it('không hỗ trợ resume: reconnectToStream trả null', async function () {
    const transport = createAgentTransport({ config: configFixture() })

    const stream = await transport.reconnectToStream?.({
      chatId: 'chat-1',
    } as never)

    expect(stream).toBeNull()
  })

  it('vòng lặp agent đủ dài cho chuỗi nhiều lần gọi tool', function () {
    // listCategories → searchProducts → nới bộ lọc tìm lại → trả lời cần > 5 bước
    expect(MAX_AGENT_STEPS).toBe(10)
  })

  it('truyền tools vào convertToModelMessages để readImage đưa ảnh vào ngữ cảnh model', async function () {
    const fullStreamSentinel = { marker: 'full-stream' }
    const uiStream = new ReadableStream()
    vi.mocked(streamText).mockReturnValue({ fullStream: fullStreamSentinel } as never)
    vi.mocked(toUIMessageStream).mockReturnValue(uiStream as never)

    const transport = createAgentTransport({ config: configFixture() })
    const stream = await transport.sendMessages({
      chatId: 'chat-1',
      messages: readImageMessagesFixture(),
      abortSignal: undefined,
    } as never)

    expect(stream).toBe(uiStream)
    expect(vi.mocked(toUIMessageStream)).toHaveBeenCalledWith({ stream: fullStreamSentinel })

    const call = vi.mocked(streamText).mock.calls[0]?.[0] as unknown as {
      tools: Record<string, { execute?: unknown }>
      messages: Array<Record<string, unknown>>
    }
    expect(typeof call.tools.readImage.execute).toBe('function')

    // Ảnh từ kết quả readImage phải nằm trong messages gửi cho model dưới dạng file data.
    const messagesJson = JSON.stringify(call.messages)
    expect(messagesJson).toContain('"type":"file"')
    expect(messagesJson).toContain('YW5o')
    expect(messagesJson).toContain('image/png')
  })
})
