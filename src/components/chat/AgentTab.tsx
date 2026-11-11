import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useChat } from '@ai-sdk/react'
import {
  CaretDown,
  ChatCircleDots,
  MagnifyingGlass,
  PaperPlaneRight,
  Plus,
  Sparkle,
  Stop,
  Trash,
} from '@phosphor-icons/react'

import Markdown from '@/components/Markdown'
import {
  useAiConversations,
  useAiMessages,
  useCreateAiConversation,
  useDeleteAiConversation,
  useSaveAiMessage,
} from '@/hooks/useAiHistory'
import { usePinToBottom } from '@/hooks/usePinToBottom'
import { useSessionQuery } from '@/hooks/useSession'
import { readAgentConfig } from '@/lib/ai/agent'
import { deserializeAgentMessage, serializeAgentMessage } from '@/lib/ai/agentHistory'
import { createAgentTransport } from '@/lib/ai/chatTransport'
import { EMPTY_FILTERS, parseFilters, toQueryString, withFilter } from '@/lib/searchFilters'

import {
  bubbleClass,
  CHAT_CANVAS_CLASS,
  CHAT_INPUT_CLASS,
  CHAT_SEND_BUTTON_CLASS,
  messageRowClass,
} from './bubble'
import ChatProductCard from './ChatProductCard'
import { extractProductSlugs, stripProductLinks } from './messageParser'

import type { ChatSurfaceVariant } from './bubble'
import type {
  AgentConfig,
  AgentMessageMetadata,
  AgentTools,
  AgentUIMessage,
  SearchToolOutput,
  ShowToolOutput,
} from '@/lib/ai/agent'
import type { SearchFilters } from '@/types/search'
import type { ToolUIPart, ChatTransport } from 'ai'

export interface AgentTabProps {
  /** Inject cho test; bỏ trống thì đọc từ biến env VITE_AI_*. */
  config?: AgentConfig
  /** Inject cho test; bỏ trống thì dựng transport chạy agent trong browser. */
  transport?: ChatTransport<AgentUIMessage>
  /** ID cuộc trò chuyện AI đang chọn (dùng cho trang /messages). */
  activeConversationId?: string | null
  /** Callback khi đổi cuộc trò chuyện. */
  onSelectConversation?: (id: string | null) => void
  /** Biến thể giao diện giữa khung popup nổi (dock) và trang toàn màn hình (page). */
  variant?: ChatSurfaceVariant
}

const AI_QUICK_PROMPTS = [
  'Váy hoa dự tiệc dưới 500k',
  'Áo polo nam màu đen size L',
  'Áo khoác đi làm thanh lịch',
  'Gợi ý set đồ dạo phố cuối tuần',
]

type SearchToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-searchProducts' }>
type ShowToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-showProducts' }>
type ProductDetailToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-getProductDetail' }>

function StatusPill(props: { text: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="inline-flex max-w-[85%] items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/95 px-3 py-1 text-[11px] font-semibold text-zinc-600 shadow-2xs dark:border-white/10 dark:bg-white/10 dark:text-zinc-300">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
        <span>{props.text}</span>
      </span>
    </div>
  )
}

/** Kết quả tool searchProducts: chỉ pill trạng thái/tổng số — agent có thể tìm lại
 *  nhiều lần mà không đổ card vào chat; card do tool showProducts phụ trách. */
function SearchToolBlock(props: { part: SearchToolPart }) {
  const part = props.part
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <StatusPill text="Đang tìm sản phẩm…" />
  }
  if (part.state === 'output-error') {
    return <StatusPill text="Có lỗi khi tìm sản phẩm." />
  }
  if (part.state === 'output-available') {
    const output: SearchToolOutput = part.output
    return <StatusPill text={'Tìm thấy ' + output.total + ' sản phẩm'} />
  }
  return null
}

function productGridClass(variant?: ChatSurfaceVariant): string {
  if (variant === 'page') {
    return 'grid grid-cols-1 gap-2.5 lg:grid-cols-2'
  }
  return 'flex flex-col gap-2.5'
}

/** Kết quả tool showProducts: danh sách card xem chi tiết sản phẩm + nút áp dụng bộ lọc
 *  lấy từ tool searchProducts gần nhất trong cùng tin nhắn (nếu có). */
