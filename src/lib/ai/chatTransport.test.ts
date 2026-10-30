import { describe, expect, it } from 'vite-plus/test'

import { createAgentTransport } from './chatTransport'

import type { AgentConfig } from './agent'

function configFixture(): AgentConfig {
  return { baseUrl: 'https://ai.example.com/v1', apiKey: 'sk-test', model: 'test-model' }
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
})
