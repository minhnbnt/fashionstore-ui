import { Link } from 'react-router'

import { breakdownRows, formatPercent } from '@/lib/admin/adminStats'
import { cn, FOCUS_RING_CLASS, PANEL_CLASS } from '@/lib/ui/styles'

export interface CompositionItem {
  label: string
  value: number
  /** Lớp màu của thanh. Trạng thái dùng màu semantic; nhóm không phải trạng thái dùng một màu chung. */
  fillClass: string
}

export interface CompositionGroup {
  key: string
  title: string
  total: number
  to: string
  items: CompositionItem[]
}

interface Props {
  groups: CompositionGroup[]
}

function GroupColumn({ group }: { group: CompositionGroup }) {
  const rows = breakdownRows(group.items)

  return (
    <div className="min-w-0">
      <Link
        to={group.to}
        className={cn(
          'flex items-baseline justify-between gap-2 rounded-lg hover:text-blue-700 dark:hover:text-sky-300',
          FOCUS_RING_CLASS,
        )}
      >
        <h3 className="text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">{group.title}</h3>
        <span className="text-xl font-semibold tracking-tight text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
          {group.total.toLocaleString('vi-VN')}
        </span>
      </Link>

      <ul className="mt-3 space-y-2.5">
        {rows.map(function (row, idx) {
          const fill = group.items[idx]?.fillClass ?? 'bg-blue-700'
          return (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-zinc-600 dark:text-zinc-300">{row.label}</span>
                <span className="font-semibold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
                  {row.value.toLocaleString('vi-VN')}
                  <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">
                    {formatPercent(row.share)}
                  </span>
                </span>
              </div>
              <div
                aria-hidden="true"
                className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-white/10"
              >
                {row.value > 0 && (
                  <div
                    className={cn('h-full rounded-full', fill)}
                    style={{ width: `${row.share * 100}%`, minWidth: 6 }}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Cơ cấu tài khoản / shop / sản phẩm gom vào một panel ba cột thay vì ba thẻ rời. */
export default function CompositionPanel({ groups }: Props) {
  return (
    <section aria-labelledby="composition-title" className={PANEL_CLASS}>
      <h2
        id="composition-title"
        className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]"
      >
        Cơ cấu nền tảng
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-zinc-100 dark:md:divide-white/[0.06]">
        {groups.map(function (group, index) {
          let padClass = 'md:px-6'
          if (index === 0) {
            padClass = 'md:pr-6'
          }
          if (index === groups.length - 1) {
            padClass = 'md:pl-6'
          }
          return (
            <div key={group.key} className={padClass}>
              <GroupColumn group={group} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
