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

// Focus ring chuẩn dùng chung trên mọi phần tử tương tác
export const FOCUS_RING_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:focus-visible:ring-sky-400/45'

// Form controls chuẩn theo docs/design-system.md (pill input, rounded-2xl textarea)
export const LABEL_CLASS = 'mb-1.5 block text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]'

export const INPUT_CLASS =
  'w-full rounded-full border border-zinc-300 bg-white/85 px-4 py-2.5 text-sm text-[#17203a] placeholder:text-zinc-500 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-sky-400 dark:focus:ring-sky-400/25'

export const TEXTAREA_CLASS =
  'w-full rounded-2xl border border-zinc-300 bg-white/85 px-4 py-2.5 text-sm text-[#17203a] placeholder:text-zinc-500 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-sky-400 dark:focus:ring-sky-400/25'

// Card/panel bề mặt chuẩn: light crisp/translucent, dark navy #11182a
export const CARD_CLASS =
  'rounded-3xl border border-zinc-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-[#11182a]'

export const PANEL_CLASS =
  'rounded-3xl border border-zinc-200/90 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]'

export const WORKSPACE_PANEL_CLASS =
  'rounded-3xl border border-zinc-200/90 bg-white/95 p-5 shadow-sm md:p-6 dark:border-white/10 dark:bg-[#11182a]'

// Nhóm nút dạng pill (tab, chọn sắp xếp, chuyển view)
export function segmentedTrackClass(): string {
  return 'flex items-center gap-1 rounded-full bg-zinc-100/90 p-1 dark:bg-white/10'
}

export function segmentedItemClass(active: boolean): string {
  if (active) {
    return 'btn-primary flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:focus-visible:ring-sky-400/45'
  }
  return 'flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-zinc-600 transition hover:text-[#17203a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:text-zinc-300 dark:hover:text-white dark:focus-visible:ring-sky-400/45'
}

// Ô icon bo góc có nền gradient nhạt — dùng cho menu, accordion, tiêu đề panel
export function iconChipClass(): string {
  return 'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 text-blue-700 dark:from-white/10 dark:to-white/5 dark:text-sky-300'
}

// Card lồng trong panel glass
export function cardClass(): string {
  return 'rounded-2xl border border-zinc-300/70 bg-white/75 dark:border-white/10 dark:bg-white/5'
}

// Chip bộ lọc đang bật
export function filterChipClass(): string {
  return 'flex cursor-pointer items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25 dark:focus-visible:ring-sky-400/45'
}

// Chip gợi ý nhỏ (xu hướng, gợi ý tìm kiếm)
export function chipClass(active: boolean): string {
  if (active) {
    return 'btn-primary cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xs'
  }
  return 'cursor-pointer rounded-full border border-sky-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-zinc-600 transition hover:border-sky-300 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:text-sky-300 dark:focus-visible:ring-sky-400/45'
}

// Hàng chọn trong sidebar bộ lọc (danh mục, kích cỡ...)
export function filterRowClass(selected: boolean): string {
  if (selected) {
    return 'btn-primary w-full flex cursor-pointer items-center justify-between rounded-full px-3 py-2 text-left text-xs font-extrabold shadow-xs'
  }
  return 'w-full flex cursor-pointer items-center justify-between rounded-full px-3 py-2 text-left text-xs font-semibold text-zinc-600 transition hover:bg-sky-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-sky-400/45'
}

// Pill chọn nhỏ trong sidebar (khoảng giá, kích cỡ, màu)
export function optionPillClass(selected: boolean): string {
  if (selected) {
    return 'btn-primary cursor-pointer rounded-full px-2.5 py-1.5 text-[11px] font-extrabold shadow-xs'
  }
  return 'cursor-pointer rounded-full border border-sky-200/80 bg-white/80 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-sky-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:bg-white/10 dark:focus-visible:ring-sky-400/45'
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
  return 'text-xs font-extrabold tracking-wider text-zinc-600 uppercase dark:text-zinc-400'
}

// Nút chính gradient brand
export function primaryButtonClass(): string {
  return 'btn-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:focus-visible:ring-sky-400/45'
}

// Nút phụ (viền trung tính, bo tròn pill)
export function secondaryButtonClass(): string {
  return 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white/90 px-4 py-2 text-sm font-bold text-[#17203a] transition hover:bg-zinc-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:border-white/15 dark:bg-white/10 dark:text-[#e2e8f0] dark:hover:bg-white/15 dark:focus-visible:ring-sky-400/45'
}

// Nút thành công / duyệt (emerald semantic)
export function successButtonClass(): string {
  return 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:bg-emerald-500 dark:hover:bg-emerald-600'
}

// Nút ghost không viền
export function ghostButtonClass(): string {
  return 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-sky-50 hover:text-[#17203a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-sky-400/45'
}

// Nút hành động nguy hiểm (xóa, hủy, gỡ — thống nhất họ rose)
export function dangerButtonClass(): string {
  return 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:bg-rose-500 dark:hover:bg-rose-600'
}

// Nút icon tròn
export function iconButtonClass(): string {
  return 'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-300/80 bg-white/85 text-zinc-700 transition hover:bg-zinc-100 hover:text-[#17203a] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15 dark:hover:text-white dark:focus-visible:ring-sky-400/45'
}

// Semantic badge tone helper
export function badgeToneClass(
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral',
): string {
  if (tone === 'success') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
  }
  if (tone === 'warning') {
    return 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
  }
  if (tone === 'danger') {
    return 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300'
  }
  if (tone === 'info') {
    return 'border border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300'
  }
  return 'border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200'
}

// Mục điều hướng sidebar (trạng thái active dùng gradient brand btn-primary)
export function sidebarItemClass(active: boolean): string {
  if (active) {
    return 'btn-primary flex w-full cursor-pointer items-center gap-2.5 rounded-full px-3.5 py-2.5 text-sm font-bold shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:focus-visible:ring-sky-400/45'
  }
  return 'flex w-full cursor-pointer items-center gap-2.5 rounded-full px-3.5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-sky-50 hover:text-[#17203a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-sky-400/45'
}

// Hàng trong menu tài khoản
export function menuItemClass(): string {
  return 'group flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-indigo-50 focus-visible:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none focus-visible:ring-inset dark:text-zinc-200 dark:hover:bg-white/10 dark:focus-visible:bg-white/10 dark:focus-visible:ring-sky-400/40'
}
