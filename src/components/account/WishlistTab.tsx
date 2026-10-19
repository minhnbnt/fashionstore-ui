import { Link } from 'react-router'

import { ArrowRight, Heart, HeartBreak, ShoppingBag } from '@phosphor-icons/react'

import { useWishlist } from '@/hooks/useWishlist'
import { imageUrl } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

export default function WishlistTab() {
  const wishlist = useWishlist()

  function handleRemove(productId: string | undefined) {
    if (productId === undefined || productId === '') {
      return
    }
    wishlist.remove.mutate({ productId })
  }

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Sản phẩm yêu thích ({wishlist.count})
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Danh sách các sản phẩm bạn đã lưu để xem lại sau
        </p>
      </div>

      {/* Loading state */}
      {wishlist.isLoading && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Đang tải danh sách yêu thích từ CSDL…
          </p>
        </div>
      )}

      {/* Empty state */}
      {wishlist.isLoading === false && wishlist.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400">
            <Heart size={32} weight="duotone" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-white">
            Danh sách yêu thích đang trống
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Hãy nhấn vào biểu tượng trái tim ở các sản phẩm bạn quan tâm để lưu lại và theo dõi biến
            động giá.
          </p>
          <Link
            to="/search"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700"
          >
            <ShoppingBag size={15} weight="bold" />
            <span>Khám phá sản phẩm hot</span>
          </Link>
        </div>
      )}

      {/* Wishlist Grid */}
      {wishlist.isLoading === false && wishlist.items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {wishlist.items.map(function (item) {
            let hasImage = false
            let imgSource = ''
            if (item.defaultImageKey !== null && item.defaultImageKey !== undefined) {
              try {
                imgSource = imageUrl(item.defaultImageKey)
                hasImage = true
              } catch {
                hasImage = false
              }
            }

            return (
              <div
                key={item.productId}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Product Image Link */}
                <Link
                  to={`/products/${item.slug ?? item.productId}`}
                  className="relative aspect-3/4 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                >
                  {hasImage && (
                    <img
                      src={imgSource}
                      alt={item.name ?? 'Sản phẩm'}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                  {hasImage === false && (
                    <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                      <ShoppingBag size={36} weight="duotone" />
                    </div>
                  )}

                  {/* Remove Button on Top Right */}
                  <button
                    type="button"
                    title="Bỏ khỏi yêu thích"
                    onClick={function (e) {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRemove(item.productId)
                    }}
                    disabled={wishlist.remove.isPending}
                    className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-md backdrop-blur-xs transition hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-800/90 dark:hover:bg-rose-500/20"
                  >
                    <HeartBreak size={16} weight="fill" />
                  </button>
                </Link>

                {/* Product Info */}
                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <div>
                    <Link
                      to={`/products/${item.slug ?? item.productId}`}
                      className="line-clamp-2 text-xs font-bold text-zinc-900 hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
                    >
                      {item.name ?? 'Sản phẩm thời trang'}
                    </Link>
                    <p className="mt-1.5 text-sm font-extrabold text-orange-600 dark:text-orange-500">
                      {formatVnd(item.minPrice ?? 0)}
                    </p>
                  </div>

                  <div className="mt-3">
                    <Link
                      to={`/products/${item.slug ?? item.productId}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-50/50 py-1.5 text-xs font-bold text-orange-600 transition hover:bg-orange-600 hover:text-white dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-600 dark:hover:text-white"
                    >
                      <span>Xem ngay</span>
                      <ArrowRight size={12} weight="bold" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
