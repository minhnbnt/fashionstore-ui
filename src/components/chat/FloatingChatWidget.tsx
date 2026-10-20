import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import {
  getMessagesQueryKey,
  getMyConversationsQueryKey,
  useMarkRead,
  useMessages,
  useMyConversations,
  useSendMessage,
  useStartConversation,
} from '@generated/endpoints/chat/chat'
import {
  ChatCircleDots,
  Minus,
  PaperPlaneRight,
  ShoppingBag,
  Storefront,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { useSessionQuery } from '@/hooks/useSession'
import { takeData } from '@/lib/apiAdapters'
import { formatDateTime } from '@/lib/format'

import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { ChatMessageResponse } from '@generated/model/chatMessageResponse'

interface OpenChatEventDetail {
  shopId?: string
  shopName?: string
}

export default function FloatingChatWidget() {
  const queryClient = useQueryClient()
  const { data: session } = useSessionQuery()
  const isLoggedIn = session !== null && session !== undefined

  const [isOpen, setIsOpen] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [selectedShopName, setSelectedShopName] = useState<string>('Người bán')
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  let convInterval = 15000
  if (isOpen) {
    convInterval = 5000
  }

  // 1. Fetch Buyer Conversations
  const convQuery = useMyConversations({
    query: {
      enabled: isLoggedIn,
      refetchInterval: convInterval,
    },
  })

  let conversations: ChatConversationResponse[] = []
  if (convQuery.data !== undefined) {
    try {
      conversations = takeData(convQuery.data)
    } catch {
      conversations = []
    }
  }

  // Calculate total unread count
  let totalUnread = 0
  for (const c of conversations) {
    if (c.unreadCount !== undefined && c.unreadCount > 0) {
      totalUnread += c.unreadCount
    }
  }

  // 2. Fetch Messages for selected conversation
  let safeConvId = ''
  if (selectedConversationId !== null && selectedConversationId !== undefined) {
    safeConvId = selectedConversationId
  }

  let msgInterval: number | false = false
  if (isOpen) {
    msgInterval = 3000
  }

  const messagesQuery = useMessages(safeConvId, {
    query: {
      enabled: safeConvId !== '',
      refetchInterval: msgInterval,
    },
  })

  let messagesList: ChatMessageResponse[] = []
  if (messagesQuery.data !== undefined) {
    try {
      messagesList = takeData(messagesQuery.data)
    } catch {
      messagesList = []
    }
  }

  // 3. Mutations
  const markReadMutation = useMarkRead()

  const startConvMutation = useStartConversation({
    mutation: {
      onSuccess: function (res) {
        try {
          const conv = takeData(res)
          if (conv.id !== undefined) {
            setSelectedConversationId(conv.id)
            if (conv.shopName !== undefined && conv.shopName !== '') {
              setSelectedShopName(conv.shopName)
            }
            void queryClient.invalidateQueries({ queryKey: getMyConversationsQueryKey() })
          }
        } catch {
          // ignore
        }
      },
    },
  })

  const sendMutation = useSendMessage({
    mutation: {
      onSuccess: function () {
        setInputMessage('')
        if (safeConvId !== '') {
          void queryClient.invalidateQueries({
            queryKey: getMessagesQueryKey(safeConvId),
          })
          void queryClient.invalidateQueries({
            queryKey: getMyConversationsQueryKey(),
          })
        }
      },
    },
  })

  // Mark as read when conversation is opened
  useEffect(() => {
    if (safeConvId !== '' && isOpen) {
      markReadMutation.mutate({ id: safeConvId })
    }
  }, [safeConvId, isOpen])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current !== null) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messagesList.length, isOpen])

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (selectedConversationId === null && conversations.length > 0) {
      const first = conversations[0]
      if (first && first.id !== undefined) {
        setSelectedConversationId(first.id)
        if (first.shopName !== undefined && first.shopName !== '') {
          setSelectedShopName(first.shopName)
        }
      }
    }
  }, [conversations, selectedConversationId])

  // Listen to open-shop-chat CustomEvent from anywhere
  useEffect(() => {
    function handleOpenEvent(e: Event) {
      const customEvent = e as CustomEvent<OpenChatEventDetail>
      const detail = customEvent.detail
      setIsOpen(true)
      if (detail.shopName !== undefined && detail.shopName !== '') {
        setSelectedShopName(detail.shopName)
      }
      if (detail.shopId !== undefined && detail.shopId !== '') {
        startConvMutation.mutate({
          data: { shopId: detail.shopId },
        })
      }
    }

    window.addEventListener('open-shop-chat', handleOpenEvent)
    return function () {
      window.removeEventListener('open-shop-chat', handleOpenEvent)
    }
  }, [])

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (safeConvId === '' || inputMessage.trim() === '') {
      return
    }
    sendMutation.mutate({
      id: safeConvId,
      data: { content: inputMessage.trim() },
    })
  }

  let headerShopName = selectedShopName
  const activeChatConv = conversations.find(function (c) {
    return c.id === selectedConversationId
  })
  if (
    activeChatConv !== undefined &&
    activeChatConv.shopName !== undefined &&
    activeChatConv.shopName !== ''
  ) {
    headerShopName = activeChatConv.shopName
  }

  return (
    <div className="fixed right-5 bottom-5 z-50">
      {/* 1. Floating Pill Button (When closed) */}
      {isOpen === false && (
        <button
          type="button"
          id="btn-floating-chat-trigger"
          onClick={function () {
            setIsOpen(true)
          }}
          className="group relative flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-xs font-black text-white shadow-xl shadow-blue-600/30 transition duration-300 hover:scale-105 hover:bg-blue-700 focus:outline-none"
        >
          <ChatCircleDots size={22} weight="fill" />
          <span className="tracking-wide">Chat</span>
          {totalUnread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-blue-600 shadow-xs">
              {totalUnread}
            </span>
          )}
        </button>
      )}

      {/* 2. Expanded Chat Window */}
      {isOpen && (
        <div className="flex h-[480px] w-[350px] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl sm:w-[580px] dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-zinc-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Storefront size={20} weight="fill" />
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold">{headerShopName}</p>
                <p className="text-[10px] text-blue-100">nét Live Chat</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Thu nhỏ"
                onClick={function () {
                  setIsOpen(false)
                }}
                className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <Minus size={16} weight="bold" />
              </button>
              <button
                type="button"
                title="Đóng chat"
                onClick={function () {
                  setIsOpen(false)
                }}
                className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Not logged in State */}
          {isLoggedIn === false && (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                <ChatCircleDots size={28} weight="duotone" />
              </div>
              <h4 className="mt-3 text-sm font-extrabold text-zinc-900 dark:text-white">
                Đăng nhập để trò chuyện
              </h4>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Bạn cần đăng nhập tài khoản nét để gửi tin nhắn và nhận tư vấn từ Người Bán.
              </p>
              <Link
                to="/login"
                className="mt-4 rounded-full bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}

          {/* Logged in State: 2-column layout */}
          {isLoggedIn && (
            <div className="flex flex-1 overflow-hidden">
              {/* Left Column: Conversations List */}
              <div className="hidden w-44 flex-col border-r border-zinc-100 bg-zinc-50/60 sm:flex dark:border-zinc-800 dark:bg-zinc-800/30">
                <div className="border-b border-zinc-100 px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase dark:border-zinc-800">
                  Hội thoại ({conversations.length})
                </div>
                <div className="no-scrollbar flex-1 overflow-y-auto">
                  {conversations.length === 0 && (
                    <div className="p-4 text-center text-[11px] text-zinc-400">
                      Chưa có hội thoại
                    </div>
                  )}
                  {conversations.map(function (c) {
                    const isSelected = c.id === selectedConversationId
                    let itemClass =
                      'w-full text-left p-3 border-b border-zinc-100/60 dark:border-zinc-800/40 transition flex flex-col gap-1'
                    if (isSelected) {
                      itemClass +=
                        ' bg-blue-50/80 text-blue-600 dark:bg-blue-950/40 dark:text-sky-400'
                    }
                    if (isSelected === false) {
                      itemClass += ' hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60'
                    }

                    let convTitle = 'Shop'
                    if (c.shopName !== undefined && c.shopName !== '') {
                      convTitle = c.shopName
                    } else if (c.shopId !== undefined && c.shopId !== '') {
                      convTitle = 'Shop #' + c.shopId.slice(0, 6)
                    }

                    let lastMsg = 'Bắt đầu cuộc trò chuyện'
                    if (
                      c.lastMessageText !== undefined &&
                      c.lastMessageText !== null &&
                      c.lastMessageText !== ''
                    ) {
                      lastMsg = c.lastMessageText
                    }

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={function () {
                          if (c.id !== undefined) {
                            setSelectedConversationId(c.id)
                          }
                          if (c.shopName !== undefined && c.shopName !== '') {
                            setSelectedShopName(c.shopName)
                          }
                        }}
                        className={itemClass}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {convTitle}
                          </span>
                          {c.unreadCount !== undefined && c.unreadCount > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-black text-white">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                          {lastMsg}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right Column: Active Conversation Messages & Input */}
              <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-900">
                {/* Messages Feed */}
                <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
                  {messagesQuery.isLoading && (
                    <div className="py-8 text-center text-xs text-zinc-400">Đang tải tin nhắn…</div>
                  )}

                  {messagesQuery.isLoading === false && messagesList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                      <ShoppingBag size={28} weight="duotone" className="text-zinc-300" />
                      <p className="mt-2 text-xs">Hãy gửi câu hỏi cho shop để được giải đáp</p>
                    </div>
                  )}

                  {messagesList.map(function (msg) {
                    const isBuyer = msg.senderType === 'BUYER'
                    let bubbleClass = 'max-w-[75%] rounded-2xl p-3 text-xs shadow-xs'
                    let alignClass = 'flex flex-col'

                    if (isBuyer) {
                      bubbleClass += ' bg-blue-600 text-white rounded-br-xs self-end font-medium'
                      alignClass += ' items-end'
                    }
                    if (isBuyer === false) {
                      bubbleClass +=
                        ' bg-zinc-100 text-zinc-800 rounded-bl-xs self-start dark:bg-zinc-800 dark:text-zinc-100'
                      alignClass += ' items-start'
                    }

                    return (
                      <div key={msg.id} className={alignClass}>
                        <div className={bubbleClass}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="mt-1 text-[9px] text-zinc-400">
                          {formatDateTime(msg.sentAt)}
                        </span>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 border-t border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <label htmlFor="chatMessageInput" className="sr-only">
                    Nhập tin nhắn
                  </label>
                  <input
                    id="chatMessageInput"
                    type="text"
                    value={inputMessage}
                    onChange={function (e) {
                      setInputMessage(e.target.value)
                    }}
                    placeholder="Nhập nội dung cần tư vấn…"
                    className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-800 placeholder-zinc-400 transition focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    disabled={sendMutation.isPending || inputMessage.trim() === ''}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-40"
                  >
                    <PaperPlaneRight size={15} weight="fill" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
