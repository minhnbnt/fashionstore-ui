import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { SpinnerGap } from '@phosphor-icons/react'

import {
  cn,
  dangerButtonClass,
  ghostButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  successButtonClass,
} from '@/lib/ui/styles'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

function variantClass(variant: ButtonVariant): string {
  if (variant === 'secondary') {
    return secondaryButtonClass()
  }
  if (variant === 'danger') {
    return dangerButtonClass()
  }
  if (variant === 'success') {
    return successButtonClass()
  }
  if (variant === 'ghost') {
    return ghostButtonClass()
  }
  return cn(
    primaryButtonClass(),
    'inline-flex items-center justify-center gap-2 rounded-full font-bold disabled:cursor-not-allowed disabled:opacity-50',
  )
}

function sizeClass(size: ButtonSize): string {
  if (size === 'sm') {
    return 'px-3.5 py-1.5 text-xs'
  }
  if (size === 'lg') {
    return 'px-6 py-3 text-sm'
  }
  return 'px-4 py-2 text-sm'
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled === true || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(variantClass(variant), sizeClass(size), className)}
      {...rest}
    >
      {loading && <SpinnerGap size={16} weight="bold" className="motion-safe:animate-spin" />}
      {children}
    </button>
  )
}

export default Button
