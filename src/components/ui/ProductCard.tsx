import { Link } from 'react-router'

import { Star, Storefront } from '@phosphor-icons/react'

import WishlistButton from '@/components/WishlistButton'
import { fallbackImageOnError, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { formatVnd, priceLabel } from '@/lib/format'
import { CARD_CLASS, cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

export interface ProductCardItem {
  id?: string
  name?: string | null
  minPrice?: number | null
  compareAtPrice?: number | null
  defaultImageUrl?: string | null
  averageRating?: number | null
  reviewCount?: number | null
  soldCount?: number | null
  shopName?: string | null
  shopSlug?: string | null
  totalStock?: number | null
}

export interface ProductCardProps {
  item: ProductCardItem
  density?: 'default' | 'compact'
  showShop?: boolean
  showWishlist?: boolean
  className?: string
}

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

export function ProductCard({
  item,
  density = 'default',
  showShop = true,
  showWishlist = true,
  className,
}: ProductCardProps) {
  const productId = item.id ?? ''
  const productHref = '/product/' + productId
  const discountPct = discountPercentOf(item.minPrice, item.compareAtPrice)
  const isOutOfStock =
    item.totalStock !== null && item.totalStock !== undefined && item.totalStock <= 0
  const hasRating =
    item.averageRating !== null && item.averageRating !== undefined && item.averageRating > 0
  const soldCount = item.soldCount ?? 0
  const hasShopName =
    showShop && item.shopName !== null && item.shopName !== undefined && item.shopName !== ''

  let bodyPadding = 'p-3.5 sm:p-4'
  if (density === 'compact') {
    bodyPadding = 'p-3'
  }

  return (
    <article
      className={cn(
        CARD_CLASS,
        'group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/70 hover:shadow-xl hover:shadow-indigo-900/10 dark:hover:border-sky-400/35 dark:hover:shadow-black/50',
        className,
      )}
    >
      <div className="relative overflow-hidden bg-zinc-100/80 dark:bg-white/5">
        <Link to={productHref} className={cn('block overflow-hidden', FOCUS_RING_CLASS)}>
          <img
            src={urlOrPlaceholder(item.defaultImageUrl)}
            alt={item.name ?? 'Sản phẩm DHMQ'}
            loading="lazy"
            width={600}
            height={750}
            onError={fallbackImageOnError}
            className={cn(
              'aspect-[4/5] w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:scale-[1.03]',
              isOutOfStock && 'opacity-70 grayscale-[25%]',
            )}
          />
        </Link>

        {/* Top-left badges */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {discountPct !== null && (
            <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white tabular-nums shadow-sm">
              -{discountPct}%
            </span>
          )}
          {isOutOfStock && (
            <span className="inline-flex items-center rounded-full bg-zinc-900/85 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs">
              Hết hàng
            </span>
          )}
        </div>

        {showWishlist && <WishlistButton productId={item.id} />}
      </div>

      <div className={cn('flex flex-1 flex-col', bodyPadding)}>
        {hasShopName && (
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            <Storefront
              size={12}
              weight="bold"
              className="shrink-0 text-blue-600 dark:text-sky-400"
            />
            <span className="truncate">{item.shopName}</span>
          </div>
        )}

        <Link to={productHref} className={cn('block rounded-2xl', FOCUS_RING_CLASS)}>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-bold text-[#17203a] transition-colors group-hover:text-blue-700 dark:text-[#e2e8f0] dark:group-hover:text-sky-300">
            {item.name}
          </h3>
        </Link>

        <div className="mt-auto pt-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-base font-extrabold tracking-tight text-blue-700 tabular-nums dark:text-sky-300">
              {priceLabel(item.minPrice)}
            </span>
            {discountPct !== null &&
              item.compareAtPrice !== null &&
              item.compareAtPrice !== undefined && (
                <span className="text-xs font-medium text-zinc-500 tabular-nums line-through dark:text-zinc-400">
                  {formatVnd(item.compareAtPrice)}
                </span>
              )}
          </div>

          {(hasRating || soldCount > 0) && (
            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              {hasRating && (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                  <Star size={13} weight="fill" className="text-amber-400" />
                  <span>{(item.averageRating ?? 0).toFixed(1)}</span>
                </span>
              )}
              {soldCount > 0 && (
                <span className="ml-auto text-[11px] font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                  Đã bán {formatSoldCount(soldCount)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default ProductCard
