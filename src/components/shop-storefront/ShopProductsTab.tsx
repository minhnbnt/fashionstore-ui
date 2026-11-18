import { useState } from 'react'

import {
  useGetShopCategories,
  useGetShopProducts,
} from '@generated/endpoints/shops-catalog/shops-catalog'
import { Funnel, MagnifyingGlass, Package, Sparkle, X } from '@phosphor-icons/react'

import Pagination from '@/components/search/Pagination'
import { ProductCard, type ProductCardItem } from '@/components/ui/ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import {
  CARD_CLASS,
  cn,
  FOCUS_RING_CLASS,
  optionPillClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

import type { PageResponseProductResponse } from '@generated/model/pageResponseProductResponse'
import type { ProductResponse } from '@generated/model/productResponse'
import type { ShopCategorySummaryResponse } from '@generated/model/shopCategorySummaryResponse'

export interface ShopProductsTabProps {
  shopId: string
  searchQuery?: string
  onClearSearch?: () => void
  selectedCategoryId?: string
  onSelectCategory?: (categoryId: string | undefined) => void
}

type ProductSortKey = 'NEWEST' | 'BEST_SELLER' | 'PRICE_ASC' | 'PRICE_DESC'

const PRODUCT_SORT_OPTIONS: Array<{ key: ProductSortKey; label: string }> = [
  { key: 'NEWEST', label: 'Mới nhất' },
  { key: 'BEST_SELLER', label: 'Bán chạy' },
  { key: 'PRICE_ASC', label: 'Giá tăng dần' },
  { key: 'PRICE_DESC', label: 'Giá giảm dần' },
]

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

export default function ShopProductsTab({
  shopId,
  searchQuery = '',
  onClearSearch,
  selectedCategoryId,
  onSelectCategory,
}: ShopProductsTabProps) {
  const [sort, setSort] = useState<ProductSortKey>('NEWEST')
  // Page lưu kèm filter tại thời điểm bấm: khi searchQuery/selectedCategoryId đổi (từ header,
  // không qua click trong tab) thì page tự derive về 0 — tránh query chạy ở page cũ rồi
  // báo "không tìm thấy" oan uổng. Derive lúc render, không dùng effect.
  const [pageState, setPageState] = useState({
    search: searchQuery,
    category: selectedCategoryId,
    page: 0,
  })
  const pageSize = 15

  const filterChanged =
    pageState.search !== searchQuery || pageState.category !== selectedCategoryId
  let page = pageState.page
  if (filterChanged) {
    page = 0
  }

  const updatePage = (next: number) => {
    setPageState({ search: searchQuery, category: selectedCategoryId, page: next })
  }

  // Categories query
  const categoriesQuery = useGetShopCategories(shopId, {
    query: {
      enabled: shopId !== '',
    },
  })

  let categories: ShopCategorySummaryResponse[] = []
  if (categoriesQuery.data !== undefined && categoriesQuery.data.status === 200) {
    categories = takeData(categoriesQuery.data)
  }

  let queryText: string | undefined
  if (searchQuery !== '') {
    queryText = searchQuery
  }

  // Products query
  const productsQuery = useGetShopProducts(
    shopId,
    {
      q: queryText,
      categoryId: selectedCategoryId,
      sort,
      page,
      limit: pageSize,
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

  const products = pageData?.items ?? []
  const totalItems = pageData?.total ?? 0
  const resolvedPageSize = pageData?.size ?? pageSize
  const totalPages = Math.ceil(totalItems / resolvedPageSize)

  const handleCategoryClick = (catId: string | undefined) => {
    updatePage(0)
    if (onSelectCategory) {
      onSelectCategory(catId)
    }
  }

  const handleSortChange = (newSort: ProductSortKey) => {
    setSort(newSort)
    updatePage(0)
  }

  return (
    <div className="space-y-6">
      {/* Search keyword banner if active */}
      {searchQuery !== '' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-xs text-sky-900 sm:px-5 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200">
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={16} className="text-blue-700 dark:text-sky-300" />
            <span>
              Kết quả tìm kiếm cho: <strong>&ldquo;{searchQuery}&rdquo;</strong> ({totalItems} sản
              phẩm)
            </span>
          </div>
          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className={cn(
                'flex cursor-pointer items-center gap-1 rounded-full font-bold text-blue-700 hover:underline dark:text-sky-300',
                FOCUS_RING_CLASS,
              )}
            >
              <span>Xóa bộ lọc tìm kiếm</span>
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      )}

      {/* Category Pills Filter Bar */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => handleCategoryClick(undefined)}
            className={cn(
              optionPillClass(selectedCategoryId === undefined),
              'shrink-0 px-4 py-1.5 text-xs',
            )}
          >
            Tất cả danh mục
          </button>
          {categories.map((c) => {
            const isSelected = selectedCategoryId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryClick(c.id)}
                className={cn(optionPillClass(isSelected), 'shrink-0 px-4 py-1.5 text-xs')}
              >
                <span>{c.name}</span>
                <span> ({c.productCount})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Top Filter and Sort Bar */}
      <div className={cn(CARD_CLASS, 'flex flex-wrap items-center justify-between gap-4 p-4')}>
        <div className="flex items-center gap-2">
          <Package size={20} className="text-blue-700 dark:text-sky-300" />
          <h2 className="text-sm font-bold text-[#17203a] tabular-nums dark:text-zinc-100">
            Sản phẩm ({totalItems})
          </h2>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Funnel size={14} />
            Sắp xếp:
          </span>
          <div className={cn(segmentedTrackClass(), 'shrink-0')}>
            {PRODUCT_SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSortChange(opt.key)}
                className={cn(segmentedItemClass(sort === opt.key), 'whitespace-nowrap')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {productsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, idx) => (
            <ProductCardSkeleton key={idx} />
          ))}
        </div>
      )}

      {/* Error State — API lỗi thì nói thẳng, không nhầm là "không có kết quả" */}
      {productsQuery.isError && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-8 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {hookErrorMessage('shops-catalog', productsQuery.error)}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!productsQuery.isLoading && !productsQuery.isError && products.length === 0 && (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white/60 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <Sparkle size={36} className="mx-auto text-zinc-300 dark:text-zinc-600" />
          <h3 className="mt-3 text-base font-bold text-[#17203a] dark:text-zinc-200">
            Không tìm thấy sản phẩm nào phù hợp
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Vui lòng thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc danh mục.
          </p>
          {(searchQuery !== '' || selectedCategoryId !== undefined) && (
            <button
              type="button"
              onClick={() => {
                updatePage(0)
                if (onClearSearch) onClearSearch()
                if (onSelectCategory) onSelectCategory(undefined)
              }}
              className={cn(
                'btn-primary mt-4 cursor-pointer rounded-full px-5 py-2 text-xs font-semibold',
                FOCUS_RING_CLASS,
              )}
            >
              Xem tất cả sản phẩm
            </button>
          )}
        </div>
      )}

      {/* Product Grid */}
      {!productsQuery.isLoading && products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} item={toProductCardItem(p)} showShop={false} />
          ))}
        </div>
      )}

      {/* Shared Pagination Controls */}
      {!productsQuery.isLoading && products.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={resolvedPageSize}
          onPage={updatePage}
        />
      )}
    </div>
  )
}
