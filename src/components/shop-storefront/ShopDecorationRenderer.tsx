import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  useGetShopCategories,
  useGetShopProducts,
} from '@generated/endpoints/shops-catalog/shops-catalog'
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  Pause,
  Play,
  Sparkle,
  SquaresFour,
  VideoCamera,
} from '@phosphor-icons/react'

import { ProductCard, type ProductCardItem } from '@/components/ui/ProductCard'
import {
  fallbackImageOnError,
  hookErrorMessage,
  PLACEHOLDER_IMAGE,
  takeData,
  urlOrPlaceholder,
} from '@/lib/api/apiAdapters'
import { isInternalLink } from '@/lib/content/siteContent'
import { CARD_CLASS, cn, FOCUS_RING_CLASS, iconChipClass } from '@/lib/ui/styles'

import type { DecorationBlock } from '@/types/seller'
import type { PageResponseProductResponse } from '@generated/model/pageResponseProductResponse'
import type { ProductResponse } from '@generated/model/productResponse'
import type { ShopCategorySummaryResponse } from '@generated/model/shopCategorySummaryResponse'

interface ShopDecorationRendererProps {
  blocks: DecorationBlock[]
  shopId: string
  onSelectCategory?: (categoryId: string) => void
  onViewAllProducts?: () => void
}

function toProductCardItem(p: ProductResponse): ProductCardItem {
  let defaultImageUrl: string | null = null
  if (p.images !== undefined && p.images.length > 0) {
    const firstImg = p.images[0]
    if (firstImg?.url !== undefined && firstImg.url !== '') {
      defaultImageUrl = firstImg.url
    }
  }

  let minPrice: number | null = null
  let compareAtPrice: number | null = null
  let totalStock: number | null = null

  if (p.variants !== undefined && p.variants.length > 0) {
    const prices = p.variants.map((v) => v.price ?? 0).filter((pr) => pr > 0)
    if (prices.length > 0) {
      minPrice = Math.min(...prices)
    }
    const defaultVar = p.variants.find((v) => v.defaultVariant) ?? p.variants[0]
    if (
      defaultVar?.compareAtPrice !== undefined &&
      defaultVar.compareAtPrice !== null &&
      minPrice !== null &&
      defaultVar.compareAtPrice > minPrice
    ) {
      compareAtPrice = defaultVar.compareAtPrice
    }
    const hasStockInfo = p.variants.some((v) => v.stockQuantity !== undefined)
    if (hasStockInfo) {
      totalStock = p.variants.reduce((acc, v) => acc + (v.stockQuantity ?? 0), 0)
    }
  }

  return {
    id: p.id ?? '',
    name: p.name ?? 'Sản phẩm',
    defaultImageUrl,
    minPrice,
    compareAtPrice,
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
    totalStock,
  }
}

function BannerAnchor(props: {
  linkUrl: string | undefined
  className: string
  children: React.ReactNode
}) {
  const link = props.linkUrl ?? ''
  if (link === '') {
    return <div className={props.className}>{props.children}</div>
  }
  if (isInternalLink(link)) {
    return (
      <Link to={link} className={props.className}>
        {props.children}
      </Link>
    )
  }
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={props.className}>
      {props.children}
    </a>
  )
}