function ShowProductsBlock(props: {
  part: ShowToolPart
  appliedParams?: Partial<SearchFilters>
  onApplyFilters: (patch: Partial<SearchFilters>) => void
  variant?: ChatSurfaceVariant
}) {
  const part = props.part
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <StatusPill text="Đang chuẩn bị sản phẩm…" />
  }
  if (part.state === 'output-error') {
    return <StatusPill text="Có lỗi khi hiển thị sản phẩm." />
  }
  if (part.state === 'output-available') {
    const output: ShowToolOutput | undefined = part.output
    const items = output?.items
    if (!Array.isArray(items) || items.length === 0) {
      return <StatusPill text="Không hiển thị được sản phẩm." />
    }
    return (
      <div className="w-full space-y-2.5">
        <div className={productGridClass(props.variant)}>
          {items.map(function (item, idx) {
            return <ChatProductCard key={item.id || item.slug || String(idx)} product={item} />
          })}
        </div>
        {props.appliedParams !== undefined && (
          <button
            type="button"
            onClick={function () {
              props.onApplyFilters(props.appliedParams as Partial<SearchFilters>)
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/90 px-4 py-1.5 text-xs font-bold text-blue-700 transition hover:border-blue-500 hover:bg-sky-100 active:scale-[0.98] dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
          >
            <MagnifyingGlass size={13} weight="bold" />
            <span>Lọc trên trang</span>
          </button>
        )}
      </div>
    )
  }
  return null
}

/** Bộ lọc đang có hiệu lực: từ URL nếu đang ở trang /search, ngoài đó rỗng. */
function filtersFromLocation(pathname: string, search: string): SearchFilters {
  if (pathname === '/search' || pathname.startsWith('/search/')) {
    return parseFilters(new URLSearchParams(search))
  }
  return { ...EMPTY_FILTERS }
}

/** Id sản phẩm đang xem nếu đang ở trang chi tiết /product/:id, ngoài đó undefined. */
function productIdFromLocation(pathname: string): string | undefined {
  const match = pathname.match(/^\/product\/([^/]+)$/)
  if (match === null) {
    return undefined
  }
  return match[1]
}

/** Kết quả tool getProductDetail: đang chạy → pill tra cứu, lỗi → pill lỗi,
 *  xong → giữ lại dấu vết đã tra cứu kèm tên sản phẩm (như các tool khác còn pill). */
function ProductDetailToolBlock(props: { part: ProductDetailToolPart }) {
  const part = props.part
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <StatusPill text="Đang tra cứu sản phẩm…" />
  }
  if (part.state === 'output-error') {
    return <StatusPill text="Có lỗi khi tra cứu sản phẩm." />
  }
  if (part.state === 'output-available') {
    const output = part.output
    let name = output.name
    if (name === undefined || name === '') {
      name = part.input.productId
    }
    return <StatusPill text={'Đã tra cứu sản phẩm: ' + name} />
  }
  return null
}

/** Nội dung tab "Trợ lý AI" của ChatDock: chat streaming với agent tìm sản phẩm.
 *  Hoạt động ở mọi trang — bộ lọc đọc từ URL, "Lọc trên trang" navigate về /search. */
