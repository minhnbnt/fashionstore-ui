import { useState } from 'react'

import {
  getListAuditLogsQueryKey,
  getListMembersQueryKey,
  getListRolesQueryKey,
  useChangeMemberRole,
  useCreateRole,
  useInviteStaff,
  useListAuditLogs,
  useListMembers,
  useListRoles,
  useRemoveMember,
} from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import {
  UsersThree,
  ShieldCheck,
  ClockCounterClockwise,
  UserPlus,
  Trash,
  CheckCircle,
  LockKey,
  Shield,
  Key,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { takeData } from '@/lib/apiAdapters'
import { auditItem, memberItem, roleItem } from '@/lib/sellerAdapters'

import type { ShopRoleItem, ShopMemberItem, ShopAuditItem } from '@/types/seller'
import type { ShopMemberDetailResponse } from '@generated/model/shopMemberDetailResponse'

interface SellerStaffTabProps {
  shopId: string
}

const ALL_SYSTEM_PERMISSIONS = [
  { key: 'PRODUCT_READ', label: 'Xem danh sách sản phẩm', group: 'Sản phẩm' },
  { key: 'PRODUCT_WRITE', label: 'Thêm, sửa, xóa sản phẩm', group: 'Sản phẩm' },
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

export function SellerStaffTab({ shopId }: SellerStaffTabProps) {
  const queryClient = useQueryClient()
  const [activeSubTab, setActiveSubTab] = useState<'MEMBERS' | 'ROLES' | 'AUDIT'>('MEMBERS')

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')

  // Create role modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const [notification, setNotification] = useState('')

  const rolesQuery = useListRoles(shopId, { query: { enabled: shopId !== '' } })
  const membersQuery = useListMembers(shopId, { query: { enabled: shopId !== '' } })
  const auditQuery = useListAuditLogs(shopId, { query: { enabled: shopId !== '' } })

  const createRoleMutation = useCreateRole({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListRolesQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListAuditLogsQueryKey(shopId) })
      },
    },
  })
  const inviteStaffMutation = useInviteStaff({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListAuditLogsQueryKey(shopId) })
      },
    },
  })
  const removeMemberMutation = useRemoveMember({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListRolesQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListAuditLogsQueryKey(shopId) })
      },
    },
  })
  const changeMemberRoleMutation = useChangeMemberRole({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListAuditLogsQueryKey(shopId) })
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

  let auditLogs: ShopAuditItem[] = []
  if (auditQuery.data !== undefined) {
    auditLogs = takeData(auditQuery.data).map(auditItem)
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
    if (!inviteEmail.trim()) return

    inviteStaffMutation.mutate({
      shopId,
      data: { email: inviteEmail.trim(), roleId: inviteRoleId },
    })

    setNotification(`Đã gửi email mời nhân viên ${inviteEmail.trim()} thành công!`)
    setInviteEmail('')
    setIsInviteModalOpen(false)
  }

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim() || selectedPermissions.length === 0) return

    createRoleMutation.mutate({
      shopId,
      data: { name: newRoleName.trim(), permissions: selectedPermissions },
    })

    setNotification(`Đã tạo vai trò tùy chỉnh "${newRoleName.trim()}" thành công!`)
    setNewRoleName('')
    setSelectedPermissions([])
    setIsRoleModalOpen(false)
  }

  const handleRemove = (member: ShopMemberItem) => {
    if (member.roleName.includes('Owner')) {
      alert('Không thể xóa tài khoản Chủ gian hàng (Shop Owner)!')
      return
    }

    removeMemberMutation.mutate({ shopId, memberId: member.id })
    setNotification(`Đã xóa nhân viên ${member.email} khỏi gian hàng!`)
  }

  const handleChangeRole = (member: ShopMemberItem, roleId: string) => {
    if (member.roleName.includes('Owner')) {
      alert('Không thể đổi vai trò của Chủ gian hàng (Shop Owner)!')
      return
    }
    if (roleId === member.roleId) {
      return
    }

    changeMemberRoleMutation.mutate({ shopId, memberId: member.id, data: { roleId } })
    const matchedRole = roles.find((r) => r.id === roleId)
    let roleTitle = 'vai trò mới'
    if (matchedRole) {
      roleTitle = matchedRole.name
    }
    setNotification(`Đã chuyển ${member.email} sang vai trò ${roleTitle}!`)
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
            Mời nhân viên, tạo nhóm quyền nội bộ (CSKH, Kho vận, Marketing) và theo dõi nhật ký hoạt
            động bảo mật.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRoleModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <Shield size={16} className="text-zinc-500 dark:text-zinc-400" />
            Tạo vai trò mới
          </button>
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="btn-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
          >
            <UserPlus size={16} />
            Mời nhân viên
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification('')}
            className="text-xs font-medium text-green-700 underline hover:text-green-900"
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
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
            activeSubTab === 'MEMBERS' &&
            'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
          } ${activeSubTab !== 'MEMBERS' && 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          <UsersThree size={16} />
          Danh sách nhân viên ({members.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('ROLES')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
            activeSubTab === 'ROLES' &&
            'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
          } ${activeSubTab !== 'ROLES' && 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          <ShieldCheck size={16} />
          Vai trò & Phân quyền ({roles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('AUDIT')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
            activeSubTab === 'AUDIT' &&
            'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
          } ${activeSubTab !== 'AUDIT' && 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          <ClockCounterClockwise size={16} />
          Nhật ký hoạt động (Audit Trail)
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
                    Nhân viên / Email
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
              <tbody className="divide-y divide-zinc-100">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-50/80">
                    <td className="p-3 pl-4" aria-label="Nhân viên">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {member.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-800 dark:text-zinc-100">
                            {member.email}
                          </div>
                          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                            ID: {member.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {member.roleName.includes('Owner') && (
                        <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          <Key size={12} />
                          {member.roleName}
                        </span>
                      )}
                      {!member.roleName.includes('Owner') && (
                        <select
                          aria-label={`Đổi vai trò cho ${member.email}`}
                          value={member.roleId}
                          onChange={(e) => handleChangeRole(member, e.target.value)}
                          className="w-44 rounded-full border border-zinc-300 bg-white px-2 py-1.5 text-[11px] font-medium text-zinc-700 focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
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
                      {member.status === 'ACTIVE' && (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <CheckCircle size={12} />
                          Đang hoạt động
                        </span>
                      )}
                      {member.status === 'INVITED' && (
                        <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          <ClockCounterClockwise size={12} />
                          Chờ chấp thuận
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-zinc-500 dark:text-zinc-400">{member.joinedAt}</td>
                    <td className="p-3 pr-4 text-right">
                      {!member.roleName.includes('Owner') && (
                        <button
                          type="button"
                          onClick={() => handleRemove(member)}
                          className="inline-flex items-center gap-1 rounded p-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                        >
                          <Trash size={14} />
                          Xóa
                        </button>
                      )}
                      {member.roleName.includes('Owner') && (
                        <span className="text-[11px] text-zinc-400 italic dark:text-zinc-500">
                          Chủ shop (Bảo vệ)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {activeSubTab === 'ROLES' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {roles.map((role) => (
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
                      <span className="flex items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300">
                        <LockKey size={10} /> Mặc định hệ thống
                      </span>
                    )}
                    {!role.isSystem && (
                      <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">
                        Tùy chỉnh
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Đang gán cho {role.memberCount} thành viên
                  </span>
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  Quyền hạn cho phép:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeSubTab === 'AUDIT' && (
        <div className="space-y-3 rounded-b-3xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
              Nhật ký truy vết thao tác nhân viên
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Hiển thị các thao tác phân quyền & tác vụ quan trọng
            </span>
          </div>

          <div className="divide-y divide-zinc-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="py-0.2 rounded border bg-zinc-100 px-1.5 font-mono text-[11px] font-bold text-zinc-800 dark:bg-white/10 dark:text-zinc-100">
                      {log.action}
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-200">{log.detail}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    Đối tượng: {log.targetType}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {log.createdAt}
                </span>
              </div>
            ))}
          </div>
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
            <div>
              <label
                htmlFor="inviteEmailInput"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Email nhân viên
              </label>
              <input
                id="inviteEmailInput"
                type="email"
                required
                placeholder="nhanvien@gmail.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
              />
              <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500">
                Hệ thống sẽ gửi email chứa đường link kích hoạt và mã token phân quyền đến địa chỉ
                này.
              </span>
            </div>

            <div>
              <label
                htmlFor="inviteRoleSelect"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Gán vai trò chức danh
              </label>
              <select
                id="inviteRoleSelect"
                value={inviteRoleId}
                onChange={(e) => setInviteRoleId(e.target.value)}
                className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-100 pt-2 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-primary rounded-full px-4 py-2 text-xs font-semibold"
              >
                Gửi lời mời
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Create Custom Role Modal */}
      {isRoleModalOpen && (
        <Modal
          title="Tạo vai trò tùy chỉnh (Custom Role)"
          onClose={() => setIsRoleModalOpen(false)}
          widthClass="max-w-lg"
        >
          <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="newRoleNameInput"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Tên vai trò mới
              </label>
              <input
                id="newRoleNameInput"
                type="text"
                required
                placeholder="Ví dụ: CTV Bán hàng Ca tối, Trợ lý Livestream"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Tích chọn các quyền hạn ({selectedPermissions.length} đã chọn):
              </span>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border bg-zinc-50 p-3 dark:bg-white/5">
                {ALL_SYSTEM_PERMISSIONS.map((perm) => (
                  <label
                    htmlFor={`perm-chk-${perm.key}`}
                    key={perm.key}
                    aria-label={perm.label}
                    className="flex cursor-pointer items-start gap-2 rounded p-1.5 text-xs transition-colors hover:bg-white"
                  >
                    <input
                      id={`perm-chk-${perm.key}`}
                      type="checkbox"
                      checked={selectedPermissions.includes(perm.key)}
                      onChange={() => handleTogglePermission(perm.key)}
                      className="mt-0.5 rounded accent-indigo-600"
                    />
                    <div>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                        {perm.label}
                      </span>
                      <span className="block font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                        [{perm.key}] • Nhóm: {perm.group}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-100 pt-2 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={selectedPermissions.length === 0}
                className="btn-primary rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Tạo vai trò
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
