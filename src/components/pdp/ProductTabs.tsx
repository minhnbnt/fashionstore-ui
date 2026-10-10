import { useState } from 'react'
import { Star } from '@phosphor-icons/react'

import type { Product } from '../../data/products'

type Tab = 'mo-ta' | 'thong-so' | 'danh-gia'

export default function ProductTabs(props: { product: Product }) {
  const [tab, setTab] = useState<Tab>('mo-ta')
  return (
    <section className="mt-10 rounded-3xl border border-sky-100 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={function () {
            setTab('mo-ta')
          }}
          className="rounded-full border border-sky-100 px-4 py-2 text-sm font-bold dark:border-white/10"
        >
          Mô tả
        </button>
        <button
          type="button"
          onClick={function () {
            setTab('thong-so')
          }}
          className="rounded-full border border-sky-100 px-4 py-2 text-sm font-bold dark:border-white/10"
        >
          Thông số
        </button>
        <button
          type="button"
          onClick={function () {
            setTab('danh-gia')
          }}
          className="rounded-full border border-sky-100 px-4 py-2 text-sm font-bold dark:border-white/10"
        >
          Đánh giá ({props.product.reviewsCount})
        </button>
      </div>
      {tab === 'mo-ta' && (
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {props.product.desc}
        </p>
      )}
      {tab === 'thong-so' && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
          {props.product.details.map(function (d) {
            return <li key={d}>{d}</li>
          })}
        </ul>
      )}
      {tab === 'danh-gia' && (
        <div className="mt-4 space-y-4">
          {props.product.reviews.map(function (r) {
            return (
              <div
                key={r.name}
                className="border-b border-sky-100 pb-3 last:border-0 dark:border-white/10"
              >
                <p className="flex items-center gap-2 text-sm font-bold">
                  {r.name}
                  <span className="flex items-center gap-1 text-sky-400">
                    <Star size={12} weight="fill" />
                    {r.rating}
                  </span>
                </p>
                <p className="mt-1 text-sm">{r.text}</p>
                <p className="mt-1 text-xs text-zinc-400">{r.date}</p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
