import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router'

import { useChat } from '@ai-sdk/react'
import { MagnifyingGlass, PaperPlaneRight, Stop, X } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

import { readAgentConfig } from '@/lib/ai/agent'
import { createAgentTransport } from '@/lib/ai/chatTransport'
import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import SearchAgentLauncher from './SearchAgentLauncher'

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

interface SearchAgentWidgetProps {
  filters: SearchFilters
  onApplyFilters: (patch: Partial<SearchFilters>) => void
  /** Inject cho test; bỏ trống thì đọc từ biến env VITE_AI_*. */
  config?: AgentConfig
  /** Inject cho test; bỏ trống thì dựng transport chạy agent trong browser. */
  transport?: ChatTransport<AgentUIMessage>
  /** Mở panel ngay khi mount (dùng khi trang lazy-load widget sau cú bấm nút). */
  autoOpen?: boolean
}

type SearchToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-searchProducts' }>

function toggleLabel(open: boolean): string {
  if (open) {
    return 'Đóng trợ lý tìm kiếm'
  }
  return 'Mở trợ lý tìm kiếm'
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

/** Panel nổi; tôn trọng prefers-reduced-motion thì hiện luôn không animate. */
function AgentPanel(props: { className: string; children: ReactNode }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <div className={props.className}>{props.children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={props.className}
    >
      {props.children}
    </motion.div>
  )
}

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
      <div className="max-w-[86%] rounded-2xl rounded-tl-xs bg-zinc-100 p-3 dark:bg-white/10">
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

export default function SearchAgentWidget(props: SearchAgentWidgetProps) {
  const [open, setOpen] = useState(props.autoOpen === true)
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
    const metadata: AgentMessageMetadata = { filters: props.filters }
    void chat.sendMessage({ text, metadata })
    setInput('')
  }

  function renderMessage(message: AgentUIMessage) {
    return (
      <div key={message.id} className={messageRowClass(message.role === 'user')}>
        {message.parts.map(function (part, index) {
          const key = message.id + '-' + String(index)
          if (part.type === 'text') {
            if (part.text === '') {
              return null
            }
            return (
              <p key={key} className={bubbleClass(message.role === 'user')}>
                {part.text}
              </p>
            )
          }
          if (part.type === 'tool-searchProducts') {
            return <SearchToolBlock key={key} part={part} onApplyFilters={props.onApplyFilters} />
          }
          return null
        })}
      </div>
    )
  }

  return (
    <>
      <SearchAgentLauncher
        label={toggleLabel(open)}
        onClick={function () {
          setOpen(!open)
        }}
      />

      {open && (
        <AgentPanel className="fixed inset-x-3 bottom-[88px] z-50 flex h-[min(68dvh,540px)] flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 shadow-2xl backdrop-blur md:inset-x-auto md:left-5 md:w-[380px] dark:border-white/10 dark:bg-[#11182a]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-sm font-black text-zinc-900 dark:text-white">Trợ lý tìm kiếm</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Mô tả món bạn muốn, mình tìm giúp
              </p>
            </div>
            <button
              type="button"
              aria-label="Đóng trợ lý tìm kiếm"
              onClick={function () {
                setOpen(false)
              }}
              className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
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
          <form
            onSubmit={handleSubmit}
            className="border-t border-zinc-100 p-3 dark:border-white/10"
          >
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
        </AgentPanel>
      )}
    </>
  )
}
