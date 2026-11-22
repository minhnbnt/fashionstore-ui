import { useRef, useState } from 'react'

import {
  Eye,
  ListBullets,
  ListNumbers,
  PencilSimple,
  Quotes,
  Table,
  TextB,
  TextHThree,
  TextHTwo,
  TextItalic,
} from '@phosphor-icons/react'

import Markdown from '@/components/Markdown'
import { cn, FOCUS_RING_CLASS, segmentedItemClass, segmentedTrackClass } from '@/lib/ui/styles'

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

const TOOLBAR_BTN_CLASS = cn(
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition hover:bg-sky-50 hover:text-blue-700 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-sky-300',
  FOCUS_RING_CLASS,
)

export default function RichTextEditor({
  id = 'rich-text-editor',
  value,
  onChange,
  placeholder = 'Nhập mô tả chi tiết sản phẩm bằng định dạng Markdown...',
  rows = 8,
}: Props) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertFormatting(prefix: string, suffix = '') {
    const textarea = textareaRef.current
    if (textarea === null) {
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const replacement = prefix + selectedText + suffix

    const updated = value.substring(0, start) + replacement + value.substring(end)
    onChange(updated)

    setTimeout(function () {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
    }, 0)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.ctrlKey === false && event.metaKey === false) {
      return
    }
    const key = event.key.toLowerCase()
    if (key === 'b') {
      event.preventDefault()
      insertFormatting('**', '**')
      return
    }
    if (key === 'i') {
      event.preventDefault()
      insertFormatting('*', '*')
    }
  }

  function handleInsertTable() {
    const tableTemplate =
      '\n| Kích cỡ | Chiều cao (cm) | Cân nặng (kg) | Vòng ngực (cm) |\n| :--- | :--- | :--- | :--- |\n| S | 150 - 160 | 45 - 52 | 82 - 86 |\n| M | 160 - 168 | 53 - 60 | 86 - 90 |\n| L | 168 - 175 | 60 - 68 | 90 - 95 |\n| XL | 175 - 182 | 68 - 76 | 95 - 100 |\n'
    insertFormatting(tableTemplate)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-300 bg-white/90 transition-all focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 dark:border-white/15 dark:bg-white/5 dark:focus-within:border-sky-400 dark:focus-within:ring-sky-400/25">
      {/* Toolbar header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 bg-zinc-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
        <div
          className="flex flex-wrap items-center gap-1"
          role="toolbar"
          aria-label="Công cụ định dạng văn bản"
        >
          <button
            type="button"
            title="In đậm (Ctrl+B)"
            aria-label="In đậm"
            onClick={function () {
              insertFormatting('**', '**')
            }}
            className={TOOLBAR_BTN_CLASS}
          >
            <TextB size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="In nghiêng (Ctrl+I)"
            aria-label="In nghiêng"
            onClick={function () {
              insertFormatting('*', '*')
            }}
            className={TOOLBAR_BTN_CLASS}
          >
            <TextItalic size={16} weight="bold" />
          </button>
          <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-white/10" />
          <button
            type="button"
            title="Tiêu đề 2"
            aria-label="Tiêu đề cấp 2"
            onClick={function () {
              insertFormatting('## ')
            }}
            className={TOOLBAR_BTN_CLASS}
          >
            <TextHTwo size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="Tiêu đề 3"
            aria-label="Tiêu đề cấp 3"
            onClick={function () {
              insertFormatting('### ')
            }}
            className={TOOLBAR_BTN_CLASS}
          >
            <TextHThree size={16} weight="bold" />
          </button>
          <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-white/10" />
          <button
            type="button"
            title="Danh sách gạch đầu dòng"
            aria-label="Danh sách gạch đầu dòng"
            onClick={function () {
              insertFormatting('- ')
            }}
            className={TOOLBAR_BTN_CLASS}
          >
            <ListBullets size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="Danh sách đánh số"
            aria-label="Danh sách đánh số"
            onClick={function () {
              insertFormatting('1. ')
            }}
            className={TOOLBAR_BTN_CLASS}
          >
            <ListNumbers size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="Trích dẫn"
            aria-label="Trích dẫn"
            onClick={function () {
              insertFormatting('> ')
            }}
            className={TOOLBAR_BTN_CLASS}
          >
            <Quotes size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="Chèn bảng thông số kích cỡ"
            aria-label="Chèn bảng thông số kích cỡ"
            onClick={handleInsertTable}
            className={TOOLBAR_BTN_CLASS}
          >
            <Table size={16} weight="bold" />
          </button>
        </div>

        {/* View Switch: Soạn thảo / Xem trước */}
        <div role="tablist" aria-label="Chế độ soạn thảo" className={segmentedTrackClass()}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'edit'}
            onClick={function () {
              setActiveTab('edit')
            }}
            className={segmentedItemClass(activeTab === 'edit')}
          >
            <PencilSimple size={14} weight="bold" />
            <span>Soạn thảo</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preview'}
            onClick={function () {
              setActiveTab('preview')
            }}
            className={segmentedItemClass(activeTab === 'preview')}
          >
            <Eye size={14} weight="bold" />
            <span>Xem trước</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {activeTab === 'edit' && (
        <textarea
          ref={textareaRef}
          id={id}
          rows={rows}
          value={value}
          onKeyDown={handleKeyDown}
          onChange={function (e) {
            onChange(e.target.value)
          }}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent p-4 text-sm leading-relaxed text-[#17203a] outline-none placeholder:text-zinc-500 dark:text-[#e2e8f0] dark:placeholder:text-zinc-400"
        />
      )}

      {activeTab === 'preview' && (
        <div className="min-h-[160px] p-4 text-sm">
          {value.trim() === '' && (
            <p className="text-zinc-500 italic dark:text-zinc-400">
              (Chưa có nội dung mô tả để xem trước)
            </p>
          )}
          {value.trim() !== '' && <Markdown source={value} />}
        </div>
      )}
    </div>
  )
}
