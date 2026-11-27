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
  Image as ImageIcon,
  Pause,
  Play,
  SquaresFour,
  VideoCamera,
} from '@phosphor-icons/react'

import { ProductCard, type ProductCardItem } from '@/components/ui/ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import {
  fallbackImageOnError,
  hookErrorMessage,
  PLACEHOLDER_IMAGE,
  takeData,
  urlOrPlaceholder,
} from '@/lib/api/apiAdapters'
import { isInternalLink } from '@/lib/content/siteContent'
import { safeBannerLink } from '@/lib/seller/decoration'
import { CARD_CLASS, cn, FOCUS_RING_CLASS, iconChipClass } from '@/lib/ui/styles'

import type { DecorationBlock } from '@/types/seller'
import type { GetShopProductsParams } from '@generated/model/getShopProductsParams'
import type { PageResponseProductResponse } from '@generated/model/pageResponseProductResponse'
import type { ProductResponse } from '@generated/model/productResponse'
import type { ShopCategorySummaryResponse } from '@generated/model/shopCategorySummaryResponse'

interface ShopDecorationRendererProps {
  blocks: DecorationBlock[]
  shopId: string
  onSelectCategory?: (categoryId: string) => void
  onViewAllProducts?: () => void
  /**
   * Chế độ xem trước trong trình trang trí của seller: khối trống (chưa có ảnh, chưa có video,
   * không có sản phẩm khớp) hiện khung gợi ý thay vì ẩn đi như với khách.
   */
  preview?: boolean
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

/** Khung gợi ý chỉ seller thấy trong chế độ xem trước. */
function PreviewPlaceholder(props: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-dashed border-zinc-300 bg-white/60 px-5 py-6 text-left dark:border-white/15 dark:bg-white/[0.03]">
      <span className="text-zinc-400 dark:text-zinc-500">{props.icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[#17203a] dark:text-zinc-100">
          {props.title}
        </span>
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">{props.hint}</span>
      </span>
    </div>
  )
}

function BannerAnchor(props: {
  linkUrl: string | undefined
  className: string
  children: React.ReactNode
}) {
  const link = safeBannerLink(props.linkUrl)
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

function BannerSliderBlock({ block, preview }: { block: DecorationBlock; preview: boolean }) {
  // Slide chưa tải ảnh thì bỏ qua — khách không nên thấy ô placeholder xám trong slider.
  const banners = (block.banners ?? []).filter((b) => b.imageUrl !== '')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (banners.length <= 1 || paused) return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) return

    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length, paused])

