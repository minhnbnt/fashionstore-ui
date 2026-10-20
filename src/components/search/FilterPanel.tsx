import { useState } from 'react'

import {
  CaretDown,
  CaretUp,
  Check,
  Funnel,
  MapPin,
  Money,
  ShieldCheck,
  Sparkle,
  Star,
  Tag,
  Trash,
  Truck,
} from '@phosphor-icons/react'

import { formatVnd } from '@/lib/format'
import { PRICE_PRESETS } from '@/lib/searchFilters'

import type { SearchFilters } from '@/types/search'
import type { CategoryResponse } from '@generated/model/categoryResponse'
import type { SearchFacetsResponse } from '@generated/model/searchFacetsResponse'

// Color map for realistic visual swatches
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
}

const COMMON_SIZES = ['S', 'M', 'L', 'XL', 'Freesize']

const PROVINCE_PRESETS = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Toàn quốc']

function AccordionGroup(props: {
  title: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: string | number
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? true)

  return (
    <section className="border-b border-zinc-100 py-4 last:border-b-0 dark:border-white/10">
      <button
        type="button"
        onClick={function () {
          setOpen(!open)
        }}
        className="group flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {props.icon && <span className="text-blue-600 dark:text-sky-400">{props.icon}</span>}
          <span className="text-xs font-extrabold tracking-wider text-zinc-800 uppercase dark:text-zinc-200">
            {props.title}
          </span>
          {props.badge !== undefined && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-500/20 dark:text-sky-300">
              {props.badge}
            </span>
          )}
        </div>
        <span className="text-zinc-400 transition group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
          {open ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
        </span>
      </button>
      {open && <div className="mt-3.5 space-y-2">{props.children}</div>}
    </section>
  )
}

function priceText(value: number | null): string {
  if (value === null) {
    return ''
  }
  return String(value)
}

function parsePrice(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits === '') {
    return null
  }
  return Number(digits)
}

