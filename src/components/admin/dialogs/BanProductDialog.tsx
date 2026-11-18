import { useState } from 'react'

import { useBanProduct } from '@generated/endpoints/admin-products/admin-products'
import { Prohibit } from '@phosphor-icons/react'

import Modal from '@/components/Modal'
import {
  appendTemplate,
  REASON_MAX,
  reasonError,
  VIOLATION_OPTIONS,
} from '@/lib/admin/productModeration'
import { hookErrorMessage } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import {
  cn,
  dangerButtonClass,
  LABEL_CLASS,
  secondaryButtonClass,
  TEXTAREA_CLASS,
} from '@/lib/ui/styles'

import type { AdminProductResponse } from '@generated/model/adminProductResponse'
import type { BanProductRequestViolationType } from '@generated/model/banProductRequestViolationType'

interface Props {
  product: AdminProductResponse
  onClose: () => void
  onDone: () => void
}

/** Gỡ từ hàng đợi báo cáo thì chọn sẵn lý do bị báo cáo nhiều nhất, admin vẫn đổi được. */
function initialViolation(
  topReason: string | null | undefined,
): BanProductRequestViolationType | null {
  const match = VIOLATION_OPTIONS.find((option) => option.type === topReason)
  if (match === undefined) {
    return null
  }
  return match.type
}

/** Chọn loại vi phạm + lý do (có câu mẫu theo loại), gỡ sản phẩm khỏi sàn. */
export default function BanProductDialog({ product, onClose, onDone }: Props) {
  const [violationType, setViolationType] = useState<BanProductRequestViolationType | null>(
    initialViolation(product.topReportReason),
  )
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const ban = useBanProduct()

  const selected = VIOLATION_OPTIONS.find((option) => option.type === violationType)
  const reasonProblem = reasonError(reason)
  let visibleProblem: string | null = null
  if (touched) {
    visibleProblem = reasonProblem
  }
  const canSubmit = violationType !== null && reasonProblem === null && ban.isPending === false

  function handleClose() {
    if (ban.isPending) {
      return
    }
    onClose()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (violationType === null || reasonProblem !== null || product.id === undefined) {
      return
    }
    ban.mutate(
      { id: product.id, data: { violationType, reason: reason.trim() } },
      {
        onSuccess: onDone,
        onError: function (err) {
          notify.fromError(err, 'adminProductBan')
        },
      },
    )
  }

  return (
    <Modal title="Gỡ sản phẩm vi phạm" onClose={handleClose} widthClass="max-w-xl">
      <form onSubmit={handleSubmit} className="mt-2 space-y-5">
        <p className="flex items-center gap-2 truncate text-sm text-zinc-500 dark:text-zinc-400">
          <Prohibit size={16} weight="bold" className="shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="truncate">
            {product.name} · {product.shopName}
          </span>
        </p>

        <fieldset>
          <legend className={LABEL_CLASS}>Loại vi phạm</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {VIOLATION_OPTIONS.map(function (option) {
              const checked = option.type === violationType
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
                      name="violationType"
                      value={option.type}
                      checked={checked}
                      onChange={() => setViolationType(option.type)}
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
          <label htmlFor="ban-reason" className={LABEL_CLASS}>
            Lý do gửi shop
          </label>
          {selected !== undefined && selected.templates.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selected.templates.map(function (template) {
                return (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setReason(appendTemplate(reason, template))}
                    className="cursor-pointer rounded-full bg-zinc-100 px-3 py-1 text-left text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
                  >
                    + {template}
                  </button>
                )
              })}
            </div>
          )}
          <textarea
            id="ban-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            rows={4}
            maxLength={REASON_MAX}
            placeholder="Mô tả cụ thể vi phạm để shop biết cần khắc phục gì"
            aria-invalid={visibleProblem !== null}
            aria-describedby="ban-reason-help"
            className={cn(TEXTAREA_CLASS, 'resize-y py-3')}
          />
          <div id="ban-reason-help" className="mt-1 flex justify-between gap-3 text-xs">
            <span className="text-red-600 dark:text-red-400">{visibleProblem}</span>
            <span className="shrink-0 text-zinc-400 tabular-nums">
              {reason.trim().length}/{REASON_MAX}
            </span>
          </div>
        </div>

        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          Sản phẩm sẽ biến mất khỏi tìm kiếm, trang chi tiết và không đặt mua được nữa. Shop thấy lý
          do và không tự đăng bán lại được. Đơn hàng đang xử lý vẫn tiếp tục.
        </p>

        {ban.isError && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
            {hookErrorMessage('adminProductBan', ban.error)}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-zinc-200/80 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={handleClose}
            disabled={ban.isPending}
            className={cn(secondaryButtonClass(), 'cursor-pointer px-5 py-2.5')}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={canSubmit === false}
            className={cn(dangerButtonClass(), 'cursor-pointer px-5 py-2.5')}
          >
            {ban.isPending && <span>Đang gỡ…</span>}
            {ban.isPending === false && <span>Gỡ sản phẩm</span>}
          </button>
        </div>
      </form>
    </Modal>
  )
}
