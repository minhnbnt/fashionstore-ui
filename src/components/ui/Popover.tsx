import type { ReactNode } from 'react'

import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '@/lib/ui/styles'

export interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  contentClassName?: string
}

export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'end',
  sideOffset = 8,
  contentClassName,
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={sideOffset}
          collisionPadding={12}
          className={cn(
            'z-[55] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-zinc-200/90 bg-white/95 text-[#17203a] shadow-xl backdrop-blur-md outline-none dark:border-white/15 dark:bg-[#0a0f1e]/98 dark:text-[#e2e8f0] dark:shadow-black/60',
            contentClassName,
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export default Popover
