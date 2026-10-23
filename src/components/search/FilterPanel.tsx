import { useState } from 'react'

import { CaretDown, CaretUp, Check, Funnel, Money, Tag, Trash } from '@phosphor-icons/react'

import { formatVnd } from '@/lib/format'
import { PRICE_PRESETS } from '@/lib/searchFilters'

import PriceInputs from './PriceInputs'

import type { SearchFilters } from '@/types/search'
import type { CategoryResponse } from '@generated/model/categoryResponse'
import type { SearchFacetsResponse } from '@generated/model/searchFacetsResponse'

// Bảng màu swatch cho tên màu tiếng Việt; màu lạ thì fallback xám nhạt.
const COLOR_SWATCH_MAP: Record<string, string> = {
  đen: '#18181b',
  trắng: '#ffffff',
  be: '#e4d5b7',
  hồng: '#f472b6',
  'hoa vàng': '#fbbf24',
  'hoa xanh': '#38bdf8',
  kem: '#fef3c7',
  rêu: '#4d7c0f',
  xám: '#9ca3af',
  'xanh đậm': '#1e3a8a',
  'xanh nhạt': '#7dd3fc',
  đỏ: '#dc2626',
  nâu: '#78350f',
  vàng: '#eab308',
  tím: '#a855f7',
  cam: '#f97316',
}

// TODO(mock): fallback khi facet sizes rỗng — backend chưa trả facets.size đầy đủ
const COMMON_SIZES = ['S', 'M', 'L', 'XL', 'Freesize']

function AccordionGroup(props: {
  title: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: string | number
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? true)

  return (
    <section className="border-b border-sky-100 py-4 last:border-b-0 dark:border-white/10">
      <button
        type="button"
        onClick={function () {
          setOpen(!open)
        }}
        className="group flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {props.icon && <span className="text-sky-700 dark:text-sky-400">{props.icon}</span>}
          <span className="text-xs font-extrabold tracking-wider text-zinc-800 uppercase dark:text-zinc-200">
            {props.title}
          </span>
          {props.badge !== undefined && (
            <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-extrabold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
              {props.badge}
            </span>
          )}
        </div>
        <span className="text-zinc-400 transition group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
          {open && <CaretUp size={14} weight="bold" />}
          {!open && <CaretDown size={14} weight="bold" />}
        </span>
      </button>
      {open && <div className="mt-3.5 space-y-2">{props.children}</div>}
    </section>
  )
}

