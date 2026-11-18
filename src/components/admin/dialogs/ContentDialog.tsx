import Modal from '@/components/Modal'
import {
  cn,
  INPUT_CLASS,
  LABEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  TEXTAREA_CLASS,
} from '@/lib/ui/styles'

export { INPUT_CLASS, LABEL_CLASS, TEXTAREA_CLASS }
export const HINT_CLASS = 'mt-1 text-xs text-zinc-500 dark:text-zinc-400'
export const ERROR_CLASS = 'mt-1 text-xs font-medium text-rose-600 dark:text-rose-400'

interface Props {
  title: string
  submitLabel: string
  pendingLabel: string
  pending: boolean
  canSubmit: boolean
  error: string | null
  onClose: () => void
  onSubmit: () => void
  children: React.ReactNode
}

/** Khung hộp thoại form nội dung (banner/popup/FAQ) dùng chung Modal chuẩn DHMQ. */
export default function ContentDialog({
  title,
  submitLabel,
  pendingLabel,
  pending,
  canSubmit,
  error,
  onClose,
  onSubmit,
  children,
}: Props) {
  function handleClose() {
    if (pending) {
      return
    }
    onClose()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <Modal title={title} onClose={handleClose} widthClass="max-w-2xl">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="space-y-4">
          {children}
          {error !== null && (
            <p
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200"
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-200/80 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className={cn(secondaryButtonClass(), 'px-5 py-2.5')}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={canSubmit === false || pending}
            className={cn(
              primaryButtonClass(),
              'rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {pending && <span>{pendingLabel}</span>}
            {pending === false && <span>{submitLabel}</span>}
          </button>
        </div>
      </form>
    </Modal>
  )
}
