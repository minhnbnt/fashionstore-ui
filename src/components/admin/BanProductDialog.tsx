import { useState } from 'react'

import { useBanProduct } from '@generated/endpoints/admin-products/admin-products'
import { Prohibit, X } from '@phosphor-icons/react'

import { hookErrorMessage } from '@/lib/apiAdapters'
import { appendTemplate, REASON_MAX, reasonError, VIOLATION_OPTIONS } from '@/lib/productModeration'

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (violationType === null || reasonProblem !== null || product.id === undefined) {
      return
    }
    ban.mutate(
      { id: product.id, data: { violationType, reason: reason.trim() } },
      { onSuccess: onDone },
    )
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-inherit backdrop-blur-xs"
      aria-labelledby="ban-product-title"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#11182a]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-5 dark:border-white/10">
          <div className="min-w-0">
            <h2
              id="ban-product-title"
              className="flex items-center gap-2 text-lg font-extrabold tracking-tighter"
            >
              <Prohibit size={20} weight="bold" className="text-red-600 dark:text-red-400" />
              Gỡ sản phẩm vi phạm
            </h2>
            <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
              {product.name} · {product.shopName}
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
            <legend className="mb-2 text-sm font-bold">Loại vi phạm</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {VIOLATION_OPTIONS.map(function (option) {
                const checked = option.type === violationType
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
                        name="violationType"
                        value={option.type}
                        checked={checked}
                        onChange={() => setViolationType(option.type)}
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
            <label htmlFor="ban-reason" className="mb-2 block text-sm font-bold">
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
                      className="rounded-full bg-zinc-100 px-3 py-1 text-left text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
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
              className="w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 dark:border-white/10 dark:bg-white/5"
            />
            <div id="ban-reason-help" className="mt-1 flex justify-between gap-3 text-xs">
              <span className="text-red-600 dark:text-red-400">{visibleProblem}</span>
              <span className="shrink-0 text-zinc-400 tabular-nums">
                {reason.trim().length}/{REASON_MAX}
              </span>
            </div>
          </div>

          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            Sản phẩm sẽ biến mất khỏi tìm kiếm, trang chi tiết và không đặt mua được nữa. Shop thấy
            lý do và không tự đăng bán lại được. Đơn hàng đang xử lý vẫn tiếp tục.
          </p>

          {ban.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {hookErrorMessage('adminProductBan', ban.error)}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-100 p-5 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={canSubmit === false}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {ban.isPending && <span>Đang gỡ…</span>}
            {ban.isPending === false && <span>Gỡ sản phẩm</span>}
          </button>
        </div>
      </form>
    </dialog>
  )
}
