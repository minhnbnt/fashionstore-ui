import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useMarkRead, useMyConversations } from '@generated/endpoints/chat/chat'
import {
  ChatCircleDots,
  MagnifyingGlass,
  Plus,
  SignIn,
  Sparkle,
  Storefront,
  Trash,
} from '@phosphor-icons/react'

import AgentTab from '@/components/chat/AgentTab'
import { CHAT_CANVAS_CLASS, CHAT_SEARCH_PILL_CLASS } from '@/components/chat/bubble'
import { ChatDockThread } from '@/components/chat/ChatDock'
import { formatChatPreview } from '@/components/chat/messageParser'
import UserAvatar from '@/components/UserAvatar'
import { useAiConversations, useDeleteAiConversation } from '@/hooks/useAiHistory'
import { useSessionQuery } from '@/hooks/useSession'
import { takeData } from '@/lib/api/apiAdapters'
import { formatDateTime } from '@/lib/format'

import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'

export type MessagesTab = 'shop' | 'ai'

export default function Messages() {
  const { data: session } = useSessionQuery()
  const isLoggedIn = session !== null && session !== undefined

  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const idParam = searchParams.get('id')

  let activeTab: MessagesTab = 'shop'
  if (tabParam === 'ai' || tabParam === 'agent') {
    activeTab = 'ai'
  } else if (tabParam === 'shop' || tabParam === 'messages') {
    activeTab = 'shop'
  } else if (!isLoggedIn) {
    activeTab = 'ai'
  }

  let initialAiConvId: string | null = null
  if (tabParam === 'ai' || tabParam === 'agent') {
    initialAiConvId = idParam
  }
  const [activeAiConvId, setActiveAiConvId] = useState<string | null>(initialAiConvId)
  const [shopSearch, setShopSearch] = useState('')

  // Queries
  const myConvsQuery = useMyConversations({
    query: {
      enabled: isLoggedIn,
    },
  })
  const aiConvsQuery = useAiConversations(isLoggedIn)
  const deleteAiConv = useDeleteAiConversation()
  const markReadMutation = useMarkRead()

  const conversations: ChatConversationResponse[] = useMemo(() => {
    if (myConvsQuery.data !== undefined) {
      const list = takeData(myConvsQuery.data)
      if (Array.isArray(list)) {
        return list
      }
    }
    return []
  }, [myConvsQuery.data])

  const aiConversations = aiConvsQuery.data ?? []

  const filteredShopConvs = useMemo(() => {
    const q = shopSearch.trim().toLowerCase()
    if (q === '') {
      return conversations
    }
    return conversations.filter(function (c) {
      return (c.shopName ?? '').toLowerCase().includes(q)
    })
  }, [conversations, shopSearch])

  const selectedShopConv = conversations.find(function (c) {
    return c.id === idParam
  })

  function handleTabChange(tab: MessagesTab) {
    setSearchParams(function (prev) {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      next.delete('id')
      return next
    })
  }

  function handleSelectShopConv(id: string) {
    markReadMutation.mutate({ id })
    setSearchParams(function (prev) {
      const next = new URLSearchParams(prev)
      next.set('tab', 'shop')
      next.set('id', id)
      return next
    })
  }

  function handleBackFromShopThread() {
    setSearchParams(function (prev) {
      const next = new URLSearchParams(prev)
      next.set('tab', 'shop')
      next.delete('id')
      return next
    })
  }

  function handleSelectAiConv(id: string | null) {
    setActiveAiConvId(id)
    setSearchParams(function (prev) {
      const next = new URLSearchParams(prev)
      next.set('tab', 'ai')
      if (id !== null && id !== '') {
        next.set('id', id)
      } else {
        next.delete('id')
      }
      return next
    })
  }

  function handleDeleteAiConv(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    deleteAiConv.mutate(id)
    if (activeAiConvId === id) {
      handleSelectAiConv(null)
    }
  }

  const hideLeftOnMobile =
    (activeTab === 'shop' && selectedShopConv !== undefined) ||
    (activeTab === 'ai' && activeAiConvId !== null)

  let leftColumnClass =
    'flex w-full shrink-0 flex-col border-r border-zinc-200/70 bg-white/60 md:w-80 lg:w-96 dark:border-white/10 dark:bg-white/[0.02]'
  if (hideLeftOnMobile) {
    leftColumnClass =
      'hidden w-full shrink-0 flex-col border-r border-zinc-200/70 bg-white/60 md:flex md:w-80 lg:w-96 dark:border-white/10 dark:bg-white/[0.02]'
  }

  let rightColumnClass = 'flex h-full min-w-0 flex-1 flex-col overflow-hidden'
  if (!hideLeftOnMobile) {
    rightColumnClass = 'hidden h-full min-w-0 flex-1 flex-col overflow-hidden md:flex'
  }

  let shopTabButtonClass =
    'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold text-zinc-600 transition hover:text-[#17203a] dark:text-zinc-300 dark:hover:text-white'
  if (activeTab === 'shop') {
    shopTabButtonClass =
      'btn-primary flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold shadow-xs'
  }

  let aiTabButtonClass =
    'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold text-zinc-600 transition hover:text-[#17203a] dark:text-zinc-300 dark:hover:text-white'
  if (activeTab === 'ai') {
    aiTabButtonClass =
      'btn-primary flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold shadow-xs'
  }

  let emptyShopTitle = 'Đăng nhập để xem và gửi tin nhắn cho các shop'
  if (isLoggedIn) {
    emptyShopTitle = 'Chọn một cuộc trò chuyện để bắt đầu nhắn tin'
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[1400px] flex-col px-4 pt-20 pb-4 md:pt-24 md:pb-6">
      <div className="glass flex flex-1 overflow-hidden rounded-3xl bg-white/88 shadow-xl dark:bg-[#11182a]/92">
        {/* Left Column */}
        <div className={leftColumnClass}>
          {/* Top Switcher */}
          <div className="border-b border-zinc-200/70 p-3.5 dark:border-white/10">
            <div className="flex rounded-full bg-zinc-100/90 p-1 dark:bg-white/5">
              <button
                type="button"
                onClick={function () {
                  handleTabChange('shop')
                }}
                className={shopTabButtonClass}
              >
                <ChatCircleDots size={16} weight="bold" />
                <span>Người bán (Shop)</span>
              </button>
              <button
                type="button"
                onClick={function () {
                  handleTabChange('ai')
                }}
                className={aiTabButtonClass}
              >
                <Sparkle size={16} weight="bold" />
                <span>Trợ lý nét AI</span>
              </button>
            </div>
          </div>

          {/* Shop Tab List */}
          {activeTab === 'shop' && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {!isLoggedIn && (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-sky-300">
                    <Storefront size={30} weight="duotone" />
                  </div>
                  <h3 className="text-sm font-bold text-[#17203a] dark:text-white">
                    Đăng nhập để nhắn tin với người bán
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Đăng nhập để tiếp tục trò chuyện và nhận hỗ trợ từ các shop.
                  </p>
                  <Link
                    to="/login"
                    className="btn-primary mt-4 rounded-full px-5 py-2 text-xs font-bold active:scale-95"
                  >
                    Đăng nhập ngay
                  </Link>
                </div>
              )}

              {isLoggedIn && (
                <>
                  <div className="border-b border-zinc-200/70 p-3 dark:border-white/10">
                    <div className={CHAT_SEARCH_PILL_CLASS}>
                      <MagnifyingGlass size={14} weight="bold" className="shrink-0 text-zinc-400" />
                      <input
                        type="text"
                        value={shopSearch}
                        onChange={function (e) {
                          setShopSearch(e.target.value)
                        }}
                        placeholder="Tìm kiếm shop..."
                        className="w-full bg-transparent outline-none placeholder:text-zinc-400 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2.5">
                    {filteredShopConvs.length === 0 && (
                      <div className="py-12 text-center text-xs text-zinc-400">
                        Chưa có cuộc trò chuyện nào với người bán.
                      </div>
                    )}
                    {filteredShopConvs.map(function (c) {
                      const convId = c.id ?? ''
                      const isSelected = convId === idParam
                      let itemClass =
                        'flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-[#f6f9ff] dark:hover:bg-white/5'
                      if (isSelected) {
                        itemClass =
                          'flex w-full items-center gap-3 rounded-2xl bg-indigo-50/90 p-3 text-left ring-1 ring-indigo-200/80 transition dark:bg-white/10 dark:ring-white/15'
                      }

                      let unreadText = ''
                      if (c.unreadCount !== undefined && c.unreadCount > 0) {
                        unreadText = String(c.unreadCount)
                        if (c.unreadCount > 99) {
                          unreadText = '99+'
                        }
                      }

                      return (
                        <button
                          key={convId}
                          type="button"
                          onClick={function () {
                            if (convId !== '') {
                              handleSelectShopConv(convId)
                            }
                          }}
                          className={itemClass}
                        >
                          <UserAvatar name={c.shopName ?? 'Shop'} size={42} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] font-bold text-[#17203a] dark:text-white">
                                {c.shopName ?? 'Shop'}
                              </span>
                              {c.lastMessageAt && (
                                <span className="shrink-0 text-[11px] text-zinc-400 tabular-nums">
                                  {formatDateTime(c.lastMessageAt)}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {formatChatPreview(c.lastMessageText) || 'Bắt đầu cuộc trò chuyện'}
                              </p>
                              {unreadText !== '' && (
                                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                                  {unreadText}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI Tab List */}
          {activeTab === 'ai' && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {!isLoggedIn && (
                <div className="m-3 rounded-2xl border border-sky-200/80 bg-sky-50/90 p-3.5 text-xs dark:border-white/15 dark:bg-white/5">
                  <p className="font-bold text-[#17203a] dark:text-sky-200">Chế độ khách</p>
                  <p className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-300">
                    Đăng nhập để lưu lại toàn bộ lịch sử tư vấn AI và mở lại trên mọi thiết bị.
                  </p>
                  <Link
                    to="/login"
                    className="mt-2.5 inline-flex items-center gap-1.5 font-bold text-indigo-700 hover:underline dark:text-sky-300"
                  >
                    <SignIn size={14} weight="bold" />
                    <span>Đăng nhập ngay</span>
                  </Link>
                </div>
              )}

              <div className="border-b border-zinc-200/70 p-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={function () {
                    handleSelectAiConv(null)
                  }}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold active:scale-[0.98]"
                >
                  <Plus size={14} weight="bold" />
                  <span>Đoạn chat mới</span>
                </button>
              </div>

              {isLoggedIn && (
                <div className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2.5">
                  {aiConversations.length === 0 && (
                    <div className="py-12 text-center text-xs text-zinc-400">
                      Chưa có đoạn chat nào. Bắt đầu ngay!
                    </div>
                  )}
                  {aiConversations.map(function (c) {
                    const isSelected = c.id === activeAiConvId
                    let itemClass =
                      'group flex w-full items-center justify-between gap-2 rounded-2xl p-3 text-left transition hover:bg-[#f6f9ff] dark:hover:bg-white/5'
                    if (isSelected) {
                      itemClass =
                        'group flex w-full items-center justify-between gap-2 rounded-2xl bg-sky-50/90 p-3 text-left ring-1 ring-sky-200/80 transition dark:bg-white/10 dark:ring-white/15'
                    }

                    return (
                      <div key={c.id} className={itemClass}>
                        <button
                          type="button"
                          onClick={function () {
                            handleSelectAiConv(c.id)
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-[13px] font-bold text-[#17203a] dark:text-white">
                            {c.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-400 tabular-nums">
                            {formatDateTime(c.createdAt)}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={function (e) {
                            handleDeleteAiConv(e, c.id)
                          }}
                          aria-label="Xóa đoạn chat"
                          className="rounded-full p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-white/10 dark:hover:text-rose-400"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (Thread / Agent) */}
        <div className={rightColumnClass}>
          {activeTab === 'shop' && (
            <>
              {selectedShopConv && (
                <ChatDockThread
                  key={selectedShopConv.id}
                  conversation={selectedShopConv}
                  onBack={handleBackFromShopThread}
                  variant="page"
                />
              )}
              {!selectedShopConv && (
                <div
                  className={`flex flex-1 flex-col items-center justify-center p-8 text-center ${CHAT_CANVAS_CLASS}`}
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-zinc-200/80 bg-white text-indigo-600 shadow-sm dark:border-white/10 dark:bg-[#11182a] dark:text-sky-300">
                    <ChatCircleDots size={34} weight="duotone" />
                  </div>
                  <h3 className="text-base font-bold text-[#17203a] dark:text-white">
                    {emptyShopTitle}
                  </h3>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Mọi thắc mắc về kích cỡ, chất liệu hoặc vận chuyển sẽ được người bán phản hồi
                    sớm nhất.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'ai' && (
            <div className="flex h-full flex-1 flex-col overflow-hidden">
              <AgentTab
                activeConversationId={activeAiConvId}
                onSelectConversation={handleSelectAiConv}
                variant="page"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
