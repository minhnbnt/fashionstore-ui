import { breakdownRows } from '@/lib/admin/adminStats'
import { cn, PANEL_CLASS } from '@/lib/ui/styles'

import type { BreakdownInput } from '@/types/admin'

export type BreakdownTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface BreakdownCardItem extends BreakdownInput {
  tone?: BreakdownTone
}

interface Props {
  title: string
  total: number
  items: BreakdownCardItem[]
}

function barFillClass(tone: BreakdownTone | undefined): string {
  if (tone === 'success') {
    return 'bg-emerald-500'
  }
  if (tone === 'warning') {
    return 'bg-amber-500'
  }
  if (tone === 'danger') {
    return 'bg-rose-500'
  }
  if (tone === 'info') {
    return 'bg-sky-500'
  }
  if (tone === 'neutral') {
    return 'bg-zinc-400 dark:bg-zinc-500'
  }
  return 'bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8]'
}

/** Phân bổ theo trạng thái: thanh ngang màu semantic, số + % ghi bằng chữ nên không phụ thuộc màu. */
export default function BreakdownCard({ title, total, items }: Props) {
  const rows = breakdownRows(items)

  return (
    <section className={PANEL_CLASS}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="font-extrabold tracking-tighter text-[#17203a] dark:text-[#e2e8f0]">
          {title}
        </h2>
        <p className="text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
          Tổng {total.toLocaleString('vi-VN')}
        </p>
      </div>

      {total === 0 && (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center text-xs text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
          Chưa có dữ liệu phân bổ.
        </p>
      )}

      {total > 0 && (
        <ul className="space-y-3">
          {rows.map(function (row, idx) {
            const percent = Math.round(row.share * 100)
            const tone = items[idx]?.tone
            return (
              <li key={row.label}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{row.label}</span>
                  <span className="font-bold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
                    {row.value.toLocaleString('vi-VN')}
                    <span className="ml-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {percent}%
                    </span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-200/80 dark:bg-white/10">
                  {row.value > 0 && (
                    <div
                      className={cn('h-2 min-w-2 rounded-full', barFillClass(tone))}
                      style={{ width: `${row.share * 100}%` }}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
