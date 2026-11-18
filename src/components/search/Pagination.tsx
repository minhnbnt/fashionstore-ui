import { CaretLeft, CaretRight } from '@phosphor-icons/react'

import { pageWindow } from '@/lib/pagination'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

function pageClass(selected: boolean): string {
  if (selected) {
    return cn(
      'btn-primary h-10 min-w-10 cursor-pointer rounded-full px-3 text-sm font-bold tabular-nums',
      FOCUS_RING_CLASS,
    )
  }
  return cn(
    'h-10 min-w-10 cursor-pointer rounded-full px-3 text-sm font-bold tabular-nums transition hover:bg-sky-100 dark:hover:bg-white/10',
    FOCUS_RING_CLASS,
  )
}

export default function Pagination(props: {
  page: number
  totalPages: number
  onPage: (page: number) => void
  totalItems?: number
  pageSize?: number
}) {
  if (props.totalPages <= 1) {
    return null
  }
  const isFirst = props.page <= 0
  const isLast = props.page >= props.totalPages - 1
  const navClass = cn(
    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-white/10',
    FOCUS_RING_CLASS,
  )

  const showRange =
    props.totalItems !== undefined &&
    props.pageSize !== undefined &&
    props.totalItems > 0 &&
    props.pageSize > 0
  let rangeStart = 0
  let rangeEnd = 0
  if (showRange && props.totalItems !== undefined && props.pageSize !== undefined) {
    rangeStart = props.page * props.pageSize + 1
    rangeEnd = Math.min((props.page + 1) * props.pageSize, props.totalItems)
  }

  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      {showRange && (
        <p className="text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
          Hiển thị {rangeStart}–{rangeEnd} trên {props.totalItems} sản phẩm
        </p>
      )}
      <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          aria-label="Trang trước"
          disabled={isFirst}
          onClick={function () {
            props.onPage(props.page - 1)
          }}
          className={navClass}
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        {pageWindow(props.page, props.totalPages).map(function (p, i) {
          if (p === null) {
            return (
              <span key={'gap-' + i} className="px-1 text-zinc-400">
                …
              </span>
            )
          }
          const selected = p === props.page
          return (
            <button
              key={p}
              type="button"
              aria-current={selected && 'page'}
              onClick={function () {
                props.onPage(p)
              }}
              className={pageClass(selected)}
            >
              {p + 1}
            </button>
          )
        })}
        <button
          type="button"
          aria-label="Trang sau"
          disabled={isLast}
          onClick={function () {
            props.onPage(props.page + 1)
          }}
          className={navClass}
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </nav>
    </div>
  )
}
