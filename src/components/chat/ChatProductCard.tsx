import { Link } from 'react-router'

import { useDetail1 } from '@generated/endpoints/products/products'
import { ArrowSquareOut, ShoppingBagOpen } from '@phosphor-icons/react'

import { urlOrPlaceholder, PLACEHOLDER_IMAGE, takeData } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'

import { productResponseToChatItem } from './productItem'

import type { ChatProductItem } from './productItem'

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
    product = productResponseToChatItem(takeData(query.data))
  }

  if (!product) {
    if (query.isPending) {
      return (
        <div className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 p-2.5 text-xs text-zinc-500 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
          <div className="flex h-[76px] w-[60px] shrink-0 items-center justify-center rounded-xl bg-[#f6f9ff] dark:bg-white/10">
            <ShoppingBagOpen className="h-5 w-5 animate-pulse text-indigo-400 dark:text-sky-300" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded-full bg-zinc-200 dark:bg-white/10" />
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-zinc-200 dark:bg-white/10" />
            <span className="sr-only">Đang tải thông tin sản phẩm…</span>
          </div>
        </div>
      )
    }
    return null
  }

  const targetRef = product.id || product.slug || ''
  if (targetRef === '') {
    return null
  }

  const productLink = '/product/' + targetRef
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
      className="group flex w-full items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-2.5 shadow-xs transition duration-150 hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#11182a]/90 dark:hover:border-sky-400/40"
    >
      <Link
        to={productLink}
        tabIndex={-1}
        aria-hidden="true"
        className="h-[76px] w-[60px] shrink-0 overflow-hidden rounded-xl border border-zinc-200/60 bg-[#f6f9ff] dark:border-white/10 dark:bg-white/5"
      >
        <img
          src={urlOrPlaceholder(product.defaultImageUrl)}
          alt=""
          loading="lazy"
          width={60}
          height={76}
          onError={function (e) {
            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
              e.currentTarget.src = PLACEHOLDER_IMAGE
            }
          }}
          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={productLink}
          className="block truncate text-[13px] font-bold text-[#17203a] transition group-hover:text-blue-700 dark:text-white dark:group-hover:text-sky-300"
        >
          {product.name}
        </Link>
        {priceText && (
          <p className="mt-0.5 text-[13px] font-extrabold text-indigo-700 tabular-nums dark:text-sky-300">
            {priceText}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            to={productLink}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-bold text-[#17203a] transition hover:border-blue-600 hover:text-blue-700 active:scale-[0.97] dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:hover:border-sky-400"
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
              className="btn-primary inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold active:scale-[0.97]"
            >
              Gửi vào chat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
