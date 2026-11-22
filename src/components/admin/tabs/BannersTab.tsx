import { useState } from 'react'

import {
  useDeleteBanner,
  useListAdminBanners,
  useUpdateBanner,
} from '@generated/endpoints/admin-banners/admin-banners'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import {
  hookErrorMessage,
  PLACEHOLDER_IMAGE,
  takeData,
  urlOrPlaceholder,
} from '@/lib/api/apiAdapters'
import {
  PLACEMENT_OPTIONS,
  placementLabel,
  queryKeyStartsWith,
  scheduleBadgeClass,
  scheduleLabel,
  scheduleWindowLabel,
} from '@/lib/content/siteContent'
import { notify } from '@/lib/notifications'
import {
  cn,
  FOCUS_RING_CLASS,
  primaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

import BannerFormDialog from '../dialogs/BannerFormDialog'

import type { BannerPlacementValue } from '@/lib/content/siteContent'
import type { BannerResponse } from '@generated/model/bannerResponse'

type PlacementFilter = BannerPlacementValue | 'ALL'

const FILTERS: { value: PlacementFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  ...PLACEMENT_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
]

const BANNER_KEYS = ['/api/admin/banners', '/api/public/banners']

function toggleRequest(banner: BannerResponse) {
  return {
    placement: banner.placement ?? 'HOME_CAROUSEL',
    title: banner.title ?? '',
    // Bật/tắt chỉ đổi active — echo lại uploadId từ response để giữ nguyên ảnh
    imageUploadId: banner.imageUploadId ?? '',
    mobileImageUploadId: banner.mobileImageUploadId ?? undefined,
    linkUrl: banner.linkUrl ?? undefined,
    sortOrder: banner.sortOrder ?? 0,
    active: banner.active !== true,
    startsAt: banner.startsAt ?? undefined,
    endsAt: banner.endsAt ?? undefined,
  }
}

export default function BannersTab({ onNotice }: { onNotice: (message: string) => void }) {
  const [filter, setFilter] = useState<PlacementFilter>('ALL')
  const [editing, setEditing] = useState<BannerResponse | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<BannerResponse | null>(null)
  const queryClient = useQueryClient()
  let params = {}
  if (filter !== 'ALL') {
    params = { placement: filter }
  }
  const listQuery = useListAdminBanners(params)
  const update = useUpdateBanner()
  const remove = useDeleteBanner()

  function refresh(message: string) {
    setEditing(null)
    setCreating(false)
    setDeleting(null)
    onNotice(message)
    void queryClient.invalidateQueries({
      predicate: (query) => queryKeyStartsWith(query.queryKey, BANNER_KEYS),
    })
  }

  function toggle(banner: BannerResponse) {
    if (banner.id === undefined) {
      return
    }
    let message = `Đã tắt banner "${banner.title ?? ''}".`
    if (banner.active !== true) {
      message = `Đã bật banner "${banner.title ?? ''}".`
    }
    update.mutate(
      { id: banner.id, data: toggleRequest(banner) },
      {
        onSuccess: () => refresh(message),
        onError: (err) => notify.fromError(err, 'adminContent'),
      },
    )
  }

  let defaultPlacement: BannerPlacementValue = 'HOME_CAROUSEL'
  if (filter !== 'ALL') {
    defaultPlacement = filter
  }

  let body: React.ReactNode = <TableRowsSkeleton rows={3} columns={3} />
  if (listQuery.isError) {
    body = (
      <p
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
      >
        {hookErrorMessage('adminContent', listQuery.error)}
      </p>
    )
  }
  if (listQuery.isSuccess) {
    const banners = takeData(listQuery.data)
    body = (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chưa có banner nào. Bấm "Thêm banner" để tạo.
      </p>
    )
    if (banners.length > 0) {
      body = (
        <ul className="space-y-2.5">
          {banners.map(function (banner) {
            let toggleLabel = 'Bật'
            if (banner.active === true) {
              toggleLabel = 'Tắt'
            }
            return (
              <li
                key={banner.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3 md:flex-row md:items-center dark:border-white/10 dark:bg-white/5"
              >
                <img
                  src={urlOrPlaceholder(banner.imageUrl)}
                  alt=""
                  width={180}
                  height={60}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = PLACEHOLDER_IMAGE
                  }}
                  className="aspect-[3/1] w-full shrink-0 rounded-2xl object-cover md:w-44"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
                      {banner.title}
                    </span>
                    <span className={scheduleBadgeClass(banner.scheduleState)}>
                      {scheduleLabel(banner.scheduleState)}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {placementLabel(banner.placement)} · Thứ tự {banner.sortOrder} ·{' '}
                    {scheduleWindowLabel(banner.startsAt ?? undefined, banner.endsAt ?? undefined)}
                  </p>
                  {(banner.linkUrl ?? '') !== '' && (
                    <p className="mt-0.5 truncate text-xs text-blue-700 dark:text-sky-300">
                      {banner.linkUrl}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(banner)}
                    disabled={update.isPending}
                    className={cn(
                      'cursor-pointer rounded-full border border-zinc-300 bg-white/85 px-4 py-2 text-xs font-bold text-[#17203a] transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-[#e2e8f0] dark:hover:bg-white/15',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    {toggleLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(banner)}
                    aria-label={`Sửa banner ${banner.title ?? ''}`}
                    className={cn(
                      'cursor-pointer rounded-full border border-indigo-200 p-2 text-blue-700 transition hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/10',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(banner)}
                    aria-label={`Xóa banner ${banner.title ?? ''}`}
                    className={cn(
                      'cursor-pointer rounded-full border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/15',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    <Trash size={16} weight="bold" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(segmentedTrackClass(), 'flex-wrap')}
          role="tablist"
          aria-label="Lọc vị trí"
        >
          {FILTERS.map(function (item) {
            const selected = item.value === filter
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(item.value)}
                className={cn(segmentedItemClass(selected), 'cursor-pointer')}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={cn(
            primaryButtonClass(),
            'flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold',
          )}
        >
          <Plus size={16} weight="bold" />
          Thêm banner
        </button>
      </div>

      {update.isError && (
        <p role="alert" className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400">
          {hookErrorMessage('adminContent', update.error)}
        </p>
      )}

      {body}

      {(creating || editing !== null) && (
        <BannerFormDialog
          banner={editing}
          defaultPlacement={defaultPlacement}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onDone={refresh}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        variant="danger"
        title="Xóa banner"
        description={`Xóa hẳn banner "${deleting?.title ?? ''}"? Muốn ẩn tạm thời thì bấm "Tắt" thay vì xóa.`}
        confirmLabel="Xóa banner"
        isPending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting === null || deleting.id === undefined) {
            return
          }
          const title = deleting.title ?? ''
          remove.mutate(
            { id: deleting.id },
            {
              onSuccess: () => refresh(`Đã xóa banner "${title}".`),
              onError: (err) => notify.fromError(err, 'adminContent'),
            },
          )
        }}
      />
    </div>
  )
}
