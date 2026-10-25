import { Link, useNavigate } from 'react-router'

import { Heart, ShoppingBag } from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'

function priceLabel(p: ProductSummaryResponse): string {
  if (p.minPrice !== undefined && p.minPrice !== null) {
    return formatVnd(p.minPrice)
  }
  return 'Liên hệ'
}

// Hàng ngang cho chế độ xem danh sách: ảnh trái, tên + giá phải.
export default function ProductRow(props: { item: ProductSummaryResponse }) {
  const p = props.item
  const navigate = useNavigate()
  return (
    <article className="group flex gap-4 rounded-3xl border border-sky-100 bg-white/80 p-3 shadow-sm transition hover:shadow-lg hover:shadow-sky-100 dark:border-white/10 dark:bg-white/5 dark:hover:shadow-black/50">
      <div className="relative shrink-0">
        <Link to={'/product/' + p.id}>
          <img
            src={imageUrl(p.defaultImageKey)}
            alt={p.name}
            loading="lazy"
            width={600}
            height={750}
            onError={function (e) {
              if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                e.currentTarget.src = PLACEHOLDER_IMAGE
              }
            }}
            className="aspect-[4/5] w-24 rounded-2xl object-cover md:w-36"
          />
        </Link>
        <button
          type="button"
          aria-label="Yêu thích"
          className="glass absolute top-2 right-2 rounded-full p-1.5"
        >
          <Heart size={14} />
        </button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <Link to={'/product/' + p.id}>
          <h3 className="line-clamp-2 text-sm font-bold hover:underline md:text-base">{p.name}</h3>
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span className="font-extrabold text-sky-700 dark:text-sky-300">{priceLabel(p)}</span>
          <button
            type="button"
            onClick={function () {
              void navigate('/product/' + (p.id ?? ''))
            }}
            className="btn-primary flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
          >
            <ShoppingBag size={14} weight="fill" />
            Thêm giỏ
          </button>
        </div>
      </div>
    </article>
  )
}
