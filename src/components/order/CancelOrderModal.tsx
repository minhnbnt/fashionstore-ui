import { useState } from 'react'

import Modal from '../Modal'

interface Props {
  open: boolean
  orderCode?: string
  isPending?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (reason: string, note: string | null) => void
}

const BUYER_REASONS = [
  { code: 'CHANGE_MIND', label: 'Đổi ý' },
  { code: 'FOUND_CHEAPER', label: 'Tìm được giá rẻ hơn' },
  { code: 'ORDERED_BY_MISTAKE', label: 'Đặt nhầm' },
  { code: 'OTHER', label: 'Khác' },
] as const

function reasonChipClass(selected: boolean): string {
  if (selected) {
    return 'rounded-2xl border border-blue-600 bg-blue-50 px-3.5 py-2.5 text-left text-xs font-bold text-blue-700 dark:border-sky-400 dark:bg-blue-500/20 dark:text-sky-200'
  }
  return 'rounded-2xl border border-zinc-200 bg-white/80 px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10'
}

export default function CancelOrderModal(props: Props) {
  const [reason, setReason] = useState<string>('CHANGE_MIND')
  const [note, setNote] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  if (!props.open) {
    return null
  }

  let heading = 'Hủy đơn hàng'
  if (props.orderCode) {
    heading = `Hủy đơn ${props.orderCode}`
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = note.trim()
    if (reason === 'OTHER' && trimmed === '') {
      setValidationError('Vui lòng nhập lý do hủy đơn.')
      return
    }
    setValidationError(null)
    let cleanNote: string | null = null
    if (trimmed !== '') {
      cleanNote = trimmed
    }
    props.onConfirm(reason, cleanNote)
  }

  const displayError = validationError ?? props.error ?? null

  return (
    <Modal title={heading} onClose={props.onClose} widthClass="max-w-md">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BUYER_REASONS.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => {
                setReason(option.code)
                setValidationError(null)
              }}
              className={reasonChipClass(reason === option.code)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-zinc-700 dark:text-zinc-200">
            Ghi chú chi tiết
          </label>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              if (validationError !== null) {
                setValidationError(null)
              }
            }}
            rows={3}
            maxLength={500}
            placeholder="Nhập lý do chi tiết..."
            className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500"
          />
        </div>

        {displayError !== null && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200">
            {displayError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            Giữ đơn hàng
          </button>
          <button
            type="submit"
            disabled={props.isPending}
            className="rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Xác nhận hủy đơn
          </button>
        </div>
      </form>
    </Modal>
  )
}
