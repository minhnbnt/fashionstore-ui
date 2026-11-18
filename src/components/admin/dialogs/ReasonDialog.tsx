import { useState } from 'react'

import Modal from '@/components/Modal'
import {
  cn,
  dangerButtonClass,
  LABEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  TEXTAREA_CLASS,
} from '@/lib/ui/styles'

interface ReasonDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  suggestions: string[]
  pending: boolean
  danger?: boolean
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

  function handleClose() {
    if (props.pending) {
      return
    }
    props.onClose()
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (valid === false) {
      return
    }
    props.onConfirm(trimmed)
  }

  let confirmClass = cn(
    primaryButtonClass(),
    'cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
  )
  if (props.danger === true) {
    confirmClass = cn(dangerButtonClass(), 'cursor-pointer px-5 py-2.5')
  }

  return (
    <Modal title={props.title} onClose={handleClose} widthClass="max-w-lg">
      <form onSubmit={submit} className="mt-2">
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{props.description}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {props.suggestions.map(function (suggestion) {
            return (
              <button
                key={suggestion}
                type="button"
                onClick={function () {
                  setReason(suggestion)
                }}
                className="cursor-pointer rounded-full border border-indigo-200 px-3 py-1.5 text-left text-xs font-semibold text-indigo-800 transition hover:bg-indigo-50 dark:border-indigo-300/20 dark:text-indigo-200 dark:hover:bg-white/10"
              >
                {suggestion}
              </button>
            )
          })}
        </div>

        <label className={cn(LABEL_CLASS, 'mt-5')} htmlFor="moderation-reason">
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
          placeholder="Nhập lý do để đối tượng được kiểm duyệt biết cách xử lý…"
          className={cn(TEXTAREA_CLASS, 'resize-none py-3')}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Tối thiểu 5 ký tự</span>
          <span className="tabular-nums">{reason.length}/500</span>
        </div>

        {props.error !== undefined && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
            {props.error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={props.pending}
            className={cn(secondaryButtonClass(), 'cursor-pointer px-4 py-2.5')}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={props.pending || valid === false}
            className={confirmClass}
          >
            {props.pending && <span>Đang xử lý…</span>}
            {props.pending === false && <span>{props.confirmLabel}</span>}
          </button>
        </div>
      </form>
    </Modal>
  )
}
