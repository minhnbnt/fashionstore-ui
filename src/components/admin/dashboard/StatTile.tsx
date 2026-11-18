import { cn, iconChipClass } from '@/lib/ui/styles'

import type { Icon } from '@phosphor-icons/react'

interface Props {
  icon: Icon
  label: string
  value: string
  detail?: string
  highlight?: string
}

export default function StatTile({ icon: TileIcon, label, value, detail, highlight }: Props) {
  return (
    <div className="glass flex flex-col gap-2 rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
        <div className={cn(iconChipClass(), 'h-9 w-9 rounded-2xl')}>
          <TileIcon size={18} weight="bold" />
        </div>
      </div>
      <p className="text-3xl font-extrabold tracking-tighter tabular-nums">{value}</p>
      {detail !== undefined && <p className="text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>}
      {highlight !== undefined && (
        <p className="w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          {highlight}
        </p>
      )}
    </div>
  )
}
