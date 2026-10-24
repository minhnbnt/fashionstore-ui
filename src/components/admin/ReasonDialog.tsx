import { useState } from 'react'
import { createPortal } from 'react-dom'

import { X } from '@phosphor-icons/react'

interface ReasonDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  suggestions: string[]
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: (reason: string) => void
}

export default function ReasonDialog(props: ReasonDialogProps) {
  if (props.open === false) {
    return null
  }

  return <OpenReasonDialog {...props} />
}

function OpenReasonDialog(props: Omit<ReasonDialogProps, 'open'>) {
  const [reason, setReason] = useState('')

  const trimmed = reason.trim()
  const valid = trimmed.length >= 5 && trimmed.length <= 500

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (valid === false) {
      return
    }
    props.onConfirm(trimmed)
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <dialog
        open
        aria-modal="true"
        aria-labelledby="reason-title"
        className="static w-full max-w-lg rounded-3xl border border-white/30 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-[#11182a]"
      >
        <form onSubmit={submit} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="reason-title" className="text-xl font-extrabold tracking-tight">
                {props.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {props.description}
              </p>
            </div>
            <button
              type="button"
              aria-label="Đóng"
              onClick={props.onClose}
              disabled={props.pending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {props.suggestions.map(function (suggestion) {
              return (
                <button
                  key={suggestion}
                  type="button"
                  onClick={function () {
                    setReason(suggestion)
                  }}
                  className="rounded-full border border-indigo-200 px-3 py-1.5 text-left text-xs font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-300/20 dark:text-indigo-200 dark:hover:bg-white/10"
                >
                  {suggestion}
                </button>
              )
            })}
          </div>

          <label className="mt-5 block text-sm font-bold" htmlFor="moderation-reason">
            Lý do chi tiết
          </label>
          <textarea
            id="moderation-reason"
            value={reason}
            onChange={function (event) {
              setReason(event.target.value)
            }}
            minLength={5}
            maxLength={500}
            rows={5}
            autoFocus
            placeholder="Nhập lý do để đối tượng được kiểm duyệt biết cách xử lý…"
            className="mt-2 w-full resize-none rounded-3xl border border-zinc-300 bg-white px-4 py-3 text-sm transition outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-white/15 dark:bg-white/10"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Tối thiểu 5 ký tự</span>
            <span>{reason.length}/500</span>
          </div>

          {props.error !== undefined && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
              {props.error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={props.onClose}
              disabled={props.pending}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={props.pending || valid === false}
              className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.pending && <span>Đang xử lý…</span>}
              {props.pending === false && <span>{props.confirmLabel}</span>}
            </button>
          </div>
        </form>
      </dialog>
    </div>,
    document.body,
  )
}
