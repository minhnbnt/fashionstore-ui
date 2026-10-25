import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import {
  useApproveProduct,
  useListAdminProducts,
} from '@generated/endpoints/admin-products/admin-products'
import {
  ArrowCounterClockwise,
  CheckCircle,
  Flag,
  MagnifyingGlass,
  Prohibit,
  Robot,
  TextAa,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import {
  canApprove,
  canBan,
  canReject,
  canRestore,
  formatDateTime,
  priceRangeLabel,
  STATUS_TABS,
  statusBadgeClass,
  statusLabel,
  violationLabel,
} from '@/lib/productModeration'

import AdminProductDetailPanel from '../components/admin/AdminProductDetailPanel'
import AdminShell from '../components/admin/AdminShell'
import BanProductDialog from '../components/admin/BanProductDialog'
import DismissReportsDialog from '../components/admin/DismissReportsDialog'
import RejectProductDialog from '../components/admin/RejectProductDialog'
import RestoreProductDialog from '../components/admin/RestoreProductDialog'
import Pagination from '../components/search/Pagination'

import type { ProductStatusFilter } from '@/lib/productModeration'
import type { AdminProductResponse } from '@generated/model/adminProductResponse'
import type { ListAdminProductsParams } from '@generated/model/listAdminProductsParams'

const PAGE_SIZE = 20
const DEFAULT_STATUS: ProductStatusFilter = 'REPORTED'

function statusFromUrl(raw: string | null): ProductStatusFilter {
  const match = STATUS_TABS.find((tab) => tab.value === raw)
  if (match === undefined) {
    return DEFAULT_STATUS
  }
  return match.value
}

function pageFromUrl(raw: string | null): number {
  const parsed = Number(raw)
  if (Number.isInteger(parsed) === false || parsed < 0) {
    return 0
  }
  return parsed
}

function paramsOf(
  status: ProductStatusFilter,
  q: string,
  shopId: string | null,
  page: number,
): ListAdminProductsParams {
  const params: ListAdminProductsParams = { page, size: PAGE_SIZE }
  if (status === 'REPORTED') {
    params.reported = true
  }
  if (status !== 'ALL' && status !== 'REPORTED') {
    params.status = status
  }
  if (q !== '') {
    params.q = q
  }
  if (shopId !== null && shopId !== '') {
    params.shopId = shopId
  }
  return params
}

function isAdminProductKey(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0]
  return typeof head === 'string' && head.startsWith('/api/admin/products')
}

function ProductRow({
  product,
  onOpen,
  onBan,
  onRestore,
  onApprove,
  onReject,
}: {
  product: AdminProductResponse
  onOpen: () => void
  onBan: () => void
  onRestore: () => void
  onApprove?: () => void
  onReject?: () => void
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3 sm:flex-row sm:items-center dark:bg-white/5">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <img
          src={imageUrl(product.imageKey)}
          alt=""
          width={56}
          height={70}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = PLACEHOLDER_IMAGE
          }}
          className="h-[70px] w-14 shrink-0 rounded-2xl object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold hover:underline">{product.name}</span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {product.shopName} · {priceRangeLabel(product.minPrice, product.maxPrice)} · Tồn{' '}
            {product.totalStock ?? 0}
          </span>
          {(product.openReportCount ?? 0) > 0 && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                <Flag size={12} weight="bold" />
                {product.openReportCount} báo cáo · {violationLabel(product.topReportReason)}
              </span>
              {product.systemFlagged === true && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  <Robot size={12} weight="bold" />
                  Từ khóa cấm
                </span>
              )}
            </span>
          )}
          {product.status === 'BANNED' && (
            <span className="mt-1 block truncate text-xs text-red-700 dark:text-red-300">
              {violationLabel(product.violationType)}: {product.statusReason}
            </span>
          )}
        </span>
      </button>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className={statusBadgeClass(product.status)}>{statusLabel(product.status)}</span>
          <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {formatDateTime(product.updatedAt)}
          </span>
        </div>
        {canApprove(product.status) && onApprove !== undefined && (
          <button
            type="button"
            onClick={onApprove}
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            <CheckCircle size={14} weight="bold" />
            Duyệt
          </button>
        )}
        {canReject(product.status) && onReject !== undefined && (
          <button
            type="button"
            onClick={onReject}
            className="flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Prohibit size={14} weight="bold" />
            Từ chối
          </button>
        )}
        {canBan(product.status) && (
          <button
            type="button"
            onClick={onBan}
            className="flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Prohibit size={14} weight="bold" />
            Gỡ
          </button>
        )}
        {canRestore(product.status) && (
          <button
            type="button"
            onClick={onRestore}
            className="flex items-center gap-1.5 rounded-full border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            Khôi phục
          </button>
        )}
      </div>
    </li>
  )
}

