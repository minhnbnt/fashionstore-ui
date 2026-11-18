import { Link, useNavigate } from 'react-router'

import { ShoppingBag, Star, Storefront } from '@phosphor-icons/react'

import WishlistButton from '@/components/WishlistButton'
import { fallbackImageOnError, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { formatVnd, priceLabel } from '@/lib/format'
import { CARD_CLASS, cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'

function discountPercentOf(
  minPrice: number | null | undefined,
  compareAt: number | null | undefined,
): number | null {
  if (
    minPrice === null ||
    minPrice === undefined ||
    compareAt === null ||
    compareAt === undefined
  ) {
    return null
  }
  if (compareAt <= minPrice || compareAt <= 0) {
    return null
  }
  const pct = Math.round(((compareAt - minPrice) / compareAt) * 100)
  if (pct <= 0) {
    return null
  }
  return pct
}

function formatSoldCount(count: number): string {
  if (count >= 1000) {
    const k = count / 1000
    let text = k.toFixed(1)
    if (text.endsWith('.0')) {
      text = text.slice(0, -2)
    }
    return `${text}k`
  }
  return String(count)
}

// Hàng ngang cho chế độ xem danh sách: ảnh trái, thông tin + giá + hành động phải.
export default function ProductRow(props: { item: ProductSummaryResponse }) {
  const p = props.item
  const navigate = useNavigate()
  const productId = p.id ?? ''
  const productHref = '/product/' + productId
  const discountPct = discountPercentOf(p.minPrice, p.compareAtPrice)
  const isOutOfStock = p.totalStock !== null && p.totalStock !== undefined && p.totalStock <= 0
  const hasRating = p.averageRating !== null && p.averageRating !== undefined && p.averageRating > 0
  const soldCount = p.soldCount ?? 0
  const hasShopName = p.shopName !== null && p.shopName !== undefined && p.shopName !== ''

  return (
    <article
      className={cn(
        CARD_CLASS,
        'group flex gap-4 p-3 transition-all duration-300 hover:border-blue-300/70 hover:shadow-lg hover:shadow-indigo-900/10 sm:p-4 dark:hover:border-sky-400/35 dark:hover:shadow-black/50',
      )}
    >
      <div className="relative shrink-0 overflow-hidden rounded-2xl bg-zinc-100/80 dark:bg-white/5">
        <Link to={productHref} className={cn('block rounded-2xl', FOCUS_RING_CLASS)}>
          <img
            src={urlOrPlaceholder(p.defaultImageUrl)}
            alt={p.name ?? 'Sản phẩm DHMQ'}
            loading="lazy"
            width={600}
            height={750}
            onError={fallbackImageOnError}
            className={cn(
              'aspect-[4/5] w-24 rounded-2xl object-cover md:w-36',
              isOutOfStock && 'opacity-70 grayscale-[25%]',
            )}
          />
        </Link>
        <div className="pointer-events-none absolute top-2 left-2 flex flex-col gap-1">
          {discountPct !== null && (
            <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white tabular-nums shadow-sm">
              -{discountPct}%
            </span>
          )}
          {isOutOfStock && (
            <span className="inline-flex items-center rounded-full bg-zinc-900/85 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
              Hết hàng
            </span>
          )}
        </div>
        <WishlistButton productId={p.id} variant="icon" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="space-y-1.5">
          {hasShopName && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <Storefront
                size={13}
                weight="bold"
                className="shrink-0 text-blue-600 dark:text-sky-400"
              />
              <span className="truncate">{p.shopName}</span>
            </div>
          )}

          <Link to={productHref} className={cn('block rounded-2xl', FOCUS_RING_CLASS)}>
            <h3 className="line-clamp-2 text-sm font-bold text-[#17203a] transition-colors group-hover:text-blue-700 md:text-base dark:text-[#e2e8f0] dark:group-hover:text-sky-300">
              {p.name}
            </h3>
          </Link>

          {(hasRating || soldCount > 0) && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
              {hasRating && (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                  <Star size={14} weight="fill" className="text-amber-400" />
                  <span>{(p.averageRating ?? 0).toFixed(1)}</span>
                </span>
              )}
              {soldCount > 0 && (
                <span className="text-zinc-500 tabular-nums dark:text-zinc-400">
                  Đã bán {formatSoldCount(soldCount)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-extrabold text-blue-700 tabular-nums md:text-lg dark:text-sky-300">
              {priceLabel(p.minPrice)}
            </span>
            {discountPct !== null &&
              p.compareAtPrice !== null &&
              p.compareAtPrice !== undefined && (
                <span className="text-xs font-medium text-zinc-500 tabular-nums line-through dark:text-zinc-400">
                  {formatVnd(p.compareAtPrice)}
                </span>
              )}
          </div>

          <button
            type="button"
            onClick={function () {
              void navigate(productHref)
            }}
            className={cn(
              'btn-primary inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-bold',
              FOCUS_RING_CLASS,
            )}
          >
            <ShoppingBag size={14} weight="fill" />
            Chọn phân loại
          </button>
        </div>
      </div>
    </article>
  )
}
