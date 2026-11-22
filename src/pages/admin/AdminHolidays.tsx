import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  useDisableHoliday,
  useListHolidays,
  useSaveHoliday,
  useSyncHolidays,
} from '@generated/endpoints/admin-holidays/admin-holidays'
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  PencilSimple,
  Prohibit,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminShell from '@/components/admin/AdminShell'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/admin/productModeration'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import {
  formatDay,
  holidayNameError,
  kindLabel,
  NAME_MAX,
  sourceLabel,
  syncResultMessage,
  weekdayLabel,
  yearOptions,
} from '@/lib/order/holidays'
import {
  cn,
  FOCUS_RING_CLASS,
  INPUT_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

import type { HolidayResponse } from '@generated/model/holidayResponse'
import type { HolidaySyncResponse } from '@generated/model/holidaySyncResponse'
import type { SaveHolidayRequestKind } from '@generated/model/saveHolidayRequestKind'

const CURRENT_YEAR = new Date().getFullYear()

function yearFromUrl(raw: string | null): number {
  const parsed = Number(raw)
  if (Number.isInteger(parsed) === false || parsed < 2000 || parsed > 2100) {
    return CURRENT_YEAR
  }
  return parsed
}

function isHolidayKey(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0]
  return typeof head === 'string' && head.startsWith('/api/admin/holidays')
}

function kindBadgeClass(kind: string | undefined): string {
  const base = 'w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold'
  if (kind === 'WORKING_DAY') {
    return `${base} bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300`
  }
  return `${base} bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300`
}

function LastSync({ lastSync }: { lastSync: HolidaySyncResponse | null | undefined }) {
  if (lastSync === null || lastSync === undefined) {
    return <span>Chưa đồng bộ lần nào.</span>
  }
  if (lastSync.status === 'FAILED') {
    return (
      <span className="text-rose-600 dark:text-rose-400">
        Lần gần nhất thất bại lúc {formatDateTime(lastSync.syncedAt)}: {lastSync.message}
      </span>
    )
  }
  return (
    <span>
      Đồng bộ lúc {formatDateTime(lastSync.syncedAt)}, nhận {lastSync.holidayCount ?? 0} ngày.
    </span>
  )
}

function HolidayRow({
  holiday,
  isEditing,
  onEdit,
  onDisable,
  onEnable,
  busy,
}: {
  holiday: HolidayResponse
  isEditing: boolean
  onEdit: () => void
  onDisable: () => void
  onEnable: () => void
  busy: boolean
}) {
  const disabled = holiday.enabled === false
  let rowClass =
    'flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5'
  if (disabled) {
    rowClass =
      'flex flex-col gap-3 rounded-2xl border border-zinc-200/60 bg-zinc-50/40 p-3 opacity-70 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/[0.03]'
  }
  if (isEditing) {
    rowClass = cn(rowClass, 'ring-2 ring-blue-600/40 dark:ring-sky-400/45')
  }
  const actionClass = cn(
    'flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50',
    FOCUS_RING_CLASS,
  )

  return (
    <li className={rowClass}>
      <div className="w-32 shrink-0">
        <p className="text-sm font-bold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
          {formatDay(holiday.day)}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{weekdayLabel(holiday.day)}</p>
      </div>
      <div className="min-w-0 flex-1">
        {disabled && <p className="truncate text-sm font-semibold line-through">{holiday.name}</p>}
        {disabled === false && <p className="truncate text-sm font-semibold">{holiday.name}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className={kindBadgeClass(holiday.kind)}>{kindLabel(holiday.kind)}</span>
          <span>{sourceLabel(holiday.source)}</span>
          {holiday.updatedByEmail !== null && holiday.updatedByEmail !== undefined && (
            <span>· {holiday.updatedByEmail}</span>
          )}
          {disabled && <span className="font-bold text-zinc-700 dark:text-zinc-200">· Đã bỏ</span>}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            actionClass,
            'border-zinc-300 bg-white/85 text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15',
          )}
        >
          <PencilSimple size={14} weight="bold" />
          Sửa
        </button>
        {disabled === false && (
          <button
            type="button"
            onClick={onDisable}
            disabled={busy}
            className={cn(
              actionClass,
              'border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/15',
            )}
          >
            <Prohibit size={14} weight="bold" />
            Bỏ
          </button>
        )}
        {disabled && (
          <button
            type="button"
            onClick={onEnable}
            disabled={busy}
            className={cn(
              actionClass,
              'border-indigo-200 text-blue-700 hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/10',
            )}
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            Bật lại
          </button>
        )}
      </div>
    </li>
  )
}

