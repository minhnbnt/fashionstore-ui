import { useState } from 'react'

import {
  getMessagesQueryKey,
  getSellerConversationsQueryKey,
  useMarkRead,
  useMessages,
  useSendMessage,
  useSellerConversations,
} from '@generated/endpoints/chat/chat'
import { useList5 } from '@generated/endpoints/seller-orders/seller-orders'
import { getMineQueryKey, useUpdateProfile } from '@generated/endpoints/shops/shops'
import { PaperPlaneRight, MagnifyingGlass, CheckCircle, Robot } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import UserAvatar from '@/components/UserAvatar'
import { useChatMessagesRealtime, useConversationListRealtime } from '@/hooks/useChatRealtime'
import { takeData } from '@/lib/apiAdapters'
import { chatConversationItem, chatMessageItem } from '@/lib/sellerAdapters'

import type { ChatConversationItem, ChatMessageItem } from '@/types/seller'
import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'

interface Props {
  shopId: string
  autoReplyText: string
}

function conversationRowClass(active: boolean): string {
  if (active) {
    return 'bg-indigo-50/70 dark:bg-indigo-900/30'
  }
  return 'hover:bg-zinc-50 dark:hover:bg-white/10'
}

function messageRowClass(isMine: boolean): string {
  if (isMine) {
    return 'flex flex-col items-end'
  }
  return 'flex flex-col items-start'
}

function messageBubbleClass(isMine: boolean): string {
  if (isMine) {
    return 'max-w-[70%] rounded-2xl rounded-tr-xs bg-indigo-600 p-3 text-xs leading-relaxed text-white'
  }
  return 'max-w-[70%] rounded-2xl rounded-tl-xs bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-900 dark:bg-white/10 dark:text-zinc-100'
}

