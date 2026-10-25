import { useGetMyPermissions } from '@generated/endpoints/seller-staff-roles/seller-staff-roles'

import { takeData } from '@/lib/apiAdapters'

import type { SellerTabId } from '@/types/seller'

export function useSellerPermissions(shopId: string) {
  const query = useGetMyPermissions(shopId, { query: { enabled: Boolean(shopId) } })
  let isOwner = false
  let permissions: string[] = []
  if (query.data !== undefined) {
    const permData = takeData(query.data)
    isOwner = permData.isOwner ?? false
    permissions = permData.permissions ?? []
  }
  return {
    isOwner,
    permissions,
    can: (perm: string) => isOwner || permissions.includes(perm),
    isLoading: query.isPending,
  }
}

const PERMISSION_LABELS: Record<string, string> = {
  PRODUCT_READ: 'Xem sản phẩm',
  PRODUCT_WRITE: 'Quản lý sản phẩm',
  INVENTORY_READ: 'Xem tồn kho',
  INVENTORY_WRITE: 'Điều chỉnh tồn kho',
  ORDER_READ: 'Xem đơn hàng',
  ORDER_PROCESS: 'Xử lý đơn hàng',
  ORDER_CANCEL: 'Hủy đơn hàng',
  RETURN_PROCESS: 'Xử lý đổi trả',
  REVENUE_READ: 'Xem doanh thu',
  REVENUE_WITHDRAW: 'Yêu cầu rút tiền',
  REVIEW_READ: 'Xem đánh giá',
  REVIEW_REPLY: 'Phản hồi đánh giá',
  CHAT_ACCESS: 'Truy cập tin nhắn CSKH',
  DECORATION_WRITE: 'Trang trí gian hàng',

  // Hành động nhật ký (audit)
  PRODUCT_CREATE: 'Tạo sản phẩm',
  PRODUCT_UPDATE: 'Cập nhật sản phẩm',
  PRODUCT_DELETE: 'Xóa sản phẩm',
  PRODUCT_STATUS: 'Đổi trạng thái sản phẩm',
  PRODUCT_IMAGE_DELETE: 'Xóa ảnh sản phẩm',
  INVENTORY_ADJUST: 'Điều chỉnh tồn kho',
  ORDER_CONFIRM: 'Xác nhận đơn',
  ORDER_SHIP: 'Giao đơn hàng',
  ORDER_DELIVER: 'Giao hàng thành công',
  RETURN_APPROVE: 'Duyệt trả hàng',
  RETURN_REJECT: 'Từ chối trả hàng',
  RETURN_COMPLETE: 'Hoàn tất đổi trả',
  WITHDRAWAL_CREATE: 'Yêu cầu rút tiền',
  CHAT_REPLY: 'Gửi tin nhắn',
  DECORATION_SAVE: 'Lưu nháp trang trí',
  DECORATION_PUBLISH: 'Xuất bản trang trí',
  DECORATION_DISCARD: 'Hủy nháp trang trí',
  INVITE_STAFF: 'Mời nhân viên',
  ACCEPT_INVITATION: 'Chấp nhận lời mời',
  REVOKE_INVITATION: 'Thu hồi lời mời',
  CHANGE_ROLE: 'Đổi vai trò nhân viên',
  CHANGE_MEMBER_ROLE: 'Đổi vai trò nhân viên',
  CREATE_ROLE: 'Tạo vai trò mới',
  UPDATE_ROLE: 'Cập nhật vai trò',
  DELETE_ROLE: 'Xóa vai trò',
  ACTIVATE_MEMBER: 'Kích hoạt nhân viên',
  DEACTIVATE_MEMBER: 'Vô hiệu hóa nhân viên',
  REVIEW_REPORT: 'Báo cáo đánh giá vi phạm',
  PRODUCT_STATUS_BULK: 'Đổi trạng thái hàng loạt',
}

export interface AuditBadgeMeta {
  colorClass: string
  badgeType: 'danger' | 'success' | 'info' | 'warning' | 'neutral'
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  PRODUCT: 'Sản phẩm',
  ORDER: 'Đơn hàng',
  RETURN: 'Yêu cầu đổi trả',
  RETURN_REQUEST: 'Yêu cầu đổi trả',
  ROLE: 'Vai trò',
  MEMBER: 'Thành viên',
  SHOP_MEMBER: 'Thành viên',
  INVITATION: 'Lời mời',
  DECORATION: 'Trang trí shop',
  CONVERSATION: 'Hội thoại',
  WITHDRAWAL: 'Yêu cầu rút tiền',
  REVIEW: 'Đánh giá',
}