export default function AdminHolidays() {
  const [searchParams, setSearchParams] = useSearchParams()
  const year = yearFromUrl(searchParams.get('year'))

  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [day, setDay] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SaveHolidayRequestKind>('HOLIDAY')
  const [touched, setTouched] = useState(false)
  const formSectionRef = useRef<HTMLElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()
  const listQuery = useListHolidays({ year })
  const save = useSaveHoliday()
  const disable = useDisableHoliday()
  const sync = useSyncHolidays()

  const nameProblem = holidayNameError(name)
  let visibleProblem: string | null = null
  if (touched) {
    visibleProblem = nameProblem
  }
  const canSave = day !== '' && nameProblem === null && save.isPending === false

  function refresh(message: string) {
    notify.success(message)
    void queryClient.invalidateQueries({ predicate: (query) => isHolidayKey(query.queryKey) })
  }

  function resetForm() {
    setEditingDay(null)
    setDay('')
    setName('')
    setKind('HOLIDAY')
    setTouched(false)
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (canSave === false) {
      return
    }
    const savedDay = editingDay ?? day
    save.mutate(
      { day: savedDay, data: { name: name.trim(), kind } },
      {
        onSuccess: () => {
          resetForm()
          refresh(`Đã lưu ngày ${formatDay(savedDay)}.`)
        },
        onError: (err) => {
          notify.fromError(err, 'adminHolidaySave')
        },
      },
    )
  }

  function startEdit(holiday: HolidayResponse) {
    const targetDay = holiday.day ?? ''
    setEditingDay(targetDay)
    setDay(targetDay)
    setName(holiday.name ?? '')
    setTouched(false)
    if (holiday.kind === 'WORKING_DAY') {
      setKind('WORKING_DAY')
    } else {
      setKind('HOLIDAY')
    }
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(function () {
      nameInputRef.current?.focus()
    }, 150)
  }

  function handleDisable(holiday: HolidayResponse) {
    if (holiday.day === undefined) {
      return
    }
    const target = holiday.day
    disable.mutate(
      { day: target },
      {
        onSuccess: () => {
          if (editingDay === target) {
            resetForm()
          }
          refresh(`Đã bỏ ngày ${formatDay(target)}.`)
        },
        onError: (err) => notify.fromError(err, 'adminHolidaySave'),
      },
    )
  }

  function handleEnable(holiday: HolidayResponse) {
    if (holiday.day === undefined || holiday.name === undefined) {
      return
    }
    const target = holiday.day
    let targetKind: SaveHolidayRequestKind = 'HOLIDAY'
    if (holiday.kind === 'WORKING_DAY') {
      targetKind = 'WORKING_DAY'
    }
    save.mutate(
      { day: target, data: { name: holiday.name, kind: targetKind } },
      {
        onSuccess: () => refresh(`Đã bật lại ngày ${formatDay(target)}.`),
        onError: (err) => notify.fromError(err, 'adminHolidaySave'),
      },
    )
  }

  function handleSync() {
    sync.mutate(
      { params: { year } },
      {
        onSuccess: (response) => {
          refresh(syncResultMessage(takeData(response)))
        },
        onError: (err) => {
          notify.fromError(err, 'adminHolidaySync')
        },
      },
    )
  }

  let syncConfigured = false
  let body: React.ReactNode = <TableRowsSkeleton rows={4} columns={3} />
  let lastSync: HolidaySyncResponse | null | undefined
  if (listQuery.isError) {
    body = (
      <p
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
      >
        {hookErrorMessage('adminHolidays', listQuery.error)}
      </p>
    )
  }
  if (listQuery.isSuccess) {
    const data = takeData(listQuery.data)
    const holidays = data.holidays ?? []
    syncConfigured = data.syncConfigured === true
    lastSync = data.lastSync
    body = (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Năm {year} chưa có ngày nghỉ nào.
      </p>
    )
    if (holidays.length > 0) {
      body = (
        <ul className="space-y-2.5">
          {holidays.map(function (holiday) {
            return (
              <HolidayRow
                key={holiday.day}
                holiday={holiday}
                isEditing={editingDay !== null && editingDay === holiday.day}
                busy={save.isPending || disable.isPending}
                onEdit={() => startEdit(holiday)}
                onDisable={() => handleDisable(holiday)}
                onEnable={() => handleEnable(holiday)}
              />
            )
          })}
        </ul>
      )
    }
  }

  return (
    <AdminShell
      title="Lịch nghỉ lễ"
      description="Quản lý ngày nghỉ lễ ảnh hưởng đến SLA xử lý và giao nhận đơn hàng."
    >
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
        Hạn xử lý đơn hàng không tính Chủ nhật và các ngày nghỉ dưới đây. Ngày "Đi làm bù" được tính
        kể cả khi rơi vào Chủ nhật. Ngày sửa tay luôn được giữ khi đồng bộ.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={PANEL_CLASS}>
          <h2 className="mb-1 text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
            Đồng bộ từ Calendarific
          </h2>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Tự động 03:00 ngày 1 hằng tháng cho năm nay và năm sau. <LastSync lastSync={lastSync} />
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncConfigured === false || sync.isPending}
            className={cn(
              primaryButtonClass(),
              'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <ArrowClockwise size={16} weight="bold" />
            {sync.isPending && <span>Đang đồng bộ…</span>}
            {sync.isPending === false && <span>Đồng bộ năm {year}</span>}
          </button>
          {listQuery.isSuccess && syncConfigured === false && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Server chưa cấu hình CALENDARIFIC_API_KEY nên chưa đồng bộ được.
            </p>
          )}
        </section>

        <section ref={formSectionRef} className={PANEL_CLASS}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
              {editingDay !== null && `Chỉnh sửa ngày ${formatDay(editingDay)}`}
              {editingDay === null && 'Thêm / sửa ngày'}
            </h2>
            {editingDay !== null && (
              <button
                type="button"
                onClick={resetForm}
                className={cn(secondaryButtonClass(), 'px-3 py-1.5 text-xs')}
              >
                <X size={13} weight="bold" />
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          {editingDay !== null && (
            <p className="mb-3 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200">
              Đang chỉnh sửa ngày {formatDay(editingDay)} — ô ngày được khóa để tránh tạo trùng ngày
              mới.
            </p>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              type="date"
              value={day}
              disabled={editingDay !== null}
              onChange={(event) => setDay(event.target.value)}
              aria-label="Ngày"
              className={cn(
                INPUT_CLASS,
                'w-auto py-2 disabled:cursor-not-allowed disabled:opacity-60',
              )}
            />
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              maxLength={NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Tên ngày nghỉ"
              aria-label="Tên ngày nghỉ"
              aria-invalid={visibleProblem !== null}
              className={cn(INPUT_CLASS, 'min-w-0 flex-1 py-2')}
            />
            <select
              value={kind}
              onChange={(event) => {
                if (event.target.value === 'WORKING_DAY') {
                  setKind('WORKING_DAY')
                  return
                }
                setKind('HOLIDAY')
              }}
              aria-label="Loại ngày"
              className={cn(INPUT_CLASS, 'w-auto py-2')}
            >
              <option value="HOLIDAY" className="dark:bg-[#0a0f1e]">
                Nghỉ lễ
              </option>
              <option value="WORKING_DAY" className="dark:bg-[#0a0f1e]">
                Đi làm bù
              </option>
            </select>
            <button
              type="submit"
              disabled={canSave === false}
              className={cn(
                primaryButtonClass(),
                'rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {save.isPending && <span>Đang lưu…</span>}
              {save.isPending === false && editingDay !== null && <span>Cập nhật</span>}
              {save.isPending === false && editingDay === null && <span>Lưu</span>}
            </button>
          </form>
          {visibleProblem !== null && (
            <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
              {visibleProblem}
            </p>
          )}
        </section>
      </div>

      <section className={PANEL_CLASS}>
        <div
          className={cn(segmentedTrackClass(), 'mb-4 w-fit flex-wrap')}
          role="tablist"
          aria-label="Chọn năm"
        >
          {yearOptions(CURRENT_YEAR).map(function (option) {
            const selected = option === year
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSearchParams({ year: String(option) })}
                className={cn(segmentedItemClass(selected), 'cursor-pointer')}
              >
                {option}
              </button>
            )
          })}
        </div>
        {body}
      </section>
    </AdminShell>
  )
}
