import { useGetAdminProduct } from '@generated/endpoints/admin-products/admin-products'
import { ArrowCounterClockwise, ClockCounterClockwise, Prohibit, X } from '@phosphor-icons/react'

import { hookErrorMessage, imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'
import {
  canBan,
  canRestore,
  formatDateTime,
  statusBadgeClass,
  statusLabel,
  violationLabel,
} from '@/lib/productModeration'

import type { AdminProductDetailResponse } from '@generated/model/adminProductDetailResponse'
import type { AdminProductResponse } from '@generated/model/adminProductResponse'
import type { ProductModerationHistoryResponse } from '@generated/model/productModerationHistoryResponse'

interface Props {
  productId: string
  onClose: () => void
  onBan: (product: AdminProductResponse) => void
  onRestore: (product: AdminProductResponse) => void
}

function historyTitle(entry: ProductModerationHistoryResponse): string {
  if (entry.toStatus === 'BANNED') {
    return `Gỡ vì ${violationLabel(entry.violationType)}`
  }
  return `${statusLabel(entry.fromStatus)} → ${statusLabel(entry.toStatus)}`
}

function DetailBody({
  detail,
  onBan,
  onRestore,
}: {
  detail: AdminProductDetailResponse
  onBan: Props['onBan']
  onRestore: Props['onRestore']
}) {
  const product = detail.product
  const images = detail.images ?? []
  const variants = detail.variants ?? []
  const history = detail.history ?? []
  if (product === undefined) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Không có dữ liệu sản phẩm.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.length === 0 && (
          <img
            src={PLACEHOLDER_IMAGE}
            alt=""
            width={120}
            height={150}
            className="h-[150px] w-[120px] shrink-0 rounded-2xl object-cover opacity-60"
          />
        )}
        {images.map(function (image) {
          return (
            <img
              key={image.id}
              src={imageUrl(image.s3Key)}
              alt=""
              width={120}
              height={150}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = PLACEHOLDER_IMAGE
              }}
              className="h-[150px] w-[120px] shrink-0 rounded-2xl object-cover"
            />
          )
        })}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={statusBadgeClass(product.status)}>{statusLabel(product.status)}</span>
          {product.categoryName !== null && product.categoryName !== undefined && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{product.categoryName}</span>
          )}
        </div>
        <h3 className="mt-2 text-xl font-extrabold tracking-tighter">{product.name}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">/{product.slug}</p>
        <p className="mt-2 text-sm">
          Shop <strong>{product.shopName}</strong>
          {product.shopStatus !== 'APPROVED' && (
            <span className="ml-2 text-xs text-amber-700 dark:text-amber-300">
              ({product.shopStatus})
            </span>
          )}
        </p>
      </div>

      {product.status === 'BANNED' && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-bold">{violationLabel(product.violationType)}</p>
          <p className="mt-1">{product.statusReason}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canBan(product.status) && (
          <button
            type="button"
            onClick={() => onBan(product)}
            className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <Prohibit size={16} weight="bold" />
            Gỡ sản phẩm
          </button>
        )}
        {canRestore(product.status) && (
          <button
            type="button"
            onClick={() => onRestore(product)}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 dark:bg-indigo-500"
          >
            <ArrowCounterClockwise size={16} weight="bold" />
            Khôi phục
          </button>
        )}
      </div>

      <section>
        <h4 className="mb-2 text-sm font-bold">Mô tả</h4>
        {detail.description === '' && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Shop chưa nhập mô tả.</p>
        )}
        {detail.description !== '' && (
          <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-700 dark:text-zinc-300">
            {detail.description}
          </p>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-sm font-bold">Biến thể ({variants.length})</h4>
        <ul className="divide-y divide-zinc-100 rounded-2xl bg-white/70 dark:divide-white/10 dark:bg-white/5">
          {variants.map(function (variant) {
            return (
              <li
                key={variant.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-semibold">
                    {variant.size} / {variant.color}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {variant.sku}
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatVnd(variant.price ?? 0)}
                  <span className="ml-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Tồn {variant.stockQuantity ?? 0}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <ClockCounterClockwise size={16} weight="bold" />
          Lịch sử kiểm duyệt
        </h4>
        {history.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Chưa có thao tác kiểm duyệt nào.
          </p>
        )}
        {history.length > 0 && (
          <ol className="space-y-3 border-l-2 border-zinc-200 pl-4 dark:border-white/10">
            {history.map(function (entry, index) {
              return (
                <li key={`${entry.createdAt}-${index}`} className="text-sm">
                  <p className="font-bold">{historyTitle(entry)}</p>
                  {entry.reason !== '' && (
                    <p className="text-zinc-700 dark:text-zinc-300">{entry.reason}</p>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {entry.changedByEmail ?? 'Không rõ'} · {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

/** Bảng trượt bên phải: đủ thông tin để admin đánh giá trước khi gỡ. */
export default function AdminProductDetailPanel({ productId, onClose, onBan, onRestore }: Props) {
  const query = useGetAdminProduct(productId)

  let body = <p className="text-sm text-zinc-500 dark:text-zinc-400">Đang tải…</p>
  if (query.isError) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">
        {hookErrorMessage('adminProductDetail', query.error)}
      </p>
    )
  }
  if (query.isSuccess) {
    body = <DetailBody detail={takeData(query.data)} onBan={onBan} onRestore={onRestore} />
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-40 m-0 flex h-full max-h-none w-full max-w-none justify-end border-0 bg-transparent p-0 text-inherit"
      aria-label="Chi tiết sản phẩm"
    >
      <button
        type="button"
        aria-label="Đóng chi tiết"
        onClick={onClose}
        className="absolute inset-0 cursor-default border-0 bg-black/40 backdrop-blur-xs"
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-[#f6f9ff] shadow-2xl dark:bg-[#0a0f1e]">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-white/10">
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-400">
            Chi tiết sản phẩm
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-white/10"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{body}</div>
      </aside>
    </dialog>
  )
}
