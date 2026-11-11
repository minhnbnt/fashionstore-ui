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
import { ChatDockThread } from '@/components/chat/ChatDock'
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

  const [activeAiConvId, setActiveAiConvId] = useState<string | null>(
    tabParam === 'ai' || tabParam === 'agent' ? idParam : null,
  )
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
    'flex w-full flex-col border-r border-zinc-100 shrink-0 md:w-80 lg:w-96 dark:border-white/10'
  if (hideLeftOnMobile) {
    leftColumnClass =
      'hidden w-full flex-col border-r border-zinc-100 shrink-0 md:flex md:w-80 lg:w-96 dark:border-white/10'
  }

  let rightColumnClass = 'flex flex-1 flex-col min-w-0 h-full overflow-hidden'
  if (!hideLeftOnMobile) {
    rightColumnClass = 'hidden flex-1 flex-col min-w-0 h-full overflow-hidden md:flex'
  }

  let shopTabButtonClass =
    'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-bold transition text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
  if (activeTab === 'shop') {
    shopTabButtonClass =
      'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-bold transition rounded-xl bg-white text-indigo-700 shadow-xs dark:bg-white/10 dark:text-white'
  }

  let aiTabButtonClass =
    'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-bold transition text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
  if (activeTab === 'ai') {
    aiTabButtonClass =
      'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-bold transition rounded-xl bg-white text-sky-600 shadow-xs dark:bg-white/10 dark:text-white'
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-5rem)] max-w-[1400px] flex-col px-4 pt-20 pb-4 md:pt-24 md:pb-6">
      <div className="flex flex-1 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#11182a]">
        {/* Left Column */}
        <div className={leftColumnClass}>
          {/* Top Switcher */}
          <div className="border-b border-zinc-100 p-3 dark:border-white/10">
            <div className="flex rounded-2xl bg-zinc-100/80 p-1 dark:bg-white/5">
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
                    <Storefront size={32} />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Đăng nhập để nhắn tin với người bán
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Đăng nhập để tiếp tục trò chuyện và nhận hỗ trợ từ các shop.
                  </p>
                  <Link
                    to="/login"
                    className="btn-primary mt-4 rounded-full px-5 py-2 text-xs font-semibold"
                  >
                    Đăng nhập ngay
                  </Link>
                </div>
              )}

              {isLoggedIn && (
                <>
                  <div className="border-b border-zinc-100 p-3 dark:border-white/10">
                    <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-white/5">
                      <MagnifyingGlass size={14} className="text-zinc-400" />
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

                  <div className="flex-1 space-y-1 overflow-y-auto p-2">
                    {filteredShopConvs.length === 0 && (
                      <div className="py-12 text-center text-xs text-zinc-400">
                        Chưa có cuộc trò chuyện nào với người bán.
                      </div>
                    )}
                    {filteredShopConvs.map(function (c) {
                      const convId = c.id ?? ''
                      const isSelected = convId === idParam
                      let itemClass =
                        'flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-zinc-100/70 dark:hover:bg-white/5'
                      if (isSelected) {
                        itemClass =
                          'flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition bg-indigo-50/80 dark:bg-white/10'
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
                          <UserAvatar name={c.shopName ?? 'Shop'} size={40} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                                {c.shopName ?? 'Shop'}
                              </span>
                              {c.lastMessageAt && (
                                <span className="text-[10px] text-zinc-400">
                                  {formatDateTime(c.lastMessageAt)}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-1">
                              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                {c.lastMessageText ?? 'Bắt đầu cuộc trò chuyện'}
                              </p>
                              {c.unreadCount !== undefined && c.unreadCount > 0 && (
                                <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                                  {c.unreadCount > 99 ? '99+' : c.unreadCount}
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
                <div className="m-3 rounded-2xl border border-sky-100 bg-sky-50/80 p-3 text-xs dark:border-white/10 dark:bg-white/5">
                  <p className="font-bold text-sky-900 dark:text-sky-200">Chế độ khách</p>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                    Đăng nhập để lưu lại toàn bộ lịch sử tư vấn AI và mở lại trên mọi thiết bị.
                  </p>
                  <Link
                    to="/login"
                    className="mt-2.5 inline-flex items-center gap-1 font-bold text-sky-700 hover:underline dark:text-sky-300"
                  >
                    <SignIn size={14} weight="bold" />
                    <span>Đăng nhập ngay</span>
                  </Link>
                </div>
              )}

              <div className="border-b border-zinc-100 p-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={function () {
                    handleSelectAiConv(null)
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/60 py-2.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 dark:border-white/10 dark:bg-white/10 dark:text-sky-300"
                >
                  <Plus size={14} weight="bold" />
                  <span>Đoạn chat mới</span>
                </button>
              </div>

              {isLoggedIn && (
                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                  {aiConversations.length === 0 && (
                    <div className="py-12 text-center text-xs text-zinc-400">
                      Chưa có đoạn chat nào. Bắt đầu ngay!
                    </div>
                  )}
                  {aiConversations.map(function (c) {
                    const isSelected = c.id === activeAiConvId
                    let itemClass =
                      'group flex w-full items-center justify-between rounded-2xl p-2.5 text-left transition hover:bg-zinc-100/70 dark:hover:bg-white/5'
                    if (isSelected) {
                      itemClass =
                        'group flex w-full items-center justify-between rounded-2xl p-2.5 text-left transition bg-sky-50/80 dark:bg-white/10'
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
                          <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                            {c.title}
                          </p>
                          <p className="mt-0.5 text-[10px] text-zinc-400">
                            {formatDateTime(c.createdAt)}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={function (e) {
                            handleDeleteAiConv(e, c.id)
                          }}
                          aria-label="Xóa đoạn chat"
                          className="rounded-full p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-600 dark:hover:bg-white/20 dark:hover:text-red-400"
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
                <ChatDockThread conversation={selectedShopConv} onBack={handleBackFromShopThread} />
              )}
              {!selectedShopConv && (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
                    <ChatCircleDots size={36} />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                    {isLoggedIn
                      ? 'Chọn một cuộc trò chuyện để bắt đầu nhắn tin'
                      : 'Đăng nhập để xem và gửi tin nhắn cho các shop'}
                  </h3>
                  <p className="mt-1 max-w-xs text-xs text-zinc-400">
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
                onSelectConversation={setActiveAiConvId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
