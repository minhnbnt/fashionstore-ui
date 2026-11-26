import { useEffect, useState } from 'react'

import {
  getListSellerVouchersQueryKey,
  useDeleteSellerVoucher,
  useListSellerVouchers,
  useToggleSellerVoucherActive,
} from '@generated/endpoints/seller-vouchers/seller-vouchers'
import {
  CheckCircle,
  Clock,
  Copy,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  Pause,
  PencilSimple,
  Play,
  Plus,
  Ticket,
  Trash,
  Users,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Pagination from '@/components/search/Pagination'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { takeData } from '@/lib/api/apiAdapters'
import { formatDateTime, formatVnd } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { useSellerPermissions } from '@/lib/seller/sellerPermissions'
import {
  badgeToneClass,
  cn,
  INPUT_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/lib/ui/styles'

import VoucherFormModal from './VoucherFormModal'

import type {
  ListSellerVouchersParams,
  SellerVoucherResponse,
  SellerVoucherResponseStatus,
} from '@generated/model'

export interface SellerVouchersTabProps {
  shopId: string
}

type StatusFilter = '' | SellerVoucherResponseStatus

const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'ONGOING', label: 'Đang diễn ra' },
  { value: 'UPCOMING', label: 'Sắp diễn ra' },
  { value: 'PAUSED', label: 'Tạm dừng' },
  { value: 'DEPLETED', label: 'Hết lượt' },
  { value: 'EXPIRED', label: 'Đã kết thúc' },
]

function filterPillClass(active: boolean): string {
  if (active) {
    return 'btn-primary flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition'
  }
  return 'flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white'
}

function filterCountBadgeClass(active: boolean): string {
  if (active) {
    return 'rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black text-white'
  }
  return 'rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-white/10 dark:text-zinc-400'
}

function renderStatusBadge(status?: SellerVoucherResponseStatus) {
  let label = 'Đang diễn ra'
  let tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' = 'success'

  if (status === 'UPCOMING') {
    label = 'Sắp diễn ra'
    tone = 'info'
  } else if (status === 'PAUSED') {
    label = 'Tạm dừng'
    tone = 'warning'
  } else if (status === 'DEPLETED') {
    label = 'Hết lượt'
    tone = 'danger'
  } else if (status === 'EXPIRED') {
    label = 'Đã kết thúc'
    tone = 'neutral'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
        badgeToneClass(tone),
      )}
    >
      {label}
    </span>
  )
}

function renderVisibilityBadge(visibility?: string) {
  if (visibility === 'PRIVATE') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
          badgeToneClass('neutral'),
        )}
      >
        <EyeSlash size={12} />
        <span>Mã ẩn</span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        badgeToneClass('info'),
      )}
    >
      <Eye size={12} />
      <span>Công khai</span>
    </span>
  )
}

function renderScopeBadge(productScope?: string, productCount?: number) {
  if (productScope === 'SPECIFIC_PRODUCTS') {
    const count = productCount ?? 0
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
          badgeToneClass('info'),
        )}
      >
        {count} sản phẩm
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        badgeToneClass('neutral'),
      )}
    >
      Toàn shop
    </span>
  )
}

function formatDiscountSummary(voucher: SellerVoucherResponse): string {
  const value = voucher.discountValue ?? 0
  if (voucher.discountType === 'PERCENTAGE') {
    const maxAmount = voucher.maxDiscountAmount
    if (maxAmount !== null && maxAmount !== undefined && maxAmount > 0) {
      return `${value}% · Tối đa ${formatVnd(maxAmount)}`
    }
    return `${value}%`
  }
  return formatVnd(value)
}

