import { useState } from 'react'

import { useDismissProductReports } from '@generated/endpoints/admin-products/admin-products'
import { ShieldCheck } from '@phosphor-icons/react'

import Modal from '@/components/Modal'
import { REASON_MAX } from '@/lib/admin/productModeration'
import { hookErrorMessage } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import { cn, LABEL_CLASS, secondaryButtonClass, TEXTAREA_CLASS } from '@/lib/ui/styles'

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

  function handleClose() {
    if (dismiss.isPending) {
      return
    }
    onClose()
  }

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
        onError: function (err) {
          notify.fromError(err, 'adminProductDismiss')
        },
      },
    )
  }

  return (
    <Modal
      title={`Bác bỏ ${product.openReportCount ?? 0} báo cáo?`}
      onClose={handleClose}
      widthClass="max-w-md"
    >
      <div className="mt-2">
        <p className="flex items-center gap-2 truncate text-sm font-semibold">
          <ShieldCheck
            size={18}
            weight="bold"
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <span className="truncate">{product.name}</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Xác nhận sản phẩm <strong>không vi phạm</strong>. Các báo cáo đang chờ được đóng, sản phẩm
          giữ nguyên trạng thái. Người mua vẫn có thể báo cáo lại nếu phát hiện vấn đề mới.
        </p>

        <label htmlFor="dismiss-note" className={cn(LABEL_CLASS, 'mt-4')}>
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
          className={cn(TEXTAREA_CLASS, 'resize-y py-3')}
        />

        {dismiss.isError && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
            {hookErrorMessage('adminProductDismiss', dismiss.error)}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={dismiss.isPending}
            className={cn(secondaryButtonClass(), 'cursor-pointer px-5 py-2.5')}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={dismiss.isPending}
            className="cursor-pointer rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {dismiss.isPending && <span>Đang xử lý…</span>}
            {dismiss.isPending === false && <span>Không vi phạm</span>}
          </button>
        </div>
      </div>
    </Modal>
  )
}
