import type { AgentUIMessage } from './agent'

export interface SerializedAiMessage {
  role: string
  content: string
  metadata: string
}

export interface BackendAiMessageResponse {
  id: string
  conversationId: string
  role: string
  content: string
  metadata?: string | null
  sentAt?: string
}

export function serializeUserMessageMetadata(text: string, imageUrl?: string): string {
  if (imageUrl !== undefined && imageUrl !== '') {
    return JSON.stringify({
      parts: [{ type: 'text', text }],
      imageUrl,
    })
  }
  return JSON.stringify({
    parts: [{ type: 'text', text }],
  })
}

export function getMessageImageUrl(message: AgentUIMessage): string | undefined {
  const rawMeta = message.metadata
  if (rawMeta !== null && rawMeta !== undefined && typeof rawMeta === 'object') {
    const candidate = (rawMeta as { imageUrl?: unknown }).imageUrl
    if (typeof candidate === 'string' && candidate !== '') {
      return candidate
    }
  }
  return undefined
}

/**
 * Serialize AgentUIMessage thành payload lưu vào Backend AI Message.
 * Lưu toàn bộ mảng `parts` (gồm text và tool invocations/results) vào metadata JSON
 * để có thể tái tạo trọn vẹn kết quả tìm kiếm/gợi ý sản phẩm khi tải lại lịch sử.
 */
export function serializeAgentMessage(message: AgentUIMessage): SerializedAiMessage {
  let content = ''
  if (Array.isArray(message.parts)) {
    const textParts = message.parts
      .filter(function (part) {
        return part.type === 'text' && typeof part.text === 'string'
      })
      .map(function (part) {
        return (part as { text: string }).text
      })
    content = textParts.join('\n').trim()
  }

  const createdAt = (message as { createdAt?: Date }).createdAt ?? new Date()

  const metadata = JSON.stringify({
    parts: message.parts,
    createdAt,
  })

  return {
    role: message.role,
    content,
    metadata,
  }
}

/**
 * Deserialize BackendAiMessageResponse thành AgentUIMessage để nạp vào useChat.
 */
export function deserializeAgentMessage(res: BackendAiMessageResponse): AgentUIMessage {
  let parts: AgentUIMessage['parts'] = []
  let imageUrl: string | undefined
  if (res.metadata) {
    try {
      const parsed = JSON.parse(res.metadata) as {
        parts?: AgentUIMessage['parts']
        imageUrl?: unknown
      }
      if (Array.isArray(parsed.parts) && parsed.parts.length > 0) {
        parts = parsed.parts
      }
      if (typeof parsed.imageUrl === 'string' && parsed.imageUrl !== '') {
        imageUrl = parsed.imageUrl
      }
    } catch {
      // Bỏ qua lỗi JSON hỏng, fallback về text part
    }
  }

  if (parts.length === 0) {
    parts = [{ type: 'text', text: res.content ?? '' }]
  }

  let role: AgentUIMessage['role'] = 'assistant'
  if (res.role === 'assistant' || res.role === 'system' || res.role === 'user') {
    role = res.role
  }

  let createdAt = new Date()
  if (res.sentAt) {
    createdAt = new Date(res.sentAt)
  }

  if (imageUrl !== undefined) {
    return {
      id: res.id,
      role,
      parts,
      createdAt,
      metadata: { imageUrl },
    } as unknown as AgentUIMessage
  }

  return {
    id: res.id,
    role,
    parts,
    createdAt,
  } as AgentUIMessage
}
