import { useState, useRef, type ChangeEvent } from 'react'

import {
  UploadSimple,
  Trash,
  ArrowLeft,
  ArrowRight,
  VideoCamera,
  TShirt,
  Sparkle,
  WarningCircle,
  SpinnerGap,
  PlayCircle,
} from '@phosphor-icons/react'

import { imageUrl } from '@/lib/apiAdapters'
import { uploadImage, uploadVideo } from '@/lib/uploadImage'

interface Props {
  images: string[]
  onImagesChange: (images: string[]) => void
  videoKey: string | null
  onVideoChange: (videoKey: string | null) => void
  tryOnEnabled: boolean
  onTryOnToggle: (enabled: boolean) => void
  garmentKey: string | null
  onGarmentChange: (garmentKey: string | null) => void
}

export default function ProductMediaUploader({
  images,
  onImagesChange,
  videoKey,
  onVideoChange,
  tryOnEnabled,
  onTryOnToggle,
  garmentKey,
  onGarmentChange,
}: Props) {
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [isUploadingGarment, setIsUploadingGarment] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const garmentInputRef = useRef<HTMLInputElement>(null)

  async function handleImageFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files === null || files.length === 0) {
      return
    }

    if (images.length + files.length > 9) {
      setErrorMessage('Sản phẩm chỉ được tải lên tối đa 9 ảnh.')
      e.target.value = ''
      return
    }

    setIsUploadingImages(true)
    setErrorMessage(null)

    try {
      const uploadPromises: Promise<string>[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file !== undefined) {
          uploadPromises.push(uploadImage(file))
        }
      }
      const uploadedKeys = await Promise.all(uploadPromises)
      onImagesChange([...images, ...uploadedKeys])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload ảnh thất bại.'
      setErrorMessage(msg)
    } finally {
      setIsUploadingImages(false)
      e.target.value = ''
    }
  }

  function handleMoveImage(index: number, direction: 'left' | 'right') {
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= images.length) {
      return
    }
    const updated = [...images]
    const temp = updated[index]
    const targetItem = updated[targetIndex]
    if (temp !== undefined && targetItem !== undefined) {
      updated[index] = targetItem
      updated[targetIndex] = temp
      onImagesChange(updated)
    }
  }

  function handleRemoveImage(index: number) {
    onImagesChange(images.filter((_, i) => i !== index))
  }

  async function handleVideoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file === undefined) {
      return
    }

    setIsUploadingVideo(true)
    setErrorMessage(null)

    try {
      const key = await uploadVideo(file)
      onVideoChange(key)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload video thất bại.'
      setErrorMessage(msg)
    } finally {
      setIsUploadingVideo(false)
      e.target.value = ''
    }
  }

  async function handleGarmentFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file === undefined) {
      return
    }

    setIsUploadingGarment(true)
    setErrorMessage(null)

    try {
      const key = await uploadImage(file)
      onGarmentChange(key)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload ảnh garment thất bại.'
      setErrorMessage(msg)
    } finally {
      setIsUploadingGarment(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {errorMessage !== null && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          <WarningCircle size={18} weight="fill" className="shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* A. Upload ảnh sản phẩm (3 - 9 ảnh) */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
                Ảnh sản phẩm (Gallery)
              </h3>
              <span className="text-red-500 font-bold">*</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {images.length}/9 ảnh
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Tối thiểu 3 ảnh, tối đa 9 ảnh. Kéo hoặc dùng nút mũi tên để đổi thứ tự. Ảnh đầu tiên là{' '}
              <strong className="text-orange-600 dark:text-orange-400">Ảnh đại diện (Cover)</strong>.
            </p>
          </div>

          <button
            type="button"
            disabled={images.length >= 9 || isUploadingImages}
            onClick={function () {
              imageInputRef.current?.click()
            }}
            className="flex items-center gap-1.5 rounded-2xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700 disabled:opacity-50"
          >
            {isUploadingImages && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
            {isUploadingImages === false && <UploadSimple size={14} weight="bold" />}
            Thêm ảnh ({images.length}/9)
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              void handleImageFiles(e)
            }}
            className="hidden"
          />
        </div>

        {images.length < 3 && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-300">
            <WarningCircle size={16} weight="fill" className="shrink-0 text-amber-500" />
            <span>
              Chưa đủ số lượng ảnh tối thiểu! Vui lòng tải lên thêm ít nhất {3 - images.length} ảnh nữa.
            </span>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {images.map(function (key, index) {
            return (
              <div
                key={key}
                className="group relative flex aspect-3/4 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 transition dark:border-zinc-800 dark:bg-zinc-950"
              >
                <img
                  src={imageUrl(key)}
                  alt={`Sản phẩm ${index + 1}`}
                  className="h-full w-full object-cover"
                />

                {/* Cover badge for index 0 */}
                {index === 0 && (
                  <span className="absolute top-2 left-2 rounded-lg bg-orange-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                    Ảnh bìa (Cover)
                  </span>
                )}

                {/* Controls overlay */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 p-1.5 opacity-90 transition group-hover:opacity-100">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={function () {
                        handleMoveImage(index, 'left')
                      }}
                      title="Chuyển sang trái"
                      className="rounded-md bg-white/20 p-1 text-white hover:bg-white/40 disabled:opacity-20"
                    >
                      <ArrowLeft size={12} weight="bold" />
                    </button>
                    <button
                      type="button"
                      disabled={index === images.length - 1}
                      onClick={function () {
                        handleMoveImage(index, 'right')
                      }}
                      title="Chuyển sang phải"
                      className="rounded-md bg-white/20 p-1 text-white hover:bg-white/40 disabled:opacity-20"
                    >
                      <ArrowRight size={12} weight="bold" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={function () {
                      handleRemoveImage(index)
                    }}
                    title="Xóa ảnh này"
                    className="rounded-md bg-red-600/80 p-1 text-white hover:bg-red-600"
                  >
                    <Trash size={12} weight="bold" />
                  </button>
                </div>
              </div>
            )
          })}

          {images.length < 9 && (
            <button
              type="button"
              onClick={function () {
                imageInputRef.current?.click()
              }}
              className="flex aspect-3/4 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-400 transition hover:border-orange-500 hover:text-orange-500 dark:border-zinc-800 dark:hover:border-orange-400"
            >
              <UploadSimple size={24} weight="bold" />
              <span className="mt-2 text-xs font-semibold">Tải thêm ảnh</span>
              <span className="text-[10px] text-zinc-400">Tối đa 5MB / ảnh</span>
            </button>
          )}
        </div>
      </div>

      {/* B. Video sản phẩm (Tối đa 1 video, <= 60s) */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <VideoCamera size={18} weight="bold" className="text-orange-600 dark:text-orange-400" />
              <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
                Video giới thiệu sản phẩm (Tùy chọn)
              </h3>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Tối đa 1 video, thời lượng không quá 60 giây. Giúp tăng tỷ lệ chốt đơn tới 40%.
            </p>
          </div>

          {videoKey === null && (
            <button
              type="button"
              disabled={isUploadingVideo}
              onClick={function () {
                videoInputRef.current?.click()
              }}
              className="flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {isUploadingVideo && <SpinnerGap size={14} weight="bold" className="animate-spin" />}
              {isUploadingVideo === false && <VideoCamera size={14} weight="bold" />}
              Tải video lên (≤ 60s)
            </button>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => {
              void handleVideoFile(e)
            }}
            className="hidden"
          />
        </div>

        {videoKey !== null && (
          <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative aspect-video w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-black dark:border-zinc-800">
              <video
                src={imageUrl(videoKey)}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <PlayCircle size={16} weight="fill" />
                <span>Video hợp lệ (thời lượng ≤ 60s)</span>
              </div>
              <p className="text-[11px] text-zinc-500">Video đã được upload lên hệ thống S3 an toàn.</p>
              <button
                type="button"
                onClick={function () {
                  onVideoChange(null)
                }}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400"
              >
                <Trash size={14} weight="bold" />
                Gỡ video
              </button>
            </div>
          </div>
        )}
      </div>

      {/* C. Ảnh Garment (Trải phẳng trên nền trắng) dùng cho Virtual Try-On */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Sparkle size={20} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wider text-zinc-900 uppercase dark:text-white">
                  Thử đồ ảo AI (Virtual Try-On)
                </h3>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  AI Feature
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                Cho phép khách hàng thử đồ ảo trực tiếp lên ảnh của họ trên trang sản phẩm.
              </p>
            </div>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={tryOnEnabled}
              onChange={function (e) {
                onTryOnToggle(e.target.checked)
              }}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-zinc-200 peer-checked:bg-indigo-600 peer-focus:outline-none dark:bg-zinc-700 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full dark:border-zinc-600" />
          </label>
        </div>

        {tryOnEnabled && (
          <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {garmentKey !== null && (
                <div className="relative aspect-3/4 w-32 overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-xs dark:border-indigo-800">
                  <img
                    src={imageUrl(garmentKey)}
                    alt="Ảnh Garment phẳng nền trắng"
                    className="h-full w-full object-contain p-1"
                  />
                  <button
                    type="button"
                    onClick={function () {
                      onGarmentChange(null)
                    }}
                    className="absolute top-1 right-1 rounded-md bg-red-600/80 p-1 text-white hover:bg-red-600"
                  >
                    <Trash size={12} weight="bold" />
                  </button>
                </div>
              )}

              {garmentKey === null && (
                <button
                  type="button"
                  disabled={isUploadingGarment}
                  onClick={function () {
                    garmentInputRef.current?.click()
                  }}
                  className="flex aspect-3/4 w-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-white p-2 text-center text-indigo-600 transition hover:border-indigo-500 disabled:opacity-50 dark:border-indigo-800 dark:bg-zinc-900 dark:text-indigo-400"
                >
                  {isUploadingGarment && <SpinnerGap size={20} weight="bold" className="animate-spin" />}
                  {isUploadingGarment === false && <TShirt size={24} weight="bold" />}
                  <span className="mt-1 text-[11px] font-bold">Tải ảnh garment</span>
                  <span className="text-[9px] text-zinc-400">Nền trắng</span>
                </button>
              )}

              <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                <p className="font-bold text-zinc-900 dark:text-white">
                  Yêu cầu quy chuẩn ảnh Garment:
                </p>
                <ul className="list-disc space-y-1 pl-4 text-[11px] text-zinc-500">
                  <li>Ảnh trang phục trải phẳng (Flat Lay) hoặc mặc ma-nơ-canh tàng hình (Ghost Mannequin).</li>
                  <li>Phải chụp trên <strong>nền trắng tinh khiết (RGB: 255, 255, 255)</strong>, không bóng đổ.</li>
                  <li>Sản phẩm được là phẳng phiu, căn chính giữa khung hình, không bị che khuất.</li>
                  <li className="font-semibold text-indigo-600 dark:text-indigo-400">
                    Bắt buộc có ảnh Garment khi bật tính năng thử đồ ảo.
                  </li>
                </ul>
              </div>
            </div>
            <input
              ref={garmentInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                void handleGarmentFile(e)
              }}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  )
}
