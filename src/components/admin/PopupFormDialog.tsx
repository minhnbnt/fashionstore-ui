import { useState } from 'react'

import { useCreatePopup, useUpdatePopup } from '@generated/endpoints/admin-popups/admin-popups'

import { hookErrorMessage } from '@/lib/apiAdapters'
import {
  AUDIENCE_OPTIONS,
  FREQUENCY_OPTIONS,
  fromLocalInput,
  isSafeLink,
  scheduleError,
  toLocalInput,
} from '@/lib/siteContent'

import ContentDialog, {
  ERROR_CLASS,
  HINT_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  TEXTAREA_CLASS,
} from './ContentDialog'
import ImageUploadField from './ImageUploadField'
import ScheduleFields from './ScheduleFields'

import type { PopupAudienceValue, PopupFrequencyValue, ScheduleValue } from '@/lib/siteContent'
import type { PopupRequest } from '@generated/model/popupRequest'
import type { PopupResponse } from '@generated/model/popupResponse'

interface Props {
  /** null = tạo mới. */
  popup: PopupResponse | null
  onClose: () => void
  onDone: (message: string) => void
}

function inRange(raw: string, min: number, max: number): boolean {
  const value = Number(raw)
  return Number.isInteger(value) && value >= min && value <= max
}

export default function PopupFormDialog({ popup, onClose, onDone }: Props) {
  const [name, setName] = useState(popup?.name ?? '')
  const [title, setTitle] = useState(popup?.title ?? '')
  const [body, setBody] = useState(popup?.body ?? '')
  const [imageKey, setImageKey] = useState(popup?.imageKey ?? '')
  const [ctaLabel, setCtaLabel] = useState(popup?.ctaLabel ?? '')
  const [linkUrl, setLinkUrl] = useState(popup?.linkUrl ?? '')
  const [audience, setAudience] = useState<PopupAudienceValue>(popup?.audience ?? 'ALL')
  const [frequency, setFrequency] = useState<PopupFrequencyValue>(
    popup?.frequency ?? 'ONCE_PER_DAY',
  )
  const [delaySeconds, setDelaySeconds] = useState(String(popup?.delaySeconds ?? 2))
  const [priority, setPriority] = useState(String(popup?.priority ?? 0))
  const [schedule, setSchedule] = useState<ScheduleValue>({
    active: popup?.active ?? true,
    startsAt: toLocalInput(popup?.startsAt),
    endsAt: toLocalInput(popup?.endsAt),
  })
  const [uploading, setUploading] = useState(false)
  const create = useCreatePopup()
  const update = useUpdatePopup()

  const contentProblem = title.trim() === '' && imageKey === ''
  const linkProblem = isSafeLink(linkUrl.trim()) === false
  const canSubmit =
    name.trim() !== '' &&
    contentProblem === false &&
    linkProblem === false &&
    inRange(delaySeconds, 0, 60) &&
    inRange(priority, 0, 1000) &&
    scheduleError(schedule) === null &&
    uploading === false
  const pending = create.isPending || update.isPending

  let error: string | null = null
  if (create.isError) {
    error = hookErrorMessage('adminContent', create.error)
  }
  if (update.isError) {
    error = hookErrorMessage('adminContent', update.error)
  }

  function handleSubmit() {
    if (canSubmit === false) {
      return
    }
    const data: PopupRequest = {
      name: name.trim(),
      title: title.trim() || undefined,
      body: body.trim() || undefined,
      imageKey: imageKey || undefined,
      ctaLabel: ctaLabel.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      audience,
      frequency,
      delaySeconds: Number(delaySeconds),
      priority: Number(priority),
      active: schedule.active,
      startsAt: fromLocalInput(schedule.startsAt) ?? undefined,
      endsAt: fromLocalInput(schedule.endsAt) ?? undefined,
    }
    if (popup?.id === undefined) {
      create.mutate({ data }, { onSuccess: () => onDone(`Đã tạo popup "${data.name}".`) })
      return
    }
    update.mutate(
      { id: popup.id, data },
      { onSuccess: () => onDone(`Đã lưu popup "${data.name}".`) },
    )
  }

  let dialogTitle = 'Sửa popup'
  if (popup === null) {
    dialogTitle = 'Thêm popup'
  }

  return (
    <ContentDialog
      title={dialogTitle}
      submitLabel="Lưu popup"
      pendingLabel="Đang lưu…"
      pending={pending}
      canSubmit={canSubmit}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <label className="block">
        <span className={LABEL_CLASS}>Tên nội bộ</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          placeholder="Popup 11.11"
          className={INPUT_CLASS}
        />
        <span className={HINT_CLASS}>Chỉ admin thấy, để phân biệt các popup.</span>
      </label>

      <ImageUploadField
        label="Ảnh popup"
        hint="Ảnh vuông 800×800. Bấm vào ảnh sẽ đi tới link."
        value={imageKey}
        onChange={setImageKey}
        aspectClass="aspect-square max-w-[220px]"
        optional
        onUploadingChange={setUploading}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL_CLASS}>Tiêu đề</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Giảm 50% toàn sàn"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Chữ trên nút</span>
          <input
            value={ctaLabel}
            onChange={(event) => setCtaLabel(event.target.value)}
            maxLength={40}
            placeholder="Mua ngay"
            className={INPUT_CLASS}
          />
        </label>
      </div>
      {contentProblem && <p className={ERROR_CLASS}>Popup cần có ảnh hoặc tiêu đề.</p>}

      <label className="block">
        <span className={LABEL_CLASS}>Mô tả ngắn</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={500}
          rows={2}
          className={`${TEXTAREA_CLASS} resize-y`}
        />
      </label>

      <label className="block">
        <span className={LABEL_CLASS}>Link</span>
        <input
          value={linkUrl}
          onChange={(event) => setLinkUrl(event.target.value)}
          maxLength={500}
          placeholder="/search?q=sale"
          aria-invalid={linkProblem}
          className={INPUT_CLASS}
        />
        {linkProblem && (
          <span className={ERROR_CLASS}>
            Link phải bắt đầu bằng / hoặc http(s)://, không có khoảng trắng.
          </span>
        )}
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL_CLASS}>Ai thấy</span>
          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value as PopupAudienceValue)}
            className={INPUT_CLASS}
          >
            {AUDIENCE_OPTIONS.map(function (option) {
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              )
            })}
          </select>
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Tần suất</span>
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as PopupFrequencyValue)}
            className={INPUT_CLASS}
          >
            {FREQUENCY_OPTIONS.map(function (option) {
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              )
            })}
          </select>
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Hiện sau (giây)</span>
          <input
            type="number"
            min={0}
            max={60}
            value={delaySeconds}
            onChange={(event) => setDelaySeconds(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Ưu tiên</span>
          <input
            type="number"
            min={0}
            max={1000}
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className={INPUT_CLASS}
          />
          <span className={HINT_CLASS}>Nhiều popup cùng chạy thì số lớn hơn được hiện.</span>
        </label>
      </div>

      <ScheduleFields value={schedule} onChange={setSchedule} />
    </ContentDialog>
  )
}
