import { Link, useSearchParams } from 'react-router'

import { useListAdminUsers } from '@generated/endpoints/admin-users/admin-users'
import { MagnifyingGlass, Users } from '@phosphor-icons/react'

import AdminShell from '@/components/admin/AdminShell'
import Pagination from '@/components/search/Pagination'
import Select from '@/components/ui/Select'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import StatePanel from '@/components/ui/StatePanel'
import StatusBadge from '@/components/ui/StatusBadge'
import UserAvatar from '@/components/UserAvatar'
import { formatDateTime, pageCount, roleLabel } from '@/lib/admin/admin'
import { takeData } from '@/lib/api/apiAdapters'
import { cn, FOCUS_RING_CLASS, PANEL_CLASS, primaryButtonClass } from '@/lib/ui/styles'

import type { SelectOption } from '@/components/ui/Select'
import type { AdminUserResponse } from '@generated/model/adminUserResponse'
import type { ListAdminUsersParams } from '@generated/model/listAdminUsersParams'
import type { ListAdminUsersRole } from '@generated/model/listAdminUsersRole'
import type { ListAdminUsersStatus } from '@generated/model/listAdminUsersStatus'

const PAGE_SIZE = 20

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Trạng thái: Tất cả' },
  { value: 'ACTIVE', label: 'Trạng thái: Hoạt động' },
  { value: 'LOCKED', label: 'Trạng thái: Đã khóa' },
]

const ROLE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Vai trò: Tất cả' },
  { value: 'CUSTOMER', label: 'Vai trò: Khách hàng' },
  { value: 'SHOP', label: 'Vai trò: Người bán' },
  { value: 'ADMIN', label: 'Vai trò: Quản trị viên' },
]

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
        <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800 tabular-nums dark:bg-indigo-400/15 dark:text-sky-300">
          <Users size={17} weight="bold" />
          {total.toLocaleString('vi-VN')} kết quả
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <form onSubmit={submitSearch} className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-zinc-300 bg-white/85 px-4 py-2.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 dark:border-white/15 dark:bg-white/10 dark:focus-within:border-sky-400 dark:focus-within:ring-sky-400/25">
            <MagnifyingGlass size={17} className="shrink-0 text-zinc-500 dark:text-zinc-400" />
            <span className="sr-only">Tìm tài khoản</span>
            <input
              key={query}
              name="q"
              defaultValue={query}
              placeholder="Email hoặc tên hiển thị"
              className="w-full bg-transparent text-sm text-[#17203a] outline-none placeholder:text-zinc-500 dark:text-white dark:placeholder:text-zinc-400"
            />
          </label>
          <button
            type="submit"
            className={cn(primaryButtonClass(), 'rounded-full px-5 py-2.5 text-sm font-bold')}
          >
            Tìm
          </button>
        </form>

        <Select
          value={status ?? ''}
          onValueChange={function (nextVal) {
            updateFilters(userStatus(nextVal), role, query, 0)
          }}
          options={STATUS_OPTIONS}
          ariaLabel="Lọc theo trạng thái tài khoản"
        />

        <Select
          value={role ?? ''}
          onValueChange={function (nextVal) {
            updateFilters(status, userRole(nextVal), query, 0)
          }}
          options={ROLE_OPTIONS}
          ariaLabel="Lọc theo vai trò tài khoản"
        />
      </div>

      <div className="mt-6">
        {usersQuery.isPending && <TableRowsSkeleton rows={6} columns={5} />}
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
          <>
            {/* Desktop table */}
            <div className={cn(PANEL_CLASS, 'hidden overflow-x-auto p-0 md:block')}>
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-zinc-200/80 bg-zinc-50/80 text-xs tracking-wide text-zinc-500 uppercase dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Tài khoản</th>
                    <th className="px-5 py-3.5 font-bold">Vai trò</th>
                    <th className="px-5 py-3.5 font-bold">Trạng thái</th>
                    <th className="px-5 py-3.5 font-bold">Ngày tham gia</th>
                    <th className="px-5 py-3.5 text-right font-bold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-white/10">
                  {users.map(function (user) {
                    if (user.id === undefined) {
                      return null
                    }
                    const labelTarget = user.displayName ?? user.email ?? ''
                    return (
                      <tr
                        key={user.id}
                        className="transition hover:bg-sky-50/60 dark:hover:bg-white/5"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={user.email ?? user.displayName ?? 'user'} size={36} />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-[#17203a] dark:text-[#e2e8f0]">
                                {user.displayName ?? 'Chưa có tên'}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-[#17203a] dark:text-[#e2e8f0]">
                          {roleLabel(user.role)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={user.status} />
                          {user.statusReason !== undefined && user.statusReason !== null && (
                            <p className="mt-2 max-w-xs truncate text-xs text-rose-600 dark:text-rose-300">
                              {user.statusReason}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-zinc-600 tabular-nums dark:text-zinc-300">
                          {formatDateTime(user.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={'/admin/users/' + user.id}
                            aria-label={`Mở hồ sơ tài khoản ${labelTarget}`}
                            className={cn(
                              'inline-flex cursor-pointer rounded-full px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-white/10',
                              FOCUS_RING_CLASS,
                            )}
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

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {users.map(function (user) {
                if (user.id === undefined) {
                  return null
                }
                const labelTarget = user.displayName ?? user.email ?? ''
                return (
                  <article key={user.id} className={cn(PANEL_CLASS, 'space-y-3 p-4')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar name={user.email ?? user.displayName ?? 'user'} size={36} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
                            {user.displayName ?? 'Chưa có tên'}
                          </p>
                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={user.status} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      <span className="font-semibold">{roleLabel(user.role)}</span>
                      <span className="tabular-nums">
                        Tham gia: {formatDateTime(user.createdAt)}
                      </span>
                    </div>

                    {user.statusReason !== undefined && user.statusReason !== null && (
                      <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                        {user.statusReason}
                      </p>
                    )}

                    <div className="flex justify-end border-t border-zinc-200/80 pt-3 dark:border-white/10">
                      <Link
                        to={'/admin/users/' + user.id}
                        aria-label={`Mở hồ sơ tài khoản ${labelTarget}`}
                        className={cn(
                          'inline-flex cursor-pointer rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-400/15 dark:text-sky-300 dark:hover:bg-indigo-400/25',
                          FOCUS_RING_CLASS,
                        )}
                      >
                        Mở hồ sơ
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
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