function PriceInputs(props: {
  minPrice: number | null
  maxPrice: number | null
  onApply: (min: number | null, max: number | null) => void
}) {
  const [min, setMin] = useState(priceText(props.minPrice))
  const [max, setMax] = useState(priceText(props.maxPrice))
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const minValue = parsePrice(min)
    const maxValue = parsePrice(max)
    if (minValue !== null && maxValue !== null && minValue > maxValue) {
      setError('Giá từ phải nhỏ hơn giá đến.')
      return
    }
    setError(null)
    props.onApply(minValue, maxValue)
  }

  const inputClass =
    'w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-zinc-800/80 dark:focus:border-sky-400'

  return (
    <form onSubmit={submit} className="mt-2.5">
      <div className="flex items-center gap-1.5">
        <input
          inputMode="numeric"
          aria-label="Giá từ"
          placeholder="đ TỪ"
          value={min}
          onChange={function (e) {
            setMin(e.target.value)
          }}
          className={inputClass}
        />
        <span className="text-xs text-zinc-400">–</span>
        <input
          inputMode="numeric"
          aria-label="Giá đến"
          placeholder="đ ĐẾN"
          value={max}
          onChange={function (e) {
            setMax(e.target.value)
          }}
          className={inputClass}
        />
      </div>
      {error !== null && <p className="mt-1.5 text-[11px] text-red-500">{error}</p>}
      <button
        type="submit"
        className="mt-2.5 w-full rounded-xl bg-blue-600 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98] dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        Áp dụng khoảng giá
      </button>
    </form>
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

  // Combine known sizes with facet sizes
  const allSizes = Array.from(new Set([...COMMON_SIZES, ...facetSizes]))
  // Combine known colors with facet colors
  const allColors = Array.from(new Set([...Object.keys(COLOR_SWATCH_MAP), ...facetColors]))

  const hasAnyFilter =
    f.category !== null ||
    f.minPrice !== null ||
    f.maxPrice !== null ||
    f.size !== null ||
    f.color !== null

  return (
    <div className="space-y-1">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Funnel size={18} weight="bold" className="text-blue-600 dark:text-sky-400" />
          <h2 className="text-sm font-extrabold text-zinc-900 uppercase dark:text-white">
            Bộ Lọc Tìm Kiếm
          </h2>
        </div>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={props.onClear}
            className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline dark:text-rose-400"
          >
            <Trash size={12} weight="bold" />
            <span>Xóa hết</span>
          </button>
        )}
      </div>

      {/* 1. Danh mục sản phẩm */}
      <AccordionGroup
        title="Danh mục"
        icon={<Tag size={15} weight="bold" />}
        badge={props.categories.length > 0 ? props.categories.length : undefined}
      >
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

      {/* 2. Dịch vụ & Ưu đãi Shopee Style */}
      <AccordionGroup title="Dịch vụ & Khuyến mãi" icon={<Sparkle size={15} weight="bold" />}>
        <div className="space-y-2 text-xs">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-md border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-200">
              <Truck size={14} weight="bold" className="text-emerald-600" />
              <span>Freeship Xtra</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-md border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-200">
              <ShieldCheck size={14} weight="bold" className="text-blue-600" />
              <span>Chính hãng Nét Mall</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-md border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-200">
              <Money size={14} weight="bold" className="text-amber-500" />
              <span>Đang có giảm giá sâu</span>
            </span>
          </label>
        </div>
      </AccordionGroup>

      {/* 3. Khoảng giá */}
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

      {/* 4. Đánh giá sao */}
      <AccordionGroup title="Đánh giá sản phẩm" icon={<Star size={15} weight="bold" />}>
        <div className="space-y-1.5">
          {[5, 4, 3].map(function (stars) {
            return (
              <button
                key={stars}
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
              >
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: 5 }).map(function (_, i) {
                    return (
                      <Star
                        key={i}
                        size={13}
                        weight={i < stars ? 'fill' : 'regular'}
                        className={i >= stars ? 'text-zinc-300 dark:text-zinc-600' : ''}
                      />
                    )
                  })}
                </div>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {stars === 5 ? '5 sao' : `Từ ${stars} sao`}
                </span>
              </button>
            )
          })}
        </div>
      </AccordionGroup>

      {/* 5. Kích cỡ thời trang */}
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

      {/* 6. Màu sắc với Color Swatches */}
      {allColors.length > 0 && (
        <AccordionGroup title="Màu sắc">
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {allColors.map(function (c) {
              const selected = f.color === c
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

      {/* 7. Nơi bán / Tỉnh thành */}
      <AccordionGroup
        title="Nơi gửi hàng"
        icon={<MapPin size={15} weight="bold" />}
        defaultOpen={false}
      >
        <div className="space-y-1">
          {PROVINCE_PRESETS.map(function (loc) {
            return (
              <label
                key={loc}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{loc}</span>
              </label>
            )
          })}
        </div>
      </AccordionGroup>

      {/* Footer Clear All */}
      {hasAnyFilter && (
        <div className="pt-3">
          <button
            type="button"
            onClick={props.onClear}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-2.5 text-xs font-extrabold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <Trash size={14} weight="bold" />
            <span>Xóa tất cả bộ lọc</span>
          </button>
        </div>
      )}
    </div>
  )
}

function categoryClass(selected: boolean): string {
  if (selected) {
    return 'w-full flex items-center justify-between rounded-xl bg-blue-600 px-3 py-2 text-left text-xs font-extrabold text-white shadow-xs'
  }
  return 'w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white'
}

function presetChipClass(selected: boolean): string {
  if (selected) {
    return 'rounded-xl bg-blue-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-xs'
  }
  return 'rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-blue-400 hover:bg-white dark:border-white/10 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:border-white/30'
}

function sizePillClass(selected: boolean): string {
  if (selected) {
    return 'rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs'
  }
  return 'rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:border-white/30'
}

function colorPillClass(selected: boolean): string {
  if (selected) {
    return 'flex items-center gap-1.5 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-extrabold text-white shadow-xs'
  }
  return 'flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-blue-400 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:border-white/30'
}
