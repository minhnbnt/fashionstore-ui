import { Link } from 'react-router'

import { Heart } from '@phosphor-icons/react'

import { hookErrorMessage, imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import WishlistButton from '../components/WishlistButton'
import { useWishlist } from '../hooks/useWishlist'

import type { WishlistItemResponse } from '@generated/model/wishlistItemResponse'

function WishlistCard(props: { item: WishlistItemResponse }) {
  const item = props.item
  const href = '/product/' + (item.productId ?? '')
  const unavailable = item.available === false

  let imageClass = 'aspect-[4/5] w-full object-cover'
  if (unavailable) {
    imageClass = 'aspect-[4/5] w-full object-cover opacity-40 grayscale'
  }

  let priceLabel = 'Liên hệ'
  if (item.minPrice !== null && item.minPrice !== undefined) {
    priceLabel = formatVnd(item.minPrice)
  }

  return (
    <article className="group overflow-hidden rounded-3xl border border-sky-100 bg-white/80 shadow-sm transition hover:shadow-xl hover:shadow-sky-200 dark:border-white/10 dark:bg-white/5 dark:hover:shadow-black/50">
      <div className="relative">
        <Link to={href}>
          <img
            src={imageUrl(item.defaultImageKey)}
            alt={item.name ?? ''}
            loading="lazy"
            width={600}
            height={750}
            onError={function (e) {
              if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                e.currentTarget.src = PLACEHOLDER_IMAGE
              }
            }}
            className={imageClass}
          />
        </Link>
        <WishlistButton productId={item.productId} />
        {unavailable && (
          <span className="absolute top-3 left-3 rounded-full bg-zinc-900/80 px-3 py-1 text-xs font-bold text-white">
            Không còn bán
          </span>
        )}
      </div>
      <div className="p-4">
        <Link to={href}>
          <h3 className="truncate text-sm font-bold hover:underline">{item.name}</h3>
        </Link>
        <p className="mt-2 font-extrabold text-blue-700 dark:text-sky-300">{priceLabel}</p>
        {unavailable && item.unavailableReason !== undefined && item.unavailableReason !== null && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.unavailableReason}</p>
        )}
      </div>
    </article>
  )
}

export default function Wishlist() {
  const { error, isError, isLoading, items, refetch } = useWishlist()

  let body = (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
      {[0, 1, 2, 3].map(function (index) {
        return (
          <div
            key={index}
            className="aspect-[3/4] animate-pulse rounded-3xl bg-white/60 dark:bg-white/5"
          />
        )
      })}
    </div>
  )

  if (isError) {
    body = (
      <div className="glass rounded-3xl px-6 py-12 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('wishlist', error)}
        </p>
        <button
          type="button"
          onClick={function () {
            void refetch()
          }}
          className="mt-3 rounded-full px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (isLoading === false && isError === false && items.length === 0) {
    body = (
      <div className="glass rounded-3xl px-6 py-16 text-center">
        <Heart size={40} weight="duotone" className="mx-auto text-rose-400" />
        <p className="mt-3 font-bold">Chưa có sản phẩm yêu thích</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Nhấn vào trái tim trên sản phẩm để lưu lại.
        </p>
        <Link
          to="/"
          className="btn-primary mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-bold"
        >
          Xem sản phẩm
        </Link>
      </div>
    )
  }

  if (items.length > 0) {
    body = (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map(function (item, index) {
          return <WishlistCard key={item.productId ?? index} item={item} />
        })}
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[110px] pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
            <Heart size={22} weight="fill" className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tighter">Sản phẩm yêu thích</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{items.length} sản phẩm</p>
          </div>
        </div>
      </div>

      <div className="mt-6">{body}</div>
    </main>
  )
}
