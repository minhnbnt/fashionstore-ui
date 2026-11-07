import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useChat } from '@ai-sdk/react'
import { MagnifyingGlass, PaperPlaneRight, Paperclip, Stop, X } from '@phosphor-icons/react'

import Markdown from '@/components/Markdown'
import { readAgentConfig } from '@/lib/ai/agent'
import { createAgentTransport } from '@/lib/ai/chatTransport'
import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/api/apiAdapters'
import { uploadImage, MAX_IMAGE_BYTES } from '@/lib/api/uploadImage'
import { formatVnd } from '@/lib/format'
import { EMPTY_FILTERS, parseFilters, toQueryString, withFilter } from '@/lib/searchFilters'

import { bubbleClass, messageRowClass } from './bubble'

import type {
  AgentConfig,
  AgentImageContext,
  AgentMessageMetadata,
  AgentTools,
  AgentUIMessage,
  SearchToolOutput,
  ShowImageToolOutput,
  ShowToolOutput,
} from '@/lib/ai/agent'
import type { SearchFilters } from '@/types/search'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { FileUIPart, ToolUIPart, ChatTransport } from 'ai'

export interface AgentTabProps {
  /** Inject cho test; bỏ trống thì đọc từ biến env VITE_AI_*. */
  config?: AgentConfig
  /** Inject cho test; bỏ trống thì dựng transport chạy agent trong browser. */
  transport?: ChatTransport<AgentUIMessage>
}

type SearchToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-searchProducts' }>
type ShowToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-showProducts' }>
type ProductDetailToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-getProductDetail' }>
type TryOnToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-tryOn' }>
type ShowImageToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-showImage' }>
type ReadImageToolPart = Extract<ToolUIPart<AgentTools>, { type: 'tool-readImage' }>

/** Ảnh đang soạn kèm tin nhắn: preview local, trạng thái upload, kết quả S3 (nếu xong). */
interface AttachedImage {
  previewUrl: string | null
  status: 'uploading' | 'ready' | 'error'
  mediaType?: string
  filename?: string
  image?: AgentImageContext
  error?: string
}

function StatusPill({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="max-w-[78%] rounded-2xl rounded-tl-xs bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
        {text}
      </span>
    </div>
  )
}

