import { CaretLeft, CaretRight } from '@phosphor-icons/react'

import { pageWindow } from '@/lib/pagination'

function pageClass(selected: boolean): string {
  if (selected) {
    return 'h-10 min-w-10 rounded-full bg-indigo-900 px-3 text-sm font-bold text-white'
  }
  return 'h-10 min-w-10 rounded-full px-3 text-sm font-bold transition hover:bg-sky-100 dark:hover:bg-white/10'
}

export default function Pagination(props: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  if (props.totalPages <= 1) {
    return null
  }
  const isFirst = props.page <= 0
  const isLast = props.page >= props.totalPages - 1
  const navClass =
    'flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-sky-100 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-white/10'

  return (
    <nav aria-label="Phân trang" className="mt-10 flex flex-wrap items-center justify-center gap-1">
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
  )
}