export default function SellerVouchersTab({ shopId }: SellerVouchersTabProps) {
  const { isOwner, can } = useSellerPermissions(shopId)
  const canWrite = isOwner || can('VOUCHER_WRITE')
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null)
  const [deletingVoucher, setDeletingVoucher] = useState<SellerVoucherResponse | null>(null)

  useEffect(
    function debounceSearch() {
      const timer = setTimeout(function () {
        setSearchQuery(searchInput.trim())
        setPage(0)
      }, 300)

      return function () {
        clearTimeout(timer)
      }
    },
    [searchInput],
  )

  const queryParams: ListSellerVouchersParams = {
    page,
    size: pageSize,
  }
  if (statusFilter !== '') {
    queryParams.status = statusFilter
  }
  if (searchQuery !== '') {
    queryParams.q = searchQuery
  }

  const vouchersQuery = useListSellerVouchers(shopId, queryParams, {
    query: {
      enabled: shopId !== '',
    },
  })

  const allVouchersQuery = useListSellerVouchers(
    shopId,
    { page: 0, size: 100 },
    {
      query: {
        enabled: shopId !== '',
      },
    },
  )

  let vouchers: SellerVoucherResponse[] = []
  let totalItems = 0
  let totalPages = 1
  if (vouchersQuery.data !== undefined) {
    const pageData = takeData(vouchersQuery.data)
    if (pageData && Array.isArray(pageData.items)) {
      vouchers = pageData.items
      totalItems = pageData.total ?? vouchers.length
      if (pageSize > 0) {
        totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
      }
    }
  }

  let statsSourceVouchers = vouchers
  let allCount = totalItems
  if (allVouchersQuery.data !== undefined) {
    const allPageData = takeData(allVouchersQuery.data)
    if (allPageData && Array.isArray(allPageData.items)) {
      statsSourceVouchers = allPageData.items
      allCount = allPageData.total ?? allPageData.items.length
    }
  }

  let ongoingCount = 0
  let upcomingCount = 0
  let pausedCount = 0
  let depletedCount = 0
  let expiredCount = 0
  let totalUsedCount = 0
  for (const v of statsSourceVouchers) {
    if (v.status === 'ONGOING') {
      ongoingCount += 1
    } else if (v.status === 'UPCOMING') {
      upcomingCount += 1
    } else if (v.status === 'PAUSED') {
      pausedCount += 1
    } else if (v.status === 'DEPLETED') {
      depletedCount += 1
    } else if (v.status === 'EXPIRED') {
      expiredCount += 1
    }
    totalUsedCount += v.usedCount ?? 0
  }

  function getTabCount(tabValue: StatusFilter): number {
    if (tabValue === 'ONGOING') {
      return ongoingCount
    }
    if (tabValue === 'UPCOMING') {
      return upcomingCount
    }
    if (tabValue === 'PAUSED') {
      return pausedCount
    }
    if (tabValue === 'DEPLETED') {
      return depletedCount
    }
    if (tabValue === 'EXPIRED') {
      return expiredCount
    }
    return allCount
  }

  const toggleActiveMutation = useToggleSellerVoucherActive({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListSellerVouchersQueryKey(shopId) })
        notify.success('Đã cập nhật trạng thái mã giảm giá')
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không thể đổi trạng thái mã giảm giá.')
      },
    },
  })

  const deleteMutation = useDeleteSellerVoucher({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListSellerVouchersQueryKey(shopId) })
        setDeletingVoucher(null)
        notify.success('Đã xóa mã giảm giá thành công')
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không thể xóa mã giảm giá.')
      },
    },
  })

  function handleOpenCreate() {
    setEditingVoucherId(null)
    setIsFormOpen(true)
  }

  function handleOpenEdit(voucherId: string) {
    setEditingVoucherId(voucherId)
    setIsFormOpen(true)
  }

  function handleCopyCode(code: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
      void navigator.clipboard.writeText(code)
    }
    notify.success(`Đã sao chép mã ${code}`)
  }

  function handleToggleActive(voucher: SellerVoucherResponse) {
    const voucherId = voucher.id ?? ''
    if (voucherId === '') {
      return
    }
    const nextActive = voucher.active === false
    toggleActiveMutation.mutate({
      shopId,
      voucherId,
      data: { active: nextActive },
    })
  }

  function handleConfirmDelete() {
    if (deletingVoucher === null) {
      return
    }
    const voucherId = deletingVoucher.id ?? ''
    if (voucherId === '') {
      return
    }
    deleteMutation.mutate({
      shopId,
      voucherId,
    })
  }

  const isLoading = vouchersQuery.isPending && vouchersQuery.isFetching
  const isError = vouchersQuery.isError === true

  let deleteDialogDescription = 'Bạn có chắc chắn muốn xóa vĩnh viễn mã giảm giá này không?'
  if (deletingVoucher !== null && deletingVoucher.code !== undefined) {
    deleteDialogDescription = `Bạn có chắc chắn muốn xóa vĩnh viễn mã giảm giá "${deletingVoucher.code}" không? Hành động này không thể hoàn tác.`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
            Mã giảm giá của Shop
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Tạo và quản lý các chương trình mã giảm giá giúp tăng tỷ lệ chuyển đổi đơn hàng.
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className={cn(
              primaryButtonClass(),
              'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold',
            )}
          >
            <Plus size={16} weight="bold" />
            <span>Tạo mã giảm giá</span>
          </button>
        )}
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Tổng chương trình</span>
            <Ticket size={18} className="text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-900 dark:text-white">{allCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span>Đang diễn ra</span>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
            {ongoingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-xs dark:border-sky-900/30 dark:bg-sky-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-700 dark:text-sky-400">
            <span>Sắp diễn ra</span>
            <Clock size={18} className="text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-900 dark:text-sky-200">{upcomingCount}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
            <span>Tổng lượt đã dùng</span>
            <Users size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
            {totalUsedCount}
          </p>
        </div>
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className={cn(PANEL_CLASS, 'space-y-4')}>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 pb-3 dark:border-white/10">
          {STATUS_TABS.map(function (tab) {
            const isCurrent = statusFilter === tab.value
            const tabCount = getTabCount(tab.value)
            return (
              <button
                key={tab.value || 'ALL'}
                type="button"
                onClick={function () {
                  setStatusFilter(tab.value)
                  setPage(0)
                }}
                className={filterPillClass(isCurrent)}
              >
                <span>{tab.label}</span>
                <span className={filterCountBadgeClass(isCurrent)}>{tabCount}</span>
              </button>
            )
          })}
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
            <MagnifyingGlass size={16} />
          </div>
          <input
            type="text"
            aria-label="Tìm kiếm mã giảm giá"
            value={searchInput}
            onChange={function (e) {
              setSearchInput(e.target.value)
            }}
            placeholder="Tìm theo mã code hoặc tên chương trình..."
            className={cn(INPUT_CLASS, 'py-2 pr-9 pl-10 text-xs')}
          />
          {searchInput !== '' && (
            <button
              type="button"
              aria-label="Xóa từ khóa"
              onClick={function () {
                setSearchInput('')
                setSearchQuery('')
                setPage(0)
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Voucher Table / List */}
      {isLoading && (
        <div className={cn(PANEL_CLASS, 'p-8 text-center text-sm text-zinc-500')}>
          Đang tải danh sách mã giảm giá...
        </div>
      )}

      {isError && (
        <div className={PANEL_CLASS}>
          <EmptyState
            icon={<Ticket size={32} className="text-zinc-400" />}
            title="Không thể tải danh sách mã giảm giá"
            description="Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại."
            action={
              <button
                type="button"
                onClick={function () {
                  void vouchersQuery.refetch()
                }}
                className={primaryButtonClass()}
              >
                Thử lại
              </button>
            }
          />
        </div>
      )}

      {!isLoading && !isError && vouchers.length === 0 && (
        <div className={PANEL_CLASS}>
          <EmptyState
            icon={<Ticket size={32} className="text-zinc-400" />}
            title="Chưa có mã giảm giá nào"
            description="Tạo mã giảm giá đầu tiên để thu hút khách hàng mua sắm tại gian hàng của bạn."
          />
        </div>
      )}

      {!isLoading && !isError && vouchers.length > 0 && (
        <div className="space-y-3">
          {vouchers.map(function (voucher) {
            const vid = voucher.id ?? ''
            const vcode = voucher.code ?? ''
            const used = voucher.usedCount ?? 0
            const limit = Math.max(1, voucher.usageLimit ?? 1)
            const usagePercent = Math.min(100, Math.round((used / limit) * 100))
            const discountSummary = formatDiscountSummary(voucher)
            const canDelete = used === 0

            let toggleLabel = 'Tạm dừng'
            let ToggleIcon = Pause
            if (voucher.active === false) {
              toggleLabel = 'Kích hoạt'
              ToggleIcon = Play
            }

            return (
              <div
                key={vid}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition hover:border-zinc-300 lg:flex-row lg:items-center lg:justify-between dark:border-white/10 dark:bg-[#11182a] dark:hover:border-white/20"
              >
                {/* Left: Code, Name, Visibility & Scope */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-mono text-xs font-black tracking-wider text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
                      {vcode}
                    </span>
                    <button
                      type="button"
                      aria-label={`Sao chép mã ${vcode}`}
                      onClick={function () {
                        handleCopyCode(vcode)
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <Copy size={13} />
                      <span>Copy</span>
                    </button>
                    {renderVisibilityBadge(voucher.visibility)}
                    {renderScopeBadge(voucher.productScope, voucher.productCount)}
                    {renderStatusBadge(voucher.status)}
                  </div>

                  <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                    {voucher.name}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>
                      Hiệu lực: {formatDateTime(voucher.startsAt)} –{' '}
                      {formatDateTime(voucher.endsAt)}
                    </span>
                    <span>·</span>
                    <span>Tối đa {voucher.perBuyerLimit ?? 1} lượt/khách</span>
                  </div>
                </div>

                {/* Middle: Discount & Usage Progress */}
                <div className="flex flex-wrap items-center gap-6 lg:shrink-0">
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500">Mức giảm</p>
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                      {discountSummary}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Đơn tối thiểu: {formatVnd(voucher.minOrderSubtotal ?? 0)}
                    </p>
                  </div>

                  <div className="w-36">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-500">Đã dùng</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {used} / {voucher.usageLimit ?? 0}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                {canWrite && (
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3 lg:shrink-0 lg:border-t-0 lg:pt-0 dark:border-white/10">
                    <button
                      type="button"
                      aria-label={`${toggleLabel} mã ${vcode}`}
                      onClick={function () {
                        handleToggleActive(voucher)
                      }}
                      className={cn(secondaryButtonClass(), 'px-3 py-1.5 text-xs')}
                    >
                      <ToggleIcon size={14} weight="bold" />
                      <span>{toggleLabel}</span>
                    </button>

                    <button
                      type="button"
                      aria-label={`Chỉnh sửa mã ${vcode}`}
                      onClick={function () {
                        handleOpenEdit(vid)
                      }}
                      className={cn(secondaryButtonClass(), 'px-3 py-1.5 text-xs')}
                    >
                      <PencilSimple size={14} weight="bold" />
                      <span>Chỉnh sửa</span>
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        aria-label={`Xóa mã ${vcode}`}
                        onClick={function () {
                          setDeletingVoucher(voucher)
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
                      >
                        <Trash size={14} weight="bold" />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPage={function (nextPage) {
                setPage(nextPage)
              }}
            />
          )}
        </div>
      )}

      {/* Create / Edit Voucher Modal */}
      <VoucherFormModal
        open={isFormOpen}
        shopId={shopId}
        editingVoucherId={editingVoucherId}
        onClose={function () {
          setIsFormOpen(false)
          setEditingVoucherId(null)
        }}
        onSaved={function () {
          void queryClient.invalidateQueries({ queryKey: getListSellerVouchersQueryKey(shopId) })
          if (typeof vouchersQuery.refetch === 'function') {
            void vouchersQuery.refetch()
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deletingVoucher !== null}
        title="Xóa mã giảm giá"
        description={deleteDialogDescription}
        confirmLabel="Xóa mã"
        cancelLabel="Hủy"
        variant="danger"
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={function () {
          setDeletingVoucher(null)
        }}
      />
    </div>
  )
}
