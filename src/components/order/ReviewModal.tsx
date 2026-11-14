import { useState } from 'react'

import { Camera, Star, VideoCamera, X } from '@phosphor-icons/react'

import { imageUrl } from '@/lib/api/apiAdapters'
import { uploadImage, uploadVideo } from '@/lib/api/uploadImage'
import {
  MAX_REVIEW_COMMENT_LENGTH,
  MAX_REVIEW_IMAGES,
  MAX_REVIEW_VIDEO_SECONDS,
  MIN_REVIEW_COMMENT_LENGTH,
  REVIEW_QUICK_TAGS,
  maskDisplayNamePreview,
} from '@/lib/review/reviewConstants'

import Modal from '../Modal'

import type { ReviewResponse } from '@generated/model/reviewResponse'

export interface ReviewSubmitPayload {
  stars: number
  comment: string
  imageKeys: string[]
  videoKey: string | null
  tags: string[]
  anonymous: boolean
}

interface Props {
  open: boolean
  productName: string
  variantLabel?: string | null
  reviewerName?: string
  existingReview?: ReviewResponse | null
  isPending?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (payload: ReviewSubmitPayload) => void
}

function starIconWeight(star: number, selected: number): 'fill' | 'regular' {
  if (star <= selected) {
    return 'fill'
  }
  return 'regular'
}

function starLabelText(stars: number): string {
  if (stars === 1) {
    return 'Rất tệ'
  }
  if (stars === 2) {
    return 'Không hài lòng'
  }
  if (stars === 3) {
    return 'Bình thường'
  }
  if (stars === 4) {
    return 'Hài lòng'
  }
  return 'Tuyệt vời'
}

