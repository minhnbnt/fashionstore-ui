import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Link, useParams } from 'react-router'

import { useDetail1 } from '@generated/endpoints/products/products'
import {
  ArrowLeft,
  ArrowsLeftRight,
  ArrowsOutSimple,
  CheckCircle,
  DownloadSimple,
  Sparkle,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react'

import { MediaLightbox } from '@/components/ui/MediaLightbox'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { inferTryOnMode, runDirectTryOn } from '@/lib/ai/vtonClient'
import { fallbackImageOnError, takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { MAX_IMAGE_BYTES } from '@/lib/api/uploadImage'
import { CARD_CLASS, cn, FOCUS_RING_CLASS, secondaryButtonClass } from '@/lib/ui/styles'

import type { DirectTryOnInput, DirectTryOnResult } from '@/lib/ai/vtonClient'
import type { ProductResponse } from '@generated/model/productResponse'

export interface VirtualTryOnProps {
  vtonUrl?: string
  runTryOn?: (input: DirectTryOnInput) => Promise<DirectTryOnResult>
}

interface UploadedPersonImage {
  previewUrl: string | null
  status: 'ready' | 'error'
  filename?: string
  file?: File
  error?: string
}

function getCoverImageUrl(product: ProductResponse): string {
  const images = product.images ?? []
  if (images.length === 0) {
    return urlOrPlaceholder(null)
  }
  const sorted = [...images].sort(function (a, b) {
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })
  return urlOrPlaceholder(sorted[0]?.url)
}

const TRYON_PROGRESS_STEPS = [
  { threshold: 0, label: 'Phân tích dáng người & tư thế ảnh cá nhân' },
  { threshold: 30, label: 'Tách nền & căn chỉnh tỉ lệ trang phục Garment' },
  { threshold: 60, label: 'AI ghép trang phục & tái tạo nếp gấp, ánh sáng' },
  { threshold: 82, label: 'Hoàn thiện độ nét & xuất ảnh kết quả' },
]

function nextTryOnProgress(prev: number): number {
  if (prev >= 99) {
    return 99
  }
  let delta = Math.max(0.18, (99.2 - prev) * 0.035)
  if (prev < 30) {
    delta = 1.6
  } else if (prev < 60) {
    delta = 1.3
  } else if (prev < 82) {
    delta = 0.85
  }
  const next = prev + delta
  if (next > 99) {
    return 99
  }
  return Number(next.toFixed(2))
}

function revokeBlobUrl(url: string | null) {
  if (url !== null && url.startsWith('blob:')) {
    window.URL.revokeObjectURL(url)
  }
}

export default function VirtualTryOn(props: VirtualTryOnProps = {}) {
  const params = useParams()
  const id = params.id ?? ''
  const detailQuery = useDetail1(id, {
    query: { enabled: id !== '' },
  })

  const [personImage, setPersonImage] = useState<UploadedPersonImage | null>(null)
  const [selectedGarmentIndex, setSelectedGarmentIndex] = useState(0)
  const [progressPct, setProgressPct] = useState(5)
  const [isDragging, setIsDragging] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [tryOnError, setTryOnError] = useState<string | null>(null)
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
  const tryOnSeqRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(
    function () {
      if (!isGenerating) {
        return
      }
      const timerId = window.setInterval(function () {
        setProgressPct(nextTryOnProgress)
      }, 350)
      return function () {
        window.clearInterval(timerId)
      }
    },
    [isGenerating],
  )

  useEffect(function () {
    return function () {
      tryOnSeqRef.current += 1
      setPersonImage(function (current) {
        if (current !== null) {
          revokeBlobUrl(current.previewUrl)
        }
        return current
      })
      setResultImageUrl(function (currentUrl) {
        revokeBlobUrl(currentUrl)
        return currentUrl
      })
    }
  }, [])

  function clearPersonImage() {
    setPersonImage(function (current) {
      if (current !== null) {
        revokeBlobUrl(current.previewUrl)
      }
      return null
    })
  }

  function processSelectedFile(file: File | undefined) {
    if (file === undefined) {
      return
    }
    if (file.type.startsWith('image/') === false) {
      setPersonImage({
        previewUrl: null,
        status: 'error',
        error: 'Chỉ nhận file ảnh.',
      })
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setPersonImage({
        previewUrl: null,
        status: 'error',
        error: 'Ảnh tối đa 5 MB.',
      })
      return
    }

    clearPersonImage()
    const previewUrl = window.URL.createObjectURL(file)
    setPersonImage({
      previewUrl,
      status: 'ready',
      filename: file.name,
      file,
    })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    processSelectedFile(file)
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    processSelectedFile(file)
  }

  if (detailQuery.isPending) {
    return (
      <main className="mx-auto min-h-[calc(100dvh-2rem)] max-w-7xl px-4 pt-24 pb-16">
        <PageSkeleton />
      </main>
    )
  }

  if (detailQuery.isError || detailQuery.data === undefined) {
    return (
      <main className="mx-auto min-h-[calc(100dvh-2rem)] max-w-7xl px-4 pt-24 pb-16 text-center">
        <div className={cn(CARD_CLASS, 'mx-auto max-w-lg space-y-4 p-8')}>
          <h1 className="text-2xl font-extrabold text-[#17203a] dark:text-white">
            Không tìm thấy sản phẩm
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.
          </p>
          <Link to="/search" className={secondaryButtonClass()}>
            Quay lại cửa hàng
          </Link>
        </div>
      </main>
    )
  }

  const product = takeData(detailQuery.data)
  const productId = product.id ?? id

  if (product.tryOnEnabled !== true) {
    return (
      <main className="mx-auto min-h-[calc(100dvh-2rem)] max-w-7xl px-4 pt-24 pb-16 text-center">
        <div className={cn(CARD_CLASS, 'mx-auto max-w-lg space-y-4 p-8')}>
          <h1 className="text-2xl font-extrabold text-[#17203a] dark:text-white">
            Sản phẩm này chưa hỗ trợ Thử đồ ảo AI
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Gian hàng chưa kích hoạt phòng thử đồ ảo cho sản phẩm này.
          </p>
          <Link
            to={'/product/' + productId}
            className={cn(
              'btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold',
              FOCUS_RING_CLASS,
            )}
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Quay lại trang sản phẩm</span>
          </Link>
        </div>
      </main>
    )
  }

  const readyFile = personImage?.file
  const previewUrl = personImage?.previewUrl ?? null
  const canStartTryOn = readyFile !== undefined && isGenerating === false

  const coverUrl = getCoverImageUrl(product)
  const garmentUrls: string[] = []
  if (product.garments !== undefined && product.garments !== null && product.garments.length > 0) {
    const sortedGarments = [...product.garments].sort(function (a, b) {
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    })
    for (const g of sortedGarments) {
      if (g.url !== undefined && g.url !== '') {
        garmentUrls.push(g.url)
      }
    }
  }
  if (
    garmentUrls.length === 0 &&
    product.garmentUrl !== undefined &&
    product.garmentUrl !== null &&
    product.garmentUrl !== ''
  ) {
    garmentUrls.push(product.garmentUrl)
  }
  const hasGarmentUrl = garmentUrls.length > 0
  let activeGarmentIndex = 0
  if (selectedGarmentIndex >= 0 && selectedGarmentIndex < garmentUrls.length) {
    activeGarmentIndex = selectedGarmentIndex
  }
  let primaryTryOnImageUrl = coverUrl
  const pickedGarmentUrl = garmentUrls[activeGarmentIndex]
  if (pickedGarmentUrl !== undefined && pickedGarmentUrl !== '') {
    primaryTryOnImageUrl = pickedGarmentUrl
  }

  function handleStartTryOn() {
    if (readyFile === undefined || isGenerating) {
      return
    }
    tryOnSeqRef.current += 1
    const seq = tryOnSeqRef.current

    setResultImageUrl(function (prevUrl) {
      revokeBlobUrl(prevUrl)
      return null
    })
    setTryOnError(null)
    setCompareMode(false)
    setProgressPct(5)
    setIsGenerating(true)

    let runner = runDirectTryOn
    if (props.runTryOn !== undefined) {
      runner = props.runTryOn
    }

    const mode = inferTryOnMode(product.name ?? '', product.description ?? '')
    runner({
      personFile: readyFile,
      garmentImageUrl: primaryTryOnImageUrl,
      mode,
      vtonUrl: props.vtonUrl,
    })
      .then(function (result) {
        if (tryOnSeqRef.current !== seq) {
          revokeBlobUrl(result.objectUrl)
          return
        }
        setResultImageUrl(result.objectUrl)
        setIsGenerating(false)
      })
      .catch(function (err: unknown) {
        if (tryOnSeqRef.current !== seq) {
          return
        }
        let message = 'Có lỗi khi tạo ảnh thử đồ. Vui lòng thử lại với ảnh rõ nét hơn.'
        if (err instanceof Error && err.message.trim() !== '') {
          message = err.message
        }
        setTryOnError(message)
        setIsGenerating(false)
      })
  }

  function handleDownloadResult() {
    if (resultImageUrl === null) {
      return
    }
    let slugPart = productId
    if (product.slug !== undefined && product.slug !== '') {
      slugPart = product.slug
    }
    const filename = 'thu-do-' + slugPart + '.png'
    const anchor = document.createElement('a')
    anchor.href = resultImageUrl
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-7xl flex-col px-4 pt-24 pb-16">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 dark:bg-sky-500/15 dark:text-sky-300">
            <Sparkle size={14} weight="fill" />
            <span>Phòng Thử Đồ Ảo AI</span>
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#17203a] md:text-3xl dark:text-white">
            Mặc thử trực tuyến với AI
          </h1>
        </div>
        <Link to={'/product/' + productId} className={secondaryButtonClass()}>
          <ArrowLeft size={16} weight="bold" />
          <span>Quay lại trang sản phẩm</span>
        </Link>
      </div>

      <div className="grid min-h-[580px] flex-1 grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        {/* Column 1 — Thông tin sản phẩm đang thử */}
        <section className={cn(CARD_CLASS, 'flex h-full flex-col justify-between gap-4 p-6')}>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-[#17203a] dark:text-white">
                1. Trang phục đang thử
              </h2>
              {hasGarmentUrl && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-sky-500/15 dark:text-sky-300">
                  Ảnh Garment chuẩn AI
                </span>
              )}
            </div>
            <div className="flex min-h-[340px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-4 dark:border-white/10 dark:bg-white/5">
              <img
                src={primaryTryOnImageUrl}
                alt={product.name ?? 'Ảnh sản phẩm'}
                onError={fallbackImageOnError}
                className="max-h-80 w-full object-contain p-2"
              />
            </div>
          </div>

          {garmentUrls.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                Chọn mẫu trang phục muốn thử ({activeGarmentIndex + 1}/{garmentUrls.length})
              </p>
              <div className="flex flex-wrap gap-2.5">
                {garmentUrls.map(function (gUrl, idx) {
                  const isSelected = idx === activeGarmentIndex
                  return (
                    <button
                      key={gUrl + '-' + idx}
                      type="button"
                      aria-label={'Chọn mẫu trang phục ' + (idx + 1)}
                      aria-pressed={isSelected}
                      onClick={function () {
                        setSelectedGarmentIndex(idx)
                      }}
                      className={cn(
                        'h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border bg-white p-1 transition dark:bg-zinc-900',
                        FOCUS_RING_CLASS,
                        isSelected &&
                          'border-indigo-600 ring-2 ring-indigo-600 dark:border-sky-400 dark:ring-sky-400',
                        !isSelected &&
                          'border-zinc-200/80 opacity-75 hover:opacity-100 dark:border-white/15',
                      )}
                    >
                      <img
                        src={gUrl}
                        alt={'Mẫu trang phục ' + (idx + 1)}
                        onError={fallbackImageOnError}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Column 2 — Kéo & Thả ảnh cá nhân */}
        <section className={cn(CARD_CLASS, 'flex h-full flex-col justify-between gap-4 p-6')}>
          <h2 className="text-base font-extrabold text-[#17203a] dark:text-white">
            2. Ảnh cá nhân của bạn
          </h2>
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Kéo-thả ảnh toàn thân hoặc bán thân rõ nét (JPG, PNG, WebP tối đa 5 MB). Hệ thống tự
            động nhận diện kiểu trang phục phù hợp.
          </p>

          <div
            data-testid="tryon-dropzone"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex min-h-[340px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition',
              isDragging &&
                'border-indigo-500 bg-indigo-50/60 dark:border-sky-400 dark:bg-sky-500/10',
              !isDragging &&
                'border-zinc-300 bg-zinc-50/50 hover:border-indigo-400 dark:border-white/15 dark:bg-white/[0.02]',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="Tải ảnh cá nhân để thử đồ"
              onChange={handleFileChange}
              className="sr-only"
            />

            {previewUrl !== null && (
              <div className="flex w-full flex-col items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Ảnh cá nhân của bạn"
                  className="max-h-72 w-auto rounded-2xl border border-zinc-200/80 object-contain shadow-xs dark:border-white/10"
                />
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={function () {
                      fileInputRef.current?.click()
                    }}
                    className={cn(secondaryButtonClass(), 'px-3.5 py-1.5 text-xs')}
                  >
                    Đổi ảnh khác
                  </button>
                  <button
                    type="button"
                    aria-label="Gỡ ảnh cá nhân"
                    onClick={clearPersonImage}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    <Trash size={14} weight="bold" />
                    <span>Gỡ ảnh</span>
                  </button>
                </div>
              </div>
            )}

            {previewUrl === null && (
              <div className="flex flex-col items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-sky-500/15 dark:text-sky-300">
                  <UploadSimple size={24} weight="bold" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#17203a] dark:text-white">
                    Kéo & thả ảnh cá nhân vào đây
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Hoặc bấm nút bên dưới để chọn ảnh từ thiết bị
                  </p>
                </div>
                <button
                  type="button"
                  onClick={function () {
                    fileInputRef.current?.click()
                  }}
                  className={cn(secondaryButtonClass(), 'mt-1 text-xs')}
                >
                  Chọn ảnh từ máy
                </button>
              </div>
            )}
          </div>

          {personImage?.status === 'error' && personImage.error !== undefined && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              {personImage.error}
            </p>
          )}

          <button
            type="button"
            disabled={!canStartTryOn}
            onClick={handleStartTryOn}
            className={cn(
              'btn-primary flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
              FOCUS_RING_CLASS,
            )}
          >
            <Sparkle size={16} weight="fill" />
            <span>Bắt đầu Thử Đồ Ảo AI</span>
          </button>
        </section>

        {/* Column 3 — Kết quả Thử Đồ Ảo & Tải Ảnh Về Máy */}
        <section className={cn(CARD_CLASS, 'flex h-full flex-col justify-between gap-4 p-6')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-[#17203a] dark:text-white">
              3. Kết quả mặc thử AI
            </h2>
            {resultImageUrl !== null && previewUrl !== null && (
              <button
                type="button"
                aria-pressed={compareMode}
                onClick={function () {
                  setCompareMode(!compareMode)
                }}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-300',
                  FOCUS_RING_CLASS,
                )}
              >
                <ArrowsLeftRight size={14} weight="bold" />
                <span>So sánh Trước / Sau</span>
              </button>
            )}
          </div>

          <div className="flex min-h-[340px] flex-1 flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-5 dark:border-white/10 dark:bg-white/[0.02]">
            {isGenerating && (
              <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-sky-500/15 dark:text-sky-300">
                  <Sparkle size={22} weight="fill" className="animate-pulse" />
                  <span className="absolute -inset-1 animate-spin rounded-2xl border-2 border-indigo-600/40 border-t-indigo-600 dark:border-sky-400/30 dark:border-t-sky-400" />
                </div>

                <div>
                  <p className="text-sm font-bold text-[#17203a] dark:text-white">
                    Đang tạo ảnh thử đồ, chờ chút nhé…
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    AI đang ghép trang phục lên dáng người của bạn (khoảng 15–30 giây)
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-indigo-700 dark:text-sky-300">Tiến độ xử lý AI</span>
                    <span className="text-[#17203a] tabular-nums dark:text-white">
                      {Math.round(progressPct)}%
                    </span>
                  </div>
                  <progress
                    aria-label="Tiến trình tạo ảnh thử đồ AI"
                    value={Math.round(progressPct)}
                    max={100}
                    className="sr-only"
                  />
                  <div
                    aria-hidden="true"
                    className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-white/10"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8] transition-all duration-300 ease-linear"
                      style={{ width: progressPct + '%' }}
                    />
                  </div>
                </div>

                <ul className="w-full space-y-2 rounded-2xl border border-zinc-200/70 bg-white/80 p-3.5 text-left dark:border-white/10 dark:bg-white/[0.03]">
                  {TRYON_PROGRESS_STEPS.map(function (step, idx) {
                    const nextThreshold = TRYON_PROGRESS_STEPS[idx + 1]?.threshold ?? 101
                    const isDone = progressPct >= nextThreshold
                    const isActive = progressPct >= step.threshold && progressPct < nextThreshold
                    let textClass = 'text-xs text-zinc-400 dark:text-zinc-500'
                    if (isDone) {
                      textClass = 'text-xs font-semibold text-emerald-700 dark:text-emerald-300'
                    }
                    if (isActive) {
                      textClass = 'text-xs font-bold text-[#17203a] dark:text-white'
                    }
                    return (
                      <li key={step.label} className="flex items-center gap-2.5">
                        {isDone && (
                          <CheckCircle
                            size={15}
                            weight="fill"
                            className="shrink-0 text-emerald-500"
                          />
                        )}
                        {isActive && (
                          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-sky-400" />
                        )}
                        {!isDone && !isActive && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-300 dark:bg-white/20" />
                        )}
                        <span className={textClass}>{step.label}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {tryOnError !== null && !isGenerating && (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs font-semibold text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
              >
                {tryOnError}
              </p>
            )}

            {resultImageUrl === null && !isGenerating && tryOnError === null && (
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-sky-500/10 dark:text-sky-300">
                  <Sparkle size={22} weight="fill" />
                </span>
                <p className="max-w-xs text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Tải ảnh cá nhân ở cột bên cạnh và bấm &ldquo;Bắt đầu Thử Đồ Ảo AI&rdquo; để nhận
                  ảnh kết quả tại đây.
                </p>
              </div>
            )}

            {resultImageUrl !== null && !compareMode && (
              <button
                type="button"
                onClick={function () {
                  setLightboxOpen(true)
                }}
                className="group relative cursor-pointer overflow-hidden rounded-2xl"
              >
                <img
                  src={resultImageUrl}
                  alt="Ảnh kết quả thử đồ"
                  className="max-h-80 w-auto rounded-2xl object-contain shadow-sm"
                />
              </button>
            )}

            {resultImageUrl !== null && compareMode && (
              <div className="grid w-full grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    Ảnh gốc của bạn
                  </span>
                  {previewUrl !== null && (
                    <img
                      src={previewUrl}
                      alt="Ảnh gốc để so sánh"
                      className="max-h-72 w-full rounded-xl object-contain"
                    />
                  )}
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-bold text-indigo-700 dark:text-sky-300">
                    Kết quả mặc thử AI
                  </span>
                  <img
                    src={resultImageUrl}
                    alt="Ảnh kết quả thử đồ"
                    className="max-h-72 w-full rounded-xl object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {resultImageUrl !== null && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={function () {
                  setLightboxOpen(true)
                }}
                className={cn(secondaryButtonClass(), 'flex-1 cursor-pointer py-2.5 text-xs')}
              >
                <ArrowsOutSimple size={15} weight="bold" />
                <span>Phóng to ảnh</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadResult}
                className={cn(
                  'btn-primary flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold',
                  FOCUS_RING_CLASS,
                )}
              >
                <DownloadSimple size={15} weight="bold" />
                <span>Tải ảnh về máy</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {resultImageUrl !== null && (
        <MediaLightbox
          open={lightboxOpen}
          src={resultImageUrl}
          alt="Ảnh kết quả thử đồ (phóng to)"
          onClose={function () {
            setLightboxOpen(false)
          }}
        />
      )}
    </main>
  )
}
