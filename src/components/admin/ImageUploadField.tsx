import { useId, useState } from 'react'

import { ImageSquare, Trash, UploadSimple } from '@phosphor-icons/react'

import { imageUrl } from '@/lib/apiAdapters'
import { uploadImage } from '@/lib/uploadImage'

import { ERROR_CLASS, HINT_CLASS, LABEL_CLASS } from './ContentDialog'

interface Props {
  label: string
  hint: string
  value: string
  onChange: (key: string) => void
  /** Tỉ lệ khung xem trước, ví dụ "aspect-[3/1]". */
  aspectClass: string
  optional?: boolean
  onUploadingChange?: (uploading: boolean) => void
}

/** Chọn ảnh → presign → PUT S3 → giữ S3 key. Xem trước theo đúng tỉ lệ hiển thị. */
export default function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  aspectClass,
  optional = false,
  onUploadingChange,
}: Props) {
  const inputId = useId()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setBusy(busy: boolean) {
    setUploading(busy)
    onUploadingChange?.(busy)
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) {
      return
    }
    setError(null)
    setBusy(true)
    try {
      onChange(await uploadImage(file))
    } catch (problem) {
      let message = 'Upload ảnh thất bại, thử lại sau.'
      if (problem instanceof Error && problem.message !== '') {
        message = problem.message
      }
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  let uploadLabel = 'Chọn ảnh'
  if (value !== '') {
    uploadLabel = 'Đổi ảnh'
  }
  if (uploading) {
    uploadLabel = 'Đang tải lên…'
  }

  return (
    <div>
      <p className={LABEL_CLASS}>
        {label}
        {optional && <span className="font-normal text-zinc-500"> (không bắt buộc)</span>}
      </p>
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-white/15 dark:bg-white/5 ${aspectClass}`}
      >
        {value !== '' && (
          <img
            src={imageUrl(value)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {value === '' && <ImageSquare size={32} className="text-zinc-400" />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/10"
        >
          <UploadSimple size={14} weight="bold" />
          {uploadLabel}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => void handleFile(event)}
          disabled={uploading}
          className="sr-only"
        />
        {optional && value !== '' && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Trash size={14} weight="bold" />
            Bỏ ảnh
          </button>
        )}
      </div>
      <p className={HINT_CLASS}>{hint}</p>
      {error !== null && <p className={ERROR_CLASS}>{error}</p>}
    </div>
  )
}
