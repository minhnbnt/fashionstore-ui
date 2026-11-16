import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'

import { useByImage } from '@generated/endpoints/search/search'
import { ImageSquare, UploadSimple, WarningCircle, X } from '@phosphor-icons/react'

import { imageSearchErrorText } from '@/lib/api/apiAdapters'
import { cn } from '@/lib/ui/styles'

import type { ImageSearchHit } from '@generated/model/imageSearchHit'

const MAX_QUERY_IMAGE_BYTES = 8 * 1024 * 1024

interface Props {
  onResults: (hits: ImageSearchHit[]) => void
  onClear: () => void
}

function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' B'
  }
  if (bytes < 1024 * 1024) {
    return Math.round(bytes / 1024) + ' KB'
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function ImageSearchPanel({ onResults, onClear }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const mutation = useByImage()

  useEffect(
    function () {
      return function () {
        if (previewUrl !== null) {
          URL.revokeObjectURL(previewUrl)
        }
      }
    },
    [previewUrl],
  )

  function accept(candidate: File | undefined): void {
    if (candidate === undefined) {
      return
    }
    if (candidate.type.startsWith('image/') === false || candidate.type === 'image/svg+xml') {
      setFile(null)
      setPreviewUrl(null)
      setError('Chỉ nhận file ảnh.')
      return
    }
    if (candidate.size > MAX_QUERY_IMAGE_BYTES) {
      setFile(null)
      setPreviewUrl(null)
      setError('Ảnh tối đa 8 MB.')
      return
    }
    setFile(candidate)
    setPreviewUrl(URL.createObjectURL(candidate))
    setError(null)
    onClear()
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    accept(e.target.files?.[0])
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLButtonElement>): void {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 1) {
      setError('Chỉ hỗ trợ một ảnh mỗi lần tìm.')
      return
    }
    accept(files[0])
  }

  function clear(): void {
    setFile(null)
    setPreviewUrl(null)
    setError(null)
    onClear()
  }

  async function submit(): Promise<void> {
    if (file === null) {
      return
    }
    setError(null)
    try {
      const response = await mutation.mutateAsync({
        data: { file },
        params: { limit: 20 },
      })
      if (response.status === 200) {
        onResults(response.data.items ?? [])
      }
    } catch (err: unknown) {
      setError(imageSearchErrorText(err))
    }
  }

  let dropzoneClass =
    'flex aspect-4/3 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition md:w-72'
  if (isDragging) {
    dropzoneClass = dropzoneClass + ' border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
  } else {
    dropzoneClass = dropzoneClass + ' border-zinc-300 hover:border-blue-500 dark:border-white/15'
  }

  return (
    <section aria-label="Tìm sản phẩm bằng ảnh" className="glass mt-6 rounded-3xl p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <button
          type="button"
          data-testid="image-dropzone"
          aria-label="Chọn ảnh để tìm sản phẩm giống"
          onClick={function () {
            inputRef.current?.click()
          }}
          onDragOver={function (e) {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={function () {
            setIsDragging(false)
          }}
          onDrop={handleDrop}
          className={cn(dropzoneClass)}
        >
          {previewUrl !== null && file !== null && (
            <img
              src={previewUrl}
              alt="Ảnh đã chọn để tìm"
              className="max-h-48 w-full rounded-xl object-contain"
            />
          )}
          {previewUrl === null && (
            <>
              <UploadSimple size={30} weight="bold" className="text-blue-600 dark:text-sky-300" />
              <span className="mt-2 block text-sm font-bold text-zinc-800 dark:text-white">
                Chọn ảnh hoặc kéo thả vào đây
              </span>
              <span className="mt-1 block text-[11px] text-zinc-500">
                JPG, PNG, WebP · tối đa 8 MB
              </span>
            </>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <ImageSquare size={20} weight="bold" className="text-blue-700 dark:text-sky-300" />
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
              Tìm sản phẩm giống ảnh
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Chụp hoặc chọn một ảnh trang phục. Hệ thống sẽ so sánh ảnh đó với các sản phẩm trong sàn
            và trả về những item giống nhất.
          </p>

          {file !== null && (
            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="truncate text-xs font-bold text-zinc-800 dark:text-white">
                {file.name}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">{fileSizeLabel(file.size)}</p>
            </div>
          )}

          {error !== null && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
            >
              <WarningCircle size={16} weight="fill" className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={file === null || mutation.isPending}
              onClick={function () {
                void submit()
              }}
              className="btn-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-extrabold disabled:opacity-50"
            >
              {mutation.isPending && <span aria-hidden="true">…</span>}
              Tìm sản phẩm giống ảnh
            </button>
            {file !== null && (
              <button
                type="button"
                onClick={clear}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300"
              >
                <X size={14} weight="bold" />
                Xóa ảnh
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </section>
  )
}
