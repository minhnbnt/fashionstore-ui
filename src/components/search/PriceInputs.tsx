import { useState } from 'react'

import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

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

// Nhập khoảng giá tùy chọn: validate min <= max rồi mới gửi lên bộ lọc.
export default function PriceInputs(props: {
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

  const inputClass = cn(
    'w-full min-w-0 rounded-full border border-zinc-300 bg-white/85 py-2 pr-7 pl-3 text-xs font-semibold text-[#17203a] tabular-nums outline-none transition placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-sky-400',
    FOCUS_RING_CLASS,
  )

  return (
    <form onSubmit={submit} className="mt-2.5">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            name="minPrice"
            inputMode="numeric"
            aria-label="Giá từ (₫)"
            placeholder="Từ"
            value={min}
            onChange={function (e) {
              setMin(e.target.value)
            }}
            className={inputClass}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-400"
          >
            ₫
          </span>
        </div>
        <span className="text-xs text-zinc-400">–</span>
        <div className="relative flex-1">
          <input
            name="maxPrice"
            inputMode="numeric"
            aria-label="Giá đến (₫)"
            placeholder="Đến"
            value={max}
            onChange={function (e) {
              setMax(e.target.value)
            }}
            className={inputClass}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-400"
          >
            ₫
          </span>
        </div>
      </div>
      {error !== null && (
        <p className="mt-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <button
        type="submit"
        className={cn(
          'btn-primary mt-2.5 w-full cursor-pointer rounded-full py-2 text-xs font-extrabold active:scale-[0.98]',
          FOCUS_RING_CLASS,
        )}
      >
        Áp dụng khoảng giá
      </button>
    </form>
  )
}
