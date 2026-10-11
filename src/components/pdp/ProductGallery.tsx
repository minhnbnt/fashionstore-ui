import { useState } from 'react'

import { Heart } from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'

import type { ImageResponse } from '@generated/model/imageResponse'

export default function ProductGallery(props: { images: ImageResponse[]; name: string }) {
  const [active, setActive] = useState(0)
  const imgs = [...props.images].sort(function (a, b) {
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })
  if (imgs.length === 0) {
    return <div className="rounded-3xl bg-sky-100 p-10">Chưa có ảnh</div>
  }
  const main = imgs[active]
  if (main === undefined) {
    return <div className="rounded-3xl bg-sky-100 p-10">Chưa có ảnh</div>
  }
  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white/80 dark:border-white/10 dark:bg-white/5">
        <img
          src={imageUrl(main.s3Key)}
          alt={props.name}
          width={600}
          height={750}
          onError={function (e) {
            if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
              e.currentTarget.src = PLACEHOLDER_IMAGE
            }
          }}
          className="aspect-[4/5] w-full object-cover"
        />
        <button
          type="button"
          aria-label="Yêu thích"
          className="glass absolute top-3 right-3 rounded-full p-2"
        >
          <Heart size={18} />
        </button>
      </div>
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-3">
          {imgs.map(function (img, i) {
            return (
              <button
                key={img.id ?? i}
                type="button"
                onClick={function () {
                  setActive(i)
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
