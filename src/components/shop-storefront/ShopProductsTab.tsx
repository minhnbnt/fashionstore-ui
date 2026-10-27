import { useState } from 'react'
import { Link } from 'react-router'

import {
  useGetShopCategories,
  useGetShopProducts,
} from '@generated/endpoints/shops-catalog/shops-catalog'
import {
  Funnel,
  Package,
  MagnifyingGlass,
  X,
  CaretLeft,
  CaretRight,
  Sparkle,
} from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import type { ProductResponse } from '@generated/model/productResponse'
import type { ShopCategorySummaryResponse } from '@generated/model/shopCategorySummaryResponse'

export interface ShopProductsTabProps {
  shopId: string
  searchQuery?: string
  onClearSearch?: () => void
  selectedCategoryId?: string
  onSelectCategory?: (categoryId: string | undefined) => void
}

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.onerror = null
  e.currentTarget.src = PLACEHOLDER_IMAGE
}

function getProductDisplayInfo(p: ProductResponse) {
  let imageSrc = PLACEHOLDER_IMAGE
  if (p.images !== undefined && p.images.length > 0) {
    const firstImg = p.images[0]
    if (firstImg?.s3Key !== undefined && firstImg.s3Key !== '') {
      imageSrc = imageUrl(firstImg.s3Key)
    }
  }

  let minPrice = 0
  let comparePrice: number | null = null
  if (p.variants !== undefined && p.variants.length > 0) {
    const prices = p.variants.map((v) => v.price ?? 0).filter((pr) => pr > 0)
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

interface PageData {
  items?: ProductResponse[]
  total?: number
  page?: number
  limit?: number
  totalPages?: number
}

export default function ShopProductsTab({
  shopId,
  searchQuery = '',
  onClearSearch,
  selectedCategoryId,
  onSelectCategory,
}: ShopProductsTabProps) {
  const [sort, setSort] = useState<'NEWEST' | 'BEST_SELLER' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST')
  const [page, setPage] = useState(0)
  const pageSize = 12

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

  let pageData: PageData | null = null
  if (productsQuery.data !== undefined && productsQuery.data.status === 200) {
    pageData = takeData(productsQuery.data) as PageData
  }

  const products = pageData?.items ?? []
  const totalItems = pageData?.total ?? 0
  const totalPages = pageData?.totalPages ?? Math.ceil(totalItems / pageSize)

  const handleCategoryClick = (catId: string | undefined) => {
    setPage(0)
    if (onSelectCategory) {
      onSelectCategory(catId)
    }
  }

  const handleSortChange = (newSort: 'NEWEST' | 'BEST_SELLER' | 'PRICE_ASC' | 'PRICE_DESC') => {
    setSort(newSort)
    setPage(0)
  }

  return (
    <div className="space-y-6">
      {/* Search keyword banner if active */}
      {searchQuery !== '' && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs text-indigo-900 sm:px-5 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>
              Kết quả tìm kiếm cho: <strong>&ldquo;{searchQuery}&rdquo;</strong> ({totalItems} sản
              phẩm)
            </span>
          </div>
          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
            >
              <span>Xóa bộ lọc tìm kiếm</span>
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Category Pills Filter Bar */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(() => {
            let allClass =
              'border border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300'
            if (selectedCategoryId === undefined) {
              allClass = 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
            }
            return (
              <button
                type="button"
                onClick={() => handleCategoryClick(undefined)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${allClass}`}
              >
                Tất cả danh mục
              </button>
            )
          })()}
          {categories.map((c) => {
            const isSelected = selectedCategoryId === c.id
            let catClass =
              'border border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300'
            if (isSelected) {
              catClass = 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
            }
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryClick(c.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${catClass}`}
              >
                <span>{c.name}</span>
                <span> ({c.productCount})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Top Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Sản phẩm ({totalItems})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Funnel size={14} />
            Sắp xếp:
          </span>
          <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-white/10">
            {[
              { key: 'NEWEST', label: 'Mới nhất' },
              { key: 'BEST_SELLER', label: 'Bán chạy' },
              { key: 'PRICE_ASC', label: 'Giá tăng dần' },
              { key: 'PRICE_DESC', label: 'Giá giảm dần' },
            ].map((opt) => {
              const isActive = sort === opt.key
              let sortBtnClass =
                'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
              if (isActive) {
                sortBtnClass =
                  'bg-white text-indigo-600 shadow-sm dark:bg-[#11182a] dark:text-indigo-400'
              }
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() =>
                    handleSortChange(
                      opt.key as 'NEWEST' | 'BEST_SELLER' | 'PRICE_ASC' | 'PRICE_DESC',
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${sortBtnClass}`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {productsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl border border-zinc-200/80 bg-white p-3 dark:border-white/10 dark:bg-[#11182a]"
            >
              <div className="aspect-square w-full rounded-xl bg-zinc-200 dark:bg-white/10" />
              <div className="mt-3 h-3 w-3/4 rounded bg-zinc-200 dark:bg-white/10" />
              <div className="mt-2 h-4 w-1/2 rounded bg-zinc-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!productsQuery.isLoading && products.length === 0 && (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <Sparkle size={36} className="mx-auto text-zinc-300 dark:text-zinc-600" />
          <h3 className="mt-3 text-base font-bold text-zinc-800 dark:text-zinc-200">
            Không tìm thấy sản phẩm nào phù hợp
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Vui lòng thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc danh mục.
          </p>
          {(searchQuery !== '' || selectedCategoryId !== undefined) && (
            <button
              type="button"
              onClick={() => {
                if (onClearSearch) onClearSearch()
                if (onSelectCategory) onSelectCategory(undefined)
              }}
              className="btn-primary mt-4 rounded-full px-5 py-2 text-xs font-semibold"
            >
              Xem tất cả sản phẩm
            </button>
          )}
        </div>
      )}

      {/* Product Grid */}
      {!productsQuery.isLoading && products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {products.map((p) => {
            const info = getProductDisplayInfo(p)
            return (
              <Link
                key={info.id}
                to={`/product/${info.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-white/10 dark:bg-[#11182a]"
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
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                      {formatVnd(info.minPrice)}
                    </span>
                    {info.comparePrice !== null && (
                      <span className="text-[10px] text-zinc-400 line-through">
                        {formatVnd(info.comparePrice)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
          >
            <CaretLeft size={14} />
            Trước
          </button>
          <span className="px-3 text-xs text-zinc-500 dark:text-zinc-400">
            Trang {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((prev) => prev + 1)}
            className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
          >
            Sau
            <CaretRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