export default function SellerChatTab({ shopId, autoReplyText }: Props) {
  const queryClient = useQueryClient()
  const [selectedConvId, setSelectedConvId] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAutoReplyModal, setShowAutoReplyModal] = useState(false)
  const [tempAutoReply, setTempAutoReply] = useState(autoReplyText)
  const [notification, setNotification] = useState<string | null>(null)

  const conversationsQuery = useSellerConversations(
    { shopId },
    { query: { enabled: shopId !== '' } },
  )
  // Danh mục đơn hàng để resolve tên người mua cho từng hội thoại
  const ordersQuery = useList5({ shopId }, { query: { enabled: shopId !== '' } })

  let rawConversations: ChatConversationResponse[] = []
  if (conversationsQuery.data !== undefined) {
    rawConversations = takeData(conversationsQuery.data)
  }
  const buyerNameByBuyerId = new Map<string, string>()
  if (ordersQuery.data !== undefined) {
    for (const o of takeData(ordersQuery.data)) {
      if (o.buyerId !== undefined && o.buyerId !== null && o.buyerId !== '') {
        buyerNameByBuyerId.set(o.buyerId, o.shippingName ?? '')
      }
    }
  }

  // Hội thoại đang chọn: mặc định là hội thoại đầu tiên khi data vừa load
  let activeConvId = selectedConvId
  if (activeConvId === '' && rawConversations.length > 0) {
    activeConvId = rawConversations[0]?.id ?? ''
  }
  const messagesQuery = useMessages(activeConvId, {
    query: { enabled: activeConvId !== '' },
  })

  // Realtime: nhận tin nhắn mới + read receipt qua WebSocket thay vì chờ refetch
  useConversationListRealtime()
  useChatMessagesRealtime(activeConvId, 'SELLER')

  const sendMessageMutation = useSendMessage({
    mutation: {
      onSuccess: function (_data, variables) {
        void queryClient.invalidateQueries({ queryKey: getMessagesQueryKey(variables.id) })
        void queryClient.invalidateQueries({ queryKey: getSellerConversationsQueryKey({ shopId }) })
      },
    },
  })
  const markReadMutation = useMarkRead({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getSellerConversationsQueryKey({ shopId }) })
      },
    },
  })
  const updateProfileMutation = useUpdateProfile({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getMineQueryKey() })
      },
    },
  })

  const conversations: ChatConversationItem[] = rawConversations.map(function (c) {
    return chatConversationItem(c, buyerNameByBuyerId)
  })

  let messages: ChatMessageItem[] = []
  if (messagesQuery.data !== undefined) {
    messages = takeData(messagesQuery.data).map(chatMessageItem)
  }

  function handleSelectConversation(id: string) {
    setSelectedConvId(id)
    markReadMutation.mutate({ id })
  }

  function handleSendMessage(conversationId: string, content: string) {
    sendMessageMutation.mutate({ id: conversationId, data: { content } })
  }

  function handleSaveAutoReply(text: string) {
    updateProfileMutation.mutate({ id: shopId, data: { autoReplyText: text } })
  }

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  const selectedConv = conversations.find(function (c) {
    return c.id === activeConvId
  })

  const filteredConversations = conversations.filter(function (c) {
    if (searchTerm.trim() !== '') {
      return c.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  function handleSend() {
    if (messageInput.trim() === '') {
      return
    }
    if (activeConvId === '') {
      return
    }
    handleSendMessage(activeConvId, messageInput)
    setMessageInput('')
  }

  function handleSaveAutoReplyConfirm() {
    handleSaveAutoReply(tempAutoReply)
    setShowAutoReplyModal(false)
    showToast('Đã lưu cấu hình tin nhắn tự động!')
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification !== null && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-zinc-900">
          <CheckCircle size={18} weight="bold" className="text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            Tin nhắn Trực tuyến & CSKH
          </h2>
          <p className="text-xs text-zinc-500">
            Trao đổi trực tiếp với khách hàng và thiết lập tin nhắn phản hồi tự động
          </p>
        </div>
        <button
          type="button"
          onClick={function () {
            setTempAutoReply(autoReplyText)
            setShowAutoReplyModal(true)
          }}
          className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
        >
          <Robot size={16} weight="bold" className="text-indigo-600" />
          Cài đặt Tin nhắn Tự động (Auto-reply)
        </button>
      </div>

      {/* Cửa sổ Chat 2 cột */}
      <div className="grid h-[620px] grid-cols-1 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/80 shadow-sm md:grid-cols-3 dark:border-white/10 dark:bg-[#11182a]">
        {/* Cột trái: Danh sách hội thoại */}
        <div className="flex flex-col border-r border-zinc-100 md:col-span-1 dark:border-white/10">
          <div className="border-b border-zinc-100 p-3.5 dark:border-white/10">
            <div className="relative">
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={function (e) {
                  setSearchTerm(e.target.value)
                }}
                placeholder="Tìm khách hàng..."
                className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-1.5 pr-3 pl-8 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-white/10">
            {filteredConversations.map(function (conv) {
              const isCurrent = conv.id === activeConvId
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={function () {
                    handleSelectConversation(conv.id)
                  }}
                  className={`flex w-full items-start gap-3 p-3.5 text-left transition ${conversationRowClass(isCurrent)}`}
                >
                  <UserAvatar name={conv.buyerName} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                        {conv.buyerName}
                      </p>
                      <span className="text-[10px] text-zinc-400">{conv.lastMessageAt}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-700 px-1 text-[9px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Cột phải: Khung chat chi tiết */}
        <div className="flex flex-col md:col-span-2">
          {selectedConv !== undefined && (
            <>
              {/* Header khung chat */}
              <div className="flex items-center justify-between border-b border-zinc-100 p-3.5 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={selectedConv.buyerName} size={32} />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      {selectedConv.buyerName}
                    </p>
                    <p className="flex items-center gap-1 text-[10px] text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Trực tuyến
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={function () {
                    handleSelectConversation(selectedConv.id)
                  }}
                  className="rounded-xl border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400"
                >
                  Đánh dấu đã đọc
                </button>
              </div>

              {/* Vùng tin nhắn dạng bong bóng */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map(function (msg) {
                  const isMe = msg.senderType === 'SELLER'
                  return (
                    <div key={msg.id} className={messageRowClass(isMe)}>
                      <div className={messageBubbleClass(isMe)}>{msg.content}</div>
                      <span className="mt-1 text-[9px] text-zinc-400">{msg.sentAt}</span>
                    </div>
                  )
                })}
              </div>

              {/* Ô nhập tin nhắn */}
              <div className="border-t border-zinc-100 p-3 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={function (e) {
                      setMessageInput(e.target.value)
                    }}
                    onKeyDown={function (e) {
                      if (e.key === 'Enter') {
                        handleSend()
                      }
                    }}
                    placeholder="Nhập tin nhắn trả lời khách hàng (Enter để gửi)..."
                    className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className="btn-primary flex h-9 w-9 items-center justify-center rounded-2xl"
                  >
                    <PaperPlaneRight size={16} weight="bold" />
                  </button>
                </div>
              </div>
            </>
          )}

          {selectedConv === undefined && (
            <div className="flex flex-1 items-center justify-center text-xs text-zinc-400">
              Chọn một khách hàng ở cột trái để bắt đầu trò chuyện.
            </div>
          )}
        </div>
      </div>

      {/* Modal Cài đặt Auto-reply */}
      {showAutoReplyModal && (
        <Modal
          title="Cấu hình Tin nhắn Tự động"
          onClose={function () {
            setShowAutoReplyModal(false)
          }}
          widthClass="max-w-md"
        >
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Tin nhắn này sẽ tự động được gửi ngay lập tức khi khách hàng mở cuộc hội thoại đầu tiên
            hoặc nhắn tin ngoài giờ làm việc.
          </p>

          <div className="mt-4">
            <label
              htmlFor="autoReplyContent"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Nội dung tin nhắn tự động:
            </label>
            <textarea
              id="autoReplyContent"
              rows={4}
              value={tempAutoReply}
              onChange={function (e) {
                setTempAutoReply(e.target.value)
              }}
              placeholder="VD: Cảm ơn bạn đã ghé thăm FashionHub! Chúng tôi sẽ phản hồi trong ít phút..."
              className="mt-1.5 w-full rounded-2xl border border-zinc-300 p-3 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setShowAutoReplyModal(false)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveAutoReplyConfirm}
              className="btn-primary rounded-2xl px-5 py-2 text-xs font-bold"
            >
              Lưu cấu hình
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
