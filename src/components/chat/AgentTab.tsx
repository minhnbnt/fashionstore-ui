import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useChat } from '@ai-sdk/react'
import { MagnifyingGlass, PaperPlaneRight, Stop } from '@phosphor-icons/react'

import Markdown from '@/components/Markdown'
import { readAgentConfig } from '@/lib/ai/agent'
import { createAgentTransport } from '@/lib/ai/chatTransport'
import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'
import { EMPTY_FILTERS, parseFilters, toQueryString, withFilter } from '@/lib/searchFilters'

import { bubbleClass, messageRowClass } from './bubble'

import type {
  AgentConfig,
  AgentMessageMetadata,
  AgentTools,
  AgentUIMessage,
  SearchToolOutput,
} from '@/lib/ai/agent'
import type { SearchFilters } from '@/types/search'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { ToolUIPart, ChatTransport } from 'ai'

export interface AgentTabProps {
  /** Inject cho test; bỏ trống thì đọc từ biến env VITE_AI_*. */
  config?: AgentConfig
  /** Inject cho test; bỏ trống thì dựng transport chạy agent trong browser. */
  transport?: ChatTransport<AgentUIMessage>
}

type SearchToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-searchProducts' }>

function StatusPill(props: { text: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="max-w-[78%] rounded-2xl rounded-tl-xs bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
        {props.text}
      </span>
    </div>
  )
}

/** Hàng sản phẩm gọn trong khung chat, dẫn tới trang chi tiết sản phẩm. */
function AgentProductRow(props: { item: ProductSummaryResponse }) {
  const item = props.item
  return (
    <Link
      to={'/product/' + (item.id ?? '')}
      className="flex items-center gap-2.5 rounded-2xl border border-sky-100 bg-white/80 p-2 transition hover:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30"
    >
      <img
        src={imageUrl(item.defaultImageKey)}
        alt={item.name ?? ''}
        loading="lazy"
        width={48}
        height={60}
        onError={function (e) {
          if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
            e.currentTarget.src = PLACEHOLDER_IMAGE
          }
        }}
        className="h-[60px] w-12 shrink-0 rounded-xl object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-zinc-900 dark:text-white">
          {item.name}
        </span>
        <span className="mt-0.5 block text-xs font-extrabold text-sky-700 dark:text-sky-300">
          {formatVnd(item.minPrice)}
        </span>
      </span>
    </Link>
  )
}

/** Kết quả tool searchProducts: trạng thái đang tìm, danh sách sản phẩm, nút áp dụng bộ lọc. */
function SearchToolBlock(props: {
  part: SearchToolPart
  onApplyFilters: (patch: Partial<SearchFilters>) => void
}) {
  const part = props.part
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <StatusPill text="Đang tìm sản phẩm…" />
  }
  if (part.state === 'output-error') {
    return <StatusPill text="Có lỗi khi tìm sản phẩm." />
  }
  if (part.state === 'output-available') {
    const output: SearchToolOutput = part.output
    return (
      <div className="w-full rounded-2xl bg-zinc-100 p-3 dark:bg-white/10">
        <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
          Tìm thấy {output.total} sản phẩm
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {output.items.map(function (item) {
            return <AgentProductRow key={item.id} item={item} />
          })}
        </div>
        {output.items.length > 0 && (
          <button
            type="button"
            onClick={function () {
              props.onApplyFilters(output.appliedParams)
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

/** Nội dung tab "Trợ lý AI" của ChatDock: chat streaming với agent tìm sản phẩm.
 *  Hoạt động ở mọi trang — bộ lọc đọc từ URL, "Lọc trên trang" navigate về /search. */
export default function AgentTab(props: AgentTabProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [input, setInput] = useState('')

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (text === '') {
      return
    }
    const metadata: AgentMessageMetadata = { filters }
    void chat.sendMessage({ text, metadata })
    setInput('')
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
              return (
                <p key={key} className={bubbleClass(true)}>
                  {part.text}
                </p>
              )
            }
            return null
          })}
        </div>
      )
    }
    return (
      <div key={message.id} className="w-full space-y-4">
        {message.parts.map(function (part, index) {
          const key = message.id + '-' + String(index)
          if (part.type === 'text') {
            if (part.text === '') {
              return null
            }
            return <Markdown key={key} source={part.text} className="prose-sm" />
          }
          if (part.type === 'tool-searchProducts') {
            return <SearchToolBlock key={key} part={part} onApplyFilters={applyFilters} />
          }
          return null
        })}
      </div>
    )
  }

  return (
    <>
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
