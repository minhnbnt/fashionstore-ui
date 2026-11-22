import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { EMPTY_FILTERS } from '@/lib/searchFilters'

import { createChatTransport } from './chatTransport'

import type { AgentContext } from './agent'
import type { AgentUIMessage } from './agent'

const { sessionMock } = vi.hoisted(function () {
  return { sessionMock: vi.fn() }
})

vi.mock('@/lib/auth', function () {
  return { getAuthClient: () => ({ getSession: sessionMock }) }
})

function contextFixture(): AgentContext {
  return { route: '/search', filters: { ...EMPTY_FILTERS }, productId: undefined }
}

function responseFixture(): Response {
  return new Response('data: {"type":"start"}\n\ndata: [DONE]\n\n', {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

function sendOptions() {
  return {
    chatId: 'c1',
    messageId: 'u1',
    trigger: 'submit',
    messages: [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Tìm áo' }] },
    ] as unknown as AgentUIMessage[],
  }
}

afterEach(function () {
  vi.unstubAllGlobals()
})

describe('createChatTransport', function () {
  it('gửi tới {backendUrl}/api/chat kèm Bearer token của phiên', async function () {
    sessionMock.mockResolvedValue({ data: { session: { access_token: 'jwt-1' } } })
    const fetchMock = vi.fn().mockResolvedValue(responseFixture())
    vi.stubGlobal('fetch', fetchMock)

    const transport = createChatTransport({
      backendUrl: 'https://ai.test',
      getContext: contextFixture,
    })
    await transport.sendMessages(sendOptions() as never)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]
    expect(String(call[0])).toBe('https://ai.test/api/chat')
    const headers = new Headers(call[1]?.headers)
    expect(headers.get('authorization')).toBe('Bearer jwt-1')
  })

  it('không có session thì vẫn gửi request nhưng không gắn authorization', async function () {
    sessionMock.mockResolvedValue({ data: { session: null } })
    const fetchMock = vi.fn().mockResolvedValue(responseFixture())
    vi.stubGlobal('fetch', fetchMock)

    const transport = createChatTransport({
      backendUrl: 'https://ai.test',
      getContext: contextFixture,
    })
    await transport.sendMessages(sendOptions() as never)

    const call = fetchMock.mock.calls[0]
    expect(String(call[0])).toBe('https://ai.test/api/chat')
    const headers = new Headers(call[1]?.headers)
    expect(headers.get('authorization')).toBeNull()
  })

  it('gửi context mới nhất trong body cùng messages', async function () {
    sessionMock.mockResolvedValue({ data: { session: null } })
    const fetchMock = vi.fn().mockResolvedValue(responseFixture())
    vi.stubGlobal('fetch', fetchMock)

    const transport = createChatTransport({
      backendUrl: 'https://ai.test',
      getContext: function () {
        return { ...contextFixture(), route: '/product/ao-polo', productId: 'slug-ao-polo' }
      },
    })
    await transport.sendMessages(sendOptions() as never)

    const call = fetchMock.mock.calls[0]
    const body = JSON.parse(String(call[1]?.body)) as unknown as {
      context: { route: string; productId?: string }
      messages: AgentUIMessage[]
    }
    expect(body.context.route).toBe('/product/ao-polo')
    expect(body.context.productId).toBe('slug-ao-polo')
    expect(body.messages).toHaveLength(1)
  })
})
