import type { AdminCancelOrderRequestReason } from '@generated/model/adminCancelOrderRequestReason'

export type OrderStatusFilter =
  | 'ALL'
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'

export type OrderAlertFilter = 'CONFIRM_LATE' | 'HANDOVER_LATE' | 'DELIVERY_LATE' | 'RETURN_OPEN'

type StatusCounts = {
  total?: number
  pending?: number
  confirmed?: number
  shipping?: number
  delivered?: number
  cancelled?: number
}

export const STATUS_TABS: { value: OrderStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Chờ lấy hàng' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

export interface AlertOption {
  value: OrderAlertFilter
  label: string
  hint: string
}

// Mốc giờ khớp backend (OrderMonitoringQueryRepository), tham khảo SLA Shopee/Lazada.
export const ALERT_OPTIONS: AlertOption[] = [
  { value: 'CONFIRM_LATE', label: 'Chậm xác nhận', hint: 'Chờ xác nhận quá 24 giờ' },
  {
    value: 'HANDOVER_LATE',
    label: 'Chậm bàn giao vận chuyển',
    hint: 'Đặt quá 48 giờ chưa giao cho vận chuyển',
  },
  { value: 'DELIVERY_LATE', label: 'Giao hàng quá lâu', hint: 'Đang giao quá 7 ngày' },
  { value: 'RETURN_OPEN', label: 'Trả hàng chờ xử lý', hint: 'Yêu cầu trả hàng chưa hoàn tất' },
]

export interface CancelReasonOption {
  type: AdminCancelOrderRequestReason
  label: string
  hint: string
  templates: string[]
}

export const CANCEL_REASON_OPTIONS: CancelReasonOption[] = [
  {
    type: 'SELLER_UNRESPONSIVE',
    label: 'Shop không xử lý đơn',
    hint: 'Đơn quá hạn xác nhận/bàn giao, shop không phản hồi',
    templates: [
      'Shop không xác nhận đơn quá thời hạn quy định.',
      'Shop không bàn giao hàng cho đơn vị vận chuyển đúng hạn.',
    ],
  },
  {
    type: 'FRAUD_SUSPECTED',
    label: 'Nghi gian lận, đơn ảo',
    hint: 'Buff đơn, đặt hàng loạt bất thường, thông tin giả',
    templates: [
      'Tài khoản đặt nhiều đơn bất thường trong thời gian ngắn.',
      'Thông tin người nhận không xác thực được.',
    ],
  },
  {
    type: 'BUYER_REQUEST',
    label: 'Người mua yêu cầu',
    hint: 'Người mua liên hệ CSKH nhờ hủy',
    templates: ['Người mua liên hệ CSKH yêu cầu hủy đơn.'],
  },
  {
    type: 'PROHIBITED_ITEM',
    label: 'Hàng vi phạm chính sách',
    hint: 'Đơn chứa sản phẩm đã/bị gỡ vì vi phạm',
    templates: ['Đơn chứa sản phẩm vi phạm chính sách đăng bán của sàn.'],
  },
  {
    type: 'OTHER',
    label: 'Lý do khác',
    hint: 'Ghi rõ lý do trong phần ghi chú',
    templates: [],
  },
]

/** Chỉ hủy được khi chưa bàn giao vận chuyển, giống Shopee/Lazada. */
export function canAdminCancel(status: string | undefined): boolean {
  return status === 'PENDING' || status === 'CONFIRMED'
}

export function statusLabel(status: string | null | undefined): string {
  const tab = STATUS_TABS.find((item) => item.value === status)
  if (tab === undefined || tab.value === 'ALL') {
    return status ?? ''
  }
  return tab.label
}

export function statusBadgeClass(status: string | undefined): string {
  const base = 'w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold'
  if (status === 'PENDING') {
    return `${base} bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300`
  }
  if (status === 'CONFIRMED' || status === 'SHIPPING') {
    return `${base} bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300`
  }
  if (status === 'DELIVERED') {
    return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300`
  }
  return `${base} bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300`
}

export function alertLabel(alert: string | null | undefined): string {
  const option = ALERT_OPTIONS.find((item) => item.value === alert)
  if (option === undefined) {
    return alert ?? ''
  }
  return option.label
}

export function actorLabel(actor: string | undefined): string {
  if (actor === 'BUYER') {
    return 'Người mua'
  }
  if (actor === 'SELLER') {
    return 'Người bán'
  }
  if (actor === 'ADMIN') {
    return 'Quản trị sàn'
  }
  if (actor === 'SYSTEM') {
    return 'Hệ thống'
  }
  return actor ?? ''
}

export function cancelledByLabel(cancelledBy: string | null | undefined): string {
  if (cancelledBy === null || cancelledBy === undefined) {
    return ''
  }
  return actorLabel(cancelledBy)
}

/** Lý do admin là mã cố định; lý do shop tự nhập thì giữ nguyên. */
export function cancelReasonLabel(reason: string | null | undefined): string {
  if (reason === null || reason === undefined) {
    return ''
  }
  const option = CANCEL_REASON_OPTIONS.find((item) => item.type === reason)
  if (option === undefined) {
    return reason
  }
  return option.label
}

export function tabCount(
  summary: StatusCounts | undefined,
  status: OrderStatusFilter,
): number | undefined {
  if (summary === undefined) {
    return undefined
  }
  if (status === 'ALL') {
    return summary.total ?? 0
  }
  if (status === 'PENDING') {
    return summary.pending ?? 0
  }
  if (status === 'CONFIRMED') {
    return summary.confirmed ?? 0
  }
  if (status === 'SHIPPING') {
    return summary.shipping ?? 0
  }
  if (status === 'DELIVERED') {
    return summary.delivered ?? 0
  }
  return summary.cancelled ?? 0
}

/** Ngày dạng yyyy-MM-dd so sánh chuỗi được; trống là không giới hạn. */
export function dateRangeError(from: string, to: string): string | null {
  if (from === '' || to === '') {
    return null
  }
  if (from > to) {
    return 'Ngày bắt đầu phải trước ngày kết thúc.'
  }
  return null
}

/** Khoảng thời gian từ mốc đến giờ, làm tròn xuống đơn vị lớn nhất: "45 phút", "10 giờ", "3 ngày". */
export function elapsedLabel(iso: string | null | undefined, now: Date): string {
  if (iso === null || iso === undefined) {
    return ''
  }
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) {
    return 'vừa xong'
  }
  if (minutes < 60) {
    return `${minutes} phút`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} giờ`
  }
  return `${Math.floor(hours / 24)} ngày`
}
