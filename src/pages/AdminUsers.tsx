import { Link, useSearchParams } from 'react-router'

import { useListAdminUsers } from '@generated/endpoints/admin-users/admin-users'
import { MagnifyingGlass, Users } from '@phosphor-icons/react'

import AdminShell from '@/components/admin/AdminShell'
import StatePanel from '@/components/admin/StatePanel'
import StatusBadge from '@/components/admin/StatusBadge'
import Pagination from '@/components/search/Pagination'
import UserAvatar from '@/components/UserAvatar'
import { formatDateTime, pageCount, roleLabel } from '@/lib/admin'
import { takeData } from '@/lib/apiAdapters'

import type { AdminUserResponse } from '@generated/model/adminUserResponse'
import type { ListAdminUsersParams } from '@generated/model/listAdminUsersParams'
import type { ListAdminUsersRole } from '@generated/model/listAdminUsersRole'
import type { ListAdminUsersStatus } from '@generated/model/listAdminUsersStatus'

const PAGE_SIZE = 20

function userStatus(value: string | null): ListAdminUsersStatus | undefined {
  if (value === 'ACTIVE' || value === 'LOCKED') {
    return value
  }
  return undefined
}

function userRole(value: string | null): ListAdminUsersRole | undefined {
  if (value === 'CUSTOMER' || value === 'SHOP' || value === 'ADMIN') {
    return value
  }
  return undefined
}

function pageNumber(value: string | null): number {
  const parsed = Number(value)
  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed
  }
  return 0
}

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = userStatus(searchParams.get('status'))
  const role = userRole(searchParams.get('role'))
  const query = searchParams.get('q') ?? ''
  const page = pageNumber(searchParams.get('page'))
  const params: ListAdminUsersParams = { page, size: PAGE_SIZE }
  if (status !== undefined) {
    params.status = status
  }
  if (role !== undefined) {
    params.role = role
  }
  if (query !== '') {
    params.q = query
  }

  const usersQuery = useListAdminUsers(params)
  let users: AdminUserResponse[] = []
  let total = 0
  if (usersQuery.data !== undefined) {
    const result = takeData(usersQuery.data)
    users = result.items ?? []
    total = result.total ?? 0
  }

  function updateFilters(
    nextStatus: ListAdminUsersStatus | undefined,
    nextRole: ListAdminUsersRole | undefined,
    nextQuery: string,
    nextPage: number,
  ) {
    const next = new URLSearchParams()
    if (nextStatus !== undefined) {
      next.set('status', nextStatus)
    }
    if (nextRole !== undefined) {
      next.set('role', nextRole)
    }
    if (nextQuery !== '') {
      next.set('q', nextQuery)
    }
    if (nextPage > 0) {
      next.set('page', String(nextPage))
    }
    setSearchParams(next)
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const value = data.get('q')
    let nextQuery = ''
    if (typeof value === 'string') {
      nextQuery = value.trim()
    }
    updateFilters(status, role, nextQuery, 0)
  }

  return (
    <AdminShell
      title="Quản lý tài khoản"
      description="Tra cứu khách hàng, người bán và lịch sử khóa tài khoản trên toàn hệ thống."
      actions={
        <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200">
          <Users size={17} weight="bold" />
          {total} kết quả
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <form onSubmit={submitSearch} className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
            <MagnifyingGlass size={17} className="shrink-0 text-zinc-500" />
            <span className="sr-only">Tìm tài khoản</span>
            <input
              key={query}
              name="q"
              defaultValue={query}
              placeholder="Email hoặc tên hiển thị"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </label>
          <button type="submit" className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold">
            Tìm
          </button>
        </form>

        <label className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5">
          <span className="font-semibold text-zinc-500 dark:text-zinc-400">Trạng thái</span>
          <select
            value={status ?? ''}
            onChange={function (event) {
              updateFilters(userStatus(event.target.value), role, query, 0)
            }}
            className="bg-transparent font-bold outline-none"
          >
            <option value="">Tất cả</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5">
          <span className="font-semibold text-zinc-500 dark:text-zinc-400">Vai trò</span>
          <select
            value={role ?? ''}
            onChange={function (event) {
              updateFilters(status, userRole(event.target.value), query, 0)
            }}
            className="bg-transparent font-bold outline-none"
          >
            <option value="">Tất cả</option>
            <option value="CUSTOMER">Khách hàng</option>
            <option value="SHOP">Người bán</option>
            <option value="ADMIN">Quản trị viên</option>
          </select>
        </label>
      </div>

      <div className="mt-6">
        {usersQuery.isPending && (
          <StatePanel
            title="Đang tải danh sách"
            description="Dữ liệu tài khoản đang được cập nhật…"
          />
        )}
        {usersQuery.isError && (
          <StatePanel
            title="Không tải được danh sách"
            description="Kiểm tra kết nối backend hoặc quyền quản trị rồi thử lại."
          />
        )}
        {usersQuery.isPending === false && usersQuery.isError === false && users.length === 0 && (
          <StatePanel
            title="Không có tài khoản phù hợp"
            description="Thử đổi bộ lọc hoặc dùng từ khóa khác."
          />
        )}
        {users.length > 0 && (
          <div className="overflow-x-auto rounded-3xl border border-zinc-200 dark:border-white/10">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase dark:bg-white/5 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Tài khoản</th>
                  <th className="px-5 py-3 font-bold">Vai trò</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 font-bold">Ngày tham gia</th>
                  <th className="px-5 py-3 text-right font-bold">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white/60 dark:divide-white/10 dark:bg-transparent">
                {users.map(function (user) {
                  if (user.id === undefined) {
                    return null
                  }
                  return (
                    <tr
                      key={user.id}
                      className="transition hover:bg-indigo-50/60 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.email ?? user.displayName ?? 'user'} size={36} />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-zinc-900 dark:text-zinc-100">
                              {user.displayName ?? 'Chưa có tên'}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-zinc-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold">{roleLabel(user.role)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={user.status} />
                        {user.statusReason !== undefined && user.statusReason !== null && (
                          <p className="mt-2 max-w-xs truncate text-xs text-red-600 dark:text-red-300">
                            {user.statusReason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                        {formatDateTime(user.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={'/admin/users/' + user.id}
                          className="rounded-full px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-white/10"
                        >
                          Mở hồ sơ
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={pageCount(total, PAGE_SIZE)}
        onPage={function (nextPage) {
          updateFilters(status, role, query, nextPage)
        }}
      />
    </AdminShell>
  )
}
