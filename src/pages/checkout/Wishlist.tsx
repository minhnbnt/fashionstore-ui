import { Link } from 'react-router'

import { Heart } from '@phosphor-icons/react'

import AccountLayout from '@/components/account/AccountLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import ProductCard from '@/components/ui/ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import StatePanel from '@/components/ui/StatePanel'
import WishlistButton from '@/components/WishlistButton'
import { useWishlist } from '@/hooks/useWishlist'
import { fallbackImageOnError, hookErrorMessage, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { formatVnd } from '@/lib/format'
import { CARD_CLASS, cn } from '@/lib/ui/styles'

import type { WishlistItemResponse } from '@generated/model/wishlistItemResponse'

function UnavailableWishlistCard(props: { item: WishlistItemResponse }) {
  const item = props.item
  let priceLabel = 'Liên hệ'
  if (item.minPrice !== null && item.minPrice !== undefined) {
    priceLabel = formatVnd(item.minPrice)
  }

  return (
    <article className={cn(CARD_CLASS, 'flex h-full flex-col overflow-hidden opacity-85')}>
      <div className="relative overflow-hidden bg-zinc-100/80 dark:bg-white/5">
        <img
          src={urlOrPlaceholder(item.defaultImageUrl)}
          alt={item.name ?? 'Sản phẩm không còn bán'}
          loading="lazy"
          width={600}
          height={750}
          onError={fallbackImageOnError}
          className="aspect-[4/5] w-full object-cover opacity-45 grayscale"
        />
        <WishlistButton productId={item.productId} />
        <span className="absolute top-2.5 left-2.5 rounded-full bg-zinc-900/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
          Không còn bán
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-bold text-zinc-500 dark:text-zinc-400">
          {item.name}
        </h3>
        <div className="mt-auto pt-2.5">
          <p className="text-base font-extrabold text-zinc-400 tabular-nums line-through dark:text-zinc-500">
            {priceLabel}
          </p>
          {item.unavailableReason !== undefined &&
            item.unavailableReason !== null &&
            item.unavailableReason !== '' && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {item.unavailableReason}
              </p>
            )}
        </div>
      </div>
    </article>
  )
}

export default function Wishlist() {
  const { isLoggedIn, error, isError, isLoading, items, refetch } = useWishlist()

  const breadcrumbs = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Tài khoản', to: '/account' },
    { label: 'Sản phẩm yêu thích' },
  ]

  if (!isLoggedIn) {
    return (
      <AccountLayout breadcrumbs={breadcrumbs}>
        <StatePanel
          title="Bạn chưa đăng nhập"
          description="Đăng nhập để xem và quản lý danh sách sản phẩm yêu thích của bạn."
          action={
            <Link
              to="/login"
              className="btn-primary mt-5 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold"
            >
              Đăng nhập ngay
            </Link>
          }
        />
      </AccountLayout>
    )
  }

  let body = (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3" aria-busy="true">
      {[0, 1, 2, 3, 4, 5].map(function (index) {
        return <ProductCardSkeleton key={index} />
      })}
    </div>
  )

  if (isError) {
    body = (
      <div className="glass rounded-3xl px-6 py-12 text-center dark:bg-[#11182a]">
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {hookErrorMessage('wishlist', error)}
        </p>
        <button
          type="button"
          onClick={function () {
            void refetch()
          }}
          className="btn-primary mt-4 cursor-pointer rounded-full px-5 py-2 text-sm font-bold"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (isLoading === false && isError === false && items.length === 0) {
    body = (
      <EmptyState
        icon={<Heart size={28} weight="duotone" className="text-rose-500" />}
        title="Chưa có sản phẩm yêu thích"
        description="Nhấn vào biểu tượng trái tim trên sản phẩm để lưu lại và xem nhanh bất cứ lúc nào."
        action={
          <Link
            to="/search"
            className="btn-primary inline-flex rounded-full px-5 py-2.5 text-sm font-bold"
          >
            Khám phá sản phẩm
          </Link>
        }
      />
    )
  }

  if (items.length > 0) {
    body = (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map(function (item, index) {
          if (item.available === false) {
            return <UnavailableWishlistCard key={item.productId ?? index} item={item} />
          }
          return (
            <ProductCard
              key={item.productId ?? index}
              item={{
                id: item.productId,
                name: item.name,
                minPrice: item.minPrice,
                defaultImageUrl: item.defaultImageUrl,
              }}
              showShop={false}
              showWishlist={true}
            />
          )
        })}
      </div>
    )
  }

  return (
    <AccountLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
            <Heart size={22} weight="fill" className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#17203a] dark:text-white">
              Sản phẩm yêu thích
            </h1>
            <p className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
              {items.length} sản phẩm
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">{body}</div>
    </AccountLayout>
  )
}
