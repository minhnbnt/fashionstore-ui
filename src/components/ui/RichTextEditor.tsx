import { useState, useRef } from 'react'

import {
  TextB,
  TextItalic,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  Quotes,
  Table,
  Eye,
  PencilSimple,
} from '@phosphor-icons/react'

import Markdown from '@/components/Markdown'

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export default function RichTextEditor({
  id = 'rich-text-editor',
  value,
  onChange,
  placeholder = 'Nhập mô tả chi tiết sản phẩm bằng định dạng Rich Text...',
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

  function handleInsertTable() {
    const tableTemplate =
      '\n| Kích cỡ | Chiều cao (cm) | Cân nặng (kg) | Vòng ngực (cm) |\n| :--- | :--- | :--- | :--- |\n| S | 150 - 160 | 45 - 52 | 82 - 86 |\n| M | 160 - 168 | 53 - 60 | 86 - 90 |\n| L | 168 - 175 | 60 - 68 | 90 - 95 |\n| XL | 175 - 182 | 68 - 76 | 95 - 100 |\n'
    insertFormatting(tableTemplate)
  }

  let editTabButtonClass =
    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors '
  if (activeTab === 'edit') {
    editTabButtonClass += 'bg-white shadow-xs text-zinc-900 dark:bg-zinc-800 dark:text-white'
  } else {
    editTabButtonClass +=
      'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white'
  }

  let previewTabButtonClass =
    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors '
  if (activeTab === 'preview') {
    previewTabButtonClass += 'bg-white shadow-xs text-zinc-900 dark:bg-zinc-800 dark:text-white'
  } else {
    previewTabButtonClass +=
      'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white'
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Toolbar header */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            title="In đậm (Ctrl+B)"
            onClick={function () {
              insertFormatting('**', '**')
            }}
            className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <TextB size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="In nghiêng (Ctrl+I)"
            onClick={function () {
              insertFormatting('*', '*')
            }}
            className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <TextItalic size={16} weight="bold" />
          </button>
          <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            type="button"
            title="Tiêu đề 2"
            onClick={function () {
              insertFormatting('## ')
            }}
            className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <TextHTwo size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="Tiêu đề 3"
            onClick={function () {
              insertFormatting('### ')
            }}
            className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <TextHThree size={16} weight="bold" />
          </button>
          <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            type="button"
            title="Danh sách gạch đầu dòng"
            onClick={function () {
              insertFormatting('- ')
            }}
            className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ListBullets size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="Danh sách đánh số"
            onClick={function () {
              insertFormatting('1. ')
            }}
            className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ListNumbers size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="Trích dẫn"
            onClick={function () {
              insertFormatting('> ')
            }}
            className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Quotes size={16} weight="bold" />
          </button>
          <button
            type="button"
            title="Chèn bảng thông số kích cỡ"
            onClick={handleInsertTable}
            className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Table size={16} weight="bold" />
          </button>
        </div>

        {/* View Switch: Soạn thảo / Xem trước */}
        <div className="flex items-center rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-800/80">
          <button
            type="button"
            onClick={function () {
              setActiveTab('edit')
            }}
            className={editTabButtonClass}
          >
            <PencilSimple size={14} weight="bold" />
            Soạn thảo
          </button>
          <button
            type="button"
            onClick={function () {
              setActiveTab('preview')
            }}
            className={previewTabButtonClass}
          >
            <Eye size={14} weight="bold" />
            Xem trước
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
          onChange={function (e) {
            onChange(e.target.value)
          }}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent p-4 text-xs leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-600"
        />
      )}

      {activeTab === 'preview' && (
        <div className="min-h-[160px] p-4 text-xs">
          {value.trim() === '' && (
            <p className="text-zinc-400 italic dark:text-zinc-600">
              (Chưa có nội dung mô tả để xem trước)
            </p>
          )}
          {value.trim() !== '' && <Markdown source={value} />}
        </div>
      )}
    </div>
  )
}
