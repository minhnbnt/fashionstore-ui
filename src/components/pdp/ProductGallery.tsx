import { useState } from 'react'

import { Play } from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'

import type { ImageResponse } from '@generated/model/imageResponse'

export default function ProductGallery(props: {
  images: ImageResponse[]
  name: string
  videoKey?: string | null
}) {
  const [active, setActive] = useState(0)
  const imgs = [...props.images].sort(function (a, b) {
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })
  const hasVideo = props.videoKey !== null && props.videoKey !== undefined && props.videoKey !== ''
  const total = imgs.length + (hasVideo ? 1 : 0)
  if (total === 0) {
    return <div className="rounded-3xl bg-sky-100 p-10 dark:bg-white/5">Chưa có ảnh</div>
  }

  const videoActive = hasVideo && active === 0
  const activeImage = imgs[active - (hasVideo ? 1 : 0)]
  if (videoActive === false && activeImage === undefined) {
    return <div className="rounded-3xl bg-sky-100 p-10 dark:bg-white/5">Chưa có ảnh</div>
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white/80 dark:border-white/10 dark:bg-white/5">
        {videoActive ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- video do merchant tự upload, không có file phụ đề để gắn track
          <video
            key={props.videoKey}
            src={imageUrl(props.videoKey)}
            controls
            playsInline
            preload="metadata"
            className="aspect-[4/5] w-full bg-black object-contain"
          />
        ) : (
          <img
            src={imageUrl(activeImage?.s3Key)}
            alt={props.name}
            width={600}
            height={600}
            onError={function (e) {
              if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                e.currentTarget.src = PLACEHOLDER_IMAGE
              }
            }}
            className="aspect-square w-full object-cover"
          />
        )}
      </div>
      {total > 1 && (
        <div className="mt-3 flex gap-3">
          {hasVideo && (
            <button
              type="button"
              onClick={function () {
                setActive(0)
              }}
              className="overflow-hidden rounded-2xl border border-sky-100 dark:border-white/10"
              aria-label="Video sản phẩm"
            >
              <span className="flex h-20 w-16 items-center justify-center bg-zinc-900 text-white">
                <Play size={22} weight="fill" />
              </span>
            </button>
          )}
          {imgs.map(function (img, i) {
            const index = hasVideo ? i + 1 : i
            return (
              <button
                key={img.id ?? i}
                type="button"
                onClick={function () {
                  setActive(index)
                }}
                className="overflow-hidden rounded-2xl border border-sky-100 dark:border-white/10"
                aria-label={'Ảnh ' + (i + 1)}
              >
                <img
                  src={imageUrl(img.s3Key)}
                  alt=""
                  loading="lazy"
                  width={150}
                  height={188}
                  onError={function (e) {
                    if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                      e.currentTarget.src = PLACEHOLDER_IMAGE
                    }
                  }}
                  className="h-20 w-16 object-cover"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
