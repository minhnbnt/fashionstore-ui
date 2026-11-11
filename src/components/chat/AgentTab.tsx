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
import { useSessionQuery } from '@/hooks/useSession'
import { readAgentConfig } from '@/lib/ai/agent'
import { deserializeAgentMessage, serializeAgentMessage } from '@/lib/ai/agentHistory'
import { createAgentTransport } from '@/lib/ai/chatTransport'
import { EMPTY_FILTERS, parseFilters, toQueryString, withFilter } from '@/lib/searchFilters'

import { bubbleClass, messageRowClass } from './bubble'
import ChatProductCard from './ChatProductCard'
import { extractProductSlugs, stripProductLinks } from './messageParser'

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
}

type SearchToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-searchProducts' }>
type ShowToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-showProducts' }>
type ProductDetailToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-getProductDetail' }>

function StatusPill(props: { text: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="max-w-[78%] rounded-2xl rounded-tl-xs bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
        {props.text}
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

/** Kết quả tool showProducts: danh sách card xem chi tiết sản phẩm + nút áp dụng bộ lọc
 *  lấy từ tool searchProducts gần nhất trong cùng tin nhắn (nếu có). */
function ShowProductsBlock(props: {
  part: ShowToolPart
  appliedParams?: Partial<SearchFilters>
  onApplyFilters: (patch: Partial<SearchFilters>) => void
}) {
  const part = props.part
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <StatusPill text="Đang chuẩn bị sản phẩm…" />
  }
  if (part.state === 'output-error') {
    return <StatusPill text="Có lỗi khi hiển thị sản phẩm." />
  }
  if (part.state === 'output-available') {
    const output: ShowToolOutput = part.output
    if (output.items.length === 0) {
      return <StatusPill text="Không hiển thị được sản phẩm." />
    }
    return (
      <div className="w-full rounded-2xl bg-zinc-100 p-3 dark:bg-white/10">
        <div className="flex flex-col gap-2">
          {output.items.map(function (item) {
            return <ChatProductCard key={item.id} product={item} />
          })}
        </div>
        {props.appliedParams !== undefined && (
          <button
            type="button"
            onClick={function () {
              props.onApplyFilters(props.appliedParams as Partial<SearchFilters>)
            }}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-extrabold text-sky-800 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
          >
            <MagnifyingGlass size={12} weight="bold" />
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
      if (!isLoggedIn || activeConvId === null) {
        return
      }
      if (chat.status === 'ready' && chat.messages.length > 0) {
        const lastMsg = chat.messages[chat.messages.length - 1]
        if (
          lastMsg !== undefined &&
          lastMsg.role === 'assistant' &&
          !savedMsgIdsRef.current.has(lastMsg.id)
        ) {
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

  const scrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(
    function () {
      const scroller = scrollRef.current
      if (scroller !== null) {
        scroller.scrollTop = scroller.scrollHeight
      }
    },
    [chat.messages],
  )

  function handleSendAction() {
    const text = input.trim()
    if (text === '') {
      return
    }
    const metadata: AgentMessageMetadata = { filters }
    const productId = productIdFromLocation(location.pathname)
    if (productId !== undefined) {
      metadata.product = { id: productId }
    }
    void chat.sendMessage({ text, metadata })
    setInput('')

    if (isLoggedIn) {
      const currentConvId = activeConvId
      pendingUserSaveRef.current = pendingUserSaveRef.current
        .catch(function () {
          // ignore previous error
        })
        .then(async function () {
          let targetConvId = currentConvId
          if (targetConvId === null) {
            const newConv = await createConvMutation.mutateAsync(text.slice(0, 40))
            targetConvId = newConv.id
            liveConvIdsRef.current.add(targetConvId)
            hydratedConvIdRef.current = targetConvId
            handleSetActiveConvId(targetConvId)
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
    handleSendAction()
  }

  function applyFilters(patch: Partial<SearchFilters>) {
    void navigate('/search?' + toQueryString(withFilter(filters, patch)))
  }

  function renderMessage(message: AgentUIMessage) {
    // Tin nhắn user: bubble indigo bên phải. Tin nhắn agent: markdown tràn khung, không bubble.
    if (message.role === 'user') {
      return (
        <div key={message.id} className={messageRowClass(true)}>
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
                <div key={key} className="flex flex-col items-end gap-1.5">
                  {displayText !== '' && <p className={bubbleClass(true)}>{displayText}</p>}
                  {slugs.length > 0 && (
                    <div className="max-w-[280px] space-y-1.5">
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
        for (const item of part.output.items) {
          if (item.id !== undefined && item.id !== '') {
            shownIds.add(item.id)
          }
        }
      }
    }
    // appliedParams của tool searchProducts gần nhất trong cùng tin nhắn,
    // để khối showProducts có dữ liệu cho nút "Lọc trên trang" mà không cần model truyền lại.
    let lastSearchAppliedParams: Partial<SearchFilters> | undefined
    return (
      <div key={message.id} className="w-full space-y-4">
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
                  <div className="flex flex-col gap-2">
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

  return (
    <>
      {isLoggedIn && (
        <div className="relative border-b border-zinc-100 bg-zinc-50/70 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={function () {
                setShowConvDropdown(!showConvDropdown)
              }}
              className="flex min-w-0 items-center gap-1.5 font-semibold text-zinc-700 hover:text-sky-600 dark:text-zinc-200"
            >
              <ChatCircleDots size={14} className="shrink-0 text-sky-600" />
              <span className="max-w-[180px] truncate">{convHeaderTitle}</span>
              <CaretDown size={12} className="shrink-0 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={function () {
                handleSetActiveConvId(null)
                chat.setMessages([])
                setShowConvDropdown(false)
              }}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-bold text-sky-700 shadow-xs hover:bg-sky-50 dark:border-white/10 dark:bg-white/10 dark:text-sky-300"
            >
              <Plus size={12} weight="bold" />
              <span>Đoạn chat mới</span>
            </button>
          </div>

          {showConvDropdown && (
            <div className="absolute top-full right-0 left-0 z-20 max-h-60 overflow-y-auto border-b border-zinc-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-zinc-900">
              <p className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase">
                Lịch sử tư vấn AI ({conversations.length})
              </p>
              {conversations.length === 0 && (
                <p className="px-2 py-2 text-xs text-zinc-500">
                  Chưa có lịch sử cuộc trò chuyện nào.
                </p>
              )}
              {conversations.map(function (c) {
                const isSelected = c.id === activeConvId
                let itemClass =
                  'flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition hover:bg-zinc-100 dark:hover:bg-white/5'
                if (isSelected) {
                  itemClass =
                    'flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition bg-sky-50 font-bold text-sky-700 dark:bg-white/10 dark:text-sky-300'
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
                      className="rounded-lg p-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
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
      {!isLoggedIn && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-white/10 dark:bg-amber-950/30 dark:text-amber-200">
          <span>Đăng nhập để lưu lại lịch sử tư vấn AI.</span>
          <Link to="/login" className="shrink-0 font-bold underline">
            Đăng nhập
          </Link>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {chat.messages.length === 0 && (
          <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Ví dụ: “váy hoa dự tiệc dưới 500k size M” hoặc “áo polo nam màu đen”
          </p>
        )}
        {config === null && (
          <p className="rounded-2xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            Chưa cấu hình trợ lý AI. Thêm VITE_AI_* vào .env nhé.
          </p>
        )}
        {chat.messages.map(renderMessage)}
        {chat.status === 'submitted' && <StatusPill text="Đang suy nghĩ…" />}
        {chat.error !== undefined && (
          <p className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {chat.error.message}
          </p>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-100 p-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={function (e) {
              setInput(e.target.value)
            }}
            placeholder="Mô tả món bạn muốn tìm…"
            disabled={config === null}
            className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs text-zinc-900 transition outline-none focus:border-sky-300 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          {busy && (
            <button
              type="button"
              aria-label="Dừng trả lời"
              onClick={function () {
                void chat.stop()
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              <Stop size={16} weight="bold" />
            </button>
          )}
          {!busy && (
            <button
              type="submit"
              aria-label="Gửi câu hỏi"
              disabled={input.trim() === '' || config === null}
              className="btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
            >
              <PaperPlaneRight size={16} weight="bold" />
            </button>
          )}
        </div>
      </form>
    </>
  )
}
