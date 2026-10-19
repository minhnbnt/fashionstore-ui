import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { useFacets, useSearch } from '@generated/endpoints/search/search'
import { SearchSort } from '@generated/model/searchSort'
import {
  CaretRight,
  Funnel,
  GridFour,
  House,
  MagnifyingGlass,
  Sparkle,
  SquaresFour,
  Trash,
  TrendUp,
  X,
} from '@phosphor-icons/react'
import { keepPreviousData } from '@tanstack/react-query'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'
import {
  activeFilterCount,
  EMPTY_FILTERS,
  parseFilters,
  toApiParams,
  toQueryString,
  withFilter,
} from '@/lib/searchFilters'

import FilterPanel from '../components/search/FilterPanel'
import Pagination from '../components/search/Pagination'
import { ProductCard } from '../components/Sections'

import type { SearchFilters } from '@/types/search'
import type { CategoryResponse } from '@generated/model/categoryResponse'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { SearchFacetsResponse } from '@generated/model/searchFacetsResponse'

const PAGE_SIZE = 16

const HOT_SEARCH_TAGS = [
  'Áo thun oversize',
  'Váy hoa nhí',
  'Blazer công sở',
  'Quần ống suông',
  'Áo khoác dạ',
  'Chân váy chữ A',
  'Túi canvas',
  'Áo polo nam nữ',
]

function priceChipLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return formatVnd(min) + ' – ' + formatVnd(max)
  }
  if (min !== null) {
    return 'Từ ' + formatVnd(min)
  }
  if (max !== null) {
    return 'Đến ' + formatVnd(max)
  }
  return ''
}

