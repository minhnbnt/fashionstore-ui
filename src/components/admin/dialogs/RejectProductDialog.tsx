import { useState } from 'react'

import { useRejectProduct } from '@generated/endpoints/admin-products/admin-products'
import { Prohibit } from '@phosphor-icons/react'

import Modal from '@/components/Modal'
import { appendTemplate, REASON_MAX, reasonError } from '@/lib/admin/productModeration'
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

  function handleClose() {
    if (reject.isPending) {
      return
    }
    onClose()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (reasonProblem !== null || product.id === undefined) {
      return
    }
    reject.mutate(
      { id: product.id, data: { reason: reason.trim() } },
      {
        onSuccess: onDone,
        onError: function (err) {
          notify.fromError(err, 'adminProductReject')
        },
      },
    )
  }

  return (
    <Modal title="Từ chối phê duyệt sản phẩm" onClose={handleClose} widthClass="max-w-xl">
      <form onSubmit={handleSubmit} className="mt-2 space-y-5">
        <p className="flex items-center gap-2 truncate text-sm text-zinc-500 dark:text-zinc-400">
          <Prohibit size={16} weight="bold" className="shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="truncate">
            {product.name} · {product.shopName}
          </span>
        </p>

        <div>
          <label htmlFor="reject-reason" className={LABEL_CLASS}>
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
                  className="cursor-pointer rounded-full bg-zinc-100 px-3 py-1 text-left text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
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
            className={cn(TEXTAREA_CLASS, 'resize-y py-3')}
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
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
            {hookErrorMessage('adminProductReject', reject.error)}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-zinc-200/80 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={handleClose}
            disabled={reject.isPending}
            className={cn(secondaryButtonClass(), 'cursor-pointer px-5 py-2.5')}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={canSubmit === false}
            className={cn(dangerButtonClass(), 'cursor-pointer px-5 py-2.5')}
          >
            {reject.isPending && <span>Đang xử lý…</span>}
            {reject.isPending === false && <span>Xác nhận từ chối</span>}
          </button>
        </div>
      </form>
    </Modal>
  )
}
