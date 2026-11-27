import { useState } from 'react'

import { MagnifyingGlassPlus, Play } from '@phosphor-icons/react'

import { MediaLightbox } from '@/components/ui/MediaLightbox'
import { fallbackImageOnError, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { ImageResponse } from '@generated/model/imageResponse'

export default function ProductGallery(props: {
  images: ImageResponse[]
  name: string
  videoUrl?: string | null
}) {
  const [active, setActive] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)

  const sortedImgs = [...props.images].sort(function (a, b) {
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })
  const seenImgKeys = new Set<string>()
  const imgs: ImageResponse[] = []
  for (const img of sortedImgs) {
    const key = img.uploadId ?? img.url ?? ''
    if (key !== '' && seenImgKeys.has(key)) {
      continue
    }
    if (key !== '') {
      seenImgKeys.add(key)
    }
    imgs.push(img)
  }
  const hasVideo = props.videoUrl !== null && props.videoUrl !== undefined && props.videoUrl !== ''
  let videoOffset = 0
  if (hasVideo) {
    videoOffset = 1
  }
  const total = imgs.length + videoOffset
  if (total === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-6 text-sm font-semibold text-zinc-500 sm:h-[420px] dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
        Chưa có ảnh
      </div>
    )
  }

  const safeActive = active % total
  const videoActive = hasVideo && safeActive === 0
  const activeImage = imgs[safeActive - videoOffset]
  if (videoActive === false && activeImage === undefined) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-6 text-sm font-semibold text-zinc-500 sm:h-[420px] dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
        Chưa có ảnh
      </div>
    )
  }

  function goPrev() {
    setActive(function (prev) {
      return (prev - 1 + total) % total
    })
  }

  function goNext() {
    setActive(function (prev) {
      return (prev + 1) % total
    })
  }

  let lightboxSrc = ''
  let lightboxKind: 'image' | 'video' = 'image'
  if (videoActive) {
    lightboxSrc = urlOrPlaceholder(props.videoUrl)
    lightboxKind = 'video'
  } else {
    lightboxSrc = urlOrPlaceholder(activeImage?.url)
    lightboxKind = 'image'
  }

  let lightboxPrev: (() => void) | undefined
  let lightboxNext: (() => void) | undefined
  if (total > 1) {
    lightboxPrev = goPrev
    lightboxNext = goNext
  }

  return (
    <div>
      <div className="group relative flex h-[360px] w-full items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/90 sm:h-[420px] dark:border-white/10 dark:bg-zinc-900/50">
        {videoActive && (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- video do merchant tự upload, không có file phụ đề để gắn track
          <video
            key={props.videoUrl}
            src={urlOrPlaceholder(props.videoUrl)}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full bg-black object-contain"
          />
        )}
        {videoActive === false && (
          <button
            type="button"
            onClick={function () {
              setZoomOpen(true)
            }}
            aria-label={'Phóng to ' + props.name}
            className={cn(
              'relative flex h-full w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl',
              FOCUS_RING_CLASS,
            )}
          >
            <img
              src={urlOrPlaceholder(activeImage?.url)}
              alt={props.name}
              width={600}
              height={750}
              onError={fallbackImageOnError}
              className="h-full w-full object-contain p-3"
            />
            <span
              aria-hidden="true"
              className="glass pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#17203a] opacity-90 transition group-hover:opacity-100 dark:text-white"
            >
              <MagnifyingGlassPlus size={14} weight="bold" />
              Phóng to
            </span>
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {hasVideo && (
            <button
              type="button"
              onClick={function () {
                setActive(0)
              }}
              aria-label="Video sản phẩm"
              aria-current={safeActive === 0}
              className={cn(
                'shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-200/80 transition dark:border-white/10',
                FOCUS_RING_CLASS,
                safeActive === 0 &&
                  'border-blue-600 ring-2 ring-blue-600 dark:border-sky-400 dark:ring-sky-400',
              )}
            >
              <span className="flex h-16 w-16 items-center justify-center bg-zinc-900 text-white">
                <Play size={22} weight="fill" />
              </span>
            </button>
          )}
          {imgs.map(function (img, i) {
            const index = i + videoOffset
            const isSelected = safeActive === index
            return (
              <button
                key={img.id ?? i}
                type="button"
                onClick={function () {
                  setActive(index)
                }}
                aria-label={'Ảnh ' + (i + 1)}
                aria-current={isSelected}
                className={cn(
                  'shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-200/80 transition dark:border-white/10',
                  FOCUS_RING_CLASS,
                  isSelected &&
                    'border-blue-600 ring-2 ring-blue-600 dark:border-sky-400 dark:ring-sky-400',
                )}
              >
                <img
                  src={urlOrPlaceholder(img.url)}
                  alt=""
                  loading="lazy"
                  width={150}
                  height={188}
                  onError={fallbackImageOnError}
                  className="h-16 w-16 object-cover"
                />
              </button>
            )
          })}
        </div>
      )}

      <MediaLightbox
        open={zoomOpen}
        src={lightboxSrc}
        alt={props.name}
        kind={lightboxKind}
        caption={`${props.name} (${safeActive + 1}/${total})`}
        onClose={function () {
          setZoomOpen(false)
        }}
        onPrev={lightboxPrev}
        onNext={lightboxNext}
      />
    </div>
  )
}
