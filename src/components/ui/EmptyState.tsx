import type { ReactNode } from 'react'

import { Tray } from '@phosphor-icons/react'

import { cn, iconChipClass } from '@/lib/ui/styles'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState(props: EmptyStateProps) {
  let iconContent: ReactNode = <Tray size={26} />
  if (props.icon !== undefined) {
    iconContent = props.icon
  }

  return (
    <div
      className={cn(
        'glass flex flex-col items-center justify-center rounded-3xl px-6 py-12 text-center',
        props.className,
      )}
    >
      <div className={cn(iconChipClass(), 'h-14 w-14 rounded-2xl')}>{iconContent}</div>
      <h3 className="mt-4 text-lg font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
        {props.title}
      </h3>
      {props.description !== undefined && props.description !== '' && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {props.description}
        </p>
      )}
      {props.action !== undefined && <div className="mt-5">{props.action}</div>}
    </div>
  )
}

export default EmptyState
