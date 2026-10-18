export interface ChatMessageItem {
  id: string
  senderType: 'BUYER' | 'SELLER'
  content: string
  sentAt: string
}

export interface ChatConversationItem {
  id: string
  buyerName: string
  buyerAvatar: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  messages: ChatMessageItem[]
}
