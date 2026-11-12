import { useState } from 'react'

import { Trash, UploadSimple, VideoCamera } from '@phosphor-icons/react'

import { imageUrl } from '@/lib/api/apiAdapters'
import { uploadImage, uploadVideo } from '@/lib/api/uploadImage'

import Modal from '../Modal'

interface Props {
  open: boolean
  orderCode?: string
  isPending?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (payload: { reason: string; description: string; evidenceKeys: string[] }) => void
}

const RETURN_REASONS = [
  { code: 'DAMAGED', label: 'Sản phẩm bị hư hỏng / lỗi' },
  { code: 'WRONG_ITEM', label: 'Giao sai sản phẩm / size / màu' },
  { code: 'NOT_AS_DESCRIBED', label: 'Không đúng mô tả' },
  { code: 'CHANGE_MIND', label: 'Đổi ý / không còn nhu cầu' },
  { code: 'OTHER', label: 'Lý do khác' },
] as const

interface UploadedMedia {
  key: string
  isVideo: boolean
}

export default function ReturnRequestModal(props: Props) {
  const [reason, setReason] = useState<string>('DAMAGED')
  const [description, setDescription] = useState('')
  const [mediaList, setMediaList] = useState<UploadedMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  if (!props.open) {
    return null
  }

  let heading = 'Yêu cầu đổi trả / hoàn tiền'
  if (props.orderCode) {
    heading = `Yêu cầu đổi trả — ${props.orderCode}`
  }

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) {
      return
    }
    setUploading(true)
    setUploadError(null)
    const next: UploadedMedia[] = []
    try {
      for (const file of files) {
        const isVideo = file.type.startsWith('video/')
        let key = ''
        if (isVideo) {
          key = await uploadVideo(file)
        } else {
          key = await uploadImage(file)
        }
        next.push({ key, isVideo })
      }
      setMediaList((prev) => [...prev, ...next])
    } catch (err) {
      if (err instanceof Error) {
        setUploadError(err.message)
      } else {
        setUploadError('Không thể tải tệp bằng chứng lên.')
      }
    } finally {
      setUploading(false)
    }
  }

  function removeMedia(key: string) {
    setMediaList((prev) => prev.filter((item) => item.key !== key))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (uploading) {
      return
    }
    props.onSubmit({
      reason,
      description: description.trim(),
      evidenceKeys: mediaList.map((m) => m.key),
    })
  }

  const displayError = uploadError ?? props.error ?? null

  return (
    <Modal title={heading} onClose={props.onClose} widthClass="max-w-lg">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-zinc-700 dark:text-zinc-200">
            Lý do đổi trả
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white/80 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-600 dark:border-white/15 dark:bg-[#0a0f1e] dark:text-white"
          >
            {RETURN_REASONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-zinc-700 dark:text-zinc-200">
            Mô tả chi tiết
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Mô tả chi tiết tình trạng sản phẩm..."
            className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500"
          />
        </div>

        <div className="space-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10">
            <UploadSimple size={16} weight="bold" />
            <span>Tải ảnh hoặc video mở hộp</span>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => void handleFilesChange(e)}
              className="hidden"
            />
          </label>
          {uploading && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Đang tải tệp bằng chứng…</p>
          )}

          {mediaList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mediaList.map((media) => (
                <div
                  key={media.key}
                  className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-white/15 dark:bg-white/5"
                >
                  {media.isVideo && <VideoCamera size={24} className="text-sky-400" />}
                  {!media.isVideo && (
                    <img
                      src={imageUrl(media.key)}
                      alt="Bằng chứng"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    aria-label="Xóa tệp"
                    onClick={() => removeMedia(media.key)}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {displayError !== null && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200">
            {displayError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={props.isPending || uploading}
            className="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Gửi yêu cầu đổi trả
          </button>
        </div>
      </form>
    </Modal>
  )
}
