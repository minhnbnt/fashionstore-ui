import { Link } from 'react-router'

import { CaretRight, House } from '@phosphor-icons/react'

import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

export interface BreadcrumbItem {
  label: string
  to?: string
  onClick?: () => void
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showHomeIcon?: boolean
  className?: string
}

export function Breadcrumb({ items, showHomeIcon = false, className }: BreadcrumbProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Đường dẫn điều hướng"
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300',
        className,
      )}
    >
      {items.map(function (item, idx) {
        const isLast = idx === items.length - 1
        const isFirst = idx === 0

        return (
          <span key={`${item.label}-${idx}`} className="inline-flex min-w-0 items-center gap-1.5">
            {idx > 0 && (
              <CaretRight
                size={12}
                weight="bold"
                aria-hidden="true"
                className="shrink-0 text-zinc-400 dark:text-zinc-500"
              />
            )}

            {isLast && (
              <span
                aria-current="page"
                className="max-w-[260px] truncate font-bold text-[#17203a] sm:max-w-md dark:text-white"
              >
                {item.label}
              </span>
            )}

            {isLast === false && item.to !== undefined && (
              <Link
                to={item.to}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full font-semibold transition hover:text-blue-700 dark:hover:text-sky-300',
                  FOCUS_RING_CLASS,
                )}
              >
                {isFirst && showHomeIcon && <House size={14} weight="bold" aria-hidden="true" />}
                <span>{item.label}</span>
              </Link>
            )}

            {isLast === false && item.to === undefined && item.onClick !== undefined && (
              <button
                type="button"
                onClick={item.onClick}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1 rounded-full font-semibold transition hover:text-blue-700 dark:hover:text-sky-300',
                  FOCUS_RING_CLASS,
                )}
              >
                {isFirst && showHomeIcon && <House size={14} weight="bold" aria-hidden="true" />}
                <span>{item.label}</span>
              </button>
            )}

            {isLast === false && item.to === undefined && item.onClick === undefined && (
              <span className="font-semibold">{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default Breadcrumb
