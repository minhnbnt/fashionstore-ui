/** Class bubble dùng chung giữa thread chat shop và tab trợ lý AI trong ChatDock. */

export function bubbleClass(isMine: boolean): string {
  if (isMine) {
    return 'max-w-[78%] rounded-2xl rounded-tr-xs bg-indigo-600 p-3 text-xs leading-relaxed text-white'
  }
  return 'max-w-[78%] rounded-2xl rounded-tl-xs bg-zinc-100 p-3 text-xs leading-relaxed text-zinc-900 dark:bg-white/10 dark:text-zinc-100'
}

export function messageRowClass(isMine: boolean): string {
  if (isMine) {
    return 'flex flex-col items-end'
  }
  return 'flex flex-col items-start'
}
