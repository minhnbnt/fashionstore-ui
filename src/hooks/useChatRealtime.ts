import {
  getMessagesQueryKey,
  getMyConversationsQueryKey,
  getSellerConversationsQueryKey,
  useMarkRead,
} from '@generated/endpoints/chat/chat'
import { useQueryClient } from '@tanstack/react-query'

import { useWebSocket } from './useWebSocket'

import type { ChatReadEventPayload } from '@/types/chat'
import type { MessagesQueryResult } from '@generated/endpoints/chat/chat'
import type { ChatMessageResponse } from '@generated/model/chatMessageResponse'

/**
 * Gộp tin nhắn đẩy realtime vào envelope cache của useMessages (orval bọc
 * { data, status, headers }), bỏ qua tin trùng id (echo của chính mình).
 */
export function appendPushedMessage(
  existing: MessagesQueryResult | undefined,
  pushed: ChatMessageResponse,
): MessagesQueryResult | undefined {
  if (existing === undefined) {
    return existing
  }
  // Chỉ hợp nhất vào cache của fetch thành công; envelope lỗi giữ nguyên.
  if (existing.status !== 200) {
    return existing
  }

  const list = existing.data
  const duplicated = list.some(function (message) {
    return message.id === pushed.id
  })
  if (duplicated) {
    return existing
  }
  return { ...existing, data: [...list, pushed] }
}

/** Đánh dấu tin nhắn của phía mình là đã đọc khi nhận read receipt từ đối tác. */
export function markOwnMessagesRead(
  existing: MessagesQueryResult | undefined,
  mySenderType: 'BUYER' | 'SELLER',
): MessagesQueryResult | undefined {
  if (existing === undefined) {
    return existing
  }
  // Chỉ đổi trạng thái trên cache của fetch thành công; envelope lỗi giữ nguyên.
  if (existing.status !== 200) {
    return existing
  }

  const list = existing.data
  return {
    ...existing,
    data: list.map(function (message) {
      if (message.senderType === mySenderType && message.isRead === false) {
        return { ...message, isRead: true }
      }
      return message
    }),
  }
}

/** Sự kiện tổng hợp của mọi hội thoại: invalidate list buyer + seller để preview/badge sống realtime. */
export function useConversationListRealtime() {
  const queryClient = useQueryClient()

  useWebSocket('/user/queue/conversations', function () {
    void queryClient.invalidateQueries({ queryKey: getMyConversationsQueryKey() })
    void queryClient.invalidateQueries({ queryKey: getSellerConversationsQueryKey() })
  })
}

/**
 * Realtime cho MỘT hội thoại đang mở: tin nhắn mới vào thẳng cache
 * useMessages (không refetch), tin của đối tác được tự đánh dấu đã đọc,
 * read receipt của đối tác đổi trạng thái tin nhắn của mình thành "Đã xem".
 */
export function useChatMessagesRealtime(conversationId: string, mySenderType: 'BUYER' | 'SELLER') {
  const queryClient = useQueryClient()

  const markReadMutation = useMarkRead({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getMyConversationsQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getSellerConversationsQueryKey() })
      },
    },
  })

  let messagesDestination = ''
  if (conversationId !== '') {
    messagesDestination = `/user/queue/chat/${conversationId}`
  }
  let readDestination = ''
  if (conversationId !== '') {
    readDestination = `/user/queue/chat/${conversationId}/read`
  }

  useWebSocket(messagesDestination, function (frame) {
    const pushed = JSON.parse(frame.body) as ChatMessageResponse
    if (pushed.conversationId !== conversationId) {
      return
    }

    queryClient.setQueryData<MessagesQueryResult>(
      getMessagesQueryKey(conversationId),
      function (existing) {
        return appendPushedMessage(existing, pushed)
      },
    )

    if (pushed.senderType !== mySenderType) {
      markReadMutation.mutate({ id: conversationId })
    }
  })

  useWebSocket(readDestination, function (frame) {
    const event = JSON.parse(frame.body) as ChatReadEventPayload
    if (event.conversationId !== conversationId) {
      return
    }

    queryClient.setQueryData<MessagesQueryResult>(
      getMessagesQueryKey(conversationId),
      function (existing) {
        return markOwnMessagesRead(existing, mySenderType)
      },
    )
  })
}
