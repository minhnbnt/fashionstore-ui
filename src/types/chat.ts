/** Payload sự kiện "đã đọc" nhận qua WebSocket /user/queue/chat/{id}/read. */
export interface ChatReadEventPayload {
  conversationId: string
  readerId: string
  readAt: string
}

/** Payload sự kiện tổng hợp nhận qua WebSocket /user/queue/conversations. */
export interface ConversationEventPayload {
  conversationId: string
  type: 'NEW_MESSAGE'
}
