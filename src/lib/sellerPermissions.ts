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
  CREATE_ROLE: 'Tạo vai trò mới',
  UPDATE_ROLE: 'Cập nhật vai trò',
  DELETE_ROLE: 'Xóa vai trò',
  ACTIVATE_MEMBER: 'Kích hoạt nhân viên',
  DEACTIVATE_MEMBER: 'Vô hiệu hóa nhân viên',
}

export function canSeeTab(tab: SellerTabId, permissions: string[], isOwner: boolean): boolean {
  if (isOwner) {
    return true
  }

  if (tab === 'OVERVIEW' || tab === 'PROFILE') {
    return true
  }

  if (tab === 'STAFF') {
    return false
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