function BannerSliderBlock({ block }: { block: DecorationBlock }) {
  const banners = block.banners ?? []
  const [currentIdx, setCurrentIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (banners.length <= 1 || paused) return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) return

    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % banners.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [banners.length, paused])

  if (banners.length === 0) {
    return null
  }

  const safeIdx = currentIdx % banners.length
  const activeBanner = banners[safeIdx] ?? banners[0]
  let imageSrc = PLACEHOLDER_IMAGE
  if (activeBanner !== undefined) {
    // imageUrl trong draft là URL public đầy đủ (từ PresignResponse.publicUrl)
    imageSrc = urlOrPlaceholder(activeBanner.imageUrl)
  }

  const handlePrevSlide = () => {
    setCurrentIdx((prev) => {
      if (prev === 0) {
        return banners.length - 1
      }
      return prev - 1
    })
  }

  let pauseLabel = 'Dừng tự chuyển banner'
  if (paused) {
    pauseLabel = 'Tiếp tục tự chuyển banner'
  }

  const hasLink =
    activeBanner?.linkUrl !== undefined &&
    activeBanner.linkUrl !== null &&
    activeBanner.linkUrl !== ''

  return (
    <div
      aria-roledescription="carousel"
      aria-label={block.title || 'Banner gian hàng'}
      className="relative overflow-hidden rounded-3xl bg-zinc-900 shadow-md"
    >
      <div className="relative aspect-[3/1] min-h-[180px] w-full overflow-hidden">
        <BannerAnchor linkUrl={activeBanner?.linkUrl} className="block h-full w-full">
          <img
            src={imageSrc}
            alt={activeBanner?.title ?? block.title}
            onError={fallbackImageOnError}
            className={cn(
              'h-full w-full object-cover',
              hasLink &&
                'motion-safe:transition-transform motion-safe:duration-700 hover:scale-105',
            )}
          />
        </BannerAnchor>

        {/* Title overlay: pointer-events-none so underlying banner link clicks work */}
        {activeBanner?.title && (
          <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 text-white">
            <h3 className="text-lg font-bold drop-shadow-md sm:text-2xl">{activeBanner.title}</h3>
          </div>
        )}
      </div>

      {/* Navigation Arrows & Pause Toggle */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevSlide}
            className={cn(
              'absolute top-1/2 left-3 -translate-y-1/2 cursor-pointer rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/75',
              FOCUS_RING_CLASS,
            )}
            aria-label="Banner trước"
          >
            <CaretLeft size={20} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIdx((prev) => (prev + 1) % banners.length)}
            className={cn(
              'absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/75',
              FOCUS_RING_CLASS,
            )}
            aria-label="Banner sau"
          >
            <CaretRight size={20} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setPaused(paused === false)}
            aria-label={pauseLabel}
            className={cn(
              'absolute right-3 bottom-3 cursor-pointer rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/75',
              FOCUS_RING_CLASS,
            )}
          >
            {paused && <Play size={14} weight="fill" />}
            {paused === false && <Pause size={14} weight="fill" />}
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <div className="absolute right-0 bottom-2 left-0 flex justify-center gap-0.5">
          {banners.map((b, idx) => {
            const isCurrent = idx === safeIdx
            let dotClass = 'block h-2 w-2 rounded-full bg-white/55 transition-all'
            if (isCurrent) {
              dotClass = 'block h-2 w-6 rounded-full bg-white shadow transition-all'
            }
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                aria-label={`Xem banner ${idx + 1}`}
                aria-current={isCurrent}
                className={cn(
                  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full',
                  FOCUS_RING_CLASS,
                )}
              >
                <span className={dotClass} />
              </button>
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
  let collectionType: 'NEW_ARRIVALS' | 'BEST_SELLER' | 'SALE_OFF' = 'NEW_ARRIVALS'
  if (block.collectionType === 'BEST_SELLER' || block.collectionType === 'SALE_OFF') {
    collectionType = block.collectionType
  }

  const productsQuery = useGetShopProducts(
    shopId,
    {
      collection: collectionType,
      limit,
    },
    {
      query: {
        enabled: shopId !== '',
      },
    },
  )

  let pageData: PageResponseProductResponse | null = null
  if (productsQuery.data !== undefined && productsQuery.data.status === 200) {
    pageData = takeData(productsQuery.data)
  }

  const items = pageData?.items ?? []

  // API lỗi thì báo lỗi thay vì tự biến mất im lặng
  if (productsQuery.isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {hookErrorMessage('shops-catalog', productsQuery.error)}
        </p>
      </div>
    )
  }

  // Auto-hide when no products match this smart collection
  if (!productsQuery.isLoading && items.length === 0) {
    return null
  }

  return (
    <div className={cn(CARD_CLASS, 'space-y-4 p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
            <Sparkle size={14} weight="fill" />
            {badgeText}
          </span>
          <h2 className="text-lg font-bold text-[#17203a] dark:text-zinc-100">{block.title}</h2>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-full text-xs font-bold text-blue-700 transition-colors hover:underline dark:text-sky-300',
              FOCUS_RING_CLASS,
            )}
          >
            <span>Xem tất cả ({items.length})</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((prod) => (
          <ProductCard key={prod.id} item={toProductCardItem(prod)} showShop={false} />
        ))}
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
    <div className={cn(CARD_CLASS, 'space-y-4 p-6')}>
      <div className="flex items-center gap-2">
        <SquaresFour size={20} className="text-blue-700 dark:text-sky-300" />
        <h2 className="text-base font-bold text-[#17203a] dark:text-zinc-100">
          {block.title || 'Danh Mục Nổi Bật Của Shop'}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              if (onSelectCategory && c.id !== undefined) {
                onSelectCategory(c.id)
              }
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-400/40 dark:hover:bg-white/10',
              FOCUS_RING_CLASS,
            )}
          >
            <span className={cn(iconChipClass(), 'h-12 w-12 rounded-2xl')}>
              <SquaresFour size={24} />
            </span>
            <span className="text-xs font-semibold text-[#17203a] dark:text-zinc-200">
              {c.name}
            </span>
            <span className="text-[10px] text-zinc-500 tabular-nums dark:text-zinc-400">
              {c.productCount} sản phẩm
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// NOTE: Block FLASH_SALE đã bị xoá hoàn toàn (type + parser) — BE chưa có API
// khuyến mãi, block cũ render dữ liệu mock cứng (ảnh picsum, giá 199.000đ) lên
// storefront công khai. Layout legacy chứa block này bị bỏ qua lúc parse
// (allowedTypes trong lib/sellerAdapters.ts).

