import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'

import {
  getMessagesQueryKey,
  getMyConversationsQueryKey,
  useMarkRead,
  useMessages,
  useMyConversations,
  useSendMessage,
  useStartConversation,
} from '@generated/endpoints/chat/chat'
import { useDetail1 } from '@generated/endpoints/products/products'
import { ArrowLeft, ChatCircleDots, PaperPlaneRight, X } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'motion/react'

import UserAvatar from '@/components/UserAvatar'
import { useChatMessagesRealtime, useConversationListRealtime } from '@/hooks/useChatRealtime'
import { apiErrorText, takeData } from '@/lib/apiAdapters'
import { formatDateTime } from '@/lib/format'

import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { ChatMessageResponse } from '@generated/model/chatMessageResponse'
import type { ProductResponse } from '@generated/model/productResponse'

function isProductPath(pathname: string): string {
  const match = pathname.match(/^\/product\/([^/]+)$/)
  if (match === null) {
    return ''
  }
  return match[1] ?? ''
}

function bubbleClass(isMine: boolean): string {
  if (isMine) {
    return 'max-w-[78%] rounded-2xl rounded-tr-xs bg-indigo-600 p-3 text-xs leading-relaxed text-white'
  }
  return 'max-w-[78%] rounded-2xl rounded-tl-xs bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-900 dark:bg-white/10 dark:text-zinc-100'
}

function messageRowClass(isMine: boolean): string {
  if (isMine) {
    return 'flex flex-col items-end'
  }
  return 'flex flex-col items-start'
}

function chatToggleLabel(open: boolean): string {
  if (open) {
    return 'Đóng khung chat'
  }
  return 'Mở khung chat'
}

interface ChatPanelProps {
  className: string
  children: React.ReactNode
}

/** Khung panel chat nổi; tôn trọng prefers-reduced-motion thì hiện luôn không animate. */
function ChatPanel({ className, children }: ChatPanelProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function shopCtaLabel(
  existingForShop: ChatConversationResponse | undefined,
  shopNameFromProduct: string,
): string {
  if (existingForShop !== undefined) {
    return 'Mở hội thoại với shop'
  }
  return `Chat với ${shopNameFromProduct}`
}

interface ThreadProps {
  conversation: ChatConversationResponse
  onBack: () => void
}

function BuyerChatThread({ conversation, onBack }: ThreadProps) {
  const conversationId = conversation.id ?? ''
  const messagesQuery = useMessages(conversationId, {
    query: { enabled: conversationId !== '' },
  })
  const queryClient = useQueryClient()

  const [messageInput, setMessageInput] = useState('')

  // Realtime: tin nhắn mới + read receipt của shop đẩy thẳng vào cache
  useChatMessagesRealtime(conversationId, 'BUYER')

  const sendMutation = useSendMessage({
    mutation: {
      onSuccess: function (_data, variables) {
        void queryClient.invalidateQueries({ queryKey: getMessagesQueryKey(variables.id) })
        void queryClient.invalidateQueries({ queryKey: getMyConversationsQueryKey() })
      },
    },
  })

  const scrollRef = useRef<HTMLDivElement | null>(null)
  let messages: ChatMessageResponse[] = []
  if (messagesQuery.data !== undefined) {
    messages = takeData(messagesQuery.data)
  }

  useEffect(
    function scrollToBottom() {
      const container = scrollRef.current
      if (container === null) {
        return
      }
      container.scrollTop = container.scrollHeight
    },
    [messages.length],
  )

  function handleSend() {
    if (messageInput.trim() === '') {
      return
    }
    if (conversationId === '') {
      return
    }
    sendMutation.mutate({ id: conversationId, data: { content: messageInput } })
    setMessageInput('')
  }

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-zinc-100 p-3 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại danh sách hội thoại"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
        >
          <ArrowLeft size={16} weight="bold" />
        </button>
        <UserAvatar name={conversation.shopName ?? 'Shop'} size={32} />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
            {conversation.shopName ?? 'Shop'}
          </p>
          <p className="text-[10px] text-zinc-400">Shop thường phản hồi trong ít phút</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map(function (msg) {
          const isMine = msg.senderType === 'BUYER'
          let readLabel = ''
          if (isMine && msg.isRead) {
            readLabel = 'Đã xem · '
          }
          return (
            <div key={msg.id} className={messageRowClass(isMine)}>
              <div className={bubbleClass(isMine)}>{msg.content}</div>
              <span className="mt-1 text-[9px] text-zinc-400">
                {readLabel}
                {formatDateTime(msg.sentAt)}
              </span>
            </div>
          )
        })}
      </div>

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
            placeholder="Nhập tin nhắn cho shop..."
            className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
          />
          <button
            type="button"
            onClick={handleSend}
            aria-label="Gửi tin nhắn"
            className="btn-primary flex h-9 w-9 items-center justify-center rounded-2xl"
          >
            <PaperPlaneRight size={16} weight="bold" />
          </button>
        </div>
      </div>
    </>
  )
}

