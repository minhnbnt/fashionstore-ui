interface Props {
  title: string
  message: string
  confirmLabel: string
  pending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

/** Hộp xác nhận thao tác không hoàn tác được (xóa banner/popup/trang/FAQ). */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: Props) {
  return (
    <dialog
      open
      aria-label={title}
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-inherit backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <h2 className="text-lg font-extrabold tracking-tighter">{title}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
        {error !== null && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending && <span>Đang xử lý…</span>}
            {pending === false && <span>{confirmLabel}</span>}
          </button>
        </div>
      </div>
    </dialog>
  )
}
