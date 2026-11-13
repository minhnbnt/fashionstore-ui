import { useRef, useState } from 'react'

import {
  getMessagesQueryKey,
  getSellerConversationsQueryKey,
  useMarkRead,
  useMessages,
  useSendMessage,
  useSellerConversations,
} from '@generated/endpoints/chat/chat'
import { useList5 } from '@generated/endpoints/seller-orders/seller-orders'
import { useListProducts } from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import { getMineQueryKey, useUpdateProfile } from '@generated/endpoints/shops/shops'
import {
  PaperPlaneRight,
  MagnifyingGlass,
  CheckCircle,
  Robot,
  Image as ImageIcon,
  ShoppingBagOpen,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import {
  bubbleClass,
  CHAT_CANVAS_CLASS,
  CHAT_INPUT_CLASS,
  CHAT_SEARCH_PILL_CLASS,
  CHAT_SEND_BUTTON_CLASS,
  messageRowClass,
} from '@/components/chat/bubble'
import ChatImageBubble from '@/components/chat/ChatImageBubble'
import ChatProductCard from '@/components/chat/ChatProductCard'
import ChatProductPickerModal from '@/components/chat/ChatProductPickerModal'
import {
  extractProductSlugs,
  formatChatPreview,
  stripProductLinks,
} from '@/components/chat/messageParser'
import Modal from '@/components/Modal'
import UserAvatar from '@/components/UserAvatar'
import { useChatMessagesRealtime, useConversationListRealtime } from '@/hooks/useChatRealtime'
import { usePinToBottom } from '@/hooks/usePinToBottom'
import { imageUrl, takeData } from '@/lib/api/apiAdapters'
import { uploadImage } from '@/lib/api/uploadImage'
import { chatConversationItem, chatMessageItem } from '@/lib/seller/sellerAdapters'

import type { ChatConversationItem, ChatMessageItem } from '@/types/seller'
import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { SellerProductResponse } from '@generated/model/sellerProductResponse'

interface Props {
  shopId: string
  autoReplyText: string
}

function conversationRowClass(active: boolean): string {
  if (active) {
    return 'bg-indigo-50/90 ring-1 ring-indigo-200/80 dark:bg-white/10 dark:ring-white/15'
  }
  return 'hover:bg-[#f6f9ff] dark:hover:bg-white/5'
}

export default function SellerChatTab({ shopId, autoReplyText }: Props) {
  const queryClient = useQueryClient()
  const [selectedConvId, setSelectedConvId] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [pendingImageKey, setPendingImageKey] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAutoReplyModal, setShowAutoReplyModal] = useState(false)
  const [showProductPickerModal, setShowProductPickerModal] = useState(false)
  const [tempAutoReply, setTempAutoReply] = useState(autoReplyText)
  const [notification, setNotification] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const shopProductsQuery = useListProducts(
    shopId,
    { status: 'ACTIVE' },
    { query: { enabled: shopId !== '' && showProductPickerModal } },
  )

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

  let messagesContentKey = ''
  if (messages.length > 0) {
    const lastMsg = messages[messages.length - 1]
    messagesContentKey = String(messages.length) + ':' + String(lastMsg.id)
  }

  const {
    scrollRef: messagesContainerRef,
    pinNow,
    handleScroll,
    handleLoadCapture,
  } = usePinToBottom({
    resetKey: activeConvId,
    contentKey: messagesContentKey,
  })

  function handleSelectConversation(id: string) {
    setSelectedConvId(id)
    markReadMutation.mutate({ id })
  }

  function handleSendMessage(conversationId: string, content: string, imageKey?: string | null) {
    sendMessageMutation.mutate({
      id: conversationId,
      data: {
        content,
        imageKey: imageKey ?? undefined,
      },
    })
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

  let shopProducts: SellerProductResponse[] = []
  if (shopProductsQuery.data !== undefined) {
    shopProducts = takeData(shopProductsQuery.data)
  }

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
    if (activeConvId === '') {
      return
    }
    handleSendMessage(activeConvId, trimmed, pendingImageKey)
    setMessageInput('')
    setPendingImageKey(null)
    pinNow()
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
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-full border border-zinc-200/80 bg-[#17203a] px-4 py-2.5 text-sm font-bold text-white shadow-xl dark:border-white/15 dark:bg-white dark:text-[#17203a]">
          <CheckCircle size={18} weight="bold" className="text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-black text-[#17203a] dark:text-white">
            Tin nhắn Trực tuyến & CSKH
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Trao đổi trực tiếp với khách hàng và thiết lập tin nhắn phản hồi tự động
          </p>
        </div>
        <button
          type="button"
          onClick={function () {
            setTempAutoReply(autoReplyText)
            setShowAutoReplyModal(true)
          }}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-[#17203a] shadow-2xs transition hover:border-blue-600 hover:text-blue-700 active:scale-[0.98] dark:border-white/15 dark:bg-white/10 dark:text-slate-100"
        >
          <Robot size={16} weight="bold" className="text-indigo-600 dark:text-sky-300" />
          Cài đặt Tin nhắn Tự động (Auto-reply)
        </button>
      </div>

      {/* Cửa sổ Chat 2 cột */}
      <div className="glass grid h-[calc(100vh-210px)] max-h-[750px] min-h-[520px] grid-cols-1 overflow-hidden rounded-3xl bg-white/88 shadow-xl md:grid-cols-3 dark:bg-[#11182a]/92">
        {/* Cột trái: Danh sách hội thoại */}
        <div className="flex h-full min-h-0 flex-col border-r border-zinc-200/70 bg-white/60 md:col-span-1 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="shrink-0 border-b border-zinc-200/70 p-3 dark:border-white/10">
            <div className={CHAT_SEARCH_PILL_CLASS}>
              <MagnifyingGlass size={14} weight="bold" className="shrink-0 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={function (e) {
                  setSearchTerm(e.target.value)
                }}
                placeholder="Tìm khách hàng..."
                className="w-full bg-transparent outline-none placeholder:text-zinc-400 dark:text-white"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2.5">
            {filteredConversations.map(function (conv) {
              const isCurrent = conv.id === activeConvId
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={function () {
                    handleSelectConversation(conv.id)
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${conversationRowClass(isCurrent)}`}
                >
                  <UserAvatar name={conv.buyerName} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-bold text-[#17203a] dark:text-white">
                        {conv.buyerName}
                      </p>
                      <span className="shrink-0 text-[11px] text-zinc-400 tabular-nums">
                        {conv.lastMessageAt}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {formatChatPreview(conv.lastMessage)}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Cột phải: Khung chat chi tiết */}
        <div className="flex h-full min-h-0 flex-col md:col-span-2">
          {selectedConv !== undefined && (
            <>
              {/* Header khung chat */}
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/70 bg-white/85 px-5 py-3.5 backdrop-blur-xs dark:border-white/10 dark:bg-[#11182a]/85">
                <div className="flex items-center gap-3">
                  <UserAvatar name={selectedConv.buyerName} size={38} />
                  <div>
                    <p className="text-sm font-bold text-[#17203a] dark:text-white">
                      {selectedConv.buyerName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
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
                  className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-[11px] font-bold text-[#17203a] transition hover:border-blue-600 hover:text-blue-700 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:text-slate-200"
                >
                  Đánh dấu đã đọc
                </button>
              </div>

              {/* Vùng tin nhắn dạng bong bóng */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                onLoadCapture={handleLoadCapture}
                className={`min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain p-5 ${CHAT_CANVAS_CLASS}`}
              >
                {messages.map(function (msg) {
                  const isMe = msg.senderType === 'SELLER'
                  const slugs = extractProductSlugs(msg.content)
                  const displayContent = stripProductLinks(msg.content)
                  return (
                    <div key={msg.id} className={messageRowClass(isMe)}>
                      {msg.imageKey && (
                        <div className="mb-1.5">
                          <ChatImageBubble imageKey={msg.imageKey} />
                        </div>
                      )}
                      {displayContent !== '' && (
                        <div className={bubbleClass(isMe, 'page')}>{displayContent}</div>
                      )}
                      {slugs.length > 0 && (
                        <div className="mt-1.5 w-full max-w-[340px] space-y-2">
                          {slugs.map(function (slug) {
                            return <ChatProductCard key={slug} slug={slug} />
                          })}
                        </div>
                      )}
                      <span className="mt-1 text-[11px] text-zinc-400 tabular-nums">
                        {msg.sentAt}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Ô nhập tin nhắn */}
              <div className="shrink-0 border-t border-zinc-200/70 bg-white/85 px-4 py-3 backdrop-blur-xs dark:border-white/10 dark:bg-[#11182a]/85">
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
                  <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Đang tải ảnh lên…
                  </div>
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
                    aria-label="Gửi sản phẩm"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition hover:border-blue-600 hover:text-blue-700 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300 dark:hover:border-sky-400"
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
                    placeholder="Nhập tin nhắn trả lời khách hàng (Enter để gửi)..."
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
            </>
          )}

          {selectedConv === undefined && (
            <div
              className={`flex flex-1 items-center justify-center text-xs text-zinc-500 dark:text-zinc-400 ${CHAT_CANVAS_CLASS}`}
            >
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
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
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
              className="mt-1.5 w-full rounded-2xl border border-zinc-300 bg-white/90 p-3 text-xs text-[#17203a] outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setShowAutoReplyModal(false)
              }}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-xs font-bold text-[#17203a] transition hover:bg-zinc-50 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveAutoReplyConfirm}
              className="btn-primary rounded-full px-5 py-2 text-xs font-bold active:scale-95"
            >
              Lưu cấu hình
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Chọn sản phẩm gửi cho khách */}
      {showProductPickerModal && (
        <ChatProductPickerModal
          title="Chọn sản phẩm gửi cho khách"
          products={shopProducts}
          isPending={shopProductsQuery.isPending}
          isError={shopProductsQuery.isError}
          onClose={function () {
            setShowProductPickerModal(false)
          }}
          onSelectProduct={function (selected) {
            if (activeConvId !== '') {
              handleSendMessage(activeConvId, '/product/' + selected.id)
              setShowProductPickerModal(false)
              pinNow()
            }
          }}
        />
      )}
    </div>
  )
}
