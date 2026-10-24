import { useState } from 'react'

import { useAdminCancelOrder } from '@generated/endpoints/admin-orders/admin-orders'
import { XCircle, X } from '@phosphor-icons/react'

import { hookErrorMessage } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'
import { CANCEL_REASON_OPTIONS } from '@/lib/orderMonitoring'
import { appendTemplate, REASON_MAX, reasonError } from '@/lib/productModeration'

import type { AdminCancelOrderRequestReason } from '@generated/model/adminCancelOrderRequestReason'
import type { AdminOrderResponse } from '@generated/model/adminOrderResponse'

interface Props {
  order: AdminOrderResponse
  onClose: () => void
  onDone: () => void
}

/** Admin hủy can thiệp: chọn loại lý do + ghi chú (có câu mẫu). */
export default function CancelOrderDialog({ order, onClose, onDone }: Props) {
  const [reason, setReason] = useState<AdminCancelOrderRequestReason | null>(null)
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const cancel = useAdminCancelOrder()

  const selected = CANCEL_REASON_OPTIONS.find((option) => option.type === reason)
  const noteProblem = reasonError(note)
  let visibleProblem: string | null = null
  if (touched) {
    visibleProblem = noteProblem
  }
  const canSubmit = reason !== null && noteProblem === null && cancel.isPending === false

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (reason === null || noteProblem !== null || order.id === undefined) {
      return
    }
    cancel.mutate({ id: order.id, data: { reason, note: note.trim() } }, { onSuccess: onDone })
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-inherit backdrop-blur-xs"
      aria-labelledby="cancel-order-title"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#11182a]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-5 dark:border-white/10">
          <div className="min-w-0">
            <h2
              id="cancel-order-title"
              className="flex items-center gap-2 text-lg font-extrabold tracking-tighter"
            >
              <XCircle size={20} weight="bold" className="text-red-600 dark:text-red-400" />
              Hủy đơn {order.code}
            </h2>
            <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
              {order.shopName} · {order.buyerEmail} · {formatVnd(order.total ?? 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Lý do hủy</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CANCEL_REASON_OPTIONS.map(function (option) {
                const checked = option.type === reason
                let optionClass =
                  'flex cursor-pointer flex-col gap-0.5 rounded-2xl border border-zinc-200 px-3.5 py-2.5 transition hover:border-red-300 dark:border-white/10'
                if (checked) {
                  optionClass =
                    'flex cursor-pointer flex-col gap-0.5 rounded-2xl border border-red-500 bg-red-50 px-3.5 py-2.5 transition dark:bg-red-500/10'
                }
                return (
                  <label key={option.type} className={optionClass}>
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <input
                        type="radio"
                        name="cancelReason"
                        value={option.type}
                        checked={checked}
                        onChange={() => setReason(option.type)}
                        className="accent-red-600"
                      />
                      {option.label}
                    </span>
                    <span className="pl-5 text-xs text-zinc-500 dark:text-zinc-400">
                      {option.hint}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="cancel-note" className="mb-2 block text-sm font-bold">
              Ghi chú gửi người mua và shop
            </label>
            {selected !== undefined && selected.templates.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selected.templates.map(function (template) {
                  return (
                    <button
                      key={template}
                      type="button"
                      onClick={() => setNote(appendTemplate(note, template))}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-left text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
                    >
                      + {template}
                    </button>
                  )
                })}
              </div>
            )}
            <textarea
              id="cancel-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => setTouched(true)}
              rows={4}
              maxLength={REASON_MAX}
              placeholder="Mô tả cụ thể vì sao sàn hủy đơn này"
              aria-invalid={visibleProblem !== null}
              aria-describedby="cancel-note-help"
              className="w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 dark:border-white/10 dark:bg-white/5"
            />
            <div id="cancel-note-help" className="mt-1 flex justify-between gap-3 text-xs">
              <span className="text-red-600 dark:text-red-400">{visibleProblem}</span>
              <span className="shrink-0 text-zinc-400 tabular-nums">
                {note.trim().length}/{REASON_MAX}
              </span>
            </div>
          </div>

          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            Đơn chuyển sang Đã hủy, ghi nhận người hủy là Quản trị sàn. Nếu shop đã xác nhận, hàng
            được hoàn lại kho. Thao tác không hoàn tác được.
          </p>

          {cancel.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {hookErrorMessage('adminOrderCancel', cancel.error)}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-100 p-5 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Quay lại
          </button>
          <button
            type="submit"
            disabled={canSubmit === false}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {cancel.isPending && <span>Đang hủy…</span>}
            {cancel.isPending === false && <span>Hủy đơn</span>}
          </button>
        </div>
      </form>
    </dialog>
  )
}
