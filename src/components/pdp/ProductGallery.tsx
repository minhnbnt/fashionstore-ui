import { useState } from 'react'
import { Heart } from '@phosphor-icons/react'

import type { Product } from '../../data/products'

export default function ProductGallery(props: { product: Product }) {
  const [active, setActive] = useState(0)
  const imgs = props.product.gallery
  if (imgs.length === 0) {
    return <div className="rounded-3xl bg-sky-100 p-10">Chưa có ảnh</div>
  }
  const main = imgs[active]
  if (!main) {
    return <div className="rounded-3xl bg-sky-100 p-10">Chưa có ảnh</div>
  }
  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white/80 dark:border-white/10 dark:bg-white/5">
        <img
          src={main}
          alt={props.product.name}
          width={600}
          height={750}
          className="aspect-[4/5] w-full object-cover"
        />
        {props.product.tag && (
          <span className="absolute top-3 left-3 rounded-full bg-gradient-to-r from-indigo-900 to-sky-400 px-3 py-1 text-xs font-bold text-white">
            {props.product.tag}
          </span>
        )}
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
          {imgs.map(function (src, i) {
            return (
              <button
                key={src}
                type="button"
                onClick={function () {
                  setActive(i)
                }}
                className="overflow-hidden rounded-2xl border border-sky-100 dark:border-white/10"
                aria-label={'Ảnh ' + (i + 1)}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  width={150}
                  height={188}
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
