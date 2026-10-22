import { X } from '@phosphor-icons/react'

export const LABEL_CLASS = 'mb-1.5 block text-sm font-bold'
export const INPUT_CLASS =
  'w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5'
export const HINT_CLASS = 'mt-1 text-xs text-zinc-500 dark:text-zinc-400'
export const ERROR_CLASS = 'mt-1 text-xs text-red-600 dark:text-red-400'

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

/** Khung hộp thoại form nội dung (banner/popup/FAQ), cùng kiểu với hộp thoại gỡ sản phẩm. */
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
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <dialog
      open
      aria-label={title}
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-inherit backdrop-blur-xs"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 p-5 dark:border-white/10">
          <h2 className="text-lg font-extrabold tracking-tighter">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-white/10"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {children}
          {error !== null && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-100 p-5 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={canSubmit === false || pending}
            className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
          >
            {pending && <span>{pendingLabel}</span>}
            {pending === false && <span>{submitLabel}</span>}
          </button>
        </div>
      </form>
    </dialog>
  )
}
