import { useRef, useState } from 'react'

import { SpinnerGap, Trash, UploadSimple, VideoCamera } from '@phosphor-icons/react'

import Modal from '@/components/Modal'
import { imageUrl } from '@/lib/apiAdapters'
import { checkVideoDuration, uploadVideo } from '@/lib/uploadImage'

import type { DecorationBlock } from '@/types/seller'

interface VideoConfigModalProps {
  block: DecorationBlock
  isOpen: boolean
  onClose: () => void
  onSave: (updated: DecorationBlock) => void
}

/** Cùng giới hạn với video sản phẩm (ProductMediaUploader). */
const MAX_VIDEO_SECONDS = 60

/** Cấu hình block VIDEO: tiêu đề + một video upload qua presign (≤ 50 MB, ≤ 60s). */
export default function VideoConfigModal({
  block,
  isOpen,
  onClose,
  onSave,
}: VideoConfigModalProps) {
  const [title, setTitle] = useState(block.title)
  const [videoKey, setVideoKey] = useState<string | null>(block.videoKey ?? null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) {
    return null
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) {
      return
    }
    setError(null)
    setIsUploading(true)
    try {
      await checkVideoDuration(file, MAX_VIDEO_SECONDS)
      const key = await uploadVideo(file)
      setVideoKey(key)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được video, thử lại sau.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = () => {
    onSave({
      ...block,
      title,
      // videoKey: undefined → JSON.stringify bỏ field, block trở lại trạng thái chưa có video
      videoKey: videoKey ?? undefined,
    })
    onClose()
  }

  return (
    <Modal title="Cấu hình Video trải nghiệm" onClose={onClose} widthClass="max-w-md">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="videoBlockTitle"
            className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
          >
            Tiêu đề khối
          </label>
          <input
            id="videoBlockTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            placeholder="Ví dụ: Video giới thiệu, Đằng sau xưởng may..."
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              Video ({MAX_VIDEO_SECONDS}s, tối đa 50 MB)
            </span>
            {videoKey !== null && (
              <button
                type="button"
                onClick={function () {
                  setVideoKey(null)
                  setError(null)
                }}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash size={12} />
                Gỡ video
              </button>
            )}
          </div>

          {videoKey === null ? (
            <button
              type="button"
              disabled={isUploading}
              onClick={function () {
                inputRef.current?.click()
              }}
              className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              {isUploading ? (
                <SpinnerGap size={20} weight="bold" className="animate-spin text-indigo-500" />
              ) : (
                <UploadSimple size={20} weight="bold" />
              )}
              {isUploading ? 'Đang tải video lên S3...' : 'Chọn video từ thiết bị'}
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-black dark:border-white/10">
              {isUploading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white backdrop-blur-xs">
                  <SpinnerGap size={22} weight="bold" className="animate-spin text-indigo-400" />
                </div>
              )}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- video do merchant tự upload, không có file phụ đề để gắn track */}
              <video
                key={videoKey}
                src={imageUrl(videoKey)}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full object-contain"
              />
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={(e) => {
              void handleFile(e)
            }}
            className="hidden"
          />

          {error !== null && (
            <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <p className="flex items-start gap-1.5 rounded-lg bg-sky-50 p-2 text-[11px] text-zinc-500 dark:bg-sky-950/20 dark:text-zinc-400">
          <VideoCamera size={13} className="mt-0.5 shrink-0 text-sky-600" />
          Video hiển thị trên trang chủ gian hàng. Buyer bấm phát, stream thẳng từ S3 — không ảnh
          hưởng tốc độ tải trang.
        </p>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="btn-primary rounded-full px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </Modal>
  )
}
