import { useState } from 'react'

import { PaperPlaneRight, MagnifyingGlass, CheckCircle, X, Robot } from '@phosphor-icons/react'

import type { ChatConversationItem } from '@/types/seller'

interface Props {
  conversations: ChatConversationItem[]
  onSendMessage: (conversationId: string, content: string) => void
  onMarkRead: (conversationId: string) => void
  autoReplyText: string
  onSaveAutoReply: (text: string) => void
}

export default function SellerChatTab({
  conversations,
  onSendMessage,
  onMarkRead,
  autoReplyText,
  onSaveAutoReply,
}: Props) {
  const [selectedConvId, setSelectedConvId] = useState(conversations[0]?.id || '')
  const [messageInput, setMessageInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAutoReplyModal, setShowAutoReplyModal] = useState(false)
  const [tempAutoReply, setTempAutoReply] = useState(autoReplyText)
  const [notification, setNotification] = useState<string | null>(null)

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  const selectedConv = conversations.find(function (c) {
    return c.id === selectedConvId
  })

  const filteredConversations = conversations.filter(function (c) {
    if (searchTerm.trim() !== '') {
      return c.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  function handleSelectConversation(id: string) {
    setSelectedConvId(id)
    onMarkRead(id)
  }

  function handleSend() {
    if (messageInput.trim() === '') {
      return
    }
    onSendMessage(selectedConvId, messageInput)
    setMessageInput('')
  }

  function handleSaveAutoReplyConfirm() {
    onSaveAutoReply(tempAutoReply)
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
          className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <Robot size={16} weight="bold" className="text-orange-600" />
          Cài đặt Tin nhắn Tự động (Auto-reply)
        </button>
      </div>

      {/* Cửa sổ Chat 2 cột Shopee Web Chat */}
      <div className="grid h-[620px] grid-cols-1 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm md:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Cột trái: Danh sách hội thoại */}
        <div className="flex flex-col border-r border-zinc-100 md:col-span-1 dark:border-zinc-800">
          <div className="border-b border-zinc-100 p-3.5 dark:border-zinc-800">
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
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-1.5 pr-3 pl-8 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1 divide-y divide-zinc-50 overflow-y-auto dark:divide-zinc-800/40">
            {filteredConversations.map(function (conv) {
              const isCurrent = conv.id === selectedConvId
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={function () {
                    handleSelectConversation(conv.id)
                  }}
                  className={`flex w-full items-start gap-3 p-3.5 text-left transition ${
                    isCurrent
                      ? 'bg-orange-50/70 dark:bg-orange-950/30'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white uppercase">
                    {conv.buyerName.slice(0, 2)}
                  </div>
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
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-bold text-white">
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
              <div className="flex items-center justify-between border-b border-zinc-100 p-3.5 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white uppercase">
                    {selectedConv.buyerName.slice(0, 2)}
                  </div>
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
                    onMarkRead(selectedConv.id)
                  }}
                  className="rounded-xl border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400"
                >
                  Đánh dấu đã đọc
                </button>
              </div>

              {/* Vùng tin nhắn dạng bong bóng */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {selectedConv.messages.map(function (msg) {
                  const isMe = msg.senderType === 'SELLER'
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isMe
                            ? 'rounded-tr-xs bg-orange-600 text-white'
                            : 'rounded-tl-xs bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="mt-1 text-[9px] text-zinc-400">{msg.sentAt}</span>
                    </div>
                  )
                })}
              </div>

              {/* Ô nhập tin nhắn */}
              <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
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
                    className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm hover:bg-orange-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Robot size={22} weight="bold" className="text-orange-600" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Cấu hình Tin nhắn Tự động
                </h3>
              </div>
              <button
                type="button"
                onClick={function () {
                  setShowAutoReplyModal(false)
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Tin nhắn này sẽ tự động được gửi ngay lập tức khi khách hàng mở cuộc hội thoại đầu
              tiên hoặc nhắn tin ngoài giờ làm việc.
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
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-3 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={function () {
                  setShowAutoReplyModal(false)
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAutoReplyConfirm}
                className="rounded-2xl bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-700"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
