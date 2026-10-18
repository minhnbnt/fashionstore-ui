import { useState } from 'react'

import { useCreateBanner, useUpdateBanner } from '@generated/endpoints/admin-banners/admin-banners'

import { hookErrorMessage } from '@/lib/apiAdapters'
import {
  fromLocalInput,
  isSafeLink,
  PLACEMENT_OPTIONS,
  scheduleError,
  toLocalInput,
} from '@/lib/siteContent'

import ContentDialog, { ERROR_CLASS, HINT_CLASS, INPUT_CLASS, LABEL_CLASS } from './ContentDialog'
import ImageUploadField from './ImageUploadField'
import ScheduleFields from './ScheduleFields'

import type { BannerPlacementValue, ScheduleValue } from '@/lib/siteContent'
import type { BannerRequest } from '@generated/model/bannerRequest'
import type { BannerResponse } from '@generated/model/bannerResponse'

interface Props {
  /** null = tạo mới. */
  banner: BannerResponse | null
  defaultPlacement: BannerPlacementValue
  onClose: () => void
  onDone: (message: string) => void
}

function initialPlacement(banner: BannerResponse | null, fallback: BannerPlacementValue) {
  if (banner?.placement === undefined) {
    return fallback
  }
  return banner.placement
}

export default function BannerFormDialog({ banner, defaultPlacement, onClose, onDone }: Props) {
  const [placement, setPlacement] = useState<BannerPlacementValue>(
    initialPlacement(banner, defaultPlacement),
  )
  const [title, setTitle] = useState(banner?.title ?? '')
  const [imageKey, setImageKey] = useState(banner?.imageKey ?? '')
  const [mobileImageKey, setMobileImageKey] = useState(banner?.mobileImageKey ?? '')
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? '')
  const [sortOrder, setSortOrder] = useState(String(banner?.sortOrder ?? 0))
  const [schedule, setSchedule] = useState<ScheduleValue>({
    active: banner?.active ?? true,
    startsAt: toLocalInput(banner?.startsAt),
    endsAt: toLocalInput(banner?.endsAt),
  })
  const [uploading, setUploading] = useState(false)
  const create = useCreateBanner()
  const update = useUpdateBanner()

  const option = PLACEMENT_OPTIONS.find((item) => item.value === placement)
  const linkProblem = isSafeLink(linkUrl.trim()) === false
  const order = Number(sortOrder)
  const orderProblem = Number.isInteger(order) === false || order < 0 || order > 9999
  const canSubmit =
    title.trim() !== '' &&
    imageKey !== '' &&
    linkProblem === false &&
    orderProblem === false &&
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
    const data: BannerRequest = {
      placement,
      title: title.trim(),
      imageKey,
      mobileImageKey: mobileImageKey || undefined,
      linkUrl: linkUrl.trim() || undefined,
      sortOrder: order,
      active: schedule.active,
      startsAt: fromLocalInput(schedule.startsAt) ?? undefined,
      endsAt: fromLocalInput(schedule.endsAt) ?? undefined,
    }
    if (banner?.id === undefined) {
      create.mutate({ data }, { onSuccess: () => onDone(`Đã tạo banner "${data.title}".`) })
      return
    }
    update.mutate(
      { id: banner.id, data },
      { onSuccess: () => onDone(`Đã lưu banner "${data.title}".`) },
    )
  }

  let desktopAspect = 'aspect-[3/1]'
  if (placement === 'HOME_STRIP') {
    desktopAspect = 'aspect-[4/1]'
  }

  let dialogTitle = 'Sửa banner'
  if (banner === null) {
    dialogTitle = 'Thêm banner'
  }

  return (
    <ContentDialog
      title={dialogTitle}
      submitLabel="Lưu banner"
      pendingLabel="Đang lưu…"
      pending={pending}
      canSubmit={canSubmit}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <fieldset>
        <legend className={LABEL_CLASS}>Vị trí</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PLACEMENT_OPTIONS.map(function (item) {
            let itemClass =
              'flex cursor-pointer flex-col gap-0.5 rounded-2xl border border-zinc-200 px-3.5 py-2.5 transition hover:border-indigo-300 dark:border-white/10'
            if (item.value === placement) {
              itemClass =
                'flex cursor-pointer flex-col gap-0.5 rounded-2xl border border-indigo-500 bg-indigo-50 px-3.5 py-2.5 transition dark:bg-indigo-500/10'
            }
            return (
              <label key={item.value} className={itemClass}>
                <span className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="radio"
                    name="placement"
                    checked={item.value === placement}
                    onChange={() => setPlacement(item.value)}
                    className="accent-indigo-600"
                  />
                  {item.label}
                </span>
                <span className="pl-5 text-xs text-zinc-500 dark:text-zinc-400">{item.hint}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className={LABEL_CLASS}>Tên banner</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Sale thu đông -50%"
          className={INPUT_CLASS}
        />
        <span className={HINT_CLASS}>
          Dùng làm mô tả ảnh (alt) cho người dùng trình đọc màn hình.
        </span>
      </label>

      <ImageUploadField
        label="Ảnh desktop"
        hint={option?.hint ?? ''}
        value={imageKey}
        onChange={setImageKey}
        aspectClass={desktopAspect}
        onUploadingChange={setUploading}
      />
      <ImageUploadField
        label="Ảnh mobile"
        hint="Bỏ trống thì mobile dùng ảnh desktop."
        value={mobileImageKey}
        onChange={setMobileImageKey}
        aspectClass="aspect-[4/3] max-w-xs"
        optional
        onUploadingChange={setUploading}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="block">
          <span className={LABEL_CLASS}>Link khi bấm</span>
          <input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            maxLength={500}
            placeholder="/search?q=ao khoac hoặc https://..."
            aria-invalid={linkProblem}
            className={INPUT_CLASS}
          />
          {linkProblem && (
            <span className={ERROR_CLASS}>
              Link phải bắt đầu bằng / hoặc http(s)://, không có khoảng trắng.
            </span>
          )}
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Thứ tự</span>
          <input
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <ScheduleFields value={schedule} onChange={setSchedule} />
    </ContentDialog>
  )
}