  if (banners.length === 0) {
    if (preview) {
      return (
        <PreviewPlaceholder
          icon={<ImageIcon size={22} />}
          title={block.title || 'Banner'}
          hint="Chưa có ảnh nào. Bấm biểu tượng bánh răng để tải banner lên — khách chỉ thấy khối này khi có ảnh."
        />
      )
    }
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

  const hasLink = safeBannerLink(activeBanner?.linkUrl) !== ''
  const slideTitle = activeBanner?.title ?? ''

  return (
    <div
      aria-roledescription="carousel"
      aria-label={block.title || 'Banner gian hàng'}
      className="relative overflow-hidden rounded-3xl bg-zinc-900 shadow-sm"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden @xl:aspect-[3/1]">
        <BannerAnchor linkUrl={activeBanner?.linkUrl} className="block h-full w-full">
          <img
            src={imageSrc}
            alt={slideTitle || block.title}
            onError={fallbackImageOnError}
            className={cn(
              'h-full w-full object-cover',
              hasLink &&
                'motion-safe:transition-transform motion-safe:duration-700 hover:scale-[1.03]',
            )}
          />
        </BannerAnchor>

        {/* pointer-events-none để click vẫn rơi xuống link của banner */}
        {slideTitle !== '' && (
          <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-5 text-white @xl:p-8">
            <h3 className="max-w-lg text-xl leading-tight font-bold drop-shadow-sm @xl:text-3xl">
              {slideTitle}
            </h3>
          </div>
        )}
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevSlide}
            className={cn(
              'absolute top-1/2 left-3 hidden -translate-y-1/2 cursor-pointer rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 @md:block',
              FOCUS_RING_CLASS,
            )}
            aria-label="Banner trước"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIdx((prev) => (prev + 1) % banners.length)}
            className={cn(
              'absolute top-1/2 right-3 hidden -translate-y-1/2 cursor-pointer rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 @md:block',
              FOCUS_RING_CLASS,
            )}
            aria-label="Banner sau"
          >
            <CaretRight size={18} weight="bold" />
          </button>
          <div className="absolute right-3 bottom-2 left-3 flex items-center justify-end gap-1">
            {banners.map((b, idx) => {
              const isCurrent = idx === safeIdx
              let dotClass = 'block h-1.5 w-1.5 rounded-full bg-white/55 transition-all'
              if (isCurrent) {
                dotClass = 'block h-1.5 w-5 rounded-full bg-white transition-all'
              }
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  aria-label={`Xem banner ${idx + 1}`}
                  aria-current={isCurrent}
                  className={cn(
                    'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <span className={dotClass} />
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setPaused(paused === false)}
              aria-label={pauseLabel}
              className={cn(
                'ml-1 cursor-pointer rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70',
                FOCUS_RING_CLASS,
              )}
            >
              {paused && <Play size={12} weight="fill" />}
              {paused === false && <Pause size={12} weight="fill" />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function collectionCaption(block: DecorationBlock, categoryName: string): string {
  if (block.collectionType === 'BEST_SELLER') {
    return 'Được mua nhiều nhất'
  }
  if (block.collectionType === 'SALE_OFF') {
    return 'Đang giảm giá'
  }
  if (block.collectionType === 'CUSTOM') {
    if (categoryName !== '') {
      return `Danh mục ${categoryName}`
    }
    return 'Shop tuyển chọn'
  }
  return 'Mới lên kệ'
}

function collectionParams(block: DecorationBlock): GetShopProductsParams {
  const params: GetShopProductsParams = { limit: block.itemLimit ?? 8 }
  if (block.collectionType === 'CUSTOM') {
    if (block.categoryId !== undefined && block.categoryId !== '') {
      params.categoryId = block.categoryId
    }
    params.sort = 'BEST_SELLER'
    return params
  }
  if (block.collectionType === 'BEST_SELLER' || block.collectionType === 'SALE_OFF') {
    params.collection = block.collectionType
    return params
  }
  params.collection = 'NEW_ARRIVALS'
  return params
}

function ProductCollectionBlock({
  block,
  shopId,
  onViewAll,
  preview,
}: {
  block: DecorationBlock
  shopId: string
  onViewAll?: () => void
  preview: boolean
}) {
  const params = collectionParams(block)
  const productsQuery = useGetShopProducts(shopId, params, {
    query: {
      enabled: shopId !== '',
    },
  })
  const categoriesQuery = useGetShopCategories(shopId, {
    query: {
      enabled: shopId !== '' && block.collectionType === 'CUSTOM',
    },
  })

  let pageData: PageResponseProductResponse | null = null
  if (productsQuery.data !== undefined && productsQuery.data.status === 200) {
    pageData = takeData(productsQuery.data)
  }
  const items = pageData?.items ?? []
  const total = pageData?.total ?? items.length

  let categoryName = ''
  if (categoriesQuery.data !== undefined && categoriesQuery.data.status === 200) {
    const match = takeData(categoriesQuery.data).find((c) => c.id === block.categoryId)
    categoryName = match?.name ?? ''
  }

  if (productsQuery.isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {hookErrorMessage('shops-catalog', productsQuery.error)}
        </p>
      </div>
    )
  }

  // Bộ sưu tập không có sản phẩm nào khớp thì khách không thấy khối này
  if (!productsQuery.isLoading && items.length === 0) {
    if (preview) {
      return (
        <PreviewPlaceholder
          icon={<SquaresFour size={22} />}
          title={block.title || 'Bộ sưu tập'}
          hint="Chưa có sản phẩm đang bán nào khớp tiêu chí này, nên khách sẽ không thấy khối."
        />
      )
    }
    return null
  }

  const isSlider = block.displayStyle === 'SLIDER'
  const heading = block.title || collectionCaption(block, categoryName)

  return (
    <section className={cn(CARD_CLASS, 'space-y-4 p-5 @xl:p-6')}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] @xl:text-xl dark:text-zinc-100">
            {heading}
          </h2>
          {block.title !== '' && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {collectionCaption(block, categoryName)}
            </p>
          )}
        </div>

        {onViewAll !== undefined && total > items.length && (
          <button
            type="button"
            onClick={onViewAll}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-full text-xs font-bold text-blue-700 transition-colors hover:underline dark:text-sky-300',
              FOCUS_RING_CLASS,
            )}
          >
            <span>Xem tất cả {total.toLocaleString('vi-VN')} sản phẩm</span>
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>

      {productsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4 @3xl:gap-4">
          {[0, 1, 2, 3].map(function (idx) {
            return <ProductCardSkeleton key={idx} />
          })}
        </div>
      )}

      {productsQuery.isLoading === false && isSlider && (
        <div
          className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 @xl:-mx-6 @xl:px-6"
          aria-label={`${heading}, cuộn ngang`}
        >
          {items.map((prod) => (
            <div
              key={prod.id}
              className="w-[46%] shrink-0 snap-start @lg:w-[31%] @3xl:w-[23.5%] @5xl:w-[18.5%]"
            >
              <ProductCard item={toProductCardItem(prod)} showShop={false} />
            </div>
          ))}
        </div>
      )}

      {productsQuery.isLoading === false && isSlider === false && (
        <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4 @3xl:gap-4">
          {items.map((prod) => (
            <ProductCard key={prod.id} item={toProductCardItem(prod)} showShop={false} />
          ))}
        </div>
      )}
    </section>
  )
}

function CategoryGridBlock({
  block,
  shopId,
  onSelectCategory,
  preview,
}: {
  block: DecorationBlock
  shopId: string
  onSelectCategory?: (categoryId: string) => void
  preview: boolean
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
    if (preview) {
      return (
        <PreviewPlaceholder
          icon={<SquaresFour size={22} />}
          title={block.title || 'Danh mục'}
          hint="Shop chưa có sản phẩm đang bán thuộc danh mục nào."
        />
      )
    }
    return null
  }

  return (
    <section className={cn(CARD_CLASS, 'space-y-4 p-5 @xl:p-6')}>
      <h2 className="text-lg font-extrabold tracking-tight text-[#17203a] @xl:text-xl dark:text-zinc-100">
        {block.title || 'Mua theo danh mục'}
      </h2>

      <div className="grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-6">
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
              'flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-3 text-left transition-colors hover:border-blue-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-400/40 dark:hover:bg-white/10',
              FOCUS_RING_CLASS,
            )}
          >
            <span className={cn(iconChipClass(), 'h-10 w-10 rounded-xl')}>
              <SquaresFour size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#17203a] dark:text-zinc-200">
                {c.name}
              </span>
              <span className="block text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {(c.productCount ?? 0).toLocaleString('vi-VN')} sản phẩm
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

/** Block VIDEO: một video do seller upload qua presign, stream thẳng từ S3. */
function VideoBlock({ block }: { block: DecorationBlock }) {
  return (
    <section className={cn(CARD_CLASS, 'overflow-hidden')}>
      {block.title !== '' && (
        <h2 className="px-5 pt-4 text-lg font-extrabold tracking-tight text-[#17203a] dark:text-white">
          {block.title}
        </h2>
      )}
      <div className="p-4">
        {block.videoUrl !== undefined && block.videoUrl !== '' && (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- video do merchant tự upload, không có file phụ đề để gắn track
          <video
            src={urlOrPlaceholder(block.videoUrl)}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full rounded-2xl bg-black object-contain"
          />
        )}
      </div>
    </section>
  )
}

// NOTE: Block FLASH_SALE đã bị xoá hoàn toàn (type + parser) — BE chưa có API
// khuyến mãi. Layout legacy chứa block này bị bỏ qua lúc parse (allowedTypes trong
// lib/seller/sellerAdapters.ts).

export default function ShopDecorationRenderer({
  blocks,
  shopId,
  onSelectCategory,
  onViewAllProducts,
  preview = false,
}: ShopDecorationRendererProps) {
  const activeBlocks = blocks.filter((b) => b.enabled)

  if (activeBlocks.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/60 p-10 text-center text-zinc-500 dark:border-white/15 dark:bg-white/5 dark:text-zinc-400">
        <p className="text-sm">Chưa có khối nào đang bật.</p>
      </div>
    )
  }

  // @container: lưới đổi cột theo bề rộng khung chứa (không theo viewport) để khung xem
  // trước điện thoại trong trình trang trí hiện đúng bố cục mobile.
  return (
    <div className="@container space-y-5">
      {activeBlocks.map((b) => {
        if (b.type === 'BANNER_SLIDER' || b.type === 'BANNER') {
          return <BannerSliderBlock key={b.id} block={b} preview={preview} />
        }
        if (b.type === 'PRODUCT_COLLECTION' || b.type === 'COLLECTION') {
          return (
            <ProductCollectionBlock
              key={b.id}
              block={b}
              shopId={shopId}
              onViewAll={onViewAllProducts}
              preview={preview}
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
              preview={preview}
            />
          )
        }
        if (b.type === 'VIDEO') {
          // Block chưa gắn video thì bỏ qua, đừng render hộp rỗng cho buyer
          if (b.videoUrl === undefined || b.videoUrl === '') {
            if (preview) {
              return (
                <PreviewPlaceholder
                  key={b.id}
                  icon={<VideoCamera size={22} />}
                  title={b.title || 'Video'}
                  hint="Chưa tải video lên, khách sẽ không thấy khối này."
                />
              )
            }
            return null
          }
          return <VideoBlock key={b.id} block={b} />
        }
        return null
      })}
    </div>
  )
}
