import { ArrowDownRight, ArrowUpRight, Minus } from '@phosphor-icons/react'

import { formatPercent } from '@/lib/admin/adminStats'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { TrendMetric } from '@/types/admin'

export interface KpiCell {
  metric: TrendMetric
  label: string
  value: string
  change: number | null
}

interface Props {
  cells: KpiCell[]
  days: number
  selected: TrendMetric
  onSelect: (metric: TrendMetric) => void
}

function ChangeLine({ change, days }: { change: number | null; days: number }) {
  const baseline = `so với ${days} ngày trước đó`

  if (change === null) {
    return (
      <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        <Minus size={12} weight="bold" aria-hidden="true" />
        <span>Kỳ trước chưa có số liệu</span>
      </p>
    )
  }

  if (change === 0) {
    return (
      <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        <Minus size={12} weight="bold" aria-hidden="true" />
        <span>Không đổi {baseline}</span>
      </p>
    )
  }

  if (change > 0) {
    return (
      <p className="flex flex-wrap items-center gap-x-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
          <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
          <span className="sr-only">Tăng</span>
          {formatPercent(change)}
        </span>
        <span>{baseline}</span>
      </p>
    )
  }

  return (
    <p className="flex flex-wrap items-center gap-x-1 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="inline-flex items-center gap-0.5 font-bold text-rose-700 tabular-nums dark:text-rose-300">
        <ArrowDownRight size={12} weight="bold" aria-hidden="true" />
        <span className="sr-only">Giảm</span>
        {formatPercent(Math.abs(change))}
      </span>
      <span>{baseline}</span>
    </p>
  )
}

/**
 * Dải chỉ số chính của kỳ đang xem. Mỗi ô cũng là nút chọn chỉ số cho biểu đồ bên dưới,
 * nên không cần thêm một hàng tab riêng.
 */
export default function KpiLedger({ cells, days, selected, onSelect }: Props) {
  return (
    <section
      aria-label={`Chỉ số ${days} ngày gần nhất`}
      className="grid grid-cols-1 overflow-hidden rounded-3xl border border-zinc-200/90 bg-white/95 shadow-sm sm:grid-cols-2 xl:grid-cols-4 dark:border-white/10 dark:bg-[#11182a]"
    >
      {cells.map(function (cell, index) {
        const isSelected = cell.metric === selected
        let dividerClass = 'border-zinc-200/90 dark:border-white/10'
        if (index > 0) {
          dividerClass = cn(dividerClass, 'border-t sm:border-t-0')
        }
        if (index % 2 === 1) {
          dividerClass = cn(dividerClass, 'sm:border-l')
        }
        if (index >= 2) {
          dividerClass = cn(dividerClass, 'sm:border-t xl:border-t-0')
        }
        if (index === 2) {
          dividerClass = cn(dividerClass, 'xl:border-l')
        }

        return (
          <button
            key={cell.metric}
            type="button"
            aria-pressed={isSelected}
            onClick={function () {
              onSelect(cell.metric)
            }}
            className={cn(
              'group relative flex cursor-pointer flex-col items-start gap-1.5 px-5 py-5 text-left transition-colors hover:bg-sky-50/60 md:px-6 dark:hover:bg-white/[0.03]',
              FOCUS_RING_CLASS,
              'focus-visible:ring-inset',
              dividerClass,
              isSelected && 'bg-sky-50/70 dark:bg-white/[0.04]',
            )}
          >
            {isSelected && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8]"
              />
            )}
            <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              {cell.label}
            </span>
            <span className="text-[1.75rem] leading-tight font-semibold tracking-tight text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
              {cell.value}
            </span>
            <ChangeLine change={cell.change} days={days} />
          </button>
        )
      })}
    </section>
  )
}