export default function FilterPanel(props: {
  filters: SearchFilters
  categories: CategoryResponse[]
  facets: SearchFacetsResponse | undefined
  onChange: (patch: Partial<SearchFilters>) => void
  onClear: () => void
  totalCount?: number
}) {
  const f = props.filters
  const facetSizes = props.facets?.sizes ?? []
  const facetColors = props.facets?.colors ?? []
  const facetMin = props.facets?.minPrice
  const facetMax = props.facets?.maxPrice

  // Deduplicate sizes case-insensitively, prioritizing facetSizes
  let rawSizes = facetSizes
  if (rawSizes.length === 0) {
    rawSizes = COMMON_SIZES
  }
  const sizeMap = new Map<string, string>()
  for (const s of rawSizes) {
    if (!s) continue
    const key = s.trim().toUpperCase()
    if (!sizeMap.has(key)) {
      sizeMap.set(key, s.trim())
    }
  }
  const allSizes = Array.from(sizeMap.values())

  // Deduplicate colors case-insensitively, prioritizing actual facetColors from catalog
  let rawColors = facetColors
  if (rawColors.length === 0) {
    rawColors = Object.keys(COLOR_SWATCH_MAP)
  }
  const colorMap = new Map<string, string>()
  for (const c of rawColors) {
    if (!c) continue
    const key = c.trim().toLowerCase()
    if (!colorMap.has(key)) {
      // Capitalize first letter if all lowercase
      const display = c.charAt(0).toUpperCase() + c.slice(1)
      colorMap.set(key, display)
    }
  }
  const allColors = Array.from(colorMap.values())

  const hasAnyFilter =
    f.category !== null ||
    f.minPrice !== null ||
    f.maxPrice !== null ||
    f.size !== null ||
    f.color !== null

  let categoryBadge: number | undefined
  if (props.categories.length > 0) {
    categoryBadge = props.categories.length
  }

  return (
    <div className="space-y-1">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-3.5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Funnel size={18} weight="bold" className="text-sky-700 dark:text-sky-400" />
          <h2 className="text-sm font-extrabold text-zinc-900 uppercase dark:text-white">
            Bộ lọc tìm kiếm
          </h2>
        </div>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={props.onClear}
            className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline dark:text-rose-400"
          >
            <Trash size={12} weight="bold" />
            <span>Xóa tất cả</span>
          </button>
        )}
      </div>

      {/* 1. Danh mục sản phẩm */}
      <AccordionGroup title="Danh mục" icon={<Tag size={15} weight="bold" />} badge={categoryBadge}>
        <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
          <li>
            <button
              type="button"
              onClick={function () {
                props.onChange({ category: null })
              }}
              className={categoryClass(f.category === null)}
            >
              <span>Tất cả sản phẩm</span>
              {f.category === null && <Check size={14} weight="bold" />}
            </button>
          </li>
          {props.categories.map(function (c) {
            const slug = c.slug ?? ''
            const selected = f.category === slug
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={function () {
                    props.onChange({ category: slug })
                  }}
                  className={categoryClass(selected)}
                >
                  <span className="truncate">{c.name}</span>
                  {selected && <Check size={14} weight="bold" className="shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>
      </AccordionGroup>

      {/* 2. Khoảng giá */}
      <AccordionGroup title="Khoảng giá" icon={<Money size={15} weight="bold" />}>
        <div className="grid grid-cols-2 gap-1.5">
          {PRICE_PRESETS.map(function (p) {
            const selected = f.minPrice === p.min && f.maxPrice === p.max
            return (
              <button
                key={p.label}
                type="button"
                onClick={function () {
                  if (selected) {
                    props.onChange({ minPrice: null, maxPrice: null })
                    return
                  }
                  props.onChange({ minPrice: p.min, maxPrice: p.max })
                }}
                className={presetChipClass(selected)}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        <PriceInputs
          key={String(f.minPrice) + '-' + String(f.maxPrice)}
          minPrice={f.minPrice}
          maxPrice={f.maxPrice}
          onApply={function (min, max) {
            props.onChange({ minPrice: min, maxPrice: max })
          }}
        />

        {facetMin !== undefined &&
          facetMin !== null &&
          facetMax !== undefined &&
          facetMax !== null && (
            <p className="mt-2 text-[11px] text-zinc-400">
              Giá thị trường: {formatVnd(facetMin)} – {formatVnd(facetMax)}
            </p>
          )}
      </AccordionGroup>

      {/* 3. Kích cỡ thời trang */}
      {allSizes.length > 0 && (
        <AccordionGroup title="Kích cỡ">
          <div className="flex flex-wrap gap-1.5">
            {allSizes.map(function (s) {
              const selected = f.size === s
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selected}
                  onClick={function () {
                    if (selected) {
                      props.onChange({ size: null })
                      return
                    }
                    props.onChange({ size: s })
                  }}
                  className={sizePillClass(selected)}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </AccordionGroup>
      )}

      {/* 4. Màu sắc với Color Swatches */}
      {allColors.length > 0 && (
        <AccordionGroup title="Màu sắc">
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {allColors.map(function (c) {
              const selected = f.color !== null && f.color.trim().toLowerCase() === c.toLowerCase()
              const hex = COLOR_SWATCH_MAP[c.toLowerCase()] ?? '#cbd5e1'
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={selected}
                  onClick={function () {
                    if (selected) {
                      props.onChange({ color: null })
                      return
                    }
                    props.onChange({ color: c })
                  }}
                  className={colorPillClass(selected)}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="truncate">{c}</span>
                </button>
              )
            })}
          </div>
        </AccordionGroup>
      )}

      {/* Footer Clear All */}
      {hasAnyFilter && (
        <div className="pt-3">
          <button
            type="button"
            onClick={props.onClear}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-sky-100 py-2.5 text-xs font-extrabold text-zinc-700 transition hover:bg-sky-50 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Trash size={14} weight="bold" />
            <span>Xóa tất cả</span>
          </button>
        </div>
      )}
    </div>
  )
}

function categoryClass(selected: boolean): string {
  if (selected) {
    return 'w-full flex items-center justify-between rounded-full bg-indigo-900 px-3 py-2 text-left text-xs font-extrabold text-white shadow-xs'
  }
  return 'w-full flex items-center justify-between rounded-full px-3 py-2 text-left text-xs font-semibold text-zinc-600 transition hover:bg-sky-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white'
}

function presetChipClass(selected: boolean): string {
  if (selected) {
    return 'rounded-full bg-indigo-900 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-xs'
  }
  return 'rounded-full border border-sky-100 bg-white/70 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-sky-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:bg-white/10'
}

function sizePillClass(selected: boolean): string {
  if (selected) {
    return 'rounded-full bg-indigo-900 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs'
  }
  return 'rounded-full border border-sky-100 bg-white/70 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:border-sky-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:bg-white/10'
}

function colorPillClass(selected: boolean): string {
  if (selected) {
    return 'flex items-center gap-1.5 rounded-full bg-indigo-900 px-2.5 py-1.5 text-xs font-extrabold text-white shadow-xs'
  }
  return 'flex items-center gap-1.5 rounded-full border border-sky-100 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-sky-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:bg-white/10'
}
