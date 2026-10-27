import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  CaretLeft,
  CaretRight,
  Lightning,
  Sparkle,
  SquaresFour,
  ArrowRight,
} from '@phosphor-icons/react'

import {
  useGetShopCategories,
  useGetShopProducts,
} from '@generated/endpoints/shops-catalog/shops-catalog'
import { imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import type { DecorationBlock } from '@/types/seller'
import type { ProductResponse } from '@generated/model/productResponse'
import type { ShopCategorySummaryResponse } from '@generated/model/shopCategorySummaryResponse'

interface ShopDecorationRendererProps {
  blocks: DecorationBlock[]
  shopId: string
  onSelectCategory?: (categoryId: string) => void
  onViewAllProducts?: () => void
}

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.onerror = null
  e.currentTarget.src = PLACEHOLDER_IMAGE
}

function getProductDisplayInfo(p: ProductResponse) {
  let imageSrc = PLACEHOLDER_IMAGE
  if (p.images !== undefined && p.images.length > 0) {
    const firstImg = p.images[0]
    if (firstImg?.url !== undefined && firstImg.url !== '') {
      imageSrc = firstImg.url
    } else if (firstImg?.imageKey !== undefined && firstImg.imageKey !== '') {
      imageSrc = imageUrl(firstImg.imageKey)
    }
  }

  let minPrice = 0
  let comparePrice: number | null = null
  if (p.variants !== undefined && p.variants.length > 0) {
    const prices = p.variants
      .map((v) => v.price ?? 0)
      .filter((pr) => pr > 0)
    if (prices.length > 0) {
      minPrice = Math.min(...prices)
    }
    const defaultVar = p.variants.find((v) => v.defaultVariant) ?? p.variants[0]
    if (
      defaultVar?.compareAtPrice !== undefined &&
      defaultVar.compareAtPrice !== null &&
      defaultVar.compareAtPrice > minPrice
    ) {
      comparePrice = defaultVar.compareAtPrice
    }
  }

  let discountPercent = 0
  if (comparePrice !== null && comparePrice > minPrice && minPrice > 0) {
    discountPercent = Math.round((1 - minPrice / comparePrice) * 100)
  }

  return {
    id: p.id ?? '',
    name: p.name ?? 'Sản phẩm',
    imageSrc,
    minPrice,
    comparePrice,
    discountPercent,
  }
}

