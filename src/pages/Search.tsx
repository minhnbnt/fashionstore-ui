import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { useFacets, useSearch } from '@generated/endpoints/search/search'
import { SearchSort } from '@generated/model/searchSort'
import { Funnel, MagnifyingGlass, X } from '@phosphor-icons/react'
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

import FilterPanel from '../components/search/FilterPanel'
import Pagination from '../components/search/Pagination'
import { ProductCard } from '../components/Sections'

import type { SearchFilters } from '@/types/search'
import type { CategoryResponse } from '@generated/model/categoryResponse'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { SearchFacetsResponse } from '@generated/model/searchFacetsResponse'

const PAGE_SIZE = 12

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
    return `Kết quả cho “${filters.q}”`
  }
  if (category !== undefined && category.name !== undefined) {
    return category.name
  }
  return 'Tất cả sản phẩm'
}

function ActiveChips(props: {
  filters: SearchFilters
  categoryName: string | undefined
  onChange: (patch: Partial<SearchFilters>) => void
}) {
  const f = props.filters
  const chips: { key: string; label: string; patch: Partial<SearchFilters> }[] = []
  if (f.q !== null) {
    chips.push({ key: 'q', label: '“' + f.q + '”', patch: { q: null } })
  }
  if (f.category !== null) {
    chips.push({
      key: 'category',
      label: props.categoryName ?? f.category,
      patch: { category: null },
    })
  }
  if (f.minPrice !== null || f.maxPrice !== null) {
    chips.push({
      key: 'price',
      label: priceChipLabel(f.minPrice, f.maxPrice),
      patch: { minPrice: null, maxPrice: null },
    })
  }
  if (f.size !== null) {
    chips.push({ key: 'size', label: 'Size ' + f.size, patch: { size: null } })
  }
  if (f.color !== null) {
    chips.push({ key: 'color', label: f.color, patch: { color: null } })
  }
  if (chips.length === 0) {
    return null
  }
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map(function (chip) {
        return (
          <button
            key={chip.key}
            type="button"
            aria-label={'Bỏ lọc ' + chip.label}
            onClick={function () {
              props.onChange(chip.patch)
            }}
            className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-indigo-900 transition hover:bg-sky-200 dark:bg-white/10 dark:text-sky-200 dark:hover:bg-white/15"
          >
            {chip.label}
            <X size={12} weight="bold" />
          </button>
        )
      })}
    </div>
  )
}

function KeywordBox(props: { initial: string; onSubmit: (q: string | null) => void }) {
  const [value, setValue] = useState(props.initial)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (q === '') {
      props.onSubmit(null)
      return
    }
    props.onSubmit(q)
  }

  return (
    <form
      onSubmit={submit}
      className="mt-5 flex max-w-xl items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"
    >
      <MagnifyingGlass size={16} weight="bold" className="shrink-0 text-zinc-400" />
      <input
        type="search"
        aria-label="Từ khóa"
        value={value}
        onChange={function (e) {
          setValue(e.target.value)
        }}
        placeholder="Tìm áo, váy, khoác…"
        className="w-full bg-transparent outline-none placeholder:text-zinc-400"
      />
      <button
        type="submit"
        className="btn-primary shrink-0 rounded-full px-4 py-1.5 text-xs font-bold"
      >
        Tìm
      </button>
    </form>
  )
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const searchQuery = useSearch(toApiParams(filters, PAGE_SIZE), {
    // Giữ lưới cũ trong lúc tải trang/bộ lọc mới, tránh nháy trắng.
    query: { placeholderData: keepPreviousData },
  })
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
  const sortOptions = Object.values(SearchSort).filter(function (s) {
    return s !== SearchSort.RELEVANCE || filters.q !== null
  })

  const filterCount = activeFilterCount(filters)

  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <p className="text-xs font-bold tracking-[0.18em] text-indigo-900 uppercase dark:text-indigo-200">
        Cửa hàng
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tighter md:text-4xl">
        {pageTitle(filters, currentCategory)}
      </h1>
      {/* key: URL đổi từ header thì ô tìm kiếm nạp lại từ khóa mới */}
      <KeywordBox
        key={filters.q ?? ''}
        initial={filters.q ?? ''}
        onSubmit={function (q) {
          change({ q, sort: null })
        }}
      />
      <ActiveChips filters={filters} categoryName={currentCategory?.name} onChange={change} />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside>
          <button
            type="button"
            aria-expanded={filtersOpen}
            onClick={function () {
              setFiltersOpen(!filtersOpen)
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-sky-100 bg-white/80 py-3 text-sm font-bold lg:hidden dark:border-white/10 dark:bg-white/5"
          >
            <Funnel size={16} weight="bold" />
            Bộ lọc
            {filterCount > 0 && (
              <span className="rounded-full bg-indigo-900 px-2 py-0.5 text-xs text-white">
                {filterCount}
              </span>
            )}
          </button>
          <div
            className={
              'mt-4 rounded-3xl border border-sky-100 bg-white/80 px-5 py-2 lg:sticky lg:top-24 lg:mt-0 lg:block dark:border-white/10 dark:bg-white/5 ' +
              visibility(filtersOpen)
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
            />
          </div>
        </aside>

        <section aria-label="Kết quả">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500" aria-live="polite">
              {searchQuery.isSuccess && total + ' sản phẩm'}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500">Sắp xếp</span>
              <select
                value={sortValue}
                onChange={function (e) {
                  change({ sort: e.target.value as SearchSort })
                }}
                className="rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-sm font-bold outline-none dark:border-white/10 dark:bg-zinc-900"
              >
                {sortOptions.map(function (s) {
                  return (
                    <option key={s} value={s}>
                      {SORT_LABELS[s]}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>

          <div className="mt-5">
            {searchQuery.isPending && <p className="text-sm text-zinc-500">Đang tải sản phẩm…</p>}
            {searchQuery.isError && (
              <p className="text-sm text-red-600">
                {hookErrorMessage('search', searchQuery.error)}
              </p>
            )}
            {searchQuery.isSuccess && items.length === 0 && (
              <div className="rounded-3xl border border-dashed border-sky-200 px-6 py-16 text-center dark:border-white/15">
                <p className="font-bold">Không tìm thấy sản phẩm phù hợp</p>
                <p className="mt-1 text-sm text-zinc-500">Thử bỏ bớt bộ lọc hoặc đổi từ khóa.</p>
                {(filterCount > 0 || filters.q !== null) && (
                  <button
                    type="button"
                    onClick={function () {
                      apply(EMPTY_FILTERS)
                    }}
                    className="btn-primary mt-5 rounded-full px-6 py-2.5 text-sm font-bold"
                  >
                    Xem tất cả sản phẩm
                  </button>
                )}
              </div>
            )}
            {items.length > 0 && (
              <div
                className={
                  'grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 lg:gap-6 ' +
                  fade(searchQuery.isPlaceholderData)
                }
              >
                {items.map(function (p) {
                  return <ProductCard key={p.id} item={p} />
                })}
              </div>
            )}
          </div>

          <Pagination page={filters.page} totalPages={totalPages} onPage={goToPage} />
        </section>
      </div>
    </main>
  )
}

function visibility(open: boolean): string {
  if (open) {
    return 'block'
  }
  return 'hidden'
}

function fade(stale: boolean): string {
  if (stale) {
    return 'opacity-50'
  }
  return 'opacity-100'
}
