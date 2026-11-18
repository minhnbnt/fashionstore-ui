import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { ClassValue } from 'clsx'

// UI kit của DHMQ: tập hợp class Tailwind dùng lại nhiều nơi, gom về một chỗ
// để mọi màn hình cùng một ngôn ngữ. Mỗi hàm trả về chuỗi class base; call-site
// dùng cn() để ghi đè (vd. cn(iconChipClass(), 'h-9 w-9')) — twMerge loại class
// trùng nhóm nên phần ghi đè luôn thắng.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Form controls chuẩn theo docs/design-system.md (pill input, rounded-2xl textarea)
export const LABEL_CLASS = 'mb-1.5 block text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]'

export const INPUT_CLASS =
  'w-full rounded-full border border-zinc-300 bg-white/80 px-4 py-2.5 text-sm text-[#17203a] placeholder:text-zinc-400 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-sky-400'

export const TEXTAREA_CLASS =
  'w-full rounded-2xl border border-zinc-300 bg-white/80 px-4 py-2.5 text-sm text-[#17203a] placeholder:text-zinc-400 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-sky-400'

// Card/panel bề mặt chuẩn: light bg-white/80, dark navy #11182a
export const CARD_CLASS =
  'rounded-3xl border border-zinc-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-[#11182a]'

export const PANEL_CLASS =
  'rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]'

// Nhóm nút dạng pill (tab, chọn sắp xếp, chuyển view)
export function segmentedTrackClass(): string {
  return 'flex items-center gap-1 rounded-full bg-zinc-100/90 p-1 dark:bg-white/10'
}

export function segmentedItemClass(active: boolean): string {
  if (active) {
    return 'btn-primary flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-xs'
  }
  return 'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-zinc-600 transition hover:text-[#17203a] dark:text-zinc-300 dark:hover:text-white'
}

// Ô icon bo góc có nền gradient nhạt — dùng cho menu, accordion, tiêu đề panel
export function iconChipClass(): string {
  return 'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 text-blue-700 dark:from-white/10 dark:to-white/5 dark:text-sky-300'
}

// Card lồng trong panel glass
export function cardClass(): string {
  return 'rounded-2xl border border-zinc-300/70 bg-white/70 dark:border-white/10 dark:bg-white/10'
}

// Chip bộ lọc đang bật
export function filterChipClass(): string {
  return 'flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20'
}

// Chip gợi ý nhỏ (xu hướng, gợi ý tìm kiếm)
export function chipClass(active: boolean): string {
  if (active) {
    return 'btn-primary rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xs'
  }
  return 'rounded-full border border-sky-100 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-zinc-600 transition hover:border-sky-300 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:text-sky-300'
}

// Hàng chọn trong sidebar bộ lọc (danh mục, kích cỡ...)
export function filterRowClass(selected: boolean): string {
  if (selected) {
    return 'btn-primary w-full flex items-center justify-between rounded-full px-3 py-2 text-left text-xs font-extrabold shadow-xs'
  }
  return 'w-full flex items-center justify-between rounded-full px-3 py-2 text-left text-xs font-semibold text-zinc-600 transition hover:bg-sky-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white'
}

// Pill chọn nhỏ trong sidebar (khoảng giá, kích cỡ, màu)
export function optionPillClass(selected: boolean): string {
  if (selected) {
    return 'btn-primary rounded-full px-2.5 py-1.5 text-[11px] font-extrabold shadow-xs'
  }
  return 'rounded-full border border-sky-100 bg-white/70 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-sky-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:bg-white/10'
}

// Switch gạt (giao diện sáng/tối)
export function switchTrackClass(on: boolean): string {
  if (on) {
    return 'bg-blue-600'
  }
  return 'bg-indigo-100 dark:bg-white/10'
}

export function switchKnobClass(): string {
  return 'h-3 w-3 rounded-full bg-white shadow-sm motion-safe:transition-transform motion-safe:duration-200'
}

// Nhãn nhóm nhỏ (Sắp xếp theo:, Xu hướng:, Đang lọc theo:)
export function sectionLabelClass(): string {
  return 'text-xs font-extrabold tracking-wider text-zinc-500 uppercase dark:text-zinc-400'
}

// Nút chính gradient brand
export function primaryButtonClass(): string {
  return 'btn-primary'
}

// Nút phụ (viền trung tính, bo tròn pill)
export function secondaryButtonClass(): string {
  return 'inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white/80 px-4 py-2 text-sm font-bold text-[#17203a] transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-[#e2e8f0] dark:hover:bg-white/15'
}

// Nút hành động nguy hiểm (xóa, hủy, gỡ)
export function dangerButtonClass(): string {
  return 'inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-500 dark:hover:bg-rose-600'
}

// Nút icon tròn
export function iconButtonClass(): string {
  return 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300/80 bg-white/80 text-zinc-700 transition hover:bg-zinc-100 hover:text-[#17203a] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15 dark:hover:text-white'
}

// Mục điều hướng sidebar (trạng thái active dùng gradient brand btn-primary)
export function sidebarItemClass(active: boolean): string {
  if (active) {
    return 'btn-primary flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.5 text-sm font-bold shadow-xs'
  }
  return 'flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-sky-50 hover:text-[#17203a] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white'
}

// Hàng trong menu tài khoản
export function menuItemClass(): string {
  return 'group flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-indigo-50 focus-visible:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none focus-visible:ring-inset dark:text-zinc-200 dark:hover:bg-white/10 dark:focus-visible:bg-white/10 dark:focus-visible:ring-sky-400/40'
}
