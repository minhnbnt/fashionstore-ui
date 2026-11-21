import { DefaultChatTransport } from 'ai'

import { getAuthClient } from '@/lib/auth'

import type { AgentUIMessage } from './agent'
import type { ChatTransport } from 'ai'

/** Transport mỏng: gọi POST /api/chat của ai-backend, gắn Bearer token theo từng request. */
export function createChatTransport({
  backendUrl,
}: {
  backendUrl: string
}): ChatTransport<AgentUIMessage> {
  return new DefaultChatTransport<AgentUIMessage>({
    api: `${backendUrl}/api/chat`,
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
