import { useState } from 'react'

import {
  useDeletePopup,
  useListAdminPopups,
  useUpdatePopup,
} from '@generated/endpoints/admin-popups/admin-popups'
import { Megaphone, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
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
  audienceLabel,
  frequencyLabel,
  queryKeyStartsWith,
  scheduleBadgeClass,
  scheduleLabel,
  scheduleWindowLabel,
} from '@/lib/content/siteContent'
import { notify } from '@/lib/notifications'
import { cn, FOCUS_RING_CLASS, primaryButtonClass } from '@/lib/ui/styles'

import PopupFormDialog from '../dialogs/PopupFormDialog'

import type { PopupRequest } from '@generated/model/popupRequest'
import type { PopupResponse } from '@generated/model/popupResponse'

const POPUP_KEYS = ['/api/admin/popups', '/api/public/popups']

function toggleRequest(popup: PopupResponse): PopupRequest {
  return {
    name: popup.name ?? '',
    title: popup.title ?? undefined,
    body: popup.body ?? undefined,
    // Bật/tắt chỉ đổi active — echo lại uploadId từ response để giữ nguyên ảnh
    imageUploadId: popup.imageUploadId ?? undefined,
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
      {
        onSuccess: () => refresh(message),
        onError: (err) => notify.fromError(err, 'adminContent'),
      },
    )
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
    const popups = takeData(listQuery.data)
    body = (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chưa có popup nào. Bấm "Thêm popup" để tạo.
      </p>
    )
    if (popups.length > 0) {
      body = (
        <ul className="space-y-2.5">
          {popups.map(function (popup) {
            const imageUrl = popup.imageUrl ?? ''
            let toggleLabel = 'Bật'
            if (popup.active === true) {
              toggleLabel = 'Tắt'
            }
            return (
              <li
                key={popup.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 dark:bg-white/10">
                  {imageUrl !== '' && (
                    <img
                      src={urlOrPlaceholder(imageUrl)}
                      alt=""
                      onError={function (e) {
                        if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                          e.currentTarget.src = PLACEHOLDER_IMAGE
                        }
                      }}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {imageUrl === '' && (
                    <Megaphone size={24} className="text-zinc-500 dark:text-zinc-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
                      {popup.name}
                    </span>
                    <span className={scheduleBadgeClass(popup.scheduleState)}>
                      {scheduleLabel(popup.scheduleState)}
                    </span>
                    <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-xs font-bold tabular-nums dark:bg-white/10">
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
                    className={cn(
                      'cursor-pointer rounded-full border border-zinc-300 bg-white/85 px-4 py-2 text-xs font-bold text-[#17203a] transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-[#e2e8f0] dark:hover:bg-white/15',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    {toggleLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(popup)}
                    aria-label={`Sửa popup ${popup.name ?? ''}`}
                    className={cn(
                      'cursor-pointer rounded-full border border-indigo-200 p-2 text-blue-700 transition hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/10',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(popup)}
                    aria-label={`Xóa popup ${popup.name ?? ''}`}
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
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Hiện ở trang chủ. Nhiều popup cùng chạy thì khách chỉ thấy 1 popup ưu tiên cao nhất còn
          hợp lệ.
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={cn(
            primaryButtonClass(),
            'flex w-fit shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold',
          )}
        >
          <Plus size={16} weight="bold" />
          Thêm popup
        </button>
      </div>

      {update.isError && (
        <p role="alert" className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400">
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

      <ConfirmDialog
        open={deleting !== null}
        variant="danger"
        title="Xóa popup"
        description={`Xóa hẳn popup "${deleting?.name ?? ''}"? Muốn ẩn tạm thời thì bấm "Tắt" thay vì xóa.`}
        confirmLabel="Xóa popup"
        isPending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting === null || deleting.id === undefined) {
            return
          }
          const name = deleting.name ?? ''
          remove.mutate(
            { id: deleting.id },
            {
              onSuccess: () => refresh(`Đã xóa popup "${name}".`),
              onError: (err) => notify.fromError(err, 'adminContent'),
            },
          )
        }}
      />
    </div>
  )
}
