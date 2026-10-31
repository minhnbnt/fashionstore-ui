import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { useFacets, useSearch } from '@generated/endpoints/search/search'
import { SearchSort } from '@generated/model/searchSort'
import {
  CaretRight,
  Funnel,
  House,
  Rows,
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
  SORT_LABELS,
  toApiParams,
  toQueryString,
  withFilter,
} from '@/lib/searchFilters'

import EmptySearchState from '../components/search/EmptySearchState'
import FilterPanel from '../components/search/FilterPanel'
import Pagination from '../components/search/Pagination'
import ProductRow from '../components/search/ProductRow'
import { ProductCard } from '../components/Sections'

import type { SearchFilters } from '@/types/search'
import type { CategoryResponse } from '@generated/model/categoryResponse'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { SearchFacetsResponse } from '@generated/model/searchFacetsResponse'

const PAGE_SIZE = 16

// TODO(mock): tag xu hướng cứng — backend chưa có API thống kê tìm kiếm hot
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

function pageTitle(filters: SearchFilters, category: CategoryResponse | undefined): string {
  if (filters.q !== null) {
    return `Kết quả tìm kiếm cho “${filters.q}”`
  }
  if (category !== undefined && category.name !== undefined) {
    return category.name
  }
  return 'Tất cả sản phẩm thời trang'
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
            className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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

  // RELEVANCE chỉ có ý nghĩa khi đang tìm theo từ khóa.
  const sortTabs: SearchSort[] = [SearchSort.NEWEST, SearchSort.PRICE_ASC, SearchSort.PRICE_DESC]
  if (filters.q !== null) {
    sortTabs.unshift(SearchSort.RELEVANCE)
  }

  const filterCount = activeFilterCount(filters)

  let filterPanelVisibility = 'hidden'
  if (filtersOpen) {
    filterPanelVisibility = 'block'
  }

  return (
    <main className="mx-auto max-w-[1440px] px-4 pt-[100px] pb-20">
      {/* 1. Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link
          to="/"
          className="flex items-center gap-1 font-semibold hover:text-sky-700 dark:hover:text-white"
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
          className="font-semibold hover:text-sky-700 dark:hover:text-white"
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
            <span className="max-w-xs truncate font-bold text-sky-700 dark:text-sky-300">
              “{filters.q}”
            </span>
          </>
        )}
      </nav>

      {/* 2. Page Title Header & Subtitle */}
      <div className="mt-3">
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 md:text-3xl dark:text-white">
          {pageTitle(filters, currentCategory)}
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Khám phá các thiết kế thời trang hiện đại, dẫn đầu xu hướng cùng nét Marketplace
        </p>
      </div>

      {/* Hot Search Pills Bar - Cố định ở dòng riêng, không bao giờ bị nhảy dòng */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-b border-sky-100 pb-3.5 dark:border-white/10">
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-extrabold tracking-wider text-sky-700 uppercase dark:text-sky-400">
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
                className={hotTagClass(isCurrent)}
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
            className="flex w-full items-center justify-center gap-2 rounded-full border border-sky-100 bg-white/80 py-3 text-sm font-extrabold text-sky-700 shadow-xs lg:hidden dark:border-white/10 dark:bg-white/5 dark:text-sky-300"
          >
            <Funnel size={16} weight="bold" />
            <span>Bộ lọc nâng cao</span>
            {filterCount > 0 && (
              <span className="rounded-full bg-indigo-900 px-2 py-0.5 text-xs text-white">
                {filterCount}
              </span>
            )}
          </button>

          {/* Sticky Desktop Filter Panel */}
          <div
            className={
              'glass mt-3 rounded-3xl p-5 lg:sticky lg:top-28 lg:mt-0 lg:block ' +
              filterPanelVisibility
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
          {/* Thanh sắp xếp & bộ lọc nhanh */}
          <div className="rounded-3xl border border-sky-100 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Tabs sắp xếp */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-extrabold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Sắp xếp theo:
                </span>

                {sortTabs.map(function (s) {
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={function () {
                        change({ sort: s })
                      }}
                      className={sortTabClass(sortValue === s)}
                    >
                      {SORT_LABELS[s]}
                    </button>
                  )
                })}
              </div>

              {/* Result Count & View Switcher */}
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {searchQuery.isSuccess && (
                    <>
                      <span className="font-extrabold text-zinc-900 dark:text-white">{total}</span>{' '}
                      sản phẩm
                    </>
                  )}
                </p>

                <div className="hidden items-center rounded-full border border-sky-100 bg-white/80 p-0.5 sm:flex dark:border-white/10 dark:bg-white/5">
                  <button
                    type="button"
                    title="Xem dạng lưới"
                    onClick={function () {
                      setViewMode('grid')
                    }}
                    className={viewTabClass(viewMode === 'grid')}
                  >
                    <SquaresFour size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    title="Xem dạng danh sách"
                    onClick={function () {
                      setViewMode('list')
                    }}
                    className={viewTabClass(viewMode === 'list')}
                  >
                    <Rows size={16} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid Area */}
          <div className="mt-5">
            {/* Loading State */}
            {searchQuery.isPending && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
                {Array.from({ length: 8 }).map(function (_, i) {
                  return (
                    <div
                      key={i}
                      className="animate-pulse rounded-3xl border border-sky-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="aspect-[4/5] rounded-2xl bg-zinc-200 dark:bg-white/10" />
                      <div className="mt-4 h-4 w-3/4 rounded-full bg-zinc-200 dark:bg-white/10" />
                      <div className="mt-2 h-4 w-1/2 rounded-full bg-zinc-200 dark:bg-white/10" />
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

            {/* Empty State: card rỗng + mẹo + gợi ý sản phẩm */}
            {searchQuery.isSuccess && items.length === 0 && (
              <EmptySearchState
                filterCount={filterCount}
                recommendedItems={recommendedItems}
                onResetAll={function () {
                  apply(EMPTY_FILTERS)
                }}
                onClearFilters={function () {
                  apply({ ...EMPTY_FILTERS, q: filters.q })
                }}
              />
            )}

            {/* Successful Search Results */}
            {items.length > 0 && viewMode === 'grid' && (
              <div
                className={
                  'grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 xl:grid-cols-4 xl:gap-5 ' +
                  resultsOpacityClass(searchQuery.isPlaceholderData)
                }
              >
                {items.map(function (p) {
                  return <ProductCard key={p.id} item={p} />
                })}
              </div>
            )}
            {items.length > 0 && viewMode === 'list' && (
              <div
                className={
                  'flex flex-col gap-3 transition-opacity ' +
                  resultsOpacityClass(searchQuery.isPlaceholderData)
                }
              >
                {items.map(function (p) {
                  return <ProductRow key={p.id} item={p} />
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
    return 'rounded-full bg-indigo-900 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs'
  }
  return 'rounded-full border border-sky-100 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-sky-300 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:text-white'
}

function hotTagClass(isCurrent: boolean): string {
  if (isCurrent) {
    return 'rounded-full bg-indigo-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs'
  }
  return 'rounded-full border border-sky-100 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-zinc-600 transition hover:border-sky-300 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:text-sky-300'
}

function viewTabClass(active: boolean): string {
  if (active) {
    return 'rounded-full bg-indigo-900 p-1.5 text-white shadow-xs'
  }
  return 'rounded-full p-1.5 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200'
}

function resultsOpacityClass(isPlaceholder: boolean): string {
  if (isPlaceholder) {
    return 'opacity-50'
  }
  return 'opacity-100'
}
