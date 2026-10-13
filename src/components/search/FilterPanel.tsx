import { useState } from 'react'

import { formatVnd } from '@/lib/format'
import { PRICE_PRESETS } from '@/lib/searchFilters'

import type { SearchFilters } from '@/lib/searchFilters'
import type { CategoryResponse } from '@generated/model/categoryResponse'
import type { SearchFacetsResponse } from '@generated/model/searchFacetsResponse'

function chipClass(selected: boolean): string {
  if (selected) {
    return 'rounded-full bg-indigo-900 px-4 py-2 text-xs font-bold text-white'
  }
  return 'rounded-full border border-sky-100 bg-white/70 px-4 py-2 text-xs font-bold transition hover:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30'
}

function Group(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-sky-100 py-5 last:border-b-0 dark:border-white/10">
      <h3 className="text-xs font-bold tracking-[0.18em] text-zinc-500 uppercase">{props.title}</h3>
      <div className="mt-3">{props.children}</div>
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
    'w-full min-w-0 rounded-full border border-sky-100 bg-white/80 px-3 py-2 text-sm outline-none focus:border-sky-400 dark:border-white/10 dark:bg-white/5'

  return (
    <form onSubmit={submit} className="mt-3">
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          aria-label="Giá từ"
          placeholder="Từ"
          value={min}
          onChange={function (e) {
            setMin(e.target.value)
          }}
          className={inputClass}
        />
        <span className="text-zinc-400">–</span>
        <input
          inputMode="numeric"
          aria-label="Giá đến"
          placeholder="Đến"
          value={max}
          onChange={function (e) {
            setMax(e.target.value)
          }}
          className={inputClass}
        />
      </div>
      {error !== null && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        className="mt-2 w-full rounded-full border border-sky-200 py-2 text-xs font-bold transition hover:bg-sky-50 dark:border-white/15 dark:hover:bg-white/10"
      >
        Áp dụng
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
}) {
  const f = props.filters
  const sizes = props.facets?.sizes ?? []
  const colors = props.facets?.colors ?? []
  const facetMin = props.facets?.minPrice
  const facetMax = props.facets?.maxPrice

  return (
    <div>
      <Group title="Danh mục">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          <li>
            <button
              type="button"
              onClick={function () {
                props.onChange({ category: null })
              }}
              className={categoryClass(f.category === null)}
            >
              Tất cả
            </button>
          </li>
          {props.categories.map(function (c) {
            const slug = c.slug ?? ''
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={function () {
                    props.onChange({ category: slug })
                  }}
                  className={categoryClass(f.category === slug)}
                >
                  {c.name}
                </button>
              </li>
            )
          })}
        </ul>
      </Group>

      <Group title="Khoảng giá">
        <div className="flex flex-wrap gap-2">
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
                className={chipClass(selected)}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        {/* key ép form nạp lại giá trị khi bộ lọc giá đổi từ nơi khác (preset, xóa chip) */}
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
            <p className="mt-2 text-xs text-zinc-500">
              Giá đang có: {formatVnd(facetMin)} – {formatVnd(facetMax)}
            </p>
          )}
      </Group>

      {sizes.length > 0 && (
        <Group title="Kích cỡ">
          <div className="flex flex-wrap gap-2">
            {sizes.map(function (s) {
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
                  className={chipClass(selected)}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </Group>
      )}

      {colors.length > 0 && (
        <Group title="Màu sắc">
          <div className="flex flex-wrap gap-2">
            {colors.map(function (c) {
              const selected = f.color === c
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
                  className={chipClass(selected)}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </Group>
      )}

      <button
        type="button"
        onClick={props.onClear}
        className="mt-4 w-full rounded-full py-2 text-xs font-bold text-zinc-500 transition hover:text-zinc-900 dark:hover:text-white"
      >
        Xóa tất cả bộ lọc
      </button>
    </div>
  )
}

function categoryClass(selected: boolean): string {
  if (selected) {
    return 'w-full rounded-full bg-indigo-900 px-4 py-2 text-left text-sm font-bold text-white'
  }
  return 'w-full rounded-full px-4 py-2 text-left text-sm font-medium text-zinc-600 transition hover:bg-sky-50 dark:text-zinc-300 dark:hover:bg-white/10'
}
