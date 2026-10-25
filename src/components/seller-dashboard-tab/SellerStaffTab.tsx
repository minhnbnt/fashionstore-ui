import { useState } from 'react'

import {
  getListAuditLogsQueryKey,
  getListInvitationsQueryKey,
  getListMembersQueryKey,
  getListRolesQueryKey,
  useChangeMemberRole,
  useCreateRole,
  useDeleteRole,
  useInviteStaff,
  useListAuditLogs,
  useListInvitations,
  useListMembers,
  useListRoles,
  useRevokeInvitation,
  useUpdateMemberStatus,
  useUpdateRole,
} from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import {
  CheckCircle,
  ClockCounterClockwise,
  EnvelopeSimple,
  Key,
  LockKey,
  PencilSimple,
  Shield,
  ShieldCheck,
  Trash,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { takeData } from '@/lib/apiAdapters'
import { formatDateTime } from '@/lib/format'
import { auditItem, memberItem, roleItem } from '@/lib/sellerAdapters'
import { permissionLabel } from '@/lib/sellerPermissions'

import type { ShopAuditItem, ShopMemberItem, ShopRoleItem } from '@/types/seller'
import type { ShopMemberDetailResponse } from '@generated/model/shopMemberDetailResponse'
import type { StaffInvitationResponse } from '@generated/model/staffInvitationResponse'
import type { UpdateMemberStatusRequestStatus } from '@generated/model/updateMemberStatusRequestStatus'

interface SellerStaffTabProps {
  shopId: string
}

const ALL_SYSTEM_PERMISSIONS = [
  { key: 'PRODUCT_READ', label: 'Xem danh sách sản phẩm', group: 'Sản phẩm' },
  { key: 'PRODUCT_WRITE', label: 'Thêm, sửa, xóa sản phẩm', group: 'Sản phẩm' },
  { key: 'INVENTORY_READ', label: 'Xem tồn kho & SKU', group: 'Tồn kho' },
  { key: 'INVENTORY_WRITE', label: 'Điều chỉnh tồn kho & SKU', group: 'Tồn kho' },
  { key: 'ORDER_READ', label: 'Xem danh sách đơn hàng', group: 'Đơn hàng' },
  { key: 'ORDER_PROCESS', label: 'Xác nhận, đóng gói & giao hàng', group: 'Đơn hàng' },
  { key: 'ORDER_CANCEL', label: 'Hủy đơn hàng & hoàn trả kho', group: 'Đơn hàng' },
  { key: 'RETURN_PROCESS', label: 'Xử lý khiếu nại trả hàng / hoàn tiền', group: 'Đơn hàng' },
  { key: 'REVENUE_READ', label: 'Xem doanh thu & số dư ví shop', group: 'Tài chính' },
  { key: 'REVENUE_WITHDRAW', label: 'Yêu cầu rút tiền về tài khoản ngân hàng', group: 'Tài chính' },
  { key: 'REVIEW_READ', label: 'Xem đánh giá của khách hàng', group: 'CSKH' },
  { key: 'REVIEW_REPLY', label: 'Phản hồi đánh giá & báo cáo vi phạm', group: 'CSKH' },
  { key: 'CHAT_ACCESS', label: 'Nhắn tin trực tiếp với người mua (nét Chat)', group: 'CSKH' },
  { key: 'DECORATION_WRITE', label: 'Trang trí gian hàng & xếp layout', group: 'Gian hàng' },
]

const AUDIT_ACTIONS = [
  'PRODUCT_CREATE',
  'PRODUCT_UPDATE',
  'PRODUCT_DELETE',
  'PRODUCT_STATUS',
  'PRODUCT_IMAGE_DELETE',
  'INVENTORY_ADJUST',
  'ORDER_CONFIRM',
  'ORDER_SHIP',
  'ORDER_DELIVER',
  'ORDER_CANCEL',
  'RETURN_APPROVE',
  'RETURN_REJECT',
  'RETURN_COMPLETE',
  'WITHDRAWAL_CREATE',
  'CHAT_REPLY',
  'REVIEW_REPLY',
  'REVIEW_REPORT',
  'DECORATION_SAVE',
  'DECORATION_PUBLISH',
  'DECORATION_DISCARD',
  'INVITE_STAFF',
  'ACCEPT_INVITATION',
  'REVOKE_INVITATION',
  'CHANGE_MEMBER_ROLE',
  'CREATE_ROLE',
  'UPDATE_ROLE',
  'DELETE_ROLE',
  'ACTIVATE_MEMBER',
  'DEACTIVATE_MEMBER',
]

function resolveAuditAction(filter: string): string | undefined {
  if (filter !== '') {
    return filter
  }
  return undefined
}

function getSubTabClass(isActive: boolean): string {
  if (isActive) {
    return 'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
  }
  return 'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
}

export function SellerStaffTab({ shopId }: SellerStaffTabProps) {
  const queryClient = useQueryClient()
  const [activeSubTab, setActiveSubTab] = useState<'MEMBERS' | 'INVITATIONS' | 'ROLES' | 'AUDIT'>(
    'MEMBERS',
  )

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Role modal state (create / edit)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [roleNameInput, setRoleNameInput] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [roleError, setRoleError] = useState<string | null>(null)

  // Audit filter state
  const [auditActionFilter, setAuditActionFilter] = useState<string>('')
  const [auditPage, setAuditPage] = useState(0)

  const [notification, setNotification] = useState('')

  const rolesQuery = useListRoles(shopId, { query: { enabled: shopId !== '' } })
  const membersQuery = useListMembers(shopId, { query: { enabled: shopId !== '' } })
  const invitationsQuery = useListInvitations(shopId, {
    query: { enabled: shopId !== '' },
  })
  const auditQuery = useListAuditLogs(
    shopId,
    {
      action: resolveAuditAction(auditActionFilter),
      page: auditPage,
      size: 20,
    },
    { query: { enabled: shopId !== '' } },
  )

  const createRoleMutation = useCreateRole({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListRolesQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getListAuditLogsQueryKey(shopId, {
            action: resolveAuditAction(auditActionFilter),
            page: auditPage,
            size: 20,
          }),
        })
        setNotification('Đã tạo vai trò mới thành công!')
        setIsRoleModalOpen(false)
        setRoleNameInput('')
        setSelectedPermissions([])
      },
      onError: function (err: unknown) {
        const errObj = err as { detail?: string }
        setRoleError(errObj.detail ?? 'Có lỗi xảy ra khi tạo vai trò.')
      },
    },
  })

  const updateRoleMutation = useUpdateRole({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListRolesQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getListAuditLogsQueryKey(shopId, {
            action: resolveAuditAction(auditActionFilter),
            page: auditPage,
            size: 20,
          }),
        })
        setNotification('Đã cập nhật vai trò thành công!')
        setIsRoleModalOpen(false)
        setEditingRoleId(null)
        setRoleNameInput('')
        setSelectedPermissions([])
      },
      onError: function (err: unknown) {
        const errObj = err as { detail?: string }
        setRoleError(errObj.detail ?? 'Có lỗi xảy ra khi sửa vai trò.')
      },
    },
  })

  const deleteRoleMutation = useDeleteRole({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListRolesQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getListAuditLogsQueryKey(shopId, {
            action: resolveAuditAction(auditActionFilter),
            page: auditPage,
            size: 20,
          }),
        })
        setNotification('Đã xóa vai trò thành công!')
      },
      onError: function (err: unknown) {
        const errObj = err as { detail?: string }
        setNotification(errObj.detail ?? 'Không thể xóa vai trò này.')
      },
    },
  })

  const inviteStaffMutation = useInviteStaff({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListInvitationsQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getListAuditLogsQueryKey(shopId, {
            action: resolveAuditAction(auditActionFilter),
            page: auditPage,
            size: 20,
          }),
        })
        setNotification(
          `Đã gửi lời mời trong website tới tài khoản ${inviteEmail.trim()} thành công!`,
        )
        setInviteEmail('')
        setIsInviteModalOpen(false)
      },
      onError: function (err: unknown) {
        const errObj = err as { status?: number; detail?: string }
        let msg = 'Có lỗi xảy ra khi gửi lời mời.'
        if (errObj.status === 404) {
          msg = 'Email chưa đăng ký tài khoản trên hệ thống.'
        }
        if (errObj.status === 409) {
          msg = 'Tài khoản này đã là thành viên hoặc đang có lời mời chờ.'
        }
        if (errObj.detail) {
          msg = errObj.detail
        }
        setInviteError(msg)
      },
    },
  })

  const revokeInvitationMutation = useRevokeInvitation({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListInvitationsQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getListAuditLogsQueryKey(shopId, {
            action: resolveAuditAction(auditActionFilter),
            page: auditPage,
            size: 20,
          }),
        })
        setNotification('Đã thu hồi lời mời thành công!')
      },
      onError: function (err: unknown) {
        const errObj = err as { detail?: string }
        setNotification(errObj.detail ?? 'Không thể thu hồi lời mời.')
      },
    },
  })

  const updateMemberStatusMutation = useUpdateMemberStatus({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getListAuditLogsQueryKey(shopId, {
            action: resolveAuditAction(auditActionFilter),
            page: auditPage,
            size: 20,
          }),
        })
        setNotification('Đã cập nhật trạng thái nhân viên thành công!')
      },
      onError: function (err: unknown) {
        const errObj = err as { detail?: string }
        setNotification(errObj.detail ?? 'Không thể đổi trạng thái nhân viên.')
      },
    },
  })

  const changeMemberRoleMutation = useChangeMemberRole({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListRolesQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getListAuditLogsQueryKey(shopId, {
            action: resolveAuditAction(auditActionFilter),
            page: auditPage,
            size: 20,
          }),
        })
        setNotification('Đã đổi vai trò nhân viên thành công!')
      },
      onError: function (err: unknown) {
        const errObj = err as { detail?: string }
        setNotification(errObj.detail ?? 'Không thể đổi vai trò.')
      },
    },
  })

  let rawMembers: ShopMemberDetailResponse[] = []
  if (membersQuery.data !== undefined) {
    rawMembers = takeData(membersQuery.data)
  }

  let roles: ShopRoleItem[] = []
  if (rolesQuery.data !== undefined) {
    roles = takeData(rolesQuery.data).map(function (r) {
      return roleItem(r, rawMembers)
    })
  }
  const members = rawMembers.map(memberItem)

  let invitations: StaffInvitationResponse[] = []
  if (invitationsQuery.data !== undefined) {
    invitations = takeData(invitationsQuery.data)
  }

  let auditLogs: ShopAuditItem[] = []
  let totalAuditLogs = 0
  if (auditQuery.data !== undefined) {
    const pageData = takeData(auditQuery.data)
    auditLogs = (pageData.items ?? []).map(auditItem)
    totalAuditLogs = pageData.total ?? 0
  }

  const handleTogglePermission = (key: string) => {
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== key))
      return
    }
    setSelectedPermissions([...selectedPermissions, key])
  }

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !inviteRoleId) return
    setInviteError(null)

    inviteStaffMutation.mutate({
      shopId,
      data: { email: inviteEmail.trim(), roleId: inviteRoleId },
    })
  }

  const handleOpenCreateRole = () => {
    setEditingRoleId(null)
    setRoleNameInput('')
    setSelectedPermissions([])
    setRoleError(null)
    setIsRoleModalOpen(true)
  }

  const handleOpenEditRole = (role: ShopRoleItem) => {
    setEditingRoleId(role.id)
    setRoleNameInput(role.name)
    setSelectedPermissions([...role.permissions])
    setRoleError(null)
    setIsRoleModalOpen(true)
  }

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleNameInput.trim() || selectedPermissions.length === 0) return
    setRoleError(null)

    if (editingRoleId) {
      updateRoleMutation.mutate({
        shopId,
        roleId: editingRoleId,
        data: { name: roleNameInput.trim(), permissions: selectedPermissions },
      })
      return
    }

    createRoleMutation.mutate({
      shopId,
      data: { name: roleNameInput.trim(), permissions: selectedPermissions },
    })
  }

  const handleChangeRole = (member: ShopMemberItem, newRoleId: string) => {
    changeMemberRoleMutation.mutate({
      shopId,
      memberId: member.id,
      data: { roleId: newRoleId },
    })
  }

  const handleToggleStatus = (member: ShopMemberItem) => {
    let newStatus: UpdateMemberStatusRequestStatus = 'DEACTIVATED'
    if (member.status === 'DEACTIVATED') {
      newStatus = 'ACTIVE'
    }
    updateMemberStatusMutation.mutate({
      shopId,
      memberId: member.id,
      data: { status: newStatus },
    })
  }

  const handleDeleteRole = (role: ShopRoleItem) => {
    if (role.isSystem) return
    deleteRoleMutation.mutate({ shopId, roleId: role.id })
  }

  const handleRevokeInvitation = (invitationId: string) => {
    revokeInvitationMutation.mutate({ shopId, invitationId })
  }

  const totalPages = Math.ceil(totalAuditLogs / 20)

  let roleModalTitle = 'Tạo vai trò tùy chỉnh mới'
  if (editingRoleId) {
    roleModalTitle = 'Cập nhật vai trò tùy chỉnh'
  }

  let roleSubmitButtonText = 'Tạo vai trò'
  if (editingRoleId) {
    roleSubmitButtonText = 'Lưu thay đổi'
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm md:flex-row md:items-center dark:border-white/10 dark:bg-[#11182a]">
        <div>
          <div className="flex items-center gap-2">
            <UsersThree size={24} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
              Quản Lý Nhân Viên & Phân Quyền Shop (RBAC)
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Mời nhân viên qua tài khoản, tạo vai trò tùy chỉnh và theo dõi nhật ký hoạt động của
            gian hàng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreateRole}
            className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <Shield size={16} className="text-zinc-500 dark:text-zinc-400" />
            <span>Tạo vai trò mới</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setInviteError(null)
              if (roles.length > 0 && !inviteRoleId) {
                setInviteRoleId(roles[0].id)
              }
              setIsInviteModalOpen(true)
            }}
            className="btn-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
          >
            <UserPlus size={16} />
            <span>Mời nhân viên</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/30 dark:bg-green-950/30 dark:text-green-300">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification('')}
            className="text-xs font-medium text-green-700 underline hover:text-green-900 dark:text-green-400"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Sub-tab navigation */}
      <div className="flex rounded-t-3xl border-b border-zinc-200/80 bg-white/80 px-4 dark:border-white/10 dark:bg-[#11182a]">
        <button
          type="button"
          onClick={() => setActiveSubTab('MEMBERS')}
          className={getSubTabClass(activeSubTab === 'MEMBERS')}
        >
          <UsersThree size={16} />
          <span>Thành viên ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('INVITATIONS')}
          className={getSubTabClass(activeSubTab === 'INVITATIONS')}
        >
          <EnvelopeSimple size={16} />
          <span>Lời mời đang chờ ({invitations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ROLES')}
          className={getSubTabClass(activeSubTab === 'ROLES')}
        >
          <ShieldCheck size={16} />
          <span>Vai trò & Quyền ({roles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('AUDIT')}
          className={getSubTabClass(activeSubTab === 'AUDIT')}
        >
          <ClockCounterClockwise size={16} />
          <span>Nhật ký hoạt động</span>
        </button>
      </div>

      {/* TAB 1: MEMBERS LIST */}
      {activeSubTab === 'MEMBERS' && (
        <div className="overflow-hidden rounded-b-3xl border border-zinc-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                  <th scope="col" className="p-3 pl-4">
                    Thành viên
                  </th>
                  <th scope="col" className="p-3">
                    Vai trò phân công
                  </th>
                  <th scope="col" className="p-3">
                    Trạng thái
                  </th>
                  <th scope="col" className="p-3">
                    Ngày tham gia
                  </th>
                  <th scope="col" className="p-3 pr-4 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {members.map((member) => {
                  const isOwner = member.roleName.includes('Owner')
                  const isActive = member.status === 'ACTIVE'
                  return (
                    <tr key={member.id} className="hover:bg-zinc-50/80 dark:hover:bg-white/5">
                      <td className="p-3 pl-4" aria-label={member.displayName}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-800 dark:text-zinc-100">
                              {member.displayName}
                            </div>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {isOwner && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
                            <Key size={12} />
                            <span>{member.roleName}</span>
                          </span>
                        )}
                        {!isOwner && (
                          <select
                            aria-label={`Đổi vai trò cho ${member.email}`}
                            value={member.roleId}
                            onChange={(e) => handleChangeRole(member, e.target.value)}
                            className="w-44 rounded-full border border-zinc-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 focus:border-indigo-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-3">
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle size={12} />
                            <span>Đang hoạt động</span>
                          </span>
                        )}
                        {!isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-400">
                            <UserMinus size={12} />
                            <span>Đã vô hiệu hóa</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-zinc-500 dark:text-zinc-400">{member.joinedAt}</td>
                      <td className="p-3 pr-4 text-right">
                        {isOwner && (
                          <span className="text-[11px] text-zinc-400 italic dark:text-zinc-500">
                            Chủ shop (Bảo vệ)
                          </span>
                        )}
                        {!isOwner && isActive && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(member)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400"
                          >
                            <UserMinus size={13} />
                            <span>Vô hiệu hóa</span>
                          </button>
                        )}
                        {!isOwner && !isActive && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(member)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300"
                          >
                            <UserCheck size={13} />
                            <span>Kích hoạt lại</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INVITATIONS LIST */}
      {activeSubTab === 'INVITATIONS' && (
        <div className="overflow-hidden rounded-b-3xl border border-zinc-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                  <th scope="col" className="p-3 pl-4">
                    Tài khoản được mời
                  </th>
                  <th scope="col" className="p-3">
                    Vai trò dự kiến
                  </th>
                  <th scope="col" className="p-3">
                    Hạn chấp nhận
                  </th>
                  <th scope="col" className="p-3">
                    Ngày gửi
                  </th>
                  <th scope="col" className="p-3 pr-4 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {invitations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400 dark:text-zinc-500">
                      Không có lời mời nào đang chờ chấp thuận.
                    </td>
                  </tr>
                )}
                {invitations.map((inv) => {
                  let roleName = inv.roleId
                  for (const r of roles) {
                    if (r.id === inv.roleId) {
                      roleName = r.name
                      break
                    }
                  }
                  return (
                    <tr key={inv.id} className="hover:bg-zinc-50/80 dark:hover:bg-white/5">
                      <td className="p-3 pl-4 font-semibold text-zinc-800 dark:text-zinc-100">
                        {inv.email}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                          {roleName}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-500 dark:text-zinc-400">
                        {formatDateTime(inv.expiresAt)}
                      </td>
                      <td className="p-3 text-zinc-500 dark:text-zinc-400">
                        {formatDateTime(inv.createdAt)}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevokeInvitation(inv.id ?? '')}
                          disabled={revokeInvitationMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20"
                        >
                          <Trash size={13} />
                          <span>Thu hồi</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROLES & PERMISSIONS */}
      {activeSubTab === 'ROLES' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {roles.map((role) => {
            let deleteRoleTitle = ''
            if (role.memberCount > 0) {
              deleteRoleTitle = 'Không thể xóa vai trò đang có người dùng'
            }
            return (
              <div
                key={role.id}
                className="space-y-3 rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                        {role.name}
                      </h3>
                      {role.isSystem && (
                        <span className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300">
                          <LockKey size={10} />
                          <span>Mặc định hệ thống</span>
                        </span>
                      )}
                      {!role.isSystem && (
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300">
                          Tùy chỉnh
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Đang gán cho {role.memberCount} thành viên
                    </span>
                  </div>

                  {!role.isSystem && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRole(role)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                      >
                        <PencilSimple size={13} />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        disabled={role.memberCount > 0}
                        title={deleteRoleTitle}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20"
                      >
                        <Trash size={13} />
                        <span>Xóa</span>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Quyền hạn cho phép:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
                      >
                        {permissionLabel(p)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeSubTab === 'AUDIT' && (
        <div className="space-y-4 rounded-b-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <div>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                Nhật ký hoạt động gian hàng
              </span>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Ghi nhận mọi thao tác nghiệp vụ và phân quyền trong shop
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Lọc hành động:</span>
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value)
                  setAuditPage(0)
                }}
                className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:border-indigo-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
              >
                <option value="">Tất cả hành động</option>
                {AUDIT_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {permissionLabel(action)} ({action})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-zinc-100 text-xs dark:divide-white/5">
            {auditLogs.length === 0 && (
              <div className="py-8 text-center text-zinc-400 dark:text-zinc-500">
                Không tìm thấy nhật ký thao tác nào.
              </div>
            )}
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300">
                      {permissionLabel(log.action)}
                    </span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">
                      {log.detail}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                    {log.actorName && (
                      <span>
                        Người thực hiện:{' '}
                        <strong className="text-zinc-600 dark:text-zinc-300">
                          {log.actorName}
                        </strong>{' '}
                        ({log.actorEmail})
                      </span>
                    )}
                    {log.targetType && <span>Đối tượng: {log.targetType}</span>}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {log.createdAt}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-white/5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Trang {auditPage + 1} / {totalPages} (Tổng {totalAuditLogs} mục)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={auditPage <= 0}
                  onClick={() => setAuditPage(auditPage - 1)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={auditPage + 1 >= totalPages}
                  onClick={() => setAuditPage(auditPage + 1)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Invite Staff Modal */}
      {isInviteModalOpen && (
        <Modal
          title="Mời nhân viên vào gian hàng"
          onClose={() => setIsInviteModalOpen(false)}
          widthClass="max-w-md"
        >
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            {inviteError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                <WarningCircle size={16} className="mt-0.5 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="inviteEmailInput"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Email tài khoản nhân viên
              </label>
              <input
                id="inviteEmailInput"
                type="email"
                required
                placeholder="nhanvien@gmail.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded-full border border-zinc-300 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-zinc-100"
              />
              <span className="mt-1.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                Hệ thống gửi thông báo trong website cho tài khoản này (không gửi email). Người được
                mời cần đăng ký tài khoản trước.
              </span>
            </div>

            <div>
              <label
                htmlFor="inviteRoleSelect"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Vai trò phân công
              </label>
              <select
                id="inviteRoleSelect"
                value={inviteRoleId}
                onChange={(e) => setInviteRoleId(e.target.value)}
                required
                className="w-full rounded-full border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-800 focus:border-indigo-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-zinc-100"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={inviteStaffMutation.isPending}
                className="btn-primary rounded-full px-5 py-2 text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {inviteStaffMutation.isPending && <span>Đang gửi…</span>}
                {!inviteStaffMutation.isPending && <span>Gửi lời mời</span>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Create / Edit Role Modal */}
      {isRoleModalOpen && (
        <Modal
          title={roleModalTitle}
          onClose={() => setIsRoleModalOpen(false)}
          widthClass="max-w-xl"
        >
          <form onSubmit={handleRoleSubmit} className="space-y-4">
            {roleError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                <WarningCircle size={16} className="mt-0.5 shrink-0" />
                <span>{roleError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="newRoleNameInput"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Tên vai trò
              </label>
              <input
                id="newRoleNameInput"
                type="text"
                required
                placeholder="Ví dụ: Kiểm hàng phụ, CSKH ca tối…"
                value={roleNameInput}
                onChange={(e) => setRoleNameInput(e.target.value)}
                className="w-full rounded-full border border-zinc-300 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-zinc-100"
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Chọn các quyền cho phép (tối thiểu 1 quyền)
              </span>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-zinc-200 p-3 dark:border-white/10">
                {ALL_SYSTEM_PERMISSIONS.map((perm) => {
                  const isChecked = selectedPermissions.includes(perm.key)
                  return (
                    <label
                      key={perm.key}
                      htmlFor={`perm-${perm.key}`}
                      aria-label={perm.label}
                      className="flex cursor-pointer items-start gap-2.5 rounded-xl p-2 transition hover:bg-zinc-50 dark:hover:bg-white/5"
                    >
                      <input
                        id={`perm-${perm.key}`}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(perm.key)}
                        className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {perm.label}
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                          [{perm.group}] {perm.key}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={
                  createRoleMutation.isPending ||
                  updateRoleMutation.isPending ||
                  selectedPermissions.length === 0 ||
                  !roleNameInput.trim()
                }
                className="btn-primary rounded-full px-5 py-2 text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                <span>{roleSubmitButtonText}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
