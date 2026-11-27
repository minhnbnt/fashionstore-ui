import { Link } from 'react-router'

import { CaretRight, CheckCircle } from '@phosphor-icons/react'

import { cn, FOCUS_RING_CLASS, PANEL_CLASS } from '@/lib/ui/styles'

export interface ActionQueueItem {
  key: string
  label: string
  /** Mô tả việc phải làm khi còn tồn đọng. */
  hint: string
  count: number
  tone: 'warning' | 'danger'
  to?: string
}

interface Props {
  items: ActionQueueItem[]
}

function countClass(count: number, tone: ActionQueueItem['tone']): string {
  if (count === 0) {
    return 'text-zinc-300 dark:text-zinc-600'
  }
  if (tone === 'danger') {
    return 'text-rose-700 dark:text-rose-300'
  }
  return 'text-amber-700 dark:text-amber-300'
}

function Row({ item }: { item: ActionQueueItem }) {
  let hint = item.hint
  if (item.count === 0) {
    hint = 'Không có tồn đọng'
  }

  const body = (
    <>
      <span
        className={cn(
          'w-12 shrink-0 text-right text-2xl font-semibold tracking-tight tabular-nums',
          countClass(item.count, item.tone),
        )}
      >
        {item.count.toLocaleString('vi-VN')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#17203a] dark:text-[#e2e8f0]">
          {item.label}
        </span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
      </span>
      {item.count === 0 && (
        <CheckCircle
          size={18}
          weight="fill"
          aria-hidden="true"
          className="shrink-0 text-emerald-600 dark:text-emerald-400"
        />
      )}
      {item.count > 0 && item.to !== undefined && (
        <CaretRight
          size={16}
          weight="bold"
          aria-hidden="true"
          className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700 dark:group-hover:text-sky-300"
        />
      )}
    </>
  )

  const rowClass = 'flex items-center gap-4 rounded-2xl px-2 py-3'

  if (item.to !== undefined) {
    return (
      <Link
        to={item.to}
        className={cn(
          rowClass,
          'group cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04]',
          FOCUS_RING_CLASS,
        )}
      >
        {body}
      </Link>
    )
  }

  return <div className={rowClass}>{body}</div>
}

/** Hàng đợi việc của admin: số lớn bên trái để quét nhanh, bấm vào là tới đúng bộ lọc. */
export default function ActionQueue({ items }: Props) {
  let pending = 0
  for (const item of items) {
    pending += item.count
  }

  let summary = 'Đã xử lý hết, không có việc chờ.'
  if (pending > 0) {
    summary = `${pending.toLocaleString('vi-VN')} việc đang chờ bạn xử lý.`
  }

  return (
    <section
      aria-labelledby="action-queue-title"
      className={cn(PANEL_CLASS, 'flex h-full flex-col')}
    >
      <h2
        id="action-queue-title"
        className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]"
      >
        Việc cần xử lý
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{summary}</p>
      <ul className="-mx-2 mt-3 divide-y divide-zinc-100 dark:divide-white/[0.06]">
        {items.map(function (item) {
          return (
            <li key={item.key}>
              <Row item={item} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
