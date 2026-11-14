import Modal from '../Modal'

import type { ReorderItemIssue } from '@generated/model/reorderItemIssue'
import type { ReorderResponse } from '@generated/model/reorderResponse'

interface Props {
  result: ReorderResponse | null
  onClose: () => void
  onGoToCart: () => void
}

function issueReasonLabel(reason: string | undefined): string {
  if (reason === 'OUT_OF_STOCK') {
    return 'Hết hàng'
  }
  if (reason === 'STOCK_LIMITED') {
    return 'Tồn kho còn hạn chế'
  }
  if (reason === 'PRODUCT_UNAVAILABLE') {
    return 'Sản phẩm đã ngừng bán'
  }
  if (reason === 'PRODUCT_DELETED') {
    return 'Sản phẩm không còn tồn tại'
  }
  if (reason === 'VARIANT_UNAVAILABLE') {
    return 'Biến thể không còn kinh doanh'
  }
  if (reason === 'CART_MAXED') {
    return 'Giỏ hàng đã đạt mức tồn kho tối đa'
  }
  return reason ?? 'Không khả dụng'
}

function IssueRow({ item, adjusted }: { item: ReorderItemIssue; adjusted: boolean }) {
  return (
    <li className="rounded-2xl border border-sky-100 bg-white/70 px-3.5 py-2.5 text-xs dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-zinc-900 dark:text-white">{item.productName}</span>
        <span className="font-semibold text-amber-600 dark:text-amber-300">
          {issueReasonLabel(item.reason)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-zinc-500 dark:text-zinc-400">
        <span>{item.variantLabel}</span>
        {adjusted && (
          <span>
            Đã thêm {item.addedQuantity ?? 0} / {item.requestedQuantity ?? 0}
          </span>
        )}
        {!adjusted && <span>Không thể thêm ({item.requestedQuantity ?? 0})</span>}
      </div>
    </li>
  )
}

export default function ReorderResultModal(props: Props) {
  if (props.result === null) {
    return null
  }

  const adjusted = props.result.adjustedItems ?? []
  const skipped = props.result.skippedItems ?? []
  const addedCount = props.result.addedCount ?? 0

  return (
    <Modal title="Kết quả mua lại đơn hàng" onClose={props.onClose} widthClass="max-w-lg">
      <div className="mt-4 space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Đã thêm thành công {addedCount} mặt hàng vào giỏ hàng.
        </p>

        {adjusted.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
              Sản phẩm điều chỉnh số lượng
            </p>
            <ul className="space-y-2">
              {adjusted.map((item, idx) => (
                <IssueRow key={`${item.variantId ?? 'adj'}-${idx}`} item={item} adjusted={true} />
              ))}
            </ul>
          </div>
        )}

        {skipped.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
              Sản phẩm không thể thêm lại
            </p>
            <ul className="space-y-2">
              {skipped.map((item, idx) => (
                <IssueRow key={`${item.variantId ?? 'skip'}-${idx}`} item={item} adjusted={false} />
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 dark:border-white/15 dark:text-zinc-200"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={props.onGoToCart}
            className="btn-primary rounded-full px-5 py-2 text-xs font-bold"
          >
            Đi tới giỏ hàng
          </button>
        </div>
      </div>
    </Modal>
  )
}
