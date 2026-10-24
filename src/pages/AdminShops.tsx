import { Link, useSearchParams } from 'react-router'

import { useListAdminShops } from '@generated/endpoints/admin-shops/admin-shops'
import { MagnifyingGlass, Storefront } from '@phosphor-icons/react'

import AdminShell from '@/components/admin/AdminShell'
import Pagination from '@/components/search/Pagination'
import StatePanel from '@/components/ui/StatePanel'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatDateTime, pageCount } from '@/lib/admin'
import { takeData } from '@/lib/apiAdapters'

import type { AdminShopResponse } from '@generated/model/adminShopResponse'
import type { ListAdminShopsParams } from '@generated/model/listAdminShopsParams'
import type { ListAdminShopsStatus } from '@generated/model/listAdminShopsStatus'

const PAGE_SIZE = 20

const STATUS_TABS: { value: '' | ListAdminShopsStatus; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đang hoạt động' },
  { value: 'SUSPENDED', label: 'Tạm khóa' },
  { value: 'REJECTED', label: 'Từ chối' },
]

function shopStatus(value: string | null): ListAdminShopsStatus | undefined {
  if (
    value === 'PENDING' ||
    value === 'APPROVED' ||
    value === 'SUSPENDED' ||
    value === 'REJECTED'
  ) {
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

export default function AdminShops() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = shopStatus(searchParams.get('status'))
  const query = searchParams.get('q') ?? ''
  const page = pageNumber(searchParams.get('page'))
  const params: ListAdminShopsParams = { page, size: PAGE_SIZE }
  if (status !== undefined) {
    params.status = status
  }
  if (query !== '') {
    params.q = query
  }

  const shopsQuery = useListAdminShops(params)
  let shops: AdminShopResponse[] = []
  let total = 0
  if (shopsQuery.data !== undefined) {
    const result = takeData(shopsQuery.data)
    shops = result.items ?? []
    total = result.total ?? 0
  }

  function updateFilters(
    nextStatus: ListAdminShopsStatus | undefined,
    nextQuery: string,
    nextPage: number,
  ) {
    const next = new URLSearchParams()
    if (nextStatus !== undefined) {
      next.set('status', nextStatus)
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
    updateFilters(status, nextQuery, 0)
  }

  return (
    <AdminShell
      title="Quản lý shop"
      description="Duyệt hồ sơ theo thứ tự nộp, theo dõi trạng thái và xử lý vi phạm."
      actions={
        <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200">
          <Storefront size={17} weight="bold" />
          {total} kết quả
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(function (tab) {
            let active = status === tab.value
            if (tab.value === '' && status === undefined) {
              active = true
            }
            let className =
              'rounded-full border px-4 py-2 text-sm font-bold transition dark:border-white/10'
            if (active) {
              className +=
                ' border-indigo-900 bg-indigo-900 text-white dark:border-indigo-300 dark:bg-indigo-300 dark:text-indigo-950'
            } else {
              className +=
                ' border-zinc-200 bg-white/60 text-zinc-600 hover:border-indigo-300 dark:bg-white/5 dark:text-zinc-300'
            }
            return (
              <button
                key={tab.label}
                type="button"
                className={className}
                onClick={function () {
                  let nextStatus: ListAdminShopsStatus | undefined
                  if (tab.value !== '') {
                    nextStatus = tab.value
                  }
                  updateFilters(nextStatus, query, 0)
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={submitSearch} className="flex max-w-2xl gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
            <MagnifyingGlass size={17} className="shrink-0 text-zinc-500 dark:text-zinc-400" />
            <span className="sr-only">Tìm shop</span>
            <input
              key={query}
              name="q"
              defaultValue={query}
              placeholder="Tên shop, slug hoặc email chủ shop"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </label>
          <button type="submit" className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold">
            Tìm
          </button>
        </form>
      </div>

      <div className="mt-6">
        {shopsQuery.isPending && (
          <StatePanel title="Đang tải danh sách" description="Dữ liệu shop đang được cập nhật…" />
        )}
        {shopsQuery.isError && (
          <StatePanel
            title="Không tải được danh sách"
            description="Kiểm tra kết nối backend hoặc quyền quản trị rồi thử lại."
          />
        )}
        {shopsQuery.isPending === false && shopsQuery.isError === false && shops.length === 0 && (
          <StatePanel
            title="Không có shop phù hợp"
            description="Thử đổi trạng thái lọc hoặc dùng từ khóa khác."
          />
        )}
        {shops.length > 0 && (
          <div className="overflow-x-auto rounded-3xl border border-zinc-200 dark:border-white/10">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase dark:bg-white/5 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-bold">Shop</th>
                  <th className="px-5 py-3 font-bold">Chủ shop</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 font-bold">Nộp gần nhất</th>
                  <th className="px-5 py-3 font-bold">Cập nhật</th>
                  <th className="px-5 py-3 text-right font-bold">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white/60 dark:divide-white/10 dark:bg-transparent">
                {shops.map(function (shop) {
                  if (shop.id === undefined) {
                    return null
                  }
                  return (
                    <tr
                      key={shop.id}
                      className="transition hover:bg-indigo-50/60 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{shop.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          /{shop.slug}
                        </p>
                        {shop.statusReason !== undefined && shop.statusReason !== null && (
                          <p className="mt-2 max-w-xs truncate text-xs text-red-600 dark:text-red-300">
                            {shop.statusReason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p>{shop.ownerName ?? 'Chưa có tên'}</p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {shop.ownerEmail ?? '—'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={shop.status} />
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                        {formatDateTime(shop.submittedAt)}
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                        {formatDateTime(shop.updatedAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={'/admin/shops/' + shop.id}
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
          updateFilters(status, query, nextPage)
        }}
      />
    </AdminShell>
  )
}