function ActiveChips(props: {
  filters: SearchFilters
  categoryName: string | undefined
  onChange: (patch: Partial<SearchFilters>) => void
  onClearAll: () => void
}) {
  const f = props.filters
  const chips: { key: string; label: string; patch: Partial<SearchFilters> }[] = []
  if (f.q !== null) {
    chips.push({ key: 'q', label: 'Từ khóa: “' + f.q + '”', patch: { q: null } })
  }
  if (f.category !== null) {
    chips.push({
      key: 'category',
      label: 'Danh mục: ' + (props.categoryName ?? f.category),
      patch: { category: null },
    })
  }
  if (f.minPrice !== null || f.maxPrice !== null) {
    chips.push({
      key: 'price',
      label: 'Giá: ' + priceChipLabel(f.minPrice, f.maxPrice),
      patch: { minPrice: null, maxPrice: null },
    })
  }
  if (f.size !== null) {
    chips.push({ key: 'size', label: 'Size: ' + f.size, patch: { size: null } })
  }
  if (f.color !== null) {
    chips.push({ key: 'color', label: 'Màu: ' + f.color, patch: { color: null } })
  }
  if (chips.length === 0) {
    return null
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-zinc-500">Đang lọc theo:</span>
      {chips.map(function (chip) {
        return (
          <button
            key={chip.key}
            type="button"
            aria-label={'Bỏ lọc ' + chip.label}
            onClick={function () {
              props.onChange(chip.patch)
            }}
            className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 transition hover:bg-blue-100 hover:border-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-sky-300 dark:hover:bg-blue-500/20"
          >
            <span>{chip.label}</span>
            <X size={12} weight="bold" />
          </button>
        )
      })}
      <button
        type="button"
        onClick={props.onClearAll}
        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
      >
        <Trash size={12} weight="bold" />
        <span>Xóa tất cả</span>
      </button>
    </div>
  )
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid4' | 'grid3'>('grid4')

  const searchQuery = useSearch(toApiParams(filters, PAGE_SIZE), {
    query: { placeholderData: keepPreviousData },
  })

  // Recommended fallback products query for empty state
  const recommendedQuery = useSearch(
    { limit: 8, sort: SearchSort.NEWEST },
    {
      query: {
        enabled: searchQuery.isSuccess && (takeData(searchQuery.data).items?.length ?? 0) === 0,
      },
    },
  )

  const facetsQuery = useFacets({
    q: filters.q ?? undefined,
    category: filters.category ?? undefined,
  })
  const categoriesQuery = useListCategories()

  const categoriesPayload = categoriesQuery.data
  let categories: CategoryResponse[] = []
  if (categoriesPayload !== undefined) {
    categories = takeData(categoriesPayload)
  }
  const currentCategory = categories.find(function (c) {
    return c.slug === filters.category
  })

  const searchPayload = searchQuery.data
  let items: ProductSummaryResponse[] = []
  let total = 0
  if (searchPayload !== undefined) {
    const page = takeData(searchPayload)
    items = page.items ?? []
    total = page.total ?? 0
  }
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const facetsPayload = facetsQuery.data
  let facets: SearchFacetsResponse | undefined
  if (facetsPayload !== undefined) {
    facets = takeData(facetsPayload)
  }

  // Recommended fallback items
  let recommendedItems: ProductSummaryResponse[] = []
  if (recommendedQuery.data !== undefined) {
    recommendedItems = takeData(recommendedQuery.data).items ?? []
  }

  function apply(next: SearchFilters) {
    setParams(new URLSearchParams(toQueryString(next)))
  }

  function change(patch: Partial<SearchFilters>) {
    apply(withFilter(filters, patch))
  }

  function goToPage(page: number) {
    apply(withFilter(filters, { page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  let sortValue: SearchSort = SearchSort.NEWEST
  if (filters.q !== null) {
    sortValue = SearchSort.RELEVANCE
  }
  if (filters.sort !== null) {
    sortValue = filters.sort
  }

  const filterCount = activeFilterCount(filters)

  return (
    <main className="mx-auto max-w-[1440px] px-4 pt-28 md:pt-32 pb-20">
      {/* 1. Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link
          to="/"
          className="flex items-center gap-1 font-semibold hover:text-blue-700 dark:hover:text-white"
        >
          <House size={14} weight="bold" />
          <span>Trang chủ</span>
        </Link>
        <CaretRight size={12} weight="bold" className="text-zinc-400" />
        <Link
          to="/search"
          onClick={function (e) {
            if (filters.q === null && filters.category === null) {
              e.preventDefault()
            }
          }}
          className="font-semibold hover:text-blue-700 dark:hover:text-white"
        >
          Cửa hàng
        </Link>
        {currentCategory && (
          <>
            <CaretRight size={12} weight="bold" className="text-zinc-400" />
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              {currentCategory.name}
            </span>
          </>
        )}
        {filters.q && (
          <>
            <CaretRight size={12} weight="bold" className="text-zinc-400" />
            <span className="font-bold text-blue-700 dark:text-sky-300 truncate max-w-xs">
              “{filters.q}”
            </span>
          </>
        )}
      </nav>

      {/* 2. Page Title Header & Subtitle */}
      <div className="mt-3">
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 md:text-3xl dark:text-white">
          {filters.q !== null
            ? `Kết quả tìm kiếm cho “${filters.q}”`
            : currentCategory !== undefined
              ? currentCategory.name
              : 'Tất cả sản phẩm thời trang'}
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Khám phá các thiết kế thời trang hiện đại, dẫn đầu xu hướng cùng nét Marketplace
        </p>
      </div>

      {/* Hot Search Pills Bar - Cố định ở dòng riêng, không bao giờ bị nhảy dòng */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3.5 dark:border-white/10">
        <span className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 uppercase tracking-wider shrink-0 dark:text-sky-400">
          <TrendUp size={13} weight="bold" />
          <span>Xu hướng:</span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {HOT_SEARCH_TAGS.map(function (tag) {
            const isCurrent = filters.q?.toLowerCase() === tag.toLowerCase()
            return (
              <button
                key={tag}
                type="button"
                onClick={function () {
                  change({ q: tag, page: 0 })
                }}
                className={
                  'rounded-full px-2.5 py-1 text-[11px] font-bold transition ' +
                  (isCurrent
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-blue-50 hover:text-blue-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700')
                }
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveChips
        filters={filters}
        categoryName={currentCategory?.name}
        onChange={change}
        onClearAll={function () {
          apply({ ...EMPTY_FILTERS, q: filters.q })
        }}
      />

      {/* 3. Main Body: Sidebar (280px) + Results Section */}
      <div className="mt-6 grid grid-cols-1 gap-7 lg:grid-cols-[280px_1fr]">
        {/* Left Column: Filter Sidebar */}
        <aside>
          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            aria-expanded={filtersOpen}
            onClick={function () {
              setFiltersOpen(!filtersOpen)
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white py-3 text-sm font-extrabold text-blue-700 shadow-xs lg:hidden dark:border-white/10 dark:bg-zinc-800 dark:text-sky-300"
          >
            <Funnel size={16} weight="bold" />
            <span>Bộ lọc nâng cao</span>
            {filterCount > 0 && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                {filterCount}
              </span>
            )}
          </button>

          {/* Sticky Desktop Filter Panel */}
          <div
            className={
              'mt-3 rounded-3xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-md lg:sticky lg:top-28 lg:mt-0 lg:block dark:border-white/10 dark:bg-zinc-900/80 ' +
              (filtersOpen ? 'block' : 'hidden')
            }
          >
            <FilterPanel
              filters={filters}
              categories={categories}
              facets={facets}
              onChange={change}
              onClear={function () {
                apply({ ...EMPTY_FILTERS, q: filters.q })
              }}
              totalCount={total}
            />
          </div>
        </aside>

        {/* Right Column: Search Results & Tools */}
        <section aria-label="Kết quả tìm kiếm">
          {/* Shopee-style Top Sort & Quick Filter Bar */}
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3 backdrop-blur-xs dark:border-white/10 dark:bg-zinc-800/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Sort Tabs Shopee Style */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-extrabold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  Sắp xếp theo:
                </span>

                {filters.q !== null && (
                  <button
                    type="button"
                    onClick={function () {
                      change({ sort: SearchSort.RELEVANCE })
                    }}
                    className={sortTabClass(sortValue === SearchSort.RELEVANCE)}
                  >
                    Phổ biến nhất
                  </button>
                )}

                <button
                  type="button"
                  onClick={function () {
                    change({ sort: SearchSort.NEWEST })
                  }}
                  className={sortTabClass(sortValue === SearchSort.NEWEST)}
                >
                  Mới nhất
                </button>

                <button
                  type="button"
                  onClick={function () {
                    change({ sort: SearchSort.PRICE_ASC })
                  }}
                  className={sortTabClass(sortValue === SearchSort.PRICE_ASC)}
                >
                  Giá: Thấp → Cao
                </button>

                <button
                  type="button"
                  onClick={function () {
                    change({ sort: SearchSort.PRICE_DESC })
                  }}
                  className={sortTabClass(sortValue === SearchSort.PRICE_DESC)}
                >
                  Giá: Cao → Thấp
                </button>
              </div>

              {/* View Switcher & Result Count */}
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {searchQuery.isSuccess && (
                    <>
                      <span className="font-extrabold text-zinc-900 dark:text-white">{total}</span>{' '}
                      sản phẩm
                    </>
                  )}
                </p>

                {/* Grid Density Switcher (4 cols vs 3 cols) */}
                <div className="hidden sm:flex items-center rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-white/10 dark:bg-zinc-900">
                  <button
                    type="button"
                    title="Chế độ 4 cột (mặc định)"
                    onClick={function () {
                      setViewMode('grid4')
                    }}
                    className={
                      'rounded-lg p-1.5 transition ' +
                      (viewMode === 'grid4'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200')
                    }
                  >
                    <GridFour size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    title="Chế độ 3 cột (ảnh lớn)"
                    onClick={function () {
                      setViewMode('grid3')
                    }}
                    className={
                      'rounded-lg p-1.5 transition ' +
                      (viewMode === 'grid3'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200')
                    }
                  >
                    <SquaresFour size={16} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid Area */}
          <div className="mt-5">
            {/* Loading State */}
            {searchQuery.isPending && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
                {Array.from({ length: 8 }).map(function (_, i) {
                  return (
                    <div
                      key={i}
                      className="animate-pulse rounded-3xl border border-zinc-100 bg-white p-4 dark:border-white/5 dark:bg-zinc-800/40"
                    >
                      <div className="aspect-[4/5] rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                      <div className="mt-4 h-4 w-3/4 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                      <div className="mt-2 h-4 w-1/2 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Error State */}
            {searchQuery.isError && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10">
                {hookErrorMessage('search', searchQuery.error)}
              </div>
            )}

            {/* Empty State: Rich, Engaging, Zero-Bounce Design */}
            {searchQuery.isSuccess && items.length === 0 && (
              <div className="space-y-12">
                <div className="rounded-3xl border border-dashed border-zinc-300 bg-gradient-to-b from-blue-50/40 via-white to-zinc-50/30 p-8 text-center dark:border-white/15 dark:from-zinc-900 dark:to-zinc-900/60">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-600 shadow-inner dark:bg-blue-500/20 dark:text-sky-300">
                    <MagnifyingGlass size={32} weight="bold" />
                  </div>

                  <h2 className="mt-4 text-xl font-black text-zinc-900 dark:text-white">
                    Rất tiếc, nét không tìm thấy sản phẩm phù hợp
                  </h2>
                  <p className="mt-2 max-w-md mx-auto text-xs text-zinc-500 dark:text-zinc-400">
                    Không có sản phẩm nào khớp với từ khóa hoặc tổ hợp bộ lọc bạn đã chọn.
                  </p>

                  {/* Search Advice / Tips */}
                  <div className="mt-6 inline-flex flex-col items-start gap-1.5 rounded-2xl bg-white p-4 text-left text-xs text-zinc-600 shadow-xs border border-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300">
                    <p className="font-bold text-zinc-800 dark:text-zinc-100">
                      💡 Mẹo tìm kiếm hiệu quả:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <li>Kiểm tra lại chính tả của từ khóa đã nhập</li>
                      <li>Sử dụng các từ khóa ngắn gọn, chung hơn (ví dụ: "áo", "váy", "quần")</li>
                      <li>Nới lỏng khoảng giá hoặc bỏ bớt các bộ lọc màu sắc, kích cỡ</li>
                    </ul>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={function () {
                        apply(EMPTY_FILTERS)
                      }}
                      className="btn-primary rounded-full px-6 py-2.5 text-xs font-bold shadow-md shadow-blue-500/20"
                    >
                      Xem tất cả sản phẩm
                    </button>
                    {filterCount > 0 && (
                      <button
                        type="button"
                        onClick={function () {
                          apply({ ...EMPTY_FILTERS, q: filters.q })
                        }}
                        className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        Chỉ xóa bộ lọc
                      </button>
                    )}
                  </div>
                </div>

                {/* RECOMMENDED PRODUCTS SECTION WHEN EMPTY: KEEP CUSTOMER SHOPPING */}
                {recommendedItems.length > 0 && (
                  <div className="border-t border-zinc-100 pt-8 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        <Sparkle size={18} weight="fill" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                          Có Thể Bạn Sẽ Thích
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Những mẫu thời trang bán chạy và nổi bật nhất trên sàn nét
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
                      {recommendedItems.map(function (p) {
                        return <ProductCard key={p.id} item={p} />
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Successful Search Results Grid */}
            {items.length > 0 && (
              <div
                className={
                  'grid gap-4 xl:gap-5 transition-opacity ' +
                  (viewMode === 'grid4'
                    ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3') +
                  ' ' +
                  (searchQuery.isPlaceholderData ? 'opacity-50' : 'opacity-100')
                }
              >
                {items.map(function (p) {
                  return <ProductCard key={p.id} item={p} />
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {items.length > 0 && (
            <Pagination page={filters.page} totalPages={totalPages} onPage={goToPage} />
          )}
        </section>
      </div>
    </main>
  )
}

function sortTabClass(selected: boolean): string {
  if (selected) {
    return 'rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs'
  }
  return 'rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/80 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
}
