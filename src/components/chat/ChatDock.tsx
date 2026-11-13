import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'

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
import {
  ArrowLeft,
  ArrowsOut,
  ChatCircleDots,
  Image as ImageIcon,
  PaperPlaneRight,
  ShoppingBagOpen,
  Sparkle,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'motion/react'

import UserAvatar from '@/components/UserAvatar'
import { useAllShopProducts } from '@/hooks/useAllShopProducts'
import { useChatMessagesRealtime, useConversationListRealtime } from '@/hooks/useChatRealtime'
import { usePinToBottom } from '@/hooks/usePinToBottom'
import { useSessionQuery } from '@/hooks/useSession'
import { apiErrorText, imageUrl, takeData } from '@/lib/api/apiAdapters'
import { uploadImage } from '@/lib/api/uploadImage'
import { formatDateTime } from '@/lib/format'

import {
  bubbleClass,
  CHAT_CANVAS_CLASS,
  CHAT_INPUT_CLASS,
  CHAT_SEND_BUTTON_CLASS,
  messageRowClass,
} from './bubble'
import ChatImageBubble from './ChatImageBubble'
import ChatProductCard from './ChatProductCard'
import ChatProductPickerModal from './ChatProductPickerModal'
import { extractProductSlugs, formatChatPreview, stripProductLinks } from './messageParser'

import type { ChatSurfaceVariant } from './bubble'
import type { AgentConfig, AgentUIMessage } from '@/lib/ai/agent'
import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { ChatMessageResponse } from '@generated/model/chatMessageResponse'
import type { ProductResponse } from '@generated/model/productResponse'
import type { ChatTransport } from 'ai'

// Tab trợ lý AI nặng (chunk ai-vendor ~430KB) nên lazy-load lần đầu mở tab.
const AgentTab = lazy(() => import('./AgentTab'))

export type ChatTab = 'agent' | 'messages'

export interface ChatDockProps {
  /** Inject config/transport cho test tab AI; production bỏ trống. */
  config?: AgentConfig
  transport?: ChatTransport<AgentUIMessage>
}

function isProductPath(pathname: string): string {
  const match = pathname.match(/^\/product\/([^/]+)$/)
  if (match === null) {
    return ''
  }
  return match[1] ?? ''
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

export interface ThreadProps {
  conversation: ChatConversationResponse
  onBack?: () => void
  variant?: ChatSurfaceVariant
}

export function ChatDockThread({ conversation, onBack, variant = 'dock' }: ThreadProps) {
  const isPageVariant = variant === 'page'
  const conversationId = conversation.id ?? ''
  const messagesQuery = useMessages(conversationId, {
    query: { enabled: conversationId !== '' },
  })
  const queryClient = useQueryClient()

  const [messageInput, setMessageInput] = useState('')
  const [pendingImageKey, setPendingImageKey] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showProductPickerModal, setShowProductPickerModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const shopId = conversation.shopId ?? ''
  const shopProductsQuery = useAllShopProducts(shopId, showProductPickerModal)
  const location = useLocation()
  const isProductPage = location.pathname.startsWith('/product/')
  let currentProductSlug = ''
  if (isProductPage) {
    currentProductSlug = location.pathname.replace('/product/', '').trim()
  }
  const viewedProductQuery = useDetail1(currentProductSlug, {
    query: { enabled: currentProductSlug !== '' },
  })
  let canSendViewedProduct = false
  if (currentProductSlug !== '' && viewedProductQuery.data !== undefined) {
    const viewedProduct = takeData(viewedProductQuery.data)
    if (viewedProduct.shopId !== undefined && viewedProduct.shopId === conversation.shopId) {
      canSendViewedProduct = true
    }
  }

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

  let messages: ChatMessageResponse[] = []
  if (messagesQuery.data !== undefined) {
    messages = takeData(messagesQuery.data)
  }

  const { scrollRef, pinNow, handleScroll, handleLoadCapture } = usePinToBottom({
    resetKey: conversationId,
    contentKey: messages,
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingImage(true)
    void uploadImage(file)
      .then(function (key) {
        setPendingImageKey(key)
      })
      .catch(function (err) {
        console.error('Lỗi tải ảnh:', err)
      })
      .finally(function () {
        setIsUploadingImage(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      })
  }

  function handleSend() {
    const trimmed = messageInput.trim()
    if (trimmed === '' && !pendingImageKey) {
      return
    }
    if (conversationId === '') {
      return
    }
    sendMutation.mutate({
      id: conversationId,
      data: {
        content: trimmed,
        imageKey: pendingImageKey ?? undefined,
      },
    })
    setMessageInput('')
    setPendingImageKey(null)
    pinNow()
  }

  let headerClass =
    'flex shrink-0 items-center gap-3 border-b border-zinc-200/70 bg-white/80 px-4 py-2.5 backdrop-blur-xs dark:border-white/10 dark:bg-white/[0.03]'
  let backButtonClass =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-[#f6f9ff] hover:text-[#17203a] active:scale-95 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
  let avatarSize = 36
  let shopNameClass = 'truncate text-[13px] font-bold text-[#17203a] dark:text-white'
  let scrollPaddingClass = 'px-4 py-4'
  let productCardListWidth = 'max-w-[290px]'
  if (isPageVariant) {
    headerClass =
      'flex shrink-0 items-center gap-3.5 border-b border-zinc-200/70 bg-white/85 px-5 py-3.5 backdrop-blur-xs dark:border-white/10 dark:bg-[#11182a]/85'
    backButtonClass = backButtonClass + ' md:hidden'
    avatarSize = 40
    shopNameClass = 'truncate text-sm font-bold text-[#17203a] dark:text-white'
    scrollPaddingClass = 'px-6 py-5'
    productCardListWidth = 'max-w-[340px]'
  }

  return (
    <>
      <div className={headerClass}>
        {onBack !== undefined && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại danh sách hội thoại"
            className={backButtonClass}
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
        )}
        <UserAvatar name={conversation.shopName ?? 'Shop'} size={avatarSize} />
        <div className="min-w-0">
          <p className={shopNameClass}>{conversation.shopName ?? 'Shop'}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>Shop thường phản hồi trong ít phút</span>
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onLoadCapture={handleLoadCapture}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${CHAT_CANVAS_CLASS} ${scrollPaddingClass}`}
      >
        <div className="mx-auto w-full max-w-3xl space-y-3.5">
          {messages.map(function (msg) {
            const isMine = msg.senderType === 'BUYER'
            let readLabel = ''
            if (isMine && msg.isRead) {
              readLabel = 'Đã xem · '
            }
            const slugs = extractProductSlugs(msg.content)
            const displayContent = stripProductLinks(msg.content)
            return (
              <div key={msg.id} className={messageRowClass(isMine)}>
                {msg.imageKey && (
                  <div className="mb-1.5">
                    <ChatImageBubble imageKey={msg.imageKey} />
                  </div>
                )}
                {displayContent !== '' && (
                  <div className={bubbleClass(isMine, variant)}>{displayContent}</div>
                )}
                {slugs.length > 0 && (
                  <div className={`mt-1.5 w-full space-y-2 ${productCardListWidth}`}>
                    {slugs.map(function (slug) {
                      return <ChatProductCard key={slug} slug={slug} />
                    })}
                  </div>
                )}
                <span className="mt-1 text-[11px] text-zinc-400 tabular-nums">
                  {readLabel}
                  {formatDateTime(msg.sentAt)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-200/70 bg-white/85 px-3.5 py-3 backdrop-blur-xs dark:border-white/10 dark:bg-[#11182a]/85">
        {sendMutation.isError && (
          <p className="mb-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {apiErrorText(
              sendMutation.error,
              'Không gửi được tin nhắn. Chỉ có thể gửi sản phẩm của cửa hàng này.',
            )}
          </p>
        )}
        {canSendViewedProduct && (
          <div className="mb-2.5 flex items-center justify-between gap-2 rounded-2xl border border-sky-200/80 bg-sky-50/90 px-3 py-2 dark:border-sky-400/20 dark:bg-sky-500/10">
            <span className="truncate text-xs font-medium text-sky-900 dark:text-sky-200">
              Gửi sản phẩm đang xem
            </span>
            <button
              type="button"
              onClick={() => {
                sendMutation.mutate({
                  id: conversationId,
                  data: { content: '/product/' + currentProductSlug },
                })
                pinNow()
              }}
              className="btn-primary shrink-0 rounded-full px-3.5 py-1 text-[11px] font-bold active:scale-[0.97]"
            >
              Gửi ngay
            </button>
          </div>
        )}

        {pendingImageKey && (
          <div className="mb-2.5 flex w-fit items-center gap-2 rounded-2xl border border-zinc-200/80 bg-[#f6f9ff] p-1.5 dark:border-white/10 dark:bg-white/10">
            <img
              src={imageUrl(pendingImageKey)}
              alt="Ảnh đính kèm chuẩn bị gửi"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={() => setPendingImageKey(null)}
              aria-label="Xóa ảnh đính kèm"
              className="rounded-full p-1 text-zinc-500 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-white/20"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {isUploadingImage && (
          <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Đang tải ảnh lên…</div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Chọn file ảnh"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            aria-label="Đính kèm hình ảnh"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition hover:border-blue-600 hover:text-blue-700 active:scale-95 disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300 dark:hover:border-sky-400"
          >
            <ImageIcon size={18} />
          </button>
          <button
            type="button"
            onClick={function () {
              setShowProductPickerModal(true)
            }}
            disabled={shopId === ''}
            aria-label="Gửi sản phẩm"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition hover:border-blue-600 hover:text-blue-700 active:scale-95 disabled:opacity-40 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300 dark:hover:border-sky-400"
          >
            <ShoppingBagOpen size={18} />
          </button>
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
            className={CHAT_INPUT_CLASS}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isUploadingImage || (messageInput.trim() === '' && !pendingImageKey)}
            aria-label="Gửi tin nhắn"
            className={CHAT_SEND_BUTTON_CLASS}
          >
            <PaperPlaneRight size={18} weight="fill" />
          </button>
        </div>
      </div>

      {showProductPickerModal && (
        <ChatProductPickerModal
          title="Chọn sản phẩm của shop"
          products={shopProductsQuery.data ?? []}
          isPending={shopProductsQuery.isPending}
          isError={shopProductsQuery.isError}
          onClose={function () {
            setShowProductPickerModal(false)
          }}
          onSelectProduct={function (selected) {
            if (conversationId !== '') {
              sendMutation.mutate({
                id: conversationId,
                data: { content: '/product/' + selected.id },
              })
              setShowProductPickerModal(false)
              pinNow()
            }
          }}
        />
      )}
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

function ChatDockList({
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
    <div className={`flex h-full flex-col ${CHAT_CANVAS_CLASS}`}>
      <p className="border-b border-zinc-200/70 bg-white/70 px-4 py-2.5 text-xs text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
        Trao đổi trực tiếp với các shop bạn quan tâm
      </p>

      {shopIdFromProduct !== '' && (
        <button
          type="button"
          onClick={handleChatWithShop}
          disabled={isStarting}
          className="btn-primary mx-3.5 mt-3 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold active:scale-[0.98] disabled:opacity-60"
        >
          <ChatCircleDots size={16} weight="bold" />
          {shopCtaLabel(existingForShop, shopNameFromProduct)}
        </button>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-2.5">
        {conversations.map(function (conv) {
          const convId = conv.id ?? ''
          return (
            <button
              key={convId}
              type="button"
              onClick={function () {
                onSelect(convId)
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/85 p-3 text-left shadow-2xs transition hover:border-blue-500/30 hover:bg-white dark:bg-white/[0.04] dark:hover:bg-white/10"
            >
              <UserAvatar name={conv.shopName ?? 'Shop'} size={42} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-bold text-[#17203a] dark:text-white">
                    {conv.shopName ?? 'Shop'}
                  </p>
                  <span className="shrink-0 text-[11px] text-zinc-400 tabular-nums">
                    {formatDateTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {formatChatPreview(conv.lastMessageText)}
                </p>
              </div>
              {(conv.unreadCount ?? 0) > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {conversations.length === 0 && shopIdFromProduct === '' && (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-sky-300">
            <ChatCircleDots size={24} weight="duotone" />
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Bạn chưa có hội thoại nào. Mở một trang sản phẩm để bắt đầu chat với shop nhé!
          </p>
        </div>
      )}
    </div>
  )
}

function tabClass(active: boolean): string {
  if (active) {
    return 'btn-primary flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-xs'
  }
  return 'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-zinc-600 transition hover:text-[#17203a] dark:text-zinc-300 dark:hover:text-white'
}

function ChatDockBody(props: ChatDockProps) {
  const queryClient = useQueryClient()
  const location = useLocation()

  const session = useSessionQuery().data
  const isLoggedIn = session !== null && session !== undefined

  const [open, setOpen] = useState(false)
  // Tab chưa chọn lần nào thì suy theo trạng thái đăng nhập lúc mở dock.
  const [chosenTab, setChosenTab] = useState<ChatTab | null>(null)
  const [selectedConvId, setSelectedConvId] = useState('')
  const [startError, setStartError] = useState('')

  let defaultTab: ChatTab = 'agent'
  if (isLoggedIn) {
    defaultTab = 'messages'
  }
  const activeTab: ChatTab = chosenTab ?? defaultTab

  const productId = isProductPath(location.pathname)
  const productQuery = useDetail1(productId, {
    query: { enabled: productId !== '' },
  })

  const conversationsQuery = useMyConversations({
    query: {
      enabled: isLoggedIn,
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
      setChosenTab('messages')
      if (!isLoggedIn || !(e instanceof CustomEvent)) {
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
  }, [conversations, isLoggedIn, markReadMutation, startMutation])

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

  let expandHref = '/messages'
  if (activeTab === 'agent') {
    expandHref = '/messages?tab=ai'
  } else if (selectedConvId !== '') {
    expandHref = '/messages?tab=shop&id=' + encodeURIComponent(selectedConvId)
  } else {
    expandHref = '/messages?tab=shop'
  }

  return (
    <>
      <button
        type="button"
        id="chat-dock-toggle"
        onClick={handleToggle}
        aria-label={chatToggleLabel(open)}
        className="btn-primary fixed right-5 bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl ring-2 ring-white/40 transition hover:scale-105 active:scale-95 dark:ring-white/15"
      >
        {!open && <ChatCircleDots size={24} weight="bold" />}
        {open && <X size={22} weight="bold" />}
        {!open && isLoggedIn && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadBadgeText}
          </span>
        )}
      </button>

      {open && (
        <ChatPanel className="glass fixed inset-x-3 bottom-[88px] z-50 flex h-[min(68dvh,540px)] flex-col overflow-hidden rounded-3xl bg-white/92 shadow-2xl md:inset-x-auto md:right-6 md:w-[560px] dark:bg-[#11182a]/94">
          {/* Header: 2 tab + expand button */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/70 bg-white/80 px-3.5 py-2.5 backdrop-blur-xs dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center gap-1 rounded-full bg-zinc-100/90 p-1 dark:bg-white/10">
              <button
                type="button"
                onClick={function () {
                  setChosenTab('agent')
                }}
                className={tabClass(activeTab === 'agent')}
              >
                <Sparkle size={13} weight="bold" />
                Trợ lý AI
              </button>
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={function () {
                    setChosenTab('messages')
                  }}
                  className={tabClass(activeTab === 'messages')}
                >
                  <ChatCircleDots size={13} weight="bold" />
                  Tin nhắn
                </button>
              )}
            </div>

            <Link
              to={expandHref}
              onClick={function () {
                setOpen(false)
              }}
              title="Mở trang tin nhắn toàn màn hình"
              aria-label="Mở trang tin nhắn toàn màn hình"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 bg-white/80 text-zinc-600 transition hover:border-blue-500/40 hover:text-blue-700 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:text-white"
            >
              <ArrowsOut size={15} weight="bold" />
            </Link>
          </div>

          {activeTab === 'agent' && (
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center text-xs text-zinc-400">
                  Đang tải trợ lý…
                </div>
              }
            >
              <AgentTab config={props.config} transport={props.transport} />
            </Suspense>
          )}

          {activeTab === 'messages' && (
            <>
              {showThread && (
                <ChatDockThread
                  key={selectedConv.id}
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
                <ChatDockList
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
            </>
          )}
        </ChatPanel>
      )}
    </>
  )
}

/** ChatDock — một nút chat duy nhất góc phải: tab "Trợ lý AI" (agent tìm sản phẩm,
 *  dùng được mọi trang) và tab "Tin nhắn" (chat realtime với shop, cần đăng nhập).
 *  Điều kiện ẩn/hiện theo route/role nằm ở ChatDockGate — file này chỉ lo UI. */
export default function ChatDock(props: ChatDockProps) {
  return <ChatDockBody {...props} />
}
