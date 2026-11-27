import { Link } from 'react-router'

import { cn, FOCUS_RING_CLASS, PANEL_CLASS } from '@/lib/ui/styles'

export interface RankingRow {
  key: string
  name: string
  secondary: string
  value: number
  valueLabel: string
  to?: string
}

interface Props {
  title: string
  caption: string
  rows: RankingRow[]
  emptyText: string
}

/**
 * Bảng xếp hạng ngắn (top 5). Số thứ tự là hạng thật; thanh dưới tên so với hạng 1
 * để thấy khoảng cách, không phải tỷ trọng.
 */
export default function RankingList({ title, caption, rows, emptyText }: Props) {
  let top = 0
  for (const row of rows) {
    top = Math.max(top, row.value)
  }

  return (
    <section className={cn(PANEL_CLASS, 'flex flex-col')}>
      <h2 className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">{title}</h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{caption}</p>

      {rows.length === 0 && (
        <p className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          {emptyText}
        </p>
      )}

      {rows.length > 0 && (
        <ol className="-mx-2 mt-3 space-y-0.5">
          {rows.map(function (row, index) {
            let width = 0
            if (top > 0) {
              width = (row.value / top) * 100
            }

            const body = (
              <>
                <span className="w-5 shrink-0 pt-0.5 text-sm font-semibold text-zinc-400 tabular-nums dark:text-zinc-500">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-[#17203a] dark:text-[#e2e8f0]">
                      {row.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
                      {row.valueLabel}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {row.secondary}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-1.5 block h-1 rounded-full bg-zinc-100 dark:bg-white/10"
                  >
                    <span
                      className="block h-full rounded-full bg-blue-700 dark:bg-blue-500"
                      style={{ width: `${width}%`, minWidth: 4 }}
                    />
                  </span>
                </span>
              </>
            )

            const rowClass = 'flex gap-3 rounded-2xl px-2 py-2'
            if (row.to !== undefined) {
              return (
                <li key={row.key}>
                  <Link
                    to={row.to}
                    className={cn(
                      rowClass,
                      'cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04]',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    {body}
                  </Link>
                </li>
              )
            }
            return (
              <li key={row.key} className={rowClass}>
                {body}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
