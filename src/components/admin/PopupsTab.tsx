import { useState } from 'react'

import {
  useDeletePopup,
  useListAdminPopups,
  useUpdatePopup,
} from '@generated/endpoints/admin-popups/admin-popups'
import { Megaphone, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, imageUrl, takeData } from '@/lib/apiAdapters'
import {
  audienceLabel,
  frequencyLabel,
  queryKeyStartsWith,
  scheduleBadgeClass,
  scheduleLabel,
  scheduleWindowLabel,
} from '@/lib/siteContent'

import ConfirmDialog from './ConfirmDialog'
import PopupFormDialog from './PopupFormDialog'

import type { PopupRequest } from '@generated/model/popupRequest'
import type { PopupResponse } from '@generated/model/popupResponse'

const POPUP_KEYS = ['/api/admin/popups', '/api/public/popups']

function toggleRequest(popup: PopupResponse): PopupRequest {
  return {
    name: popup.name ?? '',
    title: popup.title ?? undefined,
    body: popup.body ?? undefined,
    imageKey: popup.imageKey ?? undefined,
    ctaLabel: popup.ctaLabel ?? undefined,
    linkUrl: popup.linkUrl ?? undefined,
    audience: popup.audience ?? 'ALL',
    frequency: popup.frequency ?? 'ONCE_PER_DAY',
    delaySeconds: popup.delaySeconds ?? 0,
    priority: popup.priority ?? 0,
    active: popup.active !== true,
    startsAt: popup.startsAt ?? undefined,
    endsAt: popup.endsAt ?? undefined,
  }
}

export default function PopupsTab({ onNotice }: { onNotice: (message: string) => void }) {
  const [editing, setEditing] = useState<PopupResponse | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<PopupResponse | null>(null)
  const queryClient = useQueryClient()
  const listQuery = useListAdminPopups()
  const update = useUpdatePopup()
  const remove = useDeletePopup()

  function refresh(message: string) {
    setEditing(null)
    setCreating(false)
    setDeleting(null)
    onNotice(message)
    void queryClient.invalidateQueries({
      predicate: (query) => queryKeyStartsWith(query.queryKey, POPUP_KEYS),
    })
  }

  function toggle(popup: PopupResponse) {
    if (popup.id === undefined) {
      return
    }
    let message = `Đã tắt popup "${popup.name ?? ''}".`
    if (popup.active !== true) {
      message = `Đã bật popup "${popup.name ?? ''}".`
    }
    update.mutate(
      { id: popup.id, data: toggleRequest(popup) },
      { onSuccess: () => refresh(message) },
    )
  }

  let deleteError: string | undefined = undefined
  if (remove.isError) {
    deleteError = hookErrorMessage('adminContent', remove.error)
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
    const popups = takeData(listQuery.data)
    body = (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chưa có popup nào. Bấm "Thêm popup" để tạo.
      </p>
    )
    if (popups.length > 0) {
      body = (
        <ul className="space-y-2">
          {popups.map(function (popup) {
            const imageKey = popup.imageKey ?? ''
            let toggleLabel = 'Bật'
            if (popup.active === true) {
              toggleLabel = 'Tắt'
            }
            return (
              <li
                key={popup.id}
                className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3 sm:flex-row sm:items-center dark:bg-white/5"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 dark:bg-white/10">
                  {imageKey !== '' && (
                    <img src={imageUrl(imageKey)} alt="" className="h-full w-full object-cover" />
                  )}
                  {imageKey === '' && <Megaphone size={24} className="text-zinc-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold">{popup.name}</span>
                    <span className={scheduleBadgeClass(popup.scheduleState)}>
                      {scheduleLabel(popup.scheduleState)}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold tabular-nums dark:bg-white/10">
                      Ưu tiên {popup.priority}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {audienceLabel(popup.audience)} · {frequencyLabel(popup.frequency)} · hiện sau{' '}
                    {popup.delaySeconds}s
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {scheduleWindowLabel(popup.startsAt ?? undefined, popup.endsAt ?? undefined)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(popup)}
                    disabled={update.isPending}
                    className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    {toggleLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(popup)}
                    aria-label={`Sửa ${popup.name ?? ''}`}
                    className="rounded-full border border-indigo-200 p-2 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(popup)}
                    aria-label={`Xóa ${popup.name ?? ''}`}
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
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Hiện ở trang chủ. Nhiều popup cùng chạy thì khách chỉ thấy 1 popup ưu tiên cao nhất còn
          hợp lệ.
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 dark:bg-indigo-500"
        >
          <Plus size={16} weight="bold" />
          Thêm popup
        </button>
      </div>

      {update.isError && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('adminContent', update.error)}
        </p>
      )}

      {body}

      {(creating || editing !== null) && (
        <PopupFormDialog
          popup={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onDone={refresh}
        />
      )}

      {deleting !== null && (
        <ConfirmDialog
          open
          title="Xóa popup"
          description={`Xóa hẳn popup "${deleting.name ?? ''}"? Muốn ẩn tạm thời thì bấm "Tắt" thay vì xóa.`}
          confirmLabel="Xóa popup"
          pending={remove.isPending}
          error={deleteError}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            if (deleting.id === undefined) {
              return
            }
            remove.mutate(
              { id: deleting.id },
              { onSuccess: () => refresh(`Đã xóa popup "${deleting.name ?? ''}".`) },
            )
          }}
        />
      )}
    </div>
  )
}
