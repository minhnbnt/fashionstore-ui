import { CaretDown, Check } from '@phosphor-icons/react'
import * as SelectPrimitive from '@radix-ui/react-select'

import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

// Sentinel cho giá trị rỗng vì Radix Select không cho phép SelectItem value=""
const EMPTY_SENTINEL = '__dhmq_empty__'

export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Chọn...',
  disabled = false,
  ariaLabel,
  className,
}: SelectProps) {
  let radixValue = value
  if (value === '') {
    const hasEmptyOption = options.some(function (opt) {
      return opt.value === ''
    })
    if (hasEmptyOption) {
      radixValue = EMPTY_SENTINEL
    }
  }

  function handleChange(next: string) {
    if (next === EMPTY_SENTINEL) {
      onValueChange('')
      return
    }
    onValueChange(next)
  }

  return (
    <SelectPrimitive.Root value={radixValue} onValueChange={handleChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex w-full cursor-pointer items-center justify-between gap-2 rounded-full border border-zinc-300 bg-white/85 px-4 py-2.5 text-left text-sm text-[#17203a] transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-white/25',
          FOCUS_RING_CLASS,
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <CaretDown
            size={15}
            weight="bold"
            className="shrink-0 text-zinc-500 dark:text-zinc-300"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="z-[95] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 text-[#17203a] shadow-xl dark:border-white/15 dark:bg-[#0a0f1e] dark:text-[#e2e8f0] dark:shadow-black/60"
        >
          <SelectPrimitive.Viewport className="space-y-0.5">
            {options.map(function (opt) {
              let itemValue = opt.value
              if (itemValue === '') {
                itemValue = EMPTY_SENTINEL
              }
              return (
                <SelectPrimitive.Item
                  key={itemValue}
                  value={itemValue}
                  disabled={opt.disabled}
                  className="relative flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-sky-50 data-[highlighted]:text-blue-700 data-[state=checked]:font-bold data-[state=checked]:text-blue-700 dark:data-[highlighted]:bg-white/10 dark:data-[highlighted]:text-sky-300 dark:data-[state=checked]:text-sky-300"
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check size={15} weight="bold" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              )
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export default Select
