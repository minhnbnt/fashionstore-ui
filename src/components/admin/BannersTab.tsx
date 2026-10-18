import { useState } from 'react'

import {
  useDeleteBanner,
  useListAdminBanners,
  useUpdateBanner,
} from '@generated/endpoints/admin-banners/admin-banners'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import {
  PLACEMENT_OPTIONS,
  placementLabel,
  queryKeyStartsWith,
  scheduleBadgeClass,
  scheduleLabel,
  scheduleWindowLabel,
} from '@/lib/siteContent'

import BannerFormDialog from './BannerFormDialog'
import ConfirmDialog from './ConfirmDialog'

import type { BannerPlacementValue } from '@/lib/siteContent'
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
    imageKey: banner.imageKey ?? '',
    mobileImageKey: banner.mobileImageKey ?? undefined,
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
      { onSuccess: () => refresh(message) },
    )
  }

  let deleteError: string | null = null
  if (remove.isError) {
    deleteError = hookErrorMessage('adminContent', remove.error)
  }

  let defaultPlacement: BannerPlacementValue = 'HOME_CAROUSEL'
  if (filter !== 'ALL') {
    defaultPlacement = filter
  }

  let body = <div className="h-40 animate-pulse rounded-2xl bg-white/60 dark:bg-white/5" />
  if (listQuery.isError) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">
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
        <ul className="space-y-2">
          {banners.map(function (banner) {
            let toggleLabel = 'Bật'
            if (banner.active === true) {
              toggleLabel = 'Tắt'
            }
            return (
              <li
                key={banner.id}
                className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3 md:flex-row md:items-center dark:bg-white/5"
              >
                <img
                  src={imageUrl(banner.imageKey)}
                  alt=""
                  width={180}
                  height={60}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = PLACEHOLDER_IMAGE
                  }}
                  className="aspect-[3/1] w-full shrink-0 rounded-xl object-cover md:w-44"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold">{banner.title}</span>
                    <span className={scheduleBadgeClass(banner.scheduleState)}>
                      {scheduleLabel(banner.scheduleState)}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {placementLabel(banner.placement)} · Thứ tự {banner.sortOrder} ·{' '}
                    {scheduleWindowLabel(banner.startsAt ?? undefined, banner.endsAt ?? undefined)}
                  </p>
                  {(banner.linkUrl ?? '') !== '' && (
                    <p className="mt-0.5 truncate text-xs text-indigo-600 dark:text-indigo-300">
                      {banner.linkUrl}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(banner)}
                    disabled={update.isPending}
                    className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    {toggleLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(banner)}
                    aria-label={`Sửa ${banner.title ?? ''}`}
                    className="rounded-full border border-indigo-200 p-2 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(banner)}
                    aria-label={`Xóa ${banner.title ?? ''}`}
                    className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
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
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Lọc vị trí">
          {FILTERS.map(function (item) {
            const selected = item.value === filter
            let itemClass =
              'rounded-full px-3.5 py-1.5 text-xs font-bold transition text-zinc-600 hover:bg-white/70 dark:text-zinc-300 dark:hover:bg-white/10'
            if (selected) {
              itemClass =
                'rounded-full px-3.5 py-1.5 text-xs font-bold transition bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
            }
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(item.value)}
                className={itemClass}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-fit items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 dark:bg-indigo-500"
        >
          <Plus size={16} weight="bold" />
          Thêm banner
        </button>
      </div>

      {update.isError && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">
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

      {deleting !== null && (
        <ConfirmDialog
          title="Xóa banner"
          message={`Xóa hẳn banner "${deleting.title ?? ''}"? Muốn ẩn tạm thời thì bấm "Tắt" thay vì xóa.`}
          confirmLabel="Xóa banner"
          pending={remove.isPending}
          error={deleteError}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            if (deleting.id === undefined) {
              return
            }
            remove.mutate(
              { id: deleting.id },
              { onSuccess: () => refresh(`Đã xóa banner "${deleting.title ?? ''}".`) },
            )
          }}
        />
      )}
    </div>
  )
}
