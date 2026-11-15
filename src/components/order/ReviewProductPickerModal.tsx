import { fallbackImageOnError, PLACEHOLDER_IMAGE, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import {
  findOrderProductReview,
  groupOrderReviewProducts,
  type OrderReviewLookup,
} from '@/lib/review/reviewOrderHelpers'

import Modal from '../Modal'

import type { OrderItemResponse } from '@generated/model/orderItemResponse'
import type { ReviewResponse } from '@generated/model/reviewResponse'

interface Props {
  open: boolean
  orderId?: string
  orderCode?: string
  items: OrderItemResponse[]
  reviewLookup: OrderReviewLookup
  onClose: () => void
  onSelectProduct: (
    item: OrderItemResponse,
    variantLabel: string | undefined,
    existing?: ReviewResponse,
  ) => void
}

function actionLabel(existing: ReviewResponse | undefined): string {
  if (existing === undefined) {
    return 'Đánh giá'
  }
  if (!existing.edited) {
    return 'Sửa đánh giá (1 lần)'
  }
  return 'Đã đánh giá'
}

export default function ReviewProductPickerModal(props: Props) {
  if (!props.open) {
    return null
  }

  const products = groupOrderReviewProducts(props.items)
  let title = 'Chọn sản phẩm để đánh giá'
  if (props.orderCode) {
    title = `Đánh giá sản phẩm — ${props.orderCode}`
  }

  return (
    <Modal title={title} onClose={props.onClose} widthClass="max-w-lg">
      <div className="mt-4 space-y-3">
        {products.map((entry, idx) => {
          const item = entry.item
          const productId = item.productId ?? undefined
          const existing = findOrderProductReview(props.orderId, productId, props.reviewLookup)
          const isLocked = existing !== undefined && Boolean(existing.edited)
          let thumb = PLACEHOLDER_IMAGE
          if (item.imageUrl) {
            thumb = urlOrPlaceholder(item.imageUrl)
          }

          return (
            <div
              key={item.id ?? productId ?? `${idx}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={thumb}
                  alt={item.productName ?? 'Sản phẩm'}
                  loading="lazy"
                  onError={fallbackImageOnError}
                  className="h-12 w-12 shrink-0 rounded-2xl border border-sky-100 object-cover dark:border-white/10"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                    {item.productName}
                  </p>
                  {Boolean(entry.variantLabel) && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{entry.variantLabel}</p>
                  )}
                </div>
              </div>

              {!productId && <span className="shrink-0 text-xs text-zinc-400">Không khả dụng</span>}
              {Boolean(productId) && (
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => props.onSelectProduct(item, entry.variantLabel, existing)}
                  className="shrink-0 rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-zinc-100 dark:hover:bg-white/10"
                >
                  {actionLabel(existing)}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
