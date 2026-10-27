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
      label: 'Đã giao',
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

export function paymentStatusLabel(status: string | null | undefined): string {
  if (status === 'UNPAID') {
    return 'Chưa thanh toán'
  }
  if (status === 'COLLECTED') {
    return 'Đã thu tiền'
  }
  return status ?? 'Không rõ'
}
