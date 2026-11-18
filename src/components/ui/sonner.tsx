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
    <CheckCircle size={20} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
  ),
  error: <XCircle size={20} weight="fill" className="text-rose-600 dark:text-rose-400" />,
  warning: <Warning size={20} weight="fill" className="text-amber-500 dark:text-amber-400" />,
  info: <Info size={20} weight="fill" className="text-blue-600 dark:text-sky-400" />,
  loading: (
    <SpinnerGap
      size={20}
      weight="bold"
      className="text-indigo-600 motion-safe:animate-spin dark:text-sky-400"
    />
  ),
  close: <X size={14} weight="bold" />,
}

const TOAST_OPTIONS = {
  closeButtonAriaLabel: 'Đóng thông báo',
  classNames: {
    toast:
      'group toast flex items-start gap-3 rounded-2xl border border-zinc-200/90 bg-white/95 px-4 py-3.5 text-[#17203a] shadow-xl backdrop-blur-md motion-reduce:transition-none dark:border-white/15 dark:bg-[#0a0f1e]/95 dark:text-[#e2e8f0] dark:shadow-black/60',
    title: 'text-sm font-bold leading-snug text-[#17203a] dark:text-[#e2e8f0]',
    description: 'text-xs leading-relaxed text-zinc-600 dark:text-zinc-300',
    actionButton: 'btn-primary rounded-full px-3 py-1 text-xs font-bold',
    cancelButton:
      'rounded-full border border-zinc-300 bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15',
    closeButton:
      'rounded-full border border-zinc-200/90 bg-white text-zinc-500 transition hover:bg-zinc-100 hover:text-[#17203a] motion-reduce:transition-none dark:border-white/15 dark:bg-[#11182a] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white',
    icon: 'mt-0.5 shrink-0',
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
