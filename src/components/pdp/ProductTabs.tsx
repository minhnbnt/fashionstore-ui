import { useState } from 'react'

import { Package, Ruler, Star } from '@phosphor-icons/react'

// TODO(mock): đánh giá là demo, thay bằng API reviews khi backend có endpoint
import { DEMO_RATING, DEMO_REVIEWS } from '@/data/demoReviews'
import { priceInfo } from '@/lib/apiAdapters'

import UserAvatar from '../UserAvatar'

import type { Tab } from '@/types/product'
import type { ProductResponse } from '@generated/model/productResponse'

function Stars(props: { value: number; size?: number }) {
  const s = props.size || 14
  return (
    <span className="flex items-center gap-0.5 text-sky-400">
      {[1, 2, 3, 4, 5].map(function (i) {
        return (
          <Star
            key={i}
            size={s}
            weight={i <= Math.round(props.value) ? 'fill' : 'regular'}
            className={i <= Math.round(props.value) ? '' : 'opacity-40'}
          />
        )
      })}
    </span>
  )
}

export default function ProductTabs(props: { product: ProductResponse }) {
  const [tab, setTab] = useState<Tab>('mo-ta')
  const p = props.product
  const info = priceInfo(p)
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
          Đánh giá ({DEMO_RATING.count})
        </button>
      </div>
      {tab === 'mo-ta' && (
        <div className="mt-5">
          <p className="max-w-[65ch] text-lg leading-relaxed font-semibold tracking-tight">
            “{p.description ?? p.name}”
          </p>
        </div>
      )}
      {tab === 'thong-so' && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-sky-100 dark:border-white/10">
          <div className="flex items-center gap-3 bg-sky-50/70 px-5 py-3 text-sm font-bold dark:bg-white/5">
            <Ruler size={16} className="text-sky-500" />
            Kích cỡ có sẵn
          </div>
          <p className="flex flex-wrap gap-2 px-5 py-3">
            {info.sizes.map(function (s) {
              return (
                <span
                  key={s}
                  className="rounded-full border border-sky-100 px-3 py-1 text-xs font-bold dark:border-white/10"
                >
                  {s}
                </span>
              )
            })}
          </p>
          <div className="flex items-center gap-3 bg-sky-50/70 px-5 py-3 text-sm font-bold dark:bg-white/5">
            <Package size={16} className="text-sky-500" />
            Chi tiết sản phẩm
          </div>
          <dl>
            <div className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm odd:bg-white even:bg-sky-50/50 dark:odd:bg-transparent dark:even:bg-white/5">
              <dt className="font-bold text-zinc-500 dark:text-zinc-400">Màu sắc</dt>
              <dd className="font-semibold">{info.colors.join(' · ')}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm odd:bg-white even:bg-sky-50/50 dark:odd:bg-transparent dark:even:bg-white/5">
              <dt className="font-bold text-zinc-500 dark:text-zinc-400">Tình trạng</dt>
              <dd className="font-semibold">Còn {info.totalStock} sản phẩm</dd>
            </div>
          </dl>
        </div>
      )}
      {tab === 'danh-gia' && (
        <div className="mt-5">
          <div className="grid grid-cols-1 gap-5 rounded-3xl bg-sky-50/70 p-5 md:grid-cols-[auto_1fr] dark:bg-white/5">
            <div className="text-center md:min-w-36">
              <p className="text-5xl font-extrabold tracking-tight">{DEMO_RATING.value}</p>
              <div className="mt-2 flex justify-center">
                <Stars value={DEMO_RATING.value} size={16} />
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {DEMO_RATING.count} đánh giá
              </p>
            </div>
            <div className="space-y-1.5">
              {DEMO_RATING.breakdown.map(function (pct, i) {
                return (
                  <div key={i} className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-6 text-zinc-500">{5 - i}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-sky-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-900 to-sky-400"
                        style={{ width: pct + '%' }}
                      />
                    </div>
                    <span className="w-9 text-right text-zinc-500">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {DEMO_REVIEWS.map(function (r) {
              return (
                <article
                  key={r.name}
                  className="rounded-3xl border border-sky-100 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={r.name} />
                    <div>
                      <p className="text-sm font-bold">{r.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Stars value={r.rating} />
                        <span className="text-xs text-zinc-400">{r.date}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    “{r.text}”
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
