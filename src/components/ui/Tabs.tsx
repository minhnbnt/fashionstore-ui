import type { ReactNode } from 'react'

import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn, FOCUS_RING_CLASS, segmentedTrackClass } from '@/lib/ui/styles'

export interface TabItem {
  value: string
  label: string
  icon?: ReactNode
  badge?: number
}

export interface PillTabsProps {
  value: string
  onValueChange: (value: string) => void
  items: TabItem[]
  ariaLabel?: string
  className?: string
  children?: ReactNode
}

export function PillTabs({
  value,
  onValueChange,
  items,
  ariaLabel,
  className,
  children,
}: PillTabsProps) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List
        aria-label={ariaLabel}
        className={cn(segmentedTrackClass(), 'max-w-full overflow-x-auto whitespace-nowrap')}
      >
        {items.map(function (item) {
          const isActive = item.value === value
          let triggerClass =
            'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-zinc-600 transition hover:text-[#17203a] dark:text-zinc-300 dark:hover:text-white'
          if (isActive) {
            triggerClass =
              'btn-primary inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-xs'
          }
          return (
            <TabsPrimitive.Trigger
              key={item.value}
              value={item.value}
              className={cn(triggerClass, FOCUS_RING_CLASS)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums">
                  {item.badge}
                </span>
              )}
            </TabsPrimitive.Trigger>
          )
        })}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  )
}

export const TabPanel = TabsPrimitive.Content

export default PillTabs