function BannerSliderBlock({ block }: { block: DecorationBlock }) {
  const banners = block.banners ?? []
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) return

    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % banners.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [banners.length])

  if (banners.length === 0) {
    return null
  }

  const activeBanner = banners[currentIdx] ?? banners[0]
  let imageSrc = PLACEHOLDER_IMAGE
  if (activeBanner?.imageKey !== undefined && activeBanner.imageKey !== '') {
    if (activeBanner.imageKey.startsWith('http')) {
      imageSrc = activeBanner.imageKey
    } else {
      imageSrc = imageUrl(activeBanner.imageKey)
    }
  }

  const handlePrevSlide = () => {
    setCurrentIdx((prev) => {
      if (prev === 0) {
        return banners.length - 1
      }
      return prev - 1
    })
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-zinc-900 shadow-md">
      <div className="relative aspect-[3/1] min-h-[180px] w-full overflow-hidden">
        {activeBanner?.linkUrl && (
          <Link to={activeBanner.linkUrl} className="block h-full w-full">
            <img
              src={imageSrc}
              alt={activeBanner.title ?? block.title}
              onError={handleImageError}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </Link>
        )}
        {!activeBanner?.linkUrl && (
          <img
            src={imageSrc}
            alt={activeBanner?.title ?? block.title}
            onError={handleImageError}
            className="h-full w-full object-cover"
          />
        )}

        {/* Title overlay if title exists */}
        {activeBanner?.title && (
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 text-white">
            <h3 className="text-lg font-bold drop-shadow-md sm:text-2xl">{activeBanner.title}</h3>
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevSlide}
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Previous banner"
          >
            <CaretLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIdx((prev) => (prev + 1) % banners.length)}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Next banner"
          >
            <CaretRight size={20} />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <div className="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5">
          {banners.map((b, idx) => {
            let dotClass = 'w-2 bg-white/50 hover:bg-white/80'
            if (idx === currentIdx) {
              dotClass = 'w-6 bg-white shadow'
            }
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={`h-2 rounded-full transition-all ${dotClass}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProductCollectionBlock({
  block,
  shopId,
  onViewAll,
}: {
  block: DecorationBlock
  shopId: string
  onViewAll?: () => void
}) {
  let badgeText = 'MỚI NHẤT'
  if (block.collectionType === 'BEST_SELLER') {
    badgeText = 'BÁN CHẠY NHẤT'
  }
  if (block.collectionType === 'SALE_OFF') {
    badgeText = 'GIẢM GIÁ SÂU'
  }
  if (block.collectionType === 'CUSTOM') {
    badgeText = 'TUYỂN CHỌN'
  }

  const limit = block.itemLimit ?? 8

  const productsQuery = useGetShopProducts(
    shopId,
    {
      collection: block.collectionType ?? 'NEW_ARRIVALS',
      limit,
    },
    {
      query: {
        enabled: shopId !== '',
      },
    },
  )

  interface PageResult {
    items?: ProductResponse[]
    total?: number
  }

  let pageData: PageResult | null = null
  if (productsQuery.data !== undefined && productsQuery.data.status === 200) {
    pageData = takeData(productsQuery.data) as PageResult
  }

  const items = pageData?.items ?? []

  // Auto-hide when no products match this smart collection
  if (!productsQuery.isLoading && items.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <Sparkle size={14} weight="fill" />
            {badgeText}
          </span>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{block.title}</h2>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <span>Xem tất cả ({items.length})</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((prod) => {
          const info = getProductDisplayInfo(prod)
          return (
            <Link
              key={info.id}
              to={`/product/${info.id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-white/10">
                <img
                  src={info.imageSrc}
                  alt={info.name}
                  onError={handleImageError}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {info.discountPercent > 0 && (
                  <span className="absolute top-2 right-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                    -{info.discountPercent}%
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between p-3">
                <h3 className="line-clamp-2 text-xs font-semibold text-zinc-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-indigo-400">
                  {info.name}
                </h3>

                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                    {formatVnd(info.minPrice)}
                  </span>
                  {info.comparePrice !== null && (
                    <span className="text-[11px] text-zinc-400 line-through">
                      {formatVnd(info.comparePrice)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function CategoryGridBlock({
  block,
  shopId,
  onSelectCategory,
}: {
  block: DecorationBlock
  shopId: string
  onSelectCategory?: (categoryId: string) => void
}) {
  const categoriesQuery = useGetShopCategories(shopId, {
    query: {
      enabled: shopId !== '',
    },
  })

  let categories: ShopCategorySummaryResponse[] = []
  if (categoriesQuery.data !== undefined && categoriesQuery.data.status === 200) {
    categories = takeData(categoriesQuery.data)
  }

  if (!categoriesQuery.isLoading && categories.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
      <div className="flex items-center gap-2">
        <SquaresFour size={20} className="text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {block.title || 'Danh Mục Nổi Bật Của Shop'}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              if (onSelectCategory) {
                onSelectCategory(c.id)
              }
            }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-4 text-center transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <SquaresFour size={24} />
            </div>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {c.name}
            </span>
            <span className="text-[10px] text-zinc-400">
              {c.productCount} sản phẩm
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function FlashSaleBlock({ block }: { block: DecorationBlock }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-5 text-white shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightning size={24} weight="fill" className="animate-pulse text-yellow-300" />
          <h2 className="text-lg font-extrabold tracking-wide uppercase sm:text-xl">
            {block.title || 'FLASH SALE GIỜ VÀNG'}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold">
          <span className="rounded bg-black/60 px-2 py-1 text-yellow-300">02</span> :
          <span className="rounded bg-black/60 px-2 py-1 text-yellow-300">45</span> :
          <span className="rounded bg-black/60 px-2 py-1 text-yellow-300">19</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white p-2.5 text-zinc-900 shadow-sm dark:bg-[#11182a] dark:text-white"
          >
            <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-white/10">
              <img
                src={`https://picsum.photos/seed/flashsale${i}/300/300`}
                alt="Flash sale product"
                onError={handleImageError}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white">
                Đã bán 89%
              </span>
            </div>
            <p className="truncate text-xs font-semibold">Ưu Đãi Đặc Biệt #{i}</p>
            <span className="text-sm font-extrabold text-red-600">{formatVnd(199000)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ShopDecorationRenderer({
  blocks,
  shopId,
  onSelectCategory,
  onViewAllProducts,
}: ShopDecorationRendererProps) {
  const activeBlocks = blocks.filter((b) => b.enabled)

  if (activeBlocks.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center text-zinc-400 dark:border-white/10 dark:bg-white/5">
        <p className="text-sm">Gian hàng đang cập nhật trang trí giao diện mới.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {activeBlocks.map((b) => {
        if (b.type === 'BANNER_SLIDER' || b.type === 'BANNER') {
          return <BannerSliderBlock key={b.id} block={b} />
        }
        if (b.type === 'PRODUCT_COLLECTION' || b.type === 'COLLECTION') {
          return (
            <ProductCollectionBlock
              key={b.id}
              block={b}
              shopId={shopId}
              onViewAll={onViewAllProducts}
            />
          )
        }
        if (b.type === 'CATEGORY_GRID') {
          return (
            <CategoryGridBlock
              key={b.id}
              block={b}
              shopId={shopId}
              onSelectCategory={onSelectCategory}
            />
          )
        }
        if (b.type === 'FLASH_SALE') {
          return <FlashSaleBlock key={b.id} block={b} />
        }
        return null
      })}
    </div>
  )
}
