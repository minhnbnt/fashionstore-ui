import { Link } from 'react-router'

import { useDetail1 } from '@generated/endpoints/products/products'
import { ArrowSquareOut, ShoppingBagOpen } from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'

export interface ChatProductItem {
  id?: string
  name?: string
  slug?: string
  defaultImageKey?: string | null
  minPrice?: number | null
  maxPrice?: number | null
}

export interface ChatProductCardProps {
  slug?: string
  product?: ChatProductItem
  onSendProduct?: (product: { id: string; name: string; slug?: string }) => void
}

export default function ChatProductCard(props: ChatProductCardProps) {
  const { slug, onSendProduct } = props
  const query = useDetail1(slug ?? '', {
    query: { enabled: !props.product && !!slug },
  })

  let product = props.product
  if (!product && query.data) {
    const data = takeData(query.data)
    const prices = (data.variants ?? [])
      .map(function (v) {
        return v.price
      })
      .filter(function (p): p is number {
        return typeof p === 'number'
      })

    const firstImage = data.images?.[0]
    const s3Key = firstImage?.s3Key ?? undefined

    product = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      defaultImageKey: s3Key,
      minPrice: prices.length > 0 ? Math.min(...prices) : undefined,
      maxPrice: prices.length > 0 ? Math.max(...prices) : undefined,
    }
  }

  if (!product) {
    if (query.isPending) {
      return (
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-white/10 dark:bg-zinc-800">
          <ShoppingBagOpen className="h-4 w-4 animate-spin text-zinc-400" />
          <span>Đang tải thông tin sản phẩm…</span>
        </div>
      )
    }
    return null
  }

  const productLink = '/product/' + (product.id || product.slug || '')
  let priceText = ''
  if (product.minPrice !== undefined && product.minPrice !== null) {
    if (
      product.maxPrice !== undefined &&
      product.maxPrice !== null &&
      product.maxPrice > product.minPrice
    ) {
      priceText = formatVnd(product.minPrice) + ' - ' + formatVnd(product.maxPrice)
    } else {
      priceText = formatVnd(product.minPrice)
    }
  }

  return (
    <div
      data-testid="chat-product-card"
      className="flex w-full items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-2.5 transition hover:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
    >
      <Link to={productLink} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <img
          src={imageUrl(product.defaultImageKey)}
          alt=""
          loading="lazy"
          width={56}
          height={70}
          onError={function (e) {
            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
              e.currentTarget.src = PLACEHOLDER_IMAGE
            }
          }}
          className="h-[70px] w-14 rounded-xl object-cover"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={productLink}
          className="block truncate text-xs font-bold text-zinc-900 hover:text-sky-600 dark:text-white dark:hover:text-sky-400"
        >
          {product.name}
        </Link>
        {priceText && (
          <p className="mt-1 text-xs font-extrabold text-sky-700 dark:text-sky-300">{priceText}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Link
            to={productLink}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 dark:border-white/10 dark:bg-white/10 dark:text-sky-300"
          >
            <span>Xem chi tiết</span>
            <ArrowSquareOut className="h-3 w-3" />
          </Link>
          {onSendProduct && product.id && product.name && (
            <button
              type="button"
              onClick={() => {
                if (product?.id && product?.name) {
                  onSendProduct({ id: product.id, name: product.name, slug: product.slug })
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-sky-700"
            >
              Gửi vào chat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
