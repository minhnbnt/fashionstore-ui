import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { convertToModelMessages, stepCountIs, streamText, toUIMessageStream } from 'ai'

import {
  buildSystemPrompt,
  createAgentTools,
  filtersFromMessages,
  productFromMessages,
} from './agent'

import type { AgentConfig, AgentUIMessage } from './agent'
import type { ChatTransport } from 'ai'

// Số bước tối đa mỗi lượt agent: gọi tool → đọc kết quả → trả lời, lặp đến khi xong.
// Đủ dài cho chuỗi listCategories → searchProducts → nới bộ lọc tìm lại → trả lời.
export const MAX_AGENT_STEPS = 10

/**
 * Transport chạy agent ngay trong browser: streamText gọi thẳng endpoint
 * OpenAI-compatible, tool tìm kiếm gọi API cửa hàng qua client orval sẵn có.
 * Chỉ dùng cho dev/demo — API key nằm trong bundle (xem note TODO(oauth) ở agent.ts).
 */
export function createAgentTransport(options: {
  config: AgentConfig
}): ChatTransport<AgentUIMessage> {
  const provider = createOpenAICompatible({
    name: 'fashionstore-agent',
    baseURL: options.config.baseUrl,
    apiKey: options.config.apiKey,
  })

  return {
    sendMessages: async function ({ messages, abortSignal }) {
      const result = streamText({
        model: provider(options.config.model),
        system: buildSystemPrompt(filtersFromMessages(messages), productFromMessages(messages)),
        messages: await convertToModelMessages(messages),
        tools: createAgentTools(),
        stopWhen: stepCountIs(MAX_AGENT_STEPS),
        abortSignal,
      })
      return toUIMessageStream({ stream: result.fullStream })
    },
    reconnectToStream: async function () {
      return null
    },
  }
}
