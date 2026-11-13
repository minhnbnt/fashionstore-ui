/** Class dùng chung cho bubble, canvas và ô nhập trên khung chat, trang /messages và CSKH. */

export type ChatSurfaceVariant = 'dock' | 'page'

export const CHAT_INPUT_CLASS =
  'min-w-0 flex-1 rounded-full border border-zinc-300 bg-white/90 px-4 py-2.5 text-[13px] text-[#17203a] placeholder:text-zinc-400 transition outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-sky-400'

export const CHAT_CANVAS_CLASS = 'bg-[#f6f9ff]/75 dark:bg-[#0a0f1e]/35'

export const CHAT_SEARCH_PILL_CLASS =
  'flex items-center gap-2 rounded-full border border-zinc-300 bg-white/90 px-3.5 py-2 text-xs text-[#17203a] transition focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus-within:border-sky-400'

export const CHAT_SEND_BUTTON_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-800 text-white shadow-md shadow-blue-950/30 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-blue-900 enabled:active:scale-95 disabled:cursor-not-allowed disabled:bg-blue-700 disabled:shadow-none dark:bg-blue-700 dark:ring-1 dark:ring-blue-400/45 dark:enabled:hover:bg-blue-600 dark:disabled:bg-blue-800'

export function bubbleClass(isMine: boolean, variant: ChatSurfaceVariant = 'dock'): string {
  let sizeClass = 'px-3.5 py-2.5 text-[13px]'
  if (variant === 'page') {
    sizeClass = 'px-4 py-3 text-sm'
  }
  if (isMine) {
    return (
      'max-w-[78%] rounded-2xl rounded-tr-xs bg-indigo-600 leading-relaxed text-white shadow-xs shadow-indigo-950/10 ' +
      sizeClass
    )
  }
  return (
    'max-w-[78%] rounded-2xl rounded-tl-xs border border-zinc-200/80 bg-white leading-relaxed text-[#17203a] shadow-2xs dark:border-white/10 dark:bg-white/10 dark:text-slate-100 ' +
    sizeClass
  )
}

export function messageRowClass(isMine: boolean): string {
  if (isMine) {
    return 'flex flex-col items-end'
  }
  return 'flex flex-col items-start'
}
