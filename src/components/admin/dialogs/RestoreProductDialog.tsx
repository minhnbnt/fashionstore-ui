import { useRestoreProduct } from '@generated/endpoints/admin-products/admin-products'
import { ArrowCounterClockwise } from '@phosphor-icons/react'

import Modal from '@/components/Modal'
import { violationLabel } from '@/lib/admin/productModeration'
import { hookErrorMessage } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import { cn, primaryButtonClass, secondaryButtonClass } from '@/lib/ui/styles'

import type { AdminProductResponse } from '@generated/model/adminProductResponse'

interface Props {
  product: AdminProductResponse
  onClose: () => void
  onDone: () => void
}

/** Khôi phục về "Đang ẩn": shop kiểm tra lại rồi tự đăng bán. */
export default function RestoreProductDialog({ product, onClose, onDone }: Props) {
  const restore = useRestoreProduct()

  function handleClose() {
    if (restore.isPending) {
      return
    }
    onClose()
  }

  function handleConfirm() {
    if (product.id === undefined) {
      return
    }
    restore.mutate(
      { id: product.id },
      {
        onSuccess: onDone,
        onError: function (err) {
          notify.fromError(err, 'adminProductRestore')
        },
      },
    )
  }

  return (
    <Modal title="Khôi phục sản phẩm?" onClose={handleClose} widthClass="max-w-md">
      <div className="mt-2">
        <p className="flex items-center gap-2 truncate text-sm font-semibold">
          <ArrowCounterClockwise
            size={18}
            weight="bold"
            className="shrink-0 text-blue-700 dark:text-sky-300"
          />
          <span className="truncate">{product.name}</span>
        </p>
        {product.violationType !== null && product.violationType !== undefined && (
          <p className="mt-3 rounded-2xl bg-zinc-100 px-4 py-3 text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
            Đã gỡ vì <strong>{violationLabel(product.violationType)}</strong>:{' '}
            {product.statusReason}
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Sản phẩm chuyển về trạng thái <strong>Đang ẩn</strong>, xóa lý do vi phạm. Shop tự kiểm
          tra và đăng bán lại.
        </p>

        {restore.isError && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
            {hookErrorMessage('adminProductRestore', restore.error)}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={restore.isPending}
            className={cn(secondaryButtonClass(), 'cursor-pointer px-5 py-2.5')}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={restore.isPending}
            className={cn(
              primaryButtonClass(),
              'cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {restore.isPending && <span>Đang khôi phục…</span>}
            {restore.isPending === false && <span>Khôi phục</span>}
          </button>
        </div>
      </div>
    </Modal>
  )
}
