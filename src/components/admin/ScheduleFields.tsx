import { scheduleError } from '@/lib/siteContent'

import { ERROR_CLASS, HINT_CLASS, INPUT_CLASS, LABEL_CLASS } from './ContentDialog'

import type { ScheduleValue } from '@/lib/siteContent'

/** Bật/tắt + khung giờ chạy dùng chung cho banner và popup. */
export default function ScheduleFields({
  value,
  onChange,
}: {
  value: ScheduleValue
  onChange: (next: ScheduleValue) => void
}) {
  const problem = scheduleError(value)
  return (
    <fieldset className="space-y-3 rounded-2xl bg-zinc-50 p-4 dark:bg-white/5">
      <legend className="sr-only">Lịch hiển thị</legend>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={value.active}
          onChange={(event) => onChange({ ...value, active: event.target.checked })}
          className="h-4 w-4 accent-indigo-600"
        />
        Bật hiển thị
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>
          <span className={LABEL_CLASS}>Bắt đầu</span>
          <input
            type="datetime-local"
            value={value.startsAt}
            onChange={(event) => onChange({ ...value, startsAt: event.target.value })}
            className={INPUT_CLASS}
          />
        </label>
        <label>
          <span className={LABEL_CLASS}>Kết thúc</span>
          <input
            type="datetime-local"
            value={value.endsAt}
            onChange={(event) => onChange({ ...value, endsAt: event.target.value })}
            className={INPUT_CLASS}
          />
        </label>
      </div>
      <p className={HINT_CLASS}>Bỏ trống "Bắt đầu" = chạy ngay, bỏ trống "Kết thúc" = không hạn.</p>
      {problem !== null && <p className={ERROR_CLASS}>{problem}</p>}
    </fieldset>
  )
}
