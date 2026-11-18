import { useState } from 'react'

import { useAdminCancelOrder } from '@generated/endpoints/admin-orders/admin-orders'
import { XCircle } from '@phosphor-icons/react'

import Modal from '@/components/Modal'
import { appendTemplate, REASON_MAX, reasonError } from '@/lib/admin/productModeration'
import { hookErrorMessage } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { CANCEL_REASON_OPTIONS } from '@/lib/order/orderMonitoring'
import {
  cn,
  dangerButtonClass,
  LABEL_CLASS,
  secondaryButtonClass,
  TEXTAREA_CLASS,
} from '@/lib/ui/styles'

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

  function handleClose() {
    if (cancel.isPending) {
      return
    }
    onClose()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (reason === null || noteProblem !== null || order.id === undefined) {
      return
    }
    cancel.mutate(
      { id: order.id, data: { reason, note: note.trim() } },
      {
        onSuccess: onDone,
        onError: function (err) {
          notify.fromError(err, 'adminOrderCancel')
        },
      },
    )
  }

  return (
    <Modal title={`Hủy đơn ${order.code ?? ''}`} onClose={handleClose} widthClass="max-w-xl">
      <form onSubmit={handleSubmit} className="mt-2 space-y-5">
        <p className="flex items-center gap-2 truncate text-sm text-zinc-500 dark:text-zinc-400">
          <XCircle size={16} weight="bold" className="shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="truncate">
            {order.shopName} · {order.buyerEmail} · {formatVnd(order.total ?? 0)}
          </span>
        </p>

        <fieldset>
          <legend className={LABEL_CLASS}>Lý do hủy</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CANCEL_REASON_OPTIONS.map(function (option) {
              const checked = option.type === reason
              let optionClass =
                'flex cursor-pointer flex-col gap-0.5 rounded-2xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 transition hover:border-rose-300 dark:border-white/15 dark:bg-white/5 dark:hover:border-rose-400/50'
              if (checked) {
                optionClass =
                  'flex cursor-pointer flex-col gap-0.5 rounded-2xl border border-rose-500 bg-rose-50 px-3.5 py-2.5 transition dark:border-rose-400 dark:bg-rose-500/15'
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
                      className="accent-rose-600"
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
          <label htmlFor="cancel-note" className={LABEL_CLASS}>
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
                    className="cursor-pointer rounded-full bg-zinc-100 px-3 py-1 text-left text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
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
            className={cn(TEXTAREA_CLASS, 'resize-y py-3')}
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
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
            {hookErrorMessage('adminOrderCancel', cancel.error)}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-zinc-200/80 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={handleClose}
            disabled={cancel.isPending}
            className={cn(secondaryButtonClass(), 'cursor-pointer px-5 py-2.5')}
          >
            Quay lại
          </button>
          <button
            type="submit"
            disabled={canSubmit === false}
            className={cn(dangerButtonClass(), 'cursor-pointer px-5 py-2.5')}
          >
            {cancel.isPending && <span>Đang hủy…</span>}
            {cancel.isPending === false && <span>Hủy đơn</span>}
          </button>
        </div>
      </form>
    </Modal>
  )
}
