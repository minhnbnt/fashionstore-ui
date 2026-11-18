import { CheckCircle, Info, SpinnerGap, Warning, X, XCircle } from '@phosphor-icons/react'
import { Toaster } from 'sonner'

import { useTheme } from '@/hooks/useTheme'
import {
  TOAST_DESKTOP_OFFSET,
  TOAST_GAP,
  TOAST_MOBILE_OFFSET,
  TOAST_POSITION,
  TOAST_VISIBLE_LIMIT,
} from '@/lib/notifications/config'

const TOAST_ICONS = {
  success: (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
      <CheckCircle size={18} weight="fill" />
    </span>
  ),
  error: (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
      <XCircle size={18} weight="fill" />
    </span>
  ),
  warning: (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
      <Warning size={18} weight="fill" />
    </span>
  ),
  info: (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-blue-700 dark:bg-sky-400/20 dark:text-sky-300">
      <Info size={18} weight="fill" />
    </span>
  ),
  loading: (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-blue-700 dark:bg-white/10 dark:text-sky-400">
      <SpinnerGap size={18} weight="bold" className="motion-safe:animate-spin" />
    </span>
  ),
  close: <X size={14} weight="bold" />,
}

const TOAST_OPTIONS = {
  closeButtonAriaLabel: 'Đóng thông báo',
  classNames: {
    toast:
      'group toast flex items-start gap-3 rounded-2xl border border-zinc-200/90 bg-white/95 px-4 py-3.5 text-[#17203a] shadow-xl shadow-indigo-950/10 backdrop-blur-md motion-reduce:transition-none dark:border-white/15 dark:bg-[#0a0f1e]/95 dark:text-[#e2e8f0] dark:shadow-black/60',
    success:
      '!border-emerald-300 !bg-emerald-50/95 !text-emerald-950 dark:!border-emerald-500/45 dark:!bg-[#0c231c]/95 dark:!text-emerald-100',
    error:
      '!border-rose-300 !bg-rose-50/95 !text-rose-950 dark:!border-rose-500/45 dark:!bg-[#241019]/95 dark:!text-rose-100',
    warning:
      '!border-amber-300 !bg-amber-50/95 !text-amber-950 dark:!border-amber-500/45 dark:!bg-[#241b0d]/95 dark:!text-amber-100',
    info: '!border-sky-300 !bg-sky-50/95 !text-sky-950 dark:!border-sky-400/45 dark:!bg-[#0d1d2f]/95 dark:!text-sky-100',
    loading:
      '!border-indigo-200 !bg-white/95 !text-[#17203a] dark:!border-white/15 dark:!bg-[#11182a]/95 dark:!text-[#e2e8f0]',
    title: 'text-sm font-bold leading-snug text-current',
    description: 'text-xs leading-relaxed text-current opacity-85',
    actionButton: 'btn-primary cursor-pointer rounded-full px-3 py-1 text-xs font-bold',
    cancelButton:
      'cursor-pointer rounded-full border border-zinc-300 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15',
    closeButton:
      'cursor-pointer rounded-full border border-zinc-200/90 bg-white/90 text-zinc-600 transition hover:bg-zinc-100 hover:text-[#17203a] focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none motion-reduce:transition-none dark:border-white/15 dark:bg-[#11182a] dark:text-zinc-300 dark:hover:bg-white/15 dark:hover:text-white dark:focus-visible:ring-sky-400/45',
    icon: 'mt-0.5 shrink-0 !w-7 !h-7',
  },
}

export function AppToaster() {
  const { theme } = useTheme()

  return (
    <Toaster
      theme={theme}
      position={TOAST_POSITION}
      visibleToasts={TOAST_VISIBLE_LIMIT}
      gap={TOAST_GAP}
      offset={TOAST_DESKTOP_OFFSET}
      mobileOffset={TOAST_MOBILE_OFFSET}
      closeButton
      richColors={false}
      icons={TOAST_ICONS}
      toastOptions={TOAST_OPTIONS}
    />
  )
}

export default AppToaster
