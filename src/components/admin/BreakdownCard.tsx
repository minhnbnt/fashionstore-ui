import { breakdownRows } from '@/lib/adminStats'

import type { BreakdownInput } from '@/lib/adminStats'

interface Props {
  title: string
  total: number
  items: BreakdownInput[]
}

/** Phân bổ theo trạng thái: thanh ngang 1 tông màu, số + % ghi bằng chữ nên không phụ thuộc màu. */
export default function BreakdownCard({ title, total, items }: Props) {
  const rows = breakdownRows(items)

  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-extrabold tracking-tighter">{title}</h2>
        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          Tổng {total.toLocaleString('vi-VN')}
        </p>
      </div>
      <ul className="space-y-3">
        {rows.map(function (row) {
          const percent = Math.round(row.share * 100)
          return (
            <li key={row.label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{row.label}</span>
                <span className="font-bold tabular-nums">
                  {row.value.toLocaleString('vi-VN')}
                  <span className="ml-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    {percent}%
                  </span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200/70 dark:bg-white/10">
                {row.value > 0 && (
                  <div
                    className="h-2 min-w-2 rounded-full bg-indigo-500 dark:bg-indigo-400"
                    style={{ width: `${row.share * 100}%` }}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
