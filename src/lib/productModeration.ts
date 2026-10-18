import { formatVnd } from './format'

import type { BanProductRequestViolationType } from '@generated/model/banProductRequestViolationType'

export type ProductStatusFilter = 'ACTIVE' | 'HIDDEN' | 'BANNED' | 'ALL'

export const STATUS_TABS: { value: ProductStatusFilter; label: string }[] = [
  { value: 'ACTIVE', label: 'Đang bán' },
  { value: 'HIDDEN', label: 'Đang ẩn' },
  { value: 'BANNED', label: 'Bị gỡ' },
  { value: 'ALL', label: 'Tất cả' },
]

export interface ViolationOption {
  type: BanProductRequestViolationType
  label: string
  hint: string
  templates: string[]
}

// Thứ tự theo tần suất gặp trên sàn thời trang: hàng giả/nhái và sai lệch thông tin nhiều nhất.
export const VIOLATION_OPTIONS: ViolationOption[] = [
  {
    type: 'COUNTERFEIT',
    label: 'Hàng giả, hàng nhái',
    hint: 'Sao chép thiết kế, nhãn mác của thương hiệu khác',
    templates: [
      'Sản phẩm có dấu hiệu là hàng giả/nhái thương hiệu.',
      'Shop chưa cung cấp được chứng từ nguồn gốc hàng hóa.',
    ],
  },
  {
    type: 'MISLEADING',
    label: 'Thông tin sai lệch',
    hint: 'Ảnh, mô tả, giá không đúng thực tế',
    templates: [
      'Hình ảnh không đúng với sản phẩm thực tế.',
      'Mô tả chất liệu/xuất xứ không chính xác.',
      'Giá niêm yết bất thường, gây hiểu nhầm cho người mua.',
    ],
  },
  {
    type: 'IP_INFRINGEMENT',
    label: 'Vi phạm sở hữu trí tuệ',
    hint: 'Dùng logo, hình ảnh, tên thương hiệu không được phép',
    templates: [
      'Sử dụng logo/tên thương hiệu khi chưa được ủy quyền.',
      'Sử dụng hình ảnh có bản quyền của bên khác.',
    ],
  },
  {
    type: 'PROHIBITED',
    label: 'Hàng cấm, hạn chế',
    hint: 'Hàng hóa pháp luật hoặc chính sách sàn không cho phép',
    templates: [
      'Sản phẩm thuộc danh mục hàng cấm kinh doanh trên sàn.',
      'Sản phẩm có hình ảnh/nội dung phản cảm.',
    ],
  },
  {
    type: 'WRONG_CATEGORY',
    label: 'Sai danh mục',
    hint: 'Đăng vào danh mục không phù hợp để tăng hiển thị',
    templates: ['Sản phẩm được đăng sai danh mục, vui lòng chọn lại danh mục phù hợp.'],
  },
  {
    type: 'SPAM',
    label: 'Spam, trùng lặp',
    hint: 'Đăng lặp lại cùng sản phẩm hoặc nhồi từ khóa',
    templates: [
      'Sản phẩm đăng trùng lặp với sản phẩm khác của shop.',
      'Tên sản phẩm nhồi nhét từ khóa không liên quan.',
    ],
  },
  {
    type: 'OTHER',
    label: 'Lý do khác',
    hint: 'Ghi rõ lý do trong phần ghi chú',
    templates: [],
  },
]

export const REASON_MIN = 5
export const REASON_MAX = 500

export function violationLabel(type: string | null | undefined): string {
  if (type === null || type === undefined) {
    return ''
  }
  const option = VIOLATION_OPTIONS.find((item) => item.type === type)
  if (option === undefined) {
    return type
  }
  return option.label
}

export function statusLabel(status: string | undefined): string {
  if (status === 'ACTIVE') {
    return 'Đang bán'
  }
  if (status === 'HIDDEN') {
    return 'Đang ẩn'
  }
  if (status === 'BANNED') {
    return 'Bị gỡ'
  }
  if (status === 'DELETED') {
    return 'Shop đã xóa'
  }
  return status ?? ''
}

export function statusBadgeClass(status: string | undefined): string {
  const base = 'w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold'
  if (status === 'ACTIVE') {
    return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300`
  }
  if (status === 'BANNED') {
    return `${base} bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300`
  }
  return `${base} bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300`
}

/** Chỉ hàng đang bán hoặc đang ẩn mới gỡ được; đã gỡ/đã xóa thì không. */
export function canBan(status: string | undefined): boolean {
  return status === 'ACTIVE' || status === 'HIDDEN'
}

export function canRestore(status: string | undefined): boolean {
  return status === 'BANNED'
}

/** Lỗi hiển thị dưới ô lý do, null khi hợp lệ. Khớp ràng buộc 5–500 ký tự ở backend. */
export function reasonError(reason: string): string | null {
  const length = reason.trim().length
  if (length < REASON_MIN) {
    return `Lý do cần ít nhất ${REASON_MIN} ký tự.`
  }
  if (length > REASON_MAX) {
    return `Lý do tối đa ${REASON_MAX} ký tự.`
  }
  return null
}

/** Bấm lý do mẫu: nối vào cuối, không lặp lại câu đã có. */
export function appendTemplate(reason: string, template: string): string {
  const current = reason.trim()
  if (current === '') {
    return template
  }
  if (current.includes(template)) {
    return current
  }
  return `${current} ${template}`
}

export function priceRangeLabel(min: number | undefined, max: number | undefined): string {
  const low = min ?? 0
  const high = max ?? low
  if (low === high) {
    return formatVnd(low)
  }
  return `${formatVnd(low)} – ${formatVnd(high)}`
}

export function formatDateTime(iso: string | undefined): string {
  if (iso === undefined) {
    return ''
  }
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}
