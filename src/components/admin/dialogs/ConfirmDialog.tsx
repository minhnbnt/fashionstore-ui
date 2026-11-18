import Modal from '@/components/Modal'
import { cn, dangerButtonClass, primaryButtonClass, secondaryButtonClass } from '@/lib/ui/styles'

export default function ConfirmDialog(props: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  danger?: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}) {
  if (props.open === false) {
    return null
  }

  function handleClose() {
    if (props.pending) {
      return
    }
    props.onClose()
  }

  let confirmClass = cn(
    primaryButtonClass(),
    'cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
  )
  if (props.danger === true) {
    confirmClass = cn(dangerButtonClass(), 'cursor-pointer px-5 py-2.5')
  }

  return (
    <Modal title={props.title} onClose={handleClose} widthClass="max-w-md">
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{props.description}</p>

      {props.error !== undefined && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
          {props.error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleClose}
          disabled={props.pending}
          className={cn(secondaryButtonClass(), 'cursor-pointer px-4 py-2.5')}
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={props.onConfirm}
          disabled={props.pending}
          className={confirmClass}
        >
          {props.pending && <span>Đang xử lý…</span>}
          {props.pending === false && <span>{props.confirmLabel}</span>}
        </button>
      </div>
    </Modal>
  )
}