export function formatTargetType(targetType: string | null | undefined): string {
  if (targetType === null || targetType === undefined || targetType.trim() === '') {
    return 'Hệ thống'
  }
  const clean = targetType.trim()
  if (TARGET_TYPE_LABELS[clean] !== undefined) {
    return TARGET_TYPE_LABELS[clean]
  }
  return clean
}

const DANGER_ACTIONS = new Set([
  'PRODUCT_DELETE',
  'PRODUCT_DELETE_BULK',
  'PRODUCT_IMAGE_DELETE',
  'ORDER_CANCEL',
  'RETURN_REJECT',
  'REVOKE_INVITATION',
  'DELETE_ROLE',
  'DEACTIVATE_MEMBER',
])

const SUCCESS_ACTIONS = new Set([
  'ORDER_DELIVER',
  'RETURN_APPROVE',
  'RETURN_COMPLETE',
  'ACCEPT_INVITATION',
  'ACTIVATE_MEMBER',
  'DECORATION_PUBLISH',
  'PRODUCT_IMPORT',
])

const INFO_ACTIONS = new Set([
  'PRODUCT_CREATE',
  'PRODUCT_UPDATE',
  'PRODUCT_STATUS',
  'PRODUCT_STATUS_BULK',
  'PRODUCT_PRICE_BULK',
  'CREATE_ROLE',
  'UPDATE_ROLE',
  'CHANGE_ROLE',
  'CHANGE_MEMBER_ROLE',
  'INVITE_STAFF',
  'ORDER_SHIP',
])

const WARNING_ACTIONS = new Set([
  'INVENTORY_ADJUST',
  'INVENTORY_ADJUST_BULK',
  'WITHDRAWAL_CREATE',
  'ORDER_CONFIRM',
  'REVIEW_REPORT',
])

export function getAuditActionBadgeMeta(action: string): AuditBadgeMeta {
  if (DANGER_ACTIONS.has(action)) {
    return {
      badgeType: 'danger',
      colorClass:
        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    }
  }
  if (SUCCESS_ACTIONS.has(action)) {
    return {
      badgeType: 'success',
      colorClass:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    }
  }
  if (INFO_ACTIONS.has(action)) {
    return {
      badgeType: 'info',
      colorClass:
        'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
    }
  }
  if (WARNING_ACTIONS.has(action)) {
    return {
      badgeType: 'warning',
      colorClass:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    }
  }
  return {
    badgeType: 'neutral',
    colorClass:
      'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:border-white/15',
  }
}

export function canSeeTab(tab: SellerTabId, permissions: string[], isOwner: boolean): boolean {
  if (isOwner) {
    return true
  }

  if (tab === 'PROFILE' || tab === 'STAFF') {
    return false
  }

  if (tab === 'OVERVIEW') {
    return permissions.includes('REVENUE_READ')
  }

  if (tab === 'PRODUCTS') {
    return permissions.includes('PRODUCT_READ') || permissions.includes('PRODUCT_WRITE')
  }

  if (tab === 'ADD_PRODUCT') {
    return permissions.includes('PRODUCT_WRITE')
  }

  if (tab === 'INVENTORY') {
    return permissions.includes('INVENTORY_READ') || permissions.includes('INVENTORY_WRITE')
  }

  if (tab === 'ORDERS') {
    return (
      permissions.includes('ORDER_READ') ||
      permissions.includes('ORDER_PROCESS') ||
      permissions.includes('ORDER_CANCEL')
    )
  }

  if (tab === 'RETURNS') {
    return permissions.includes('RETURN_PROCESS')
  }

  if (tab === 'REVENUE') {
    return permissions.includes('REVENUE_READ') || permissions.includes('REVENUE_WITHDRAW')
  }

  if (tab === 'REVIEWS') {
    return permissions.includes('REVIEW_READ') || permissions.includes('REVIEW_REPLY')
  }

  if (tab === 'DECORATION') {
    return permissions.includes('DECORATION_WRITE')
  }

  if (tab === 'CHAT') {
    return permissions.includes('CHAT_ACCESS')
  }

  if (tab === 'STATS_REVENUE' || tab === 'STATS_PRODUCTS' || tab === 'STATS_CUSTOMERS') {
    return permissions.includes('REVENUE_READ')
  }

  return false
}

export function permissionLabel(key: string): string {
  if (PERMISSION_LABELS[key] !== undefined) {
    return PERMISSION_LABELS[key]
  }
  return key
}

export function canPerform(action: string, permissions: string[], isOwner: boolean): boolean {
  if (isOwner) {
    return true
  }
  return permissions.includes(action)
}
