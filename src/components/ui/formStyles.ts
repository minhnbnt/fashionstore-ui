// Recipe form control chuẩn theo docs/design-system.md (dòng 33-38) — dùng chung admin + seller.
// Input single-line pill, textarea giữ rounded-2xl (ngoại lệ hợp lý theo spec dòng 17).
export const LABEL_CLASS = 'mb-1.5 block text-sm font-bold'
export const INPUT_CLASS =
  'w-full rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10'
export const TEXTAREA_CLASS =
  'w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10'

// Card/panel bề mặt chuẩn: light bg-white/80, dark navy #11182a (docs/design-system.md dòng 52-53).
export const CARD_CLASS =
  'rounded-3xl border border-zinc-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-[#11182a]'
export const PANEL_CLASS =
  'rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]'