/** Hàng sản phẩm gọn trong khung chat, dẫn tới trang chi tiết sản phẩm. */
function AgentProductRow({ item }: { item: ProductSummaryResponse }) {
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

/** Kết quả tool searchProducts: chỉ pill trạng thái/tổng số — agent có thể tìm lại
 *  nhiều lần mà không đổ card vào chat; card do tool showProducts phụ trách. */
function SearchToolBlock({ part }: { part: SearchToolPart }) {
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

/** Kết quả tool showProducts: danh sách card sản phẩm + nút áp dụng bộ lọc
 *  lấy từ tool searchProducts gần nhất trong cùng tin nhắn (nếu có). */
function ShowProductsBlock(props: {
  part: ShowToolPart
  appliedParams?: Partial<SearchFilters>
  onApplyFilters: (patch: Partial<SearchFilters>) => void
}) {
  const { part, appliedParams, onApplyFilters } = props
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
            return <AgentProductRow key={item.id} item={item} />
          })}
        </div>
        {appliedParams !== undefined && (
          <button
            type="button"
            onClick={function () {
              onApplyFilters(appliedParams as Partial<SearchFilters>)
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
function ProductDetailToolBlock({ part }: { part: ProductDetailToolPart }) {
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

/** Kết quả tool tryOn: đang chạy → pill chờ (Space có thể mất phút), lỗi → pill lỗi,
 *  xong → pill xác nhận đã tạo; ảnh kết quả do tool showImage hiển thị riêng. */
function TryOnToolBlock({ part }: { part: TryOnToolPart }) {
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <StatusPill text="Đang thử đồ, chờ chút nhé…" />
  }
  if (part.state === 'output-error') {
    return <StatusPill text="Có lỗi khi tạo ảnh thử đồ." />
  }
  if (part.state === 'output-available') {
    return <StatusPill text="Đã tạo ảnh thử đồ." />
  }
  return null
}

/** Kết quả tool showImage: hiện ảnh từ link tool trả về — block trung tính,
 *  không biết ảnh từ đâu, mai sau tool khác có link đều dùng được. */
function ShowImageBlock({ part }: { part: ShowImageToolPart }) {
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <StatusPill text="Đang tải ảnh…" />
  }
  if (part.state === 'output-error') {
    return <StatusPill text="Có lỗi khi hiển thị ảnh." />
  }
  if (part.state === 'output-available') {
    const output: ShowImageToolOutput = part.output
    return (
      <img
        src={output.url}
        alt="Ảnh trợ lý gửi"
        className="max-w-[78%] rounded-2xl rounded-tl-xs object-cover"
      />
    )
  }
  return null
}

/** Kết quả tool readImage: ảnh chỉ để agent xem, khách không thấy gì —
 *  chỉ hiện pill chờ/lỗi để khách biết agent đang làm gì. */
function ReadImageBlock({ part }: { part: ReadImageToolPart }) {
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <StatusPill text="Đang xem ảnh…" />
  }
  if (part.state === 'output-error') {
    return <StatusPill text="Có lỗi khi đọc ảnh." />
  }
  return null
}

/** Nội dung tab "Trợ lý AI" của ChatDock: chat streaming với agent tìm sản phẩm.
 *  Hoạt động ở mọi trang — bộ lọc đọc từ URL, "Lọc trên trang" navigate về /search. */
export default function AgentTab(props: AgentTabProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [attached, setAttached] = useState<AttachedImage | null>(null)

  // Seq chống race: gỡ ảnh/đổi ảnh thì tăng, kết quả upload cũ về sau sẽ bị bỏ qua.
  const attachSeqRef = useRef(0)

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

  /** Xóa ảnh đang soạn (nếu có) và thu hồi preview URL; tăng seq để hủy kết quả upload đang treo. */
  function clearAttached() {
    attachSeqRef.current += 1
    setAttached(function (current) {
      if (current?.previewUrl !== null && current?.previewUrl !== undefined) {
        window.URL.revokeObjectURL(current.previewUrl)
      }
      return null
    })
  }

  /** Chọn file từ ô đính kèm: validate → upload S3 ngay → chờ kết quả để cho phép gửi. */
  function handleAttach(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) {
      return
    }
    if (file.type.startsWith('image/') === false) {
      setAttached({ previewUrl: null, status: 'error', error: 'Chỉ nhận file ảnh.' })
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setAttached({ previewUrl: null, status: 'error', error: 'Ảnh tối đa 5 MB.' })
      return
    }
    clearAttached()
    const seq = attachSeqRef.current
    const previewUrl = window.URL.createObjectURL(file)
    setAttached({ previewUrl, status: 'uploading', mediaType: file.type, filename: file.name })
    uploadImage(file)
      .then(function (key) {
        if (attachSeqRef.current !== seq) {
          return
        }
        setAttached({
          previewUrl,
          status: 'ready',
          mediaType: file.type,
          filename: file.name,
          image: { key, url: imageUrl(key) },
        })
      })
      .catch(function () {
        if (attachSeqRef.current !== seq) {
          return
        }
        setAttached({ previewUrl, status: 'error', error: 'Không gửi được ảnh, thử ảnh khác nhé.' })
      })
  }

  /** Ảnh đã upload xong thì mới tính là đính kèm hợp lệ cho tin nhắn. */
  function readyImageContext(): AgentImageContext | undefined {
    if (attached === null || attached.status !== 'ready' || attached.image === undefined) {
      return undefined
    }
    return attached.image
  }

  function sendDisabled(): boolean {
    if (config === null || busy) {
      return true
    }
    if (attached !== null) {
      return attached.image === undefined
    }
    return input.trim() === ''
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    const image = readyImageContext()
    if (text === '' && image === undefined) {
      return
    }
    const metadata: AgentMessageMetadata = { filters }
    const productId = productIdFromLocation(location.pathname)
    if (productId !== undefined) {
      metadata.product = { id: productId }
    }
    if (image !== undefined && attached !== null) {
      metadata.image = image
      const file: FileUIPart = {
        type: 'file',
        mediaType: attached.mediaType ?? 'image/png',
        filename: attached.filename,
        url: image.url,
      }
      void chat.sendMessage({ text, metadata, files: [file] })
    } else {
      void chat.sendMessage({ text, metadata })
    }
    setInput('')
    clearAttached()
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
            if (part.type === 'file') {
              return (
                <img
                  key={key}
                  src={part.url}
                  alt="Ảnh bạn đã gửi"
                  className="max-w-[78%] rounded-2xl rounded-tr-xs object-cover"
                />
              )
            }
            return null
          })}
        </div>
      )
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
            return <Markdown key={key} source={part.text} className="prose-sm" />
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
          if (part.type === 'tool-tryOn') {
            return <TryOnToolBlock key={key} part={part} />
          }
          if (part.type === 'tool-showImage') {
            return <ShowImageBlock key={key} part={part} />
          }
          if (part.type === 'tool-readImage') {
            return <ReadImageBlock key={key} part={part} />
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
        {attached !== null && (
          <div className="mb-2 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-white/10 dark:bg-white/5">
            {attached.previewUrl !== null && (
              <img
                src={attached.previewUrl}
                alt="Ảnh sẽ gửi kèm"
                className="h-12 w-10 shrink-0 rounded-lg object-cover"
              />
            )}
            <span className="min-w-0 flex-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {attached.status === 'uploading' && <span>Đang tải ảnh lên…</span>}
              {attached.status === 'ready' && (
                <span className="block truncate">{attached.filename}</span>
              )}
              {attached.status === 'error' && (
                <span className="text-red-600 dark:text-red-400">{attached.error}</span>
              )}
            </span>
            <button
              type="button"
              aria-label="Gỡ ảnh"
              onClick={clearAttached}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10">
            <Paperclip size={16} weight="bold" />
            <input
              type="file"
              accept="image/*"
              aria-label="Đính kèm ảnh"
              disabled={config === null}
              onChange={handleAttach}
              className="sr-only"
            />
          </label>
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
              disabled={sendDisabled()}
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
