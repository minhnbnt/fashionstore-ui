import { useRestoreProduct } from '@generated/endpoints/admin-products/admin-products'
import { ArrowCounterClockwise } from '@phosphor-icons/react'

import { hookErrorMessage } from '@/lib/apiAdapters'
import { violationLabel } from '@/lib/productModeration'

import type { AdminProductResponse } from '@generated/model/adminProductResponse'

interface Props {
  product: AdminProductResponse
  onClose: () => void
  onDone: () => void
}

/** Khôi phục về "Đang ẩn": shop kiểm tra lại rồi tự đăng bán. */
export default function RestoreProductDialog({ product, onClose, onDone }: Props) {
  const restore = useRestoreProduct()

  function handleConfirm() {
    if (product.id === undefined) {
      return
    }
    restore.mutate({ id: product.id }, { onSuccess: onDone })
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-inherit backdrop-blur-xs"
      aria-labelledby="restore-product-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <h2
          id="restore-product-title"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tighter"
        >
          <ArrowCounterClockwise
            size={20}
            weight="bold"
            className="text-indigo-600 dark:text-indigo-400"
          />
          Khôi phục sản phẩm?
        </h2>
        <p className="mt-1 truncate text-sm font-semibold">{product.name}</p>
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
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {hookErrorMessage('adminProductRestore', restore.error)}
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
            disabled={restore.isPending}
            className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
          >
            {restore.isPending && <span>Đang khôi phục…</span>}
            {restore.isPending === false && <span>Khôi phục</span>}
          </button>
        </div>
      </div>
    </dialog>
  )
}