export default function ReviewModal(props: Props) {
  const existing = props.existingReview ?? null
  const [stars, setStars] = useState<number>(existing?.stars ?? 5)
  const [comment, setComment] = useState<string>(existing?.comment ?? '')
  const [imageKeys, setImageKeys] = useState<string[]>(existing?.imageKeys ?? [])
  const [videoKey, setVideoKey] = useState<string | null>(existing?.videoKey ?? null)
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [anonymous, setAnonymous] = useState<boolean>(existing?.anonymous ?? false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  if (!props.open) {
    return null
  }

  const isEditLocked = existing !== null && Boolean(existing.edited)
  const isEditing = existing !== null && !isEditLocked
  const displayVariant = props.variantLabel ?? existing?.variantLabel ?? null

  let title = `Đánh giá ${props.productName}`
  if (isEditing) {
    title = `Chỉnh sửa đánh giá — ${props.productName}`
  }

  const trimmedComment = comment.trim()
  const remainingChars = MIN_REVIEW_COMMENT_LENGTH - trimmedComment.length
  const maskedPreview = maskDisplayNamePreview(
    existing?.buyerDisplayName ?? props.reviewerName ?? 'Người mua',
  )
  let previewDisplayName = existing?.buyerDisplayName ?? props.reviewerName ?? 'Tên thật của bạn'
  if (anonymous) {
    previewDisplayName = maskedPreview
  }
  let uploadButtonLabel = 'Thêm ảnh/video thực tế'
  if (uploading) {
    uploadButtonLabel = 'Đang tải...'
  }
  let videoCount = 0
  if (videoKey !== null) {
    videoCount = 1
  }

  function toggleTag(tag: string) {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag))
      return
    }
    setTags([...tags, tag])
  }

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    e.target.value = ''
    if (!fileList || fileList.length === 0) {
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const nextImages = [...imageKeys]
      let nextVideo = videoKey

      for (const file of Array.from(fileList)) {
        if (file.type.startsWith('image/')) {
          if (nextImages.length >= MAX_REVIEW_IMAGES) {
            setUploadError(`Tối đa ${MAX_REVIEW_IMAGES} ảnh cho mỗi đánh giá.`)
            continue
          }
          const key = await uploadImage(file)
          nextImages.push(key)
        } else if (file.type.startsWith('video/')) {
          if (nextVideo !== null) {
            setUploadError('Mỗi đánh giá chỉ được đính kèm tối đa 1 video.')
            continue
          }
          nextVideo = await uploadVideo(file, MAX_REVIEW_VIDEO_SECONDS)
        } else {
          setUploadError('Chỉ hỗ trợ tải lên tệp ảnh hoặc video.')
        }
      }

      setImageKeys(nextImages)
      setVideoKey(nextVideo)
    } catch (err) {
      if (err instanceof Error) {
        setUploadError(err.message)
      } else {
        setUploadError('Tải tệp lên thất bại, vui lòng thử lại.')
      }
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEditLocked || uploading) {
      return
    }
    if (trimmedComment.length < MIN_REVIEW_COMMENT_LENGTH) {
      setValidationError(
        `Vui lòng nhập nhận xét chi tiết tối thiểu ${MIN_REVIEW_COMMENT_LENGTH} ký tự.`,
      )
      return
    }
    setValidationError(null)
    props.onSubmit({
      stars,
      comment: trimmedComment,
      imageKeys,
      videoKey,
      tags,
      anonymous,
    })
  }

  const combinedError = validationError ?? uploadError ?? props.error ?? null

  return (
    <Modal title={title} onClose={props.onClose} widthClass="max-w-lg">
      <div className="mt-4 space-y-4">
        {Boolean(displayVariant) && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1 text-xs font-semibold text-blue-800 dark:border-white/10 dark:bg-white/10 dark:text-sky-200">
            <span>Phân loại đã mua:</span>
            <span className="font-bold">{displayVariant}</span>
          </div>
        )}

        {isEditing && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
            Lưu ý: Bạn chỉ được chỉnh sửa đánh giá này 1 lần duy nhất.
          </p>
        )}

        {isEditLocked && (
          <div className="space-y-3 rounded-2xl border border-sky-100 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
            <p className="font-semibold text-zinc-700 dark:text-zinc-200">
              Bạn đã sử dụng hết lượt chỉnh sửa cho đánh giá này.
            </p>
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={18} weight={starIconWeight(n, existing.stars ?? 5)} />
              ))}
            </div>
            {Boolean(existing.comment) && (
              <p className="text-zinc-600 dark:text-zinc-300">{existing.comment}</p>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 dark:border-white/15 dark:text-zinc-200"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {!isEditLocked && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} sao`}
                    onClick={() => setStars(n)}
                    className="text-amber-400 transition hover:scale-110"
                  >
                    <Star size={28} weight={starIconWeight(n, stars)} />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-300">
                {starLabelText(stars)}
              </span>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                Tag đánh giá nhanh
              </p>
              <div className="flex flex-wrap gap-2">
                {REVIEW_QUICK_TAGS.map((tag) => {
                  const selected = tags.includes(tag)
                  let chipClass =
                    'rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-blue-400 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200'
                  if (selected) {
                    chipClass =
                      'rounded-full border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-200'
                  }
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTag(tag)}
                      className={chipClass}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value)
                  if (
                    validationError !== null &&
                    e.target.value.trim().length >= MIN_REVIEW_COMMENT_LENGTH
                  ) {
                    setValidationError(null)
                  }
                }}
                rows={4}
                maxLength={MAX_REVIEW_COMMENT_LENGTH}
                placeholder="Chia sẻ trải nghiệm thực tế về chất lượng, form dáng, giao hàng (tối thiểu 10 ký tự)..."
                className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500"
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span>
                  {remainingChars > 0 && (
                    <span className="font-semibold text-amber-600 dark:text-amber-300">
                      Cần thêm {remainingChars} ký tự nữa (tối thiểu {MIN_REVIEW_COMMENT_LENGTH})
                    </span>
                  )}
                  {remainingChars <= 0 && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                      Đủ độ dài nhận xét tối thiểu
                    </span>
                  )}
                </span>
                <span className="text-zinc-400">
                  {comment.length} / {MAX_REVIEW_COMMENT_LENGTH}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-sky-200 bg-sky-50/70 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-sky-100/70 dark:border-white/15 dark:bg-white/10 dark:text-sky-200">
                  <Camera size={15} weight="bold" />
                  <VideoCamera size={15} weight="bold" />
                  <span>{uploadButtonLabel}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    disabled={uploading}
                    onChange={(e) => void handleFilesChange(e)}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {imageKeys.length}/{MAX_REVIEW_IMAGES} ảnh · {videoCount}/1 video (≤{' '}
                  {MAX_REVIEW_VIDEO_SECONDS}s)
                </span>
              </div>

              {(imageKeys.length > 0 || videoKey !== null) && (
                <div className="flex flex-wrap gap-2.5">
                  {imageKeys.map((key) => (
                    <div
                      key={key}
                      className="relative h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/15"
                    >
                      <img
                        src={imageUrl(key)}
                        alt="Ảnh đánh giá"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label="Xóa ảnh"
                        onClick={() => setImageKeys(imageKeys.filter((k) => k !== key))}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                      >
                        <X size={11} weight="bold" />
                      </button>
                    </div>
                  ))}
                  {videoKey !== null && (
                    <div className="relative h-16 w-28 overflow-hidden rounded-2xl border border-zinc-200 bg-black dark:border-white/15">
                      <video
                        src={imageUrl(videoKey)}
                        controls
                        className="h-full w-full object-cover"
                      >
                        <track kind="captions" />
                      </video>
                      <button
                        type="button"
                        aria-label="Xóa video"
                        onClick={() => setVideoKey(null)}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                      >
                        <X size={11} weight="bold" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-3.5 py-2.5 text-xs dark:border-white/10 dark:bg-white/5">
              <div>
                <p className="font-bold text-zinc-800 dark:text-zinc-100">
                  Ẩn danh tên khi đánh giá
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Tên hiển thị công khai:{' '}
                  <span className="font-semibold">{previewDisplayName}</span>
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Ẩn danh tên khi đánh giá"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
            </label>

            {Boolean(combinedError) && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200">
                {combinedError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 dark:border-white/15 dark:text-zinc-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={props.isPending || uploading}
                className="btn-primary rounded-full px-5 py-2 text-xs font-bold disabled:opacity-50"
              >
                {isEditing && 'Lưu chỉnh sửa'}
                {!isEditing && 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