export interface OpenChatEventDetail {
  shopId?: string
  shopName?: string
  conversationId?: string
}

interface ListProps {
  conversations: ChatConversationResponse[]
  shopIdFromProduct: string
  shopNameFromProduct: string
  onSelect: (conversationId: string) => void
  onStartForShop: (shopId: string) => void
  isStarting: boolean
}

function BuyerChatList({
  conversations,
  shopIdFromProduct,
  shopNameFromProduct,
  onSelect,
  onStartForShop,
  isStarting,
}: ListProps) {
  const existingForShop = conversations.find(function (c) {
    return shopIdFromProduct !== '' && c.shopId === shopIdFromProduct
  })

  function handleChatWithShop() {
    if (existingForShop !== undefined && existingForShop.id !== undefined) {
      onSelect(existingForShop.id)
      return
    }
    if (shopIdFromProduct !== '') {
      onStartForShop(shopIdFromProduct)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-100 p-3.5 dark:border-white/10">
        <p className="text-sm font-extrabold text-zinc-900 dark:text-white">Tin nhắn</p>
        <p className="text-[11px] text-zinc-500">Trao đổi trực tiếp với các shop bạn quan tâm</p>
      </div>

      {shopIdFromProduct !== '' && (
        <button
          type="button"
          onClick={handleChatWithShop}
          disabled={isStarting}
          className="btn-primary m-3 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold disabled:opacity-60"
        >
          <ChatCircleDots size={16} weight="bold" />
          {shopCtaLabel(existingForShop, shopNameFromProduct)}
        </button>
      )}

      <div className="flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-white/10">
        {conversations.map(function (conv) {
          const convId = conv.id ?? ''
          return (
            <button
              key={convId}
              type="button"
              onClick={function () {
                onSelect(convId)
              }}
              className="flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-zinc-50 dark:hover:bg-white/10"
            >
              <UserAvatar name={conv.shopName ?? 'Shop'} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                    {conv.shopName ?? 'Shop'}
                  </p>
                  <span className="text-[10px] text-zinc-400">
                    {formatDateTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {conv.lastMessageText ?? ''}
                </p>
              </div>
              {(conv.unreadCount ?? 0) > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-700 px-1 text-[9px] font-bold text-white">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {conversations.length === 0 && shopIdFromProduct === '' && (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-zinc-400">
          Bạn chưa có hội thoại nào. Mở một trang sản phẩm để bắt đầu chat với shop nhé!
        </div>
      )}
    </div>
  )
}

function BuyerChatWidgetBody() {
  const queryClient = useQueryClient()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [selectedConvId, setSelectedConvId] = useState('')
  const [startError, setStartError] = useState('')

  const productId = isProductPath(location.pathname)
  const productQuery = useDetail1(productId, {
    query: { enabled: productId !== '' },
  })

  const conversationsQuery = useMyConversations({
    query: {
      refetchInterval: 30000,
    },
  })

  useConversationListRealtime()

  const markReadMutation = useMarkRead({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getMyConversationsQueryKey() })
      },
    },
  })

  const startMutation = useStartConversation({
    mutation: {
      onMutate: function () {
        setStartError('')
      },
      onSuccess: function (data) {
        const conversation = takeData(data)
        if (conversation.id !== undefined) {
          setSelectedConvId(conversation.id)
          markReadMutation.mutate({ id: conversation.id })
        }
        void queryClient.invalidateQueries({ queryKey: getMyConversationsQueryKey() })
      },
      onError: function (error) {
        setStartError(apiErrorText(error, 'Không bắt đầu được hội thoại. Vui lòng thử lại.'))
      },
    },
  })

  const conversations: ChatConversationResponse[] = useMemo(
    function () {
      if (conversationsQuery.data !== undefined) {
        return takeData(conversationsQuery.data)
      }
      return []
    },
    [conversationsQuery.data],
  )

  useEffect(() => {
    function handleOpenChat(e: Event) {
      setOpen(true)
      if (!(e instanceof CustomEvent)) {
        return
      }
      const detail = e.detail as OpenChatEventDetail | undefined
      if (detail === undefined || detail === null) {
        return
      }

      const targetConvId = detail.conversationId
      if (targetConvId !== undefined && targetConvId !== '') {
        setSelectedConvId(targetConvId)
        markReadMutation.mutate({ id: targetConvId })
        return
      }

      const targetShopId = detail.shopId
      if (targetShopId !== undefined && targetShopId !== '') {
        if (startMutation.isPending) {
          return
        }
        const existing = conversations.find(function (c) {
          return c.shopId === targetShopId
        })
        if (existing !== undefined && existing.id !== undefined) {
          setSelectedConvId(existing.id)
          markReadMutation.mutate({ id: existing.id })
          return
        }

        startMutation.mutate({ data: { shopId: targetShopId } })
      }
    }
    window.addEventListener('fashionstore:open-chat', handleOpenChat)
    return () => {
      window.removeEventListener('fashionstore:open-chat', handleOpenChat)
    }
  }, [conversations, markReadMutation, startMutation])

  let product: ProductResponse | null = null
  if (productQuery.data !== undefined) {
    product = takeData(productQuery.data)
  }
  let shopIdFromProduct = ''
  let shopNameFromProduct = ''
  if (product !== null) {
    shopIdFromProduct = product.shopId ?? ''
    shopNameFromProduct = product.name ?? 'shop'
  }

  const totalUnread = conversations.reduce(function (sum, conv) {
    return sum + (conv.unreadCount ?? 0)
  }, 0)

  let unreadBadgeText = String(totalUnread)
  if (totalUnread > 99) {
    unreadBadgeText = '99+'
  }

  const selectedConv = conversations.find(function (c) {
    return c.id === selectedConvId
  })

  function handleSelect(conversationId: string) {
    setSelectedConvId(conversationId)
    markReadMutation.mutate({ id: conversationId })
  }

  function handleToggle() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (selectedConvId !== '') {
      markReadMutation.mutate({ id: selectedConvId })
    }
  }

  const showThread = selectedConv !== undefined

  return (
    <>
      <button
        type="button"
        id="buyer-chat-widget-toggle"
        onClick={handleToggle}
        aria-label={chatToggleLabel(open)}
        className="btn-primary fixed right-5 bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl"
      >
        {!open && <ChatCircleDots size={24} weight="bold" />}
        {open && <X size={22} weight="bold" />}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadBadgeText}
          </span>
        )}
      </button>

      {open && (
        <ChatPanel className="fixed inset-x-3 bottom-[88px] z-50 flex h-[min(68dvh,540px)] flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 shadow-2xl backdrop-blur md:inset-x-auto md:right-6 md:w-[380px] dark:border-white/10 dark:bg-[#11182a]">
          {showThread && (
            <BuyerChatThread
              conversation={selectedConv}
              onBack={function () {
                setSelectedConvId('')
              }}
            />
          )}
          {!showThread && startError !== '' && (
            <p className="px-4 pb-2 text-xs font-semibold text-red-600 dark:text-red-400">
              {startError}
            </p>
          )}
          {!showThread && (
            <BuyerChatList
              conversations={conversations}
              shopIdFromProduct={shopIdFromProduct}
              shopNameFromProduct={shopNameFromProduct}
              onSelect={handleSelect}
              onStartForShop={function (targetShopId) {
                startMutation.mutate({ data: { shopId: targetShopId } })
              }}
              isStarting={startMutation.isPending}
            />
          )}
        </ChatPanel>
      )}
    </>
  )
}

/** Floating chat cho buyer: nút tròn góc phải, panel hội thoại + thread realtime.
 *  Điều kiện ẩn/hiện (session/role/route) nằm ở BuyerChatGate — file này chỉ lo UI. */
export default function BuyerChatWidget() {
  return <BuyerChatWidgetBody />
}