export default function AgentTab(props: AgentTabProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [input, setInput] = useState('')

  const sessionQuery = useSessionQuery()
  const isLoggedIn = sessionQuery.data?.user !== undefined

  const conversationsQuery = useAiConversations(isLoggedIn)
  const conversations = conversationsQuery.data ?? []

  const [internalConvId, setInternalConvId] = useState<string | null>(null)
  let activeConvId = internalConvId
  if (props.activeConversationId !== undefined) {
    activeConvId = props.activeConversationId
  }

  function handleSetActiveConvId(id: string | null) {
    if (props.onSelectConversation) {
      props.onSelectConversation(id)
    } else {
      setInternalConvId(id)
    }
  }

  const [showConvDropdown, setShowConvDropdown] = useState(false)

  const messagesQuery = useAiMessages(activeConvId, isLoggedIn)
  const createConvMutation = useCreateAiConversation()
  const deleteConvMutation = useDeleteAiConversation()
  const saveMsgMutation = useSaveAiMessage()
  const savedMsgIdsRef = useRef<Set<string>>(new Set())
  const prevConvIdRef = useRef<string | null>(activeConvId)
  const hydratedConvIdRef = useRef<string | null>(null)
  const liveConvIdsRef = useRef<Set<string>>(new Set())
  const pendingUserSaveRef = useRef<Promise<unknown>>(Promise.resolve())
  const awaitingSaveRef = useRef(false)
  const sessionEpochRef = useRef(0)

  // Cấu hình chốt một lần: ưu tiên prop inject (test), không thì đọc env.
  const config = useMemo(
    function () {
      if (props.config !== undefined) {
        return props.config
      }
      return readAgentConfig()
    },
    [props.config],
  )

  // Transport dựng một lần: agent chạy trong browser, bộ lọc gửi kèm metadata từng tin nhắn.
  const agentTransport = useMemo(
    function () {
      if (props.transport !== undefined) {
        return props.transport
      }
      if (config === null) {
        return undefined
      }
      return createAgentTransport({ config })
    },
    [props.transport, config],
  )

  const filters = useMemo(
    function () {
      return filtersFromLocation(location.pathname, location.search)
    },
    [location.pathname, location.search],
  )

  const chat = useChat<AgentUIMessage>({ transport: agentTransport })
  const busy = chat.status === 'submitted' || chat.status === 'streaming'

  const chatRef = useRef(chat)
  useEffect(() => {
    chatRef.current = chat
  })

  const saveMsgAsyncRef = useRef(saveMsgMutation.mutateAsync)
  useEffect(() => {
    saveMsgAsyncRef.current = saveMsgMutation.mutateAsync
  })

  // Đồng bộ trạng thái khi chuyển đổi cuộc trò chuyện hoặc bấm "Đoạn chat mới"
  useEffect(
    function () {
      if (activeConvId === prevConvIdRef.current) {
        return
      }
      if (activeConvId !== null && liveConvIdsRef.current.has(activeConvId)) {
        prevConvIdRef.current = activeConvId
        return
      }
      prevConvIdRef.current = activeConvId
      sessionEpochRef.current += 1
      awaitingSaveRef.current = false
      hydratedConvIdRef.current = null
      liveConvIdsRef.current.clear()
      savedMsgIdsRef.current.clear()
      void chatRef.current.stop()
      chatRef.current.setMessages([])
    },
    [activeConvId],
  )

  // Hydrate messages khi load cuộc trò chuyện cũ từ DB (không ghi đè phiên chat đang live)
  useEffect(
    function () {
      if (activeConvId === null || messagesQuery.data === undefined) {
        return
      }
      if (liveConvIdsRef.current.has(activeConvId) || hydratedConvIdRef.current === activeConvId) {
        return
      }
      const hydrated = messagesQuery.data.map(deserializeAgentMessage)
      savedMsgIdsRef.current.clear()
      for (const m of hydrated) {
        savedMsgIdsRef.current.add(m.id)
      }
      hydratedConvIdRef.current = activeConvId
      chatRef.current.setMessages(hydrated)
    },
    [messagesQuery.data, activeConvId],
  )

  // Lưu tin nhắn assistant khi hoàn thành streaming, nối tuần tự sau user message
  useEffect(
    function () {
      if (!isLoggedIn || activeConvId === null || !awaitingSaveRef.current) {
        return
      }
      if (chat.status === 'ready' && chat.messages.length > 0) {
        const lastMsg = chat.messages[chat.messages.length - 1]
        if (
          lastMsg !== undefined &&
          lastMsg.role === 'assistant' &&
          !savedMsgIdsRef.current.has(lastMsg.id)
        ) {
          awaitingSaveRef.current = false
          savedMsgIdsRef.current.add(lastMsg.id)
          const targetConvId = activeConvId
          const serialized = serializeAgentMessage(lastMsg)
          pendingUserSaveRef.current = pendingUserSaveRef.current
            .catch(function () {
              // ignore previous error
            })
            .then(async function () {
              await saveMsgAsyncRef.current({
                conversationId: targetConvId,
                role: serialized.role,
                content: serialized.content,
                metadata: serialized.metadata,
              })
            })
            .catch(function (e) {
              console.error('Lỗi lưu phản hồi AI:', e)
            })
        }
      }
    },
    [chat.status, chat.messages, activeConvId, isLoggedIn],
  )

  const { scrollRef, pinNow, handleScroll, handleLoadCapture } = usePinToBottom({
    resetKey: activeConvId,
    contentKey: chat.messages,
  })

  useEffect(
    function closeDropdownOnEscape() {
      if (!showConvDropdown) {
        return
      }
      function handleKey(event: KeyboardEvent) {
        if (event.key === 'Escape') {
          setShowConvDropdown(false)
        }
      }
      window.addEventListener('keydown', handleKey)
      return function () {
        window.removeEventListener('keydown', handleKey)
      }
    },
    [showConvDropdown],
  )

  function submitPromptText(rawText: string) {
    const text = rawText.trim()
    if (text === '') {
      return
    }
    const metadata: AgentMessageMetadata = { filters }
    const productId = productIdFromLocation(location.pathname)
    if (productId !== undefined) {
      metadata.product = { id: productId }
    }
    void chat.sendMessage({ text, metadata })
    pinNow()

    if (isLoggedIn) {
      awaitingSaveRef.current = true
      const currentConvId = activeConvId
      const epochAtSubmit = sessionEpochRef.current
      pendingUserSaveRef.current = pendingUserSaveRef.current
        .catch(function () {
          // ignore previous error
        })
        .then(async function () {
          let targetConvId = currentConvId
          if (targetConvId === null) {
            const newConv = await createConvMutation.mutateAsync(text.slice(0, 40))
            targetConvId = newConv.id
            if (sessionEpochRef.current === epochAtSubmit) {
              liveConvIdsRef.current.add(targetConvId)
              hydratedConvIdRef.current = targetConvId
              handleSetActiveConvId(targetConvId)
            }
          }
          await saveMsgAsyncRef.current({
            conversationId: targetConvId,
            role: 'user',
            content: text,
            metadata: JSON.stringify({ parts: [{ type: 'text', text }] }),
          })
        })
        .catch(function (e) {
          console.error('Lỗi lưu tin nhắn AI:', e)
        })
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (input.trim() === '') {
      return
    }
    submitPromptText(input)
    setInput('')
  }

  function applyFilters(patch: Partial<SearchFilters>) {
    void navigate('/search?' + toQueryString(withFilter(filters, patch)))
  }

  const isPageVariant = props.variant === 'page'

  function renderMessage(message: AgentUIMessage) {
    let userRowContainerClass = messageRowClass(true)
    let assistantRowContainerClass = 'w-full space-y-4'
    if (isPageVariant) {
      userRowContainerClass = messageRowClass(true) + ' mx-auto w-full max-w-3xl'
      assistantRowContainerClass = 'mx-auto w-full max-w-3xl space-y-4'
    }

    // Tin nhắn user: bubble indigo bên phải. Tin nhắn agent: markdown tràn khung, không bubble.
    if (message.role === 'user') {
      return (
        <div key={message.id} className={userRowContainerClass}>
          {message.parts.map(function (part, index) {
            const key = message.id + '-' + String(index)
            if (part.type === 'text') {
              if (part.text === '') {
                return null
              }
              const slugs = extractProductSlugs(part.text)
              const displayText = stripProductLinks(part.text)
              if (displayText === '' && slugs.length === 0) {
                return null
              }
              return (
                <div key={key} className="flex w-full flex-col items-end gap-1.5">
                  {displayText !== '' && (
                    <p className={bubbleClass(true, props.variant)}>{displayText}</p>
                  )}
                  {slugs.length > 0 && (
                    <div className="w-full max-w-[300px] space-y-2">
                      {slugs.map(function (s) {
                        return <ChatProductCard key={s} slug={s} />
                      })}
                    </div>
                  )}
                </div>
              )
            }
            return null
          })}
        </div>
      )
    }
    const shownIds = new Set<string>()
    for (const part of message.parts) {
      if (part.type === 'tool-showProducts' && part.state === 'output-available') {
        const items = part.output?.items
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.id !== undefined && item.id !== '') {
              shownIds.add(item.id)
            }
          }
        }
      }
    }
    // appliedParams của tool searchProducts gần nhất trong cùng tin nhắn,
    // để khối showProducts có dữ liệu cho nút "Lọc trên trang" mà không cần model truyền lại.
    let lastSearchAppliedParams: Partial<SearchFilters> | undefined
    return (
      <div key={message.id} className={assistantRowContainerClass}>
        {message.parts.map(function (part, index) {
          const key = message.id + '-' + String(index)
          if (part.type === 'text') {
            if (part.text === '') {
              return null
            }
            const extractedSlugs = extractProductSlugs(part.text)
            const unshownSlugs: string[] = []
            for (const s of extractedSlugs) {
              if (!shownIds.has(s)) {
                shownIds.add(s)
                unshownSlugs.push(s)
              }
            }
            const displayText = stripProductLinks(part.text)
            if (displayText === '' && unshownSlugs.length === 0) {
              return null
            }
            return (
              <Fragment key={key}>
                {displayText !== '' && <Markdown source={displayText} className="prose-sm" />}
                {unshownSlugs.length > 0 && (
                  <div className={productGridClass(props.variant)}>
                    {unshownSlugs.map(function (s) {
                      return <ChatProductCard key={s} slug={s} />
                    })}
                  </div>
                )}
              </Fragment>
            )
          }
          if (part.type === 'tool-searchProducts') {
            if (part.state === 'output-available') {
              lastSearchAppliedParams = part.output.appliedParams
            }
            return <SearchToolBlock key={key} part={part} />
          }
          if (part.type === 'tool-showProducts') {
            return (
              <ShowProductsBlock
                key={key}
                part={part}
                appliedParams={lastSearchAppliedParams}
                onApplyFilters={applyFilters}
                variant={props.variant}
              />
            )
          }
          if (part.type === 'tool-getProductDetail') {
            return <ProductDetailToolBlock key={key} part={part} />
          }
          return null
        })}
      </div>
    )
  }

  const currentConversation = conversations.find(function (c) {
    return c.id === activeConvId
  })
  let convHeaderTitle = 'Cuộc trò chuyện mới'
  if (currentConversation !== undefined) {
    convHeaderTitle = currentConversation.title
  }

  let scrollerPaddingClass = 'px-4 py-4'
  let emptyBoxClass = 'mx-auto flex max-w-md flex-col items-center py-4 text-center'
  if (isPageVariant) {
    scrollerPaddingClass = 'px-6 py-6'
    emptyBoxClass = 'mx-auto flex max-w-xl flex-col items-center py-10 text-center'
  }

  return (
    <>
      {isPageVariant && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200/70 bg-white/80 px-5 py-3.5 backdrop-blur-xs dark:border-white/10 dark:bg-[#11182a]/80">
          <div className="flex min-w-0 items-center gap-3">
            <span className="btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-sm">
              <Sparkle size={18} weight="bold" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#17203a] dark:text-white">
                {convHeaderTitle}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Trợ lý nét AI · Gợi ý phối đồ & tìm nhanh sản phẩm phù hợp
              </p>
            </div>
          </div>
        </div>
      )}

      {!isPageVariant && isLoggedIn && (
        <div className="relative shrink-0 border-b border-zinc-200/70 bg-white/75 px-3.5 py-2 text-xs backdrop-blur-xs dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={function () {
                setShowConvDropdown(!showConvDropdown)
              }}
              aria-expanded={showConvDropdown}
              className="flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 font-semibold text-[#17203a] transition hover:bg-[#f6f9ff] hover:text-blue-700 dark:text-slate-100 dark:hover:bg-white/10"
            >
              <ChatCircleDots
                size={14}
                weight="bold"
                className="shrink-0 text-indigo-600 dark:text-sky-300"
              />
              <span className="max-w-[190px] truncate">{convHeaderTitle}</span>
              <CaretDown size={12} weight="bold" className="shrink-0 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={function () {
                handleSetActiveConvId(null)
                chat.setMessages([])
                setShowConvDropdown(false)
              }}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-bold text-[#17203a] shadow-2xs transition hover:border-blue-600 hover:text-blue-700 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:text-sky-300"
            >
              <Plus size={12} weight="bold" />
              <span>Đoạn chat mới</span>
            </button>
          </div>

          {showConvDropdown && (
            <div className="absolute top-[calc(100%+6px)] right-3 left-3 z-20 max-h-60 overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-[#0a0f1e]">
              <p className="px-2.5 py-1 text-[10px] font-bold tracking-wide text-zinc-400 uppercase">
                Lịch sử tư vấn AI ({conversations.length})
              </p>
              {conversations.length === 0 && (
                <p className="px-2.5 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Chưa có lịch sử cuộc trò chuyện nào.
                </p>
              )}
              {conversations.map(function (c) {
                const isSelected = c.id === activeConvId
                let itemClass =
                  'flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-[#17203a] transition hover:bg-[#f6f9ff] dark:text-slate-200 dark:hover:bg-white/5'
                if (isSelected) {
                  itemClass =
                    'flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-sky-50/90 dark:bg-white/10 dark:text-sky-300'
                }
                return (
                  <div key={c.id} className={itemClass}>
                    <button
                      type="button"
                      onClick={function () {
                        handleSetActiveConvId(c.id)
                        setShowConvDropdown(false)
                      }}
                      className="min-w-0 flex-1 truncate text-left"
                    >
                      {c.title}
                    </button>
                    <button
                      type="button"
                      onClick={function (e) {
                        e.stopPropagation()
                        deleteConvMutation.mutate(c.id)
                        if (activeConvId === c.id) {
                          handleSetActiveConvId(null)
                          chat.setMessages([])
                        }
                      }}
                      title="Xóa đoạn chat này"
                      aria-label={'Xóa cuộc trò chuyện ' + c.title}
                      className="rounded-full p-1 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-white/10 dark:hover:text-rose-400"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Guest Notice */}
      {!isLoggedIn && !isPageVariant && (
        <div className="mx-3.5 mt-2.5 flex items-center justify-between gap-2 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 dark:border-white/15 dark:bg-white/5 dark:text-amber-200">
          <span>Đăng nhập để lưu lại lịch sử tư vấn AI.</span>
          <Link
            to="/login"
            className="shrink-0 font-bold text-indigo-700 hover:underline dark:text-sky-300"
          >
            Đăng nhập
          </Link>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onLoadCapture={handleLoadCapture}
        className={`min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain ${CHAT_CANVAS_CLASS} ${scrollerPaddingClass}`}
      >
        {chat.messages.length === 0 && config !== null && (
          <div className={emptyBoxClass}>
            <span className="btn-primary mb-3 flex h-11 w-11 items-center justify-center rounded-2xl shadow-md">
              <Sparkle size={20} weight="bold" />
            </span>
            <h3 className="text-sm font-bold text-[#17203a] dark:text-white">
              Trợ lý mua sắm nét AI
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Mô tả dịp mặc, kiểu dáng, tầm giá hoặc kích cỡ bạn đang tìm — chọn nhanh gợi ý bên
              dưới:
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {AI_QUICK_PROMPTS.map(function (promptText) {
                return (
                  <button
                    key={promptText}
                    type="button"
                    disabled={busy}
                    onClick={function () {
                      submitPromptText(promptText)
                    }}
                    className="rounded-full border border-zinc-300 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#17203a] shadow-2xs transition hover:border-blue-600 hover:bg-sky-50/80 hover:text-blue-700 active:scale-[0.97] disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:hover:border-sky-400 dark:hover:text-sky-300"
                  >
                    {promptText}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {config === null && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800 dark:border-white/15 dark:bg-white/5 dark:text-amber-300">
            Chưa cấu hình trợ lý AI. Thêm VITE_AI_* vào .env nhé.
          </p>
        )}
        {chat.messages.map(renderMessage)}
        {chat.status === 'submitted' && <StatusPill text="Đang suy nghĩ…" />}
        {chat.error !== undefined && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {chat.error.message}
          </p>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-zinc-200/70 bg-white/85 px-3.5 py-3 backdrop-blur-xs dark:border-white/10 dark:bg-[#11182a]/85"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={function (e) {
              setInput(e.target.value)
            }}
            placeholder="Mô tả món bạn muốn tìm…"
            disabled={config === null}
            className={CHAT_INPUT_CLASS}
          />
          {busy && (
            <button
              type="button"
              aria-label="Dừng trả lời"
              onClick={function () {
                void chat.stop()
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition hover:border-rose-400 hover:text-rose-600 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300 dark:hover:text-rose-300"
            >
              <Stop size={16} weight="bold" />
            </button>
          )}
          {!busy && (
            <button
              type="submit"
              aria-label="Gửi câu hỏi"
              disabled={input.trim() === '' || config === null}
              className={CHAT_SEND_BUTTON_CLASS}
            >
              <PaperPlaneRight size={18} weight="fill" />
            </button>
          )}
        </div>
      </form>
    </>
  )
}
