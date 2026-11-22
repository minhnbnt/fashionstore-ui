import { SpinnerGap, Warning } from '@phosphor-icons/react'

import Modal from '@/components/Modal'
import { cn, dangerButtonClass, primaryButtonClass, secondaryButtonClass } from '@/lib/ui/styles'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  if (props.open === false) {
    return null
  }

  const isPending = props.isPending === true
  const isDanger = props.variant === 'danger'
  const confirmLabel = props.confirmLabel ?? 'Xác nhận'
  const cancelLabel = props.cancelLabel ?? 'Hủy'

  function handleClose() {
    if (isPending) {
      return
    }
    props.onCancel()
  }

  let confirmButtonStyle = cn(
    primaryButtonClass(),
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
  )
  if (isDanger) {
    confirmButtonStyle = cn(dangerButtonClass(), 'px-5')
  }

  return (
    <Modal title={props.title} onClose={handleClose} widthClass="max-w-md">
      <div className="mt-4 flex items-start gap-3">
        {isDanger && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <Warning size={20} weight="fill" />
          </div>
        )}
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {props.description}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={handleClose}
          disabled={isPending}
          className={secondaryButtonClass()}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={props.onConfirm}
          disabled={isPending}
          className={confirmButtonStyle}
        >
          {isPending && <SpinnerGap size={16} weight="bold" className="motion-safe:animate-spin" />}
          <span>{confirmLabel}</span>
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