export default function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = statusFromUrl(searchParams.get('status'))
  const q = searchParams.get('q') ?? ''
  const shopId = searchParams.get('shopId')
  const page = pageFromUrl(searchParams.get('page'))

  const [draft, setDraft] = useState(q)
  const [openId, setOpenId] = useState<string | null>(null)
  const [banTarget, setBanTarget] = useState<AdminProductResponse | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<AdminProductResponse | null>(null)
  const [dismissTarget, setDismissTarget] = useState<AdminProductResponse | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AdminProductResponse | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const listQuery = useListAdminProducts(paramsOf(status, q, shopId, page))
  const approveMutation = useApproveProduct()

  function updateUrl(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') {
        next.delete(key)
        continue
      }
      next.set(key, value)
    }
    setSearchParams(next)
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateUrl({ q: draft.trim(), page: null })
  }

  function refreshAfterModeration(message: string) {
    setBanTarget(null)
    setRestoreTarget(null)
    setDismissTarget(null)
    setRejectTarget(null)
    setNotice(message)
    void queryClient.invalidateQueries({ predicate: (query) => isAdminProductKey(query.queryKey) })
  }

  function handleApprove(product: AdminProductResponse) {
    if (product.id === undefined || product.id === null) {
      return
    }
    approveMutation.mutate(
      { id: product.id },
      {
        onSuccess: () => {
          refreshAfterModeration(`Đã phê duyệt sản phẩm "${product.name}".`)
        },
        onError: (err) => {
          setNotice(hookErrorMessage('adminProducts', err))
        },
      },
    )
  }

  let listBody = (
    <div className="space-y-2" aria-busy="true">
      {[0, 1, 2, 3].map(function (index) {
        return (
          <div
            key={index}
            className="h-[94px] animate-pulse rounded-2xl bg-white/60 dark:bg-white/5"
          />
        )
      })}
    </div>
  )
  let totalPages = 0
  let total = 0
  if (listQuery.isError) {
    listBody = (
      <p className="text-sm text-red-600 dark:text-red-400">
        {hookErrorMessage('adminProducts', listQuery.error)}
      </p>
    )
  }
  if (listQuery.isSuccess) {
    const data = takeData(listQuery.data)
    const items = data.items ?? []
    total = data.total ?? 0
    totalPages = Math.ceil(total / PAGE_SIZE)
    let emptyText = 'Không có sản phẩm nào.'
    if (status === 'REPORTED') {
      emptyText = 'Không có báo cáo nào chờ xử lý.'
    }
    if (status === 'PENDING') {
      emptyText = 'Không có sản phẩm nào chờ duyệt.'
    }
    listBody = (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
    )
    if (items.length > 0) {
      listBody = (
        <ul className="space-y-2">
          {items.map(function (product) {
            return (
              <ProductRow
                key={product.id}
                product={product}
                onOpen={() => setOpenId(product.id ?? null)}
                onBan={() => setBanTarget(product)}
                onRestore={() => setRestoreTarget(product)}
                onApprove={() => handleApprove(product)}
                onReject={() => setRejectTarget(product)}
              />
            )
          })}
        </ul>
      )
    }
  }

  return (
    <AdminShell
      title="Kiểm duyệt sản phẩm"
      description="Xử lý sản phẩm bị người mua báo cáo hoặc hệ thống gắn cờ theo từ khóa cấm, gỡ hàng vi phạm và khôi phục khi shop đã khắc phục."
      actions={
        <Link
          to="/admin/products/keywords"
          className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-white/70 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10"
        >
          <TextAa size={17} weight="bold" />
          Từ khóa cấm
        </Link>
      }
    >
      {notice !== null && (
        <output className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          {notice}
          <button type="button" aria-label="Ẩn thông báo" onClick={() => setNotice(null)}>
            <X size={16} weight="bold" />
          </button>
        </output>
      )}

      <section>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Lọc trạng thái">
            {STATUS_TABS.map(function (tab) {
              const selected = tab.value === status
              let tabClass =
                'rounded-full px-3.5 py-1.5 text-xs font-bold transition text-zinc-600 hover:bg-white/70 dark:text-zinc-300 dark:hover:bg-white/10'
              if (selected) {
                tabClass =
                  'rounded-full px-3.5 py-1.5 text-xs font-bold transition bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950'
              }
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => updateUrl({ status: tab.value, page: null })}
                  className={tabClass}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSearch} className="flex w-full items-center gap-2 lg:w-auto">
            <label className="flex flex-1 items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 lg:w-80 dark:border-white/10 dark:bg-white/5">
              <MagnifyingGlass size={16} weight="bold" className="shrink-0 text-zinc-400" />
              <input
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Tên, slug, tên shop hoặc SKU"
                aria-label="Tìm sản phẩm"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <button type="submit" className="btn-primary rounded-full px-4 py-2 text-sm font-bold">
              Tìm
            </button>
          </form>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {listQuery.isSuccess && (
            <span className="tabular-nums">{total.toLocaleString('vi-VN')} sản phẩm</span>
          )}
          {shopId !== null && shopId !== '' && (
            <button
              type="button"
              onClick={() => updateUrl({ shopId: null, page: null })}
              className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 font-semibold dark:bg-white/10"
            >
              Đang lọc theo 1 shop
              <X size={12} weight="bold" />
            </button>
          )}
        </div>

        {listBody}

        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={(next) => updateUrl({ page: String(next) })}
        />
      </section>

      {openId !== null && (
        <AdminProductDetailPanel
          productId={openId}
          onClose={() => setOpenId(null)}
          onBan={(product) => setBanTarget(product)}
          onRestore={(product) => setRestoreTarget(product)}
          onDismiss={(product) => setDismissTarget(product)}
          onApprove={(product) => handleApprove(product)}
          onReject={(product) => setRejectTarget(product)}
        />
      )}

      {dismissTarget !== null && (
        <DismissReportsDialog
          product={dismissTarget}
          onClose={() => setDismissTarget(null)}
          onDone={(count) =>
            refreshAfterModeration(
              `Đã đóng ${count} báo cáo của "${dismissTarget.name}": không vi phạm.`,
            )
          }
        />
      )}

      {rejectTarget !== null && (
        <RejectProductDialog
          product={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={() => refreshAfterModeration(`Đã từ chối duyệt sản phẩm "${rejectTarget.name}".`)}
        />
      )}

      {banTarget !== null && (
        <BanProductDialog
          product={banTarget}
          onClose={() => setBanTarget(null)}
          onDone={() => refreshAfterModeration(`Đã gỡ "${banTarget.name}" khỏi sàn.`)}
        />
      )}

      {restoreTarget !== null && (
        <RestoreProductDialog
          product={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onDone={() =>
            refreshAfterModeration(`Đã khôi phục "${restoreTarget.name}" về trạng thái ẩn.`)
          }
        />
      )}
    </AdminShell>
  )
}
