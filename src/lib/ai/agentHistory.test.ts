import { describe, expect, it } from 'vite-plus/test'

import {
  deserializeAgentMessage,
  getMessageImageUrl,
  serializeAgentMessage,
  serializeUserMessageMetadata,
} from './agentHistory'

import type { AgentUIMessage } from './agent'

describe('agentHistory serialization & deserialization', () => {
  it('serialize tin nhắn text thông thường', () => {
    const msg: AgentUIMessage = {
      id: 'msg-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Tìm áo thun trắng' }],
      createdAt: new Date('2026-11-11T10:00:00Z'),
    } as unknown as AgentUIMessage

    const serialized = serializeAgentMessage(msg)
    expect(serialized.role).toBe('user')
    expect(serialized.content).toBe('Tìm áo thun trắng')
    expect(serialized.metadata).toContain('"parts"')
  })

  it('serialize tin nhắn có tool parts và trích xuất đúng content text', () => {
    const msg: AgentUIMessage = {
      id: 'msg-2',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Tôi gợi ý các mẫu này:' },
        {
          type: 'tool-showProducts',
          toolCallId: 'call-1',
          state: 'output-available',
          input: { productIds: ['p1'] },
          output: { products: [{ id: 'p1', name: 'Áo Polo' }] },
        },
      ],
    } as unknown as AgentUIMessage

    const serialized = serializeAgentMessage(msg)
    expect(serialized.role).toBe('assistant')
    expect(serialized.content).toBe('Tôi gợi ý các mẫu này:')
    expect(serialized.metadata).toContain('tool-showProducts')
  })

  it('deserialize khôi phục đầy đủ parts từ metadata', () => {
    const payload = {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'Tôi gợi ý các mẫu này:',
      metadata: JSON.stringify({
        parts: [
          { type: 'text', text: 'Tôi gợi ý các mẫu này:' },
          { type: 'tool-showProducts', toolCallId: 'call-1', state: 'output-available' },
        ],
      }),
      sentAt: '2026-11-11T10:05:00Z',
    }

    const restored = deserializeAgentMessage(payload)
    expect(restored.id).toBe('msg-2')
    expect(restored.role).toBe('assistant')
    expect(restored.parts).toHaveLength(2)
    expect(restored.parts[1]?.type).toBe('tool-showProducts')
  })

  it('deserialize fallback về text part khi metadata null hoặc lỗi', () => {
    const payload = {
      id: 'msg-3',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Chào shop',
      metadata: null,
      sentAt: '2026-11-11T10:10:00Z',
    }

    const restored = deserializeAgentMessage(payload)
    expect(restored.parts).toEqual([{ type: 'text', text: 'Chào shop' }])
    expect(restored.metadata).toBeUndefined()
    expect(getMessageImageUrl(restored)).toBeUndefined()
  })

  it('serializeUserMessageMetadata và deserializeAgentMessage lưu & khôi phục imageUrl', () => {
    const metadata = serializeUserMessageMetadata('Mặc thử áo này', 'https://assets.test/me.png')
    const restored = deserializeAgentMessage({
      id: 'msg-img-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Mặc thử áo này',
      metadata,
      sentAt: '2026-11-11T10:15:00Z',
    })

    expect(restored.parts).toEqual([{ type: 'text', text: 'Mặc thử áo này' }])
    expect(getMessageImageUrl(restored)).toBe('https://assets.test/me.png')
  })

  it('serializeUserMessageMetadata chỉ có ảnh (text rỗng) vẫn khôi phục được imageUrl và text part rỗng', () => {
    const metadata = serializeUserMessageMetadata('', 'https://assets.test/only-img.png')
    const restored = deserializeAgentMessage({
      id: 'msg-img-2',
      conversationId: 'conv-1',
      role: 'user',
      content: '',
      metadata,
      sentAt: '2026-11-11T10:20:00Z',
    })

    expect(restored.parts).toEqual([{ type: 'text', text: '' }])
    expect(getMessageImageUrl(restored)).toBe('https://assets.test/only-img.png')
  })

  it('serializeUserMessageMetadata không truyền imageUrl thì không gắn metadata imageUrl khi deserialize', () => {
    const metadata = serializeUserMessageMetadata('Chỉ có chữ')
    expect(metadata).not.toContain('imageUrl')

    const restored = deserializeAgentMessage({
      id: 'msg-no-img',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Chỉ có chữ',
      metadata,
      sentAt: '2026-11-11T10:25:00Z',
    })

    expect(restored.metadata).toBeUndefined()
    expect(getMessageImageUrl(restored)).toBeUndefined()
  })
})
