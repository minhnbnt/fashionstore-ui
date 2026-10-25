import { useState } from 'react'

import { useRejectProduct } from '@generated/endpoints/admin-products/admin-products'
import { Prohibit, X } from '@phosphor-icons/react'

import { hookErrorMessage } from '@/lib/apiAdapters'
import { appendTemplate, REASON_MAX, reasonError } from '@/lib/productModeration'

import type { AdminProductResponse } from '@generated/model/adminProductResponse'

interface Props {
  product: AdminProductResponse
  onClose: () => void
  onDone: () => void
}

const REJECT_TEMPLATES = [
  'Hình ảnh sản phẩm không đúng quy chuẩn (mờ, vi phạm bản quyền).',
  'Ảnh Garment thử đồ ảo không trải phẳng trên nền trắng tinh khiết.',
  'Thông tin mô tả/chất liệu chưa rõ ràng hoặc không khớp sản phẩm.',
  'Video giới thiệu không đạt chất lượng hoặc chứa thông tin không phù hợp.',
  'Giá bán và thông tin biến thể bất thường.',
]

export default function RejectProductDialog({ product, onClose, onDone }: Props) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const reject = useRejectProduct()

  const reasonProblem = reasonError(reason)
  let visibleProblem: string | null = null
  if (touched) {
    visibleProblem = reasonProblem
  }
  const canSubmit = reasonProblem === null && reject.isPending === false

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (reasonProblem !== null || product.id === undefined) {
      return
    }
    reject.mutate({ id: product.id, data: { reason: reason.trim() } }, { onSuccess: onDone })
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-inherit backdrop-blur-xs"
      aria-labelledby="reject-product-title"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:border dark:border-white/10 dark:bg-[#11182a]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-5 dark:border-white/10">
          <div className="min-w-0">
            <h2
              id="reject-product-title"
              className="flex items-center gap-2 text-lg font-extrabold tracking-tighter"
            >
              <Prohibit size={20} weight="bold" className="text-red-600 dark:text-red-400" />
              Từ chối phê duyệt sản phẩm
            </h2>
            <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
              {product.name} · {product.shopName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-white/10"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <label htmlFor="reject-reason" className="mb-2 block text-sm font-bold">
              Lý do từ chối gửi cho shop
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {REJECT_TEMPLATES.map(function (template) {
                return (
                  <button
                    key={template}
                    type="button"
                    onClick={function () {
                      setReason(appendTemplate(reason, template))
                    }}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-left text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
                  >
                    + {template}
                  </button>
                )
              })}
            </div>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={function (event) {
                setReason(event.target.value)
              }}
              onBlur={function () {
                setTouched(true)
              }}
              rows={4}
              maxLength={REASON_MAX}
              placeholder="Ghi rõ lý do từ chối để shop nắm được thông tin và chỉnh sửa lại sản phẩm..."
              aria-invalid={visibleProblem !== null}
              aria-describedby="reject-reason-help"
              className="w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 dark:border-white/10 dark:bg-white/5"
            />
            <div id="reject-reason-help" className="mt-1 flex justify-between gap-3 text-xs">
              <span className="text-red-600 dark:text-red-400">{visibleProblem}</span>
              <span className="shrink-0 text-zinc-400 tabular-nums">
                {reason.trim().length}/{REASON_MAX}
              </span>
            </div>
          </div>

          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            Sản phẩm sẽ bị từ chối duyệt (chuyển sang trạng thái Bị gỡ). Shop sẽ nhận được thông báo
            kèm lý do trên để tiến hành chỉnh sửa lại thông tin trước khi nộp duyệt tiếp.
          </p>

          {reject.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {hookErrorMessage('adminProductReject', reject.error)}
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
            {reject.isPending && <span>Đang xử lý…</span>}
            {reject.isPending === false && <span>Xác nhận từ chối</span>}
          </button>
        </div>
      </form>
    </dialog>
  )
}
