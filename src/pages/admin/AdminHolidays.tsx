import { useState } from 'react'
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
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminShell from '@/components/admin/AdminShell'
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
import { cn, PANEL_CLASS, segmentedItemClass, segmentedTrackClass } from '@/lib/ui/styles'

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
      <span className="text-red-600 dark:text-red-400">
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
  onEdit,
  onDisable,
  onEnable,
  busy,
}: {
  holiday: HolidayResponse
  onEdit: () => void
  onDisable: () => void
  onEnable: () => void
  busy: boolean
}) {
  const disabled = holiday.enabled === false
  let rowClass =
    'flex flex-col gap-3 rounded-2xl bg-white/70 p-3 sm:flex-row sm:items-center dark:bg-white/5'
  if (disabled) {
    rowClass =
      'flex flex-col gap-3 rounded-2xl bg-white/40 p-3 opacity-70 sm:flex-row sm:items-center dark:bg-white/5'
  }
  const actionClass =
    'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50'

  return (
    <li className={rowClass}>
      <div className="w-32 shrink-0">
        <p className="text-sm font-bold tabular-nums">{formatDay(holiday.day)}</p>
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
          className={`${actionClass} border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10`}
        >
          <PencilSimple size={14} weight="bold" />
          Sửa
        </button>
        {disabled === false && (
          <button
            type="button"
            onClick={onDisable}
            disabled={busy}
            className={`${actionClass} border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10`}
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
            className={`${actionClass} border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10`}
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

  const [day, setDay] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SaveHolidayRequestKind>('HOLIDAY')
  const [touched, setTouched] = useState(false)
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
    const savedDay = day
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
    setDay(holiday.day ?? '')
    setName(holiday.name ?? '')
    setTouched(false)
    if (holiday.kind === 'WORKING_DAY') {
      setKind('WORKING_DAY')
      return
    }
    setKind('HOLIDAY')
  }

  function handleDisable(holiday: HolidayResponse) {
    if (holiday.day === undefined) {
      return
    }
    const target = holiday.day
    disable.mutate(
      { day: target },
      {
        onSuccess: () => refresh(`Đã bỏ ngày ${formatDay(target)}.`),
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
  let body = (
    <div className="space-y-2" aria-busy="true">
      {[0, 1, 2].map(function (index) {
        return (
          <div
            key={index}
            className="h-[64px] animate-pulse rounded-2xl bg-white/60 dark:bg-white/5"
          />
        )
      })}
    </div>
  )
  let lastSync: HolidaySyncResponse | null | undefined
  if (listQuery.isError) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">
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
        <ul className="space-y-2">
          {holidays.map(function (holiday) {
            return (
              <HolidayRow
                key={holiday.day}
                holiday={holiday}
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

  const inputClass =
    'rounded-full border border-zinc-300 bg-white/80 px-4 py-2 text-sm text-[#17203a] placeholder:text-zinc-400 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus:border-sky-400'

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
          <h2 className="mb-1 text-sm font-bold">Đồng bộ từ Calendarific</h2>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Tự động 03:00 ngày 1 hằng tháng cho năm nay và năm sau. <LastSync lastSync={lastSync} />
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncConfigured === false || sync.isPending}
            className="btn-primary flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
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

        <section className={PANEL_CLASS}>
          <h2 className="mb-3 text-sm font-bold">Thêm / sửa ngày</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              type="date"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              aria-label="Ngày"
              className={inputClass}
            />
            <input
              type="text"
              value={name}
              maxLength={NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Tên ngày nghỉ"
              aria-label="Tên ngày nghỉ"
              aria-invalid={visibleProblem !== null}
              className={`${inputClass} min-w-0 flex-1`}
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
              className={inputClass}
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
              className="btn-primary cursor-pointer rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {save.isPending && <span>Đang lưu…</span>}
              {save.isPending === false && <span>Lưu</span>}
            </button>
          </form>
          {visibleProblem !== null && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{visibleProblem}</p>
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
