import type { StatusMeta } from '@/types/admin'

// Nhãn trạng thái đơn hàng cho người mua. Không dùng statusMeta (lib/admin) vì bảng đó
// dành cho shop/sản phẩm: PENDING ở đó là "Chờ duyệt", còn đơn hàng là "Chờ xác nhận".
export function orderStatusMeta(status: string | null | undefined): StatusMeta {
  if (status === 'PENDING') {
    return {
      label: 'Chờ xác nhận',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
    }
  }
  if (status === 'CONFIRMED') {
    return {
      label: 'Shop đang chuẩn bị hàng',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-200',
    }
  }
  if (status === 'SHIPPING') {
    return {
      label: 'Đang giao',
      className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200',
    }
  }
  if (status === 'DELIVERED') {
    return {
      label: 'Hoàn thành',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
    }
  }
  if (status === 'CANCELLED') {
    return {
      label: 'Đã hủy',
      className: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
    }
  }
  return {
    label: status ?? 'Không rõ',
    className: 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200',
  }
}

/** Tên món đầu tiên + số món còn lại, để thẻ đơn không cao lên theo số sản phẩm. */
export function orderItemSummary(items: { productName?: string }[] | undefined): string {
  if (items === undefined || items.length === 0) {
    return ''
  }
  const firstName = items[0].productName ?? ''
  const rest = items.length - 1
  if (rest === 0) {
    return firstName
  }
  return firstName + ' +' + rest + ' sản phẩm khác'
}

/** Backend chỉ cho buyer hủy khi đơn còn PENDING (OrderService.cancel). */
export function canCancel(status: string | null | undefined): boolean {
  return status === 'PENDING'
}

export type BuyerOrderTabKey =
  | 'ALL'
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNS'

export interface BuyerOrderTabDef {
  key: BuyerOrderTabKey
  label: string
}

export const BUYER_ORDER_TABS: readonly BuyerOrderTabDef[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đang chuẩn bị' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
  { key: 'RETURNS', label: 'Đổi trả' },
]

export function canConfirmReceipt(
  status: string | null | undefined,
  receivedAt: string | null | undefined,
  returnStatus: string | null | undefined,
): boolean {
  if (status !== 'DELIVERED') {
    return false
  }
  if (receivedAt !== null && receivedAt !== undefined && receivedAt !== '') {
    return false
  }
  if (returnStatus === 'REQUESTED' || returnStatus === 'APPROVED' || returnStatus === 'COMPLETED') {
    return false
  }
  return true
}

export function returnStatusMeta(status: string | null | undefined): StatusMeta | null {
  if (!status) {
    return null
  }
  if (status === 'REQUESTED') {
    return {
      label: 'Đang yêu cầu đổi trả',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
    }
  }
  if (status === 'APPROVED') {
    return {
      label: 'Shop đã duyệt đổi trả',
      className: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200',
    }
  }
  if (status === 'COMPLETED') {
    return {
      label: 'Đã hoàn tất đổi trả',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
    }
  }
  if (status === 'REJECTED') {
    return {
      label: 'Yêu cầu đổi trả bị từ chối',
      className: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
    }
  }
  return {
    label: status,
    className: 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200',
  }
}

export function paymentStatusLabel(status: string | null | undefined): string {
  if (status === 'UNPAID') {
    return 'Chưa thanh toán'
  }
  if (status === 'COLLECTED') {
    return 'Đã thu tiền'
  }
  if (status === 'FAILED') {
    return 'Thanh toán lỗi'
  }
  return status ?? 'Không rõ'
}