export default function ShopDecorationRenderer({
  blocks,
  shopId,
  onSelectCategory,
  onViewAllProducts,
}: ShopDecorationRendererProps) {
  const activeBlocks = blocks.filter((b) => b.enabled)

  if (activeBlocks.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-200 bg-white/60 p-12 text-center text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
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
        if (b.type === 'VIDEO') {
          // Block chưa gắn video thì bỏ qua, đừng render hộp rỗng cho buyer
          if (b.videoUrl === undefined || b.videoUrl === '') {
            return null
          }
          return <VideoBlock key={b.id} block={b} />
        }
        return null
      })}
    </div>
  )
}

/** Block VIDEO: một video do seller upload qua presign, stream thẳng từ S3. */
function VideoBlock({ block }: { block: DecorationBlock }) {
  let bodyPadding = 'p-4'
  if (block.title !== '') {
    bodyPadding = 'p-4 pt-3'
  }

  return (
    <div className={cn(CARD_CLASS, 'overflow-hidden')}>
      {block.title !== '' && (
        <div className="flex items-center gap-2 px-5 pt-4">
          <VideoCamera size={18} weight="fill" className="text-blue-700 dark:text-sky-300" />
          <h2 className="text-base font-extrabold text-[#17203a] sm:text-lg dark:text-white">
            {block.title}
          </h2>
        </div>
      )}
      <div className={bodyPadding}>
        {block.videoUrl !== undefined && block.videoUrl !== '' && (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- video do merchant tự upload, không có file phụ đề để gắn track
          <video
            src={urlOrPlaceholder(block.videoUrl)}
            controls
            playsInline
            preload="none"
            className="aspect-video w-full rounded-2xl bg-black object-contain"
          />
        )}
      </div>
    </div>
  )
}
