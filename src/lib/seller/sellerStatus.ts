import type { StatusMeta } from '@/types/admin'

// Bảng badge trạng thái riêng cho Seller Center. Tách khỏi statusMeta (lib/admin) vì các mã
// PENDING/ACTIVE/APPROVED bị admin và seller dùng với nhãn/mau khác nhau — map chung sẽ làm
// admin hiển thị sai. Nhãn giữ nguyên text đang hiển thị trong các tab seller.
export function sellerStatusMeta(status: string | null | undefined): StatusMeta {
  // Sản phẩm (ACTIVE | HIDDEN/INACTIVE | DELETED | BANNED)
  if (status === 'ACTIVE') {
    return {
      label: 'Đang bán',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
    }
  }
  if (status === 'INACTIVE' || status === 'HIDDEN') {
    return {
      label: 'Đã ẩn',
      className: 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200',
    }
  }
  if (status === 'BANNED') {
    return {
      label: 'Bị gỡ',
      className: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
    }
  }
  if (status === 'DELETED') {
    return {
      label: 'Đã xóa',
      className: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
    }
  }
  // Đơn hàng (PENDING | CONFIRMED | SHIPPING | DELIVERED | CANCELLED)
  if (status === 'PENDING') {
    return {
      label: 'Chờ xác nhận',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
    }
  }
  if (status === 'CONFIRMED') {
    return {
      label: 'Chờ lấy hàng',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-200',
    }
  }
  if (status === 'SHIPPING') {
    return {
      label: 'Đang vận chuyển',
      className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200',
    }
  }
  if (status === 'DELIVERED') {
    return {
      label: 'Đã giao (Đã thu COD)',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
    }
  }
  if (status === 'CANCELLED') {
    return {
      label: 'Đã hủy',
      className: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
    }
  }
  // Yêu cầu trả hàng (REQUESTED | APPROVED | COMPLETED | REJECTED)
  if (status === 'REQUESTED') {
    return {
      label: 'Chờ người bán duyệt',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
    }
  }
  if (status === 'APPROVED') {
    return {
      label: 'Đã duyệt (Chờ khách gửi hàng)',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-200',
    }
  }
  if (status === 'COMPLETED') {
    return {
      label: 'Đã nhận hàng hoàn tất',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
    }
  }
  if (status === 'REJECTED') {
    return {
      label: 'Đã từ chối',
      className: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
    }
  }
  return {
    label: status ?? 'Không rõ',
    className: 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200',
  }
}

// Meta cho bảng SẢN PHẨM của seller: PENDING của sản phẩm nghĩa là "Chờ duyệt" (sản phẩm của
// shop chưa tin cậy chờ admin duyệt), khác PENDING của đơn hàng "Chờ xác nhận" — cùng mã,
// khác ngữ cảnh, nên bảng sản phẩm dùng hàm này thay cho sellerStatusMeta.
export function sellerProductStatusMeta(status: string | null | undefined): StatusMeta {
  if (status === 'PENDING') {
    return {
      label: 'Chờ duyệt',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
    }
  }
  return sellerStatusMeta(status)
}
