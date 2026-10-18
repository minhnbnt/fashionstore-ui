import { X } from '@phosphor-icons/react'

export default function ConfirmDialog(props: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}) {
  if (props.open === false) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <dialog
        open
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-3xl border border-white/30 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#11182a]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="confirm-title" className="text-xl font-extrabold tracking-tight">
              {props.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {props.description}
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={props.onClose}
            disabled={props.pending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {props.error !== undefined && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
            {props.error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.pending}
            className="rounded-full px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={props.pending}
            className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {props.pending && <span>Đang xử lý…</span>}
            {props.pending === false && <span>{props.confirmLabel}</span>}
          </button>
        </div>
      </dialog>
    </div>
  )
}
