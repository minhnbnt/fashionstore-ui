import { Link } from 'react-router'

import { ArrowUpRight } from '@phosphor-icons/react'

import { badgeToneClass, cn, FOCUS_RING_CLASS, iconChipClass, PANEL_CLASS } from '@/lib/ui/styles'

import type { Icon } from '@phosphor-icons/react'

interface Props {
  icon: Icon
  label: string
  value: string
  detail?: string
  highlight?: string
  to?: string
}

export default function StatTile({ icon: TileIcon, label, value, detail, highlight, to }: Props) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
        <div className="flex items-center gap-1.5">
          {to !== undefined && (
            <ArrowUpRight
              size={14}
              weight="bold"
              aria-hidden="true"
              className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-700 dark:text-zinc-500 dark:group-hover:text-sky-300"
            />
          )}
          <div className={cn(iconChipClass(), 'h-9 w-9 rounded-2xl')}>
            <TileIcon size={18} weight="bold" />
          </div>
        </div>
      </div>
      <p className="text-3xl font-extrabold tracking-tighter text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
        {value}
      </p>
      {detail !== undefined && <p className="text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>}
      {highlight !== undefined && (
        <p
          className={cn(
            'w-fit rounded-full px-2.5 py-0.5 text-xs font-bold',
            badgeToneClass('warning'),
          )}
        >
          {highlight}
        </p>
      )}
    </>
  )

  if (to !== undefined) {
    return (
      <Link
        to={to}
        className={cn(
          PANEL_CLASS,
          'group flex cursor-pointer flex-col gap-2 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:hover:border-sky-400/40',
          FOCUS_RING_CLASS,
        )}
      >
        {inner}
      </Link>
    )
  }

  return <div className={cn(PANEL_CLASS, 'flex flex-col gap-2')}>{inner}</div>
}
