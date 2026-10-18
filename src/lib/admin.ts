import { ApiError } from './apiFetch'

import type { StatusMeta } from '@/types/admin'

export function statusMeta(status: string | null | undefined): StatusMeta {
  if (status === 'PENDING') {
    return {
      label: 'Chờ duyệt',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
    }
  }
  if (status === 'APPROVED') {
    return {
      label: 'Đang hoạt động',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
    }
  }
  if (status === 'SUSPENDED') {
    return {
      label: 'Tạm khóa',
      className: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
    }
  }
  if (status === 'REJECTED') {
    return {
      label: 'Từ chối',
      className: 'bg-zinc-200 text-zinc-700 dark:bg-white/10 dark:text-zinc-200',
    }
  }
  if (status === 'ACTIVE') {
    return {
      label: 'Hoạt động',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
    }
  }
  if (status === 'LOCKED') {
    return {
      label: 'Đã khóa',
      className: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
    }
  }
  return {
    label: status ?? 'Không rõ',
    className: 'bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200',
  }
}

export function roleLabel(role: string | null | undefined): string {
  if (role === 'ADMIN') {
    return 'Quản trị viên'
  }
  if (role === 'SHOP') {
    return 'Người bán'
  }
  return 'Khách hàng'
}

export function formatDateTime(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function pageCount(total: number, size: number): number {
  if (total <= 0 || size <= 0) {
    return 0
  }
  return Math.ceil(total / size)
}

export function adminErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
  }
  if (error.status === 400) {
    return 'Dữ liệu chưa hợp lệ. Hãy kiểm tra lại nội dung đã nhập.'
  }
  if (error.status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }
  if (error.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.'
  }
  if (error.status === 404) {
    return 'Dữ liệu không còn tồn tại hoặc đã được chuyển đi.'
  }
  if (error.status === 409) {
    return 'Trạng thái đã thay đổi. Hãy tải lại dữ liệu trước khi thao tác.'
  }
  if (error.status === 502) {
    return 'Chưa thể đồng bộ với hệ thống đăng nhập. Không có thay đổi nào được lưu.'
  }
  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
}
