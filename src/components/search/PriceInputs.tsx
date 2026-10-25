import { useState } from 'react'

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

  const inputClass =
    'w-full min-w-0 rounded-full border border-sky-100 bg-white/80 px-3 py-2 text-xs font-semibold outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-white/5 dark:focus:border-sky-400'

  return (
    <form onSubmit={submit} className="mt-2.5">
      <div className="flex items-center gap-1.5">
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
        <span className="text-xs text-zinc-400">–</span>
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
      {error !== null && <p className="mt-1.5 text-[11px] text-red-500">{error}</p>}
      <button
        type="submit"
        className="btn-primary mt-2.5 w-full rounded-full py-2 text-xs font-extrabold active:scale-[0.98]"
      >
        Áp dụng khoảng giá
      </button>
    </form>
  )
}
