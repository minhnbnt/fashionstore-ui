import { useState } from 'react'

import { useDismissProductReports } from '@generated/endpoints/admin-products/admin-products'
import { ShieldCheck } from '@phosphor-icons/react'

import { hookErrorMessage } from '@/lib/apiAdapters'
import { REASON_MAX } from '@/lib/productModeration'

import type { AdminProductResponse } from '@generated/model/adminProductResponse'

interface Props {
  product: AdminProductResponse
  onClose: () => void
  onDone: (dismissedCount: number) => void
}

/** Xác minh không vi phạm: đóng mọi báo cáo đang mở, sản phẩm giữ nguyên. */
export default function DismissReportsDialog({ product, onClose, onDone }: Props) {
  const [note, setNote] = useState('')
  const dismiss = useDismissProductReports()

  function handleConfirm() {
    if (product.id === undefined) {
      return
    }
    dismiss.mutate(
      { id: product.id, data: { note: note.trim() } },
      {
        onSuccess: function (response) {
          if (response.status === 200) {
            onDone(response.data.dismissedCount ?? 0)
            return
          }
          onDone(0)
        },
      },
    )
  }

  return (
    <dialog
      open
      aria-labelledby="dismiss-reports-title"
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-inherit backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#11182a]">
        <h2
          id="dismiss-reports-title"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tighter"
        >
          <ShieldCheck size={20} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
          Bác bỏ {product.openReportCount ?? 0} báo cáo?
        </h2>
        <p className="mt-1 truncate text-sm font-semibold">{product.name}</p>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Xác nhận sản phẩm <strong>không vi phạm</strong>. Các báo cáo đang chờ được đóng, sản phẩm
          giữ nguyên trạng thái. Người mua vẫn có thể báo cáo lại nếu phát hiện vấn đề mới.
        </p>

        <label htmlFor="dismiss-note" className="mt-4 mb-2 block text-sm font-bold">
          Ghi chú{' '}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">(không bắt buộc)</span>
        </label>
        <textarea
          id="dismiss-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={REASON_MAX}
          placeholder="Ví dụ: đã đối chiếu ảnh thật, đúng mô tả"
          className="w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/5"
        />

        {dismiss.isError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {hookErrorMessage('adminProductDismiss', dismiss.error)}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={dismiss.isPending}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {dismiss.isPending && <span>Đang xử lý…</span>}
            {dismiss.isPending === false && <span>Không vi phạm</span>}
          </button>
        </div>
      </div>
    </dialog>
  )
}
