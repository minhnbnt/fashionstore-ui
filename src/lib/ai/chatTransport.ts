import { DefaultChatTransport } from 'ai'

import { getAuthClient } from '@/lib/auth'

import type { AgentContext } from './agent'
import type { AgentUIMessage } from './agent'
import type { ChatTransport } from 'ai'

/** Transport mỏng: gọi POST /api/chat của ai-backend, gắn Bearer token và context hiện tại. */
export function createChatTransport({
  backendUrl,
  getContext,
}: {
  backendUrl: string
  getContext: () => AgentContext
}): ChatTransport<AgentUIMessage> {
  return new DefaultChatTransport<AgentUIMessage>({
    api: `${backendUrl}/api/chat`,
    prepareSendMessagesRequest: function ({ messages }) {
      return { body: { messages, context: getContext() } }
    },
    fetch: async function (input, init) {
      const { data } = await getAuthClient().getSession()
      const token = data.session?.access_token
      const headers = new Headers(init?.headers)
      if (token !== undefined && token !== '') {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return fetch(input, { ...init, headers })
    },
  })
}
