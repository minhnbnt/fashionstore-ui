import { useState } from 'react'

import { useList } from '@generated/endpoints/reviews/reviews'
import { Package, Ruler, Star } from '@phosphor-icons/react'

import { apiErrorMessage, priceInfo, takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'
import { formatDateTime } from '@/lib/format'
import { ratingSummary } from '@/lib/ratingSummary'

import Markdown from '../Markdown'
import UserAvatar from '../UserAvatar'

import type { Tab } from '@/types/product'
import type { ProductResponse } from '@generated/model/productResponse'
import type { ReviewResponse } from '@generated/model/reviewResponse'

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

function reviewsErrorStatus(error: unknown): number {
  if (error instanceof ApiError) {
    return error.status
  }
  return 0
}

export default function ProductTabs(props: { product: ProductResponse }) {
  const [tab, setTab] = useState<Tab>('mo-ta')
  const p = props.product
  const info = priceInfo(p)

  const reviewsQuery = useList(p.id ?? '', {
    query: { enabled: p.id !== undefined },
  })
  let reviews: ReviewResponse[] = []
  if (reviewsQuery.data !== undefined) {
    reviews = takeData(reviewsQuery.data)
  }
  const summary = ratingSummary(reviews)

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
          Đánh giá ({summary.count})
        </button>
      </div>
      {tab === 'mo-ta' && (
        <div className="mt-5">
          <Markdown source={p.description ?? p.name ?? ''} />
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
          {reviewsQuery.isPending && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Đang tải đánh giá…</p>
          )}
          {reviewsQuery.isPending === false && reviewsQuery.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {apiErrorMessage('productDetail', reviewsErrorStatus(reviewsQuery.error))}
            </p>
          )}
          {reviewsQuery.isPending === false &&
            reviewsQuery.isError === false &&
            reviews.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Chưa có đánh giá nào cho sản phẩm này.
              </p>
            )}
          {reviews.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-5 rounded-3xl bg-sky-50/70 p-5 md:grid-cols-[auto_1fr] dark:bg-white/5">
                <div className="text-center md:min-w-36">
                  <p className="text-5xl font-extrabold tracking-tight">{summary.value ?? 0}</p>
                  <div className="mt-2 flex justify-center">
                    <Stars value={summary.value ?? 0} size={16} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {summary.count} đánh giá
                  </p>
                </div>
                <div className="space-y-1.5">
                  {summary.breakdown.map(function (pct, i) {
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
                {reviews.map(function (r) {
                  return (
                    <article
                      key={r.id ?? r.buyerDisplayName}
                      className="rounded-3xl border border-sky-100 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar name={r.buyerDisplayName ?? 'Người mua'} />
                        <div>
                          <p className="text-sm font-bold">{r.buyerDisplayName ?? 'Người mua'}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <Stars value={r.stars ?? 0} />
                            <span className="text-xs text-zinc-400">
                              {formatDateTime(r.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        “{r.comment}”
                      </p>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
