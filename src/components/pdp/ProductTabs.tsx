import { useState } from 'react'
import { useNavigate } from 'react-router'

import {
  getList1QueryKey,
  useList1,
  useSummary2,
  useToggleHelpful,
} from '@generated/endpoints/reviews/reviews'
import { ChatCircleDots, Package, Play, Ruler, Star, ThumbsUp } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { useSessionQuery } from '@/hooks/useSession'
import {
  apiErrorMessage,
  fallbackImageOnError,
  hookErrorMessage,
  urlOrPlaceholder,
  priceInfo,
  takeData,
} from '@/lib/api/apiAdapters'
import { ApiError } from '@/lib/api/apiFetch'
import { formatDateTime } from '@/lib/format'
import { ratingSummary } from '@/lib/shop/ratingSummary'

import Markdown from '../Markdown'
import Modal from '../Modal'
import UserAvatar from '../UserAvatar'

import type { Tab } from '@/types/product'
import type { List1Sort } from '@generated/model/list1Sort'
import type { ProductResponse } from '@generated/model/productResponse'
import type { ReviewResponse } from '@generated/model/reviewResponse'

function Stars(props: { value: number; size?: number }) {
  const s = props.size || 14
  return (
    <span className="flex items-center gap-0.5 text-sky-400">
      {[1, 2, 3, 4, 5].map(function (i) {
        if (i <= Math.round(props.value)) {
          return <Star key={i} size={s} weight="fill" />
        }
        return <Star key={i} size={s} weight="regular" className="opacity-40" />
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

function tabButtonClass(active: boolean): string {
  if (active) {
    return 'rounded-full bg-[#17203a] px-4 py-2 text-sm font-bold text-white shadow-sm dark:bg-white dark:text-[#0a0f1e]'
  }
  return 'rounded-full border border-sky-100 bg-white/70 px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-sky-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10'
}

function filterChipClass(active: boolean): string {
  if (active) {
    return 'rounded-full bg-[#17203a] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm dark:bg-white dark:text-[#0a0f1e]'
  }
  return 'rounded-full border border-sky-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-sky-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10'
}

function starDistributionPct(count: number, total: number): number {
  if (total <= 0) {
    return 0
  }
  return Math.round((count / total) * 100)
}

export default function ProductTabs(props: { product: ProductResponse }) {
  const [tab, setTab] = useState<Tab>('mo-ta')
  const [sort, setSort] = useState<List1Sort>('HELPFUL')
  const [starsFilter, setStarsFilter] = useState<number | undefined>(undefined)
  const [hasMediaOnly, setHasMediaOnly] = useState(false)
  const [helpfulError, setHelpfulError] = useState<string | null>(null)
  const [lightboxMedia, setLightboxMedia] = useState<{
    type: 'image' | 'video'
    url: string
  } | null>(null)

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = useSessionQuery()
  const isLoggedIn = session !== null && session !== undefined

  const p = props.product
  const productId = p.id ?? ''
  const info = priceInfo(p)

  const summaryQuery = useSummary2(productId, {
    query: { enabled: p.id !== undefined },
  })
  const reviewsQuery = useList1(
    productId,
    { sort, stars: starsFilter, hasMedia: hasMediaOnly },
    { query: { enabled: p.id !== undefined } },
  )
  const helpfulMutation = useToggleHelpful()

  let reviews: ReviewResponse[] = []
  if (reviewsQuery.data !== undefined) {
    reviews = takeData(reviewsQuery.data)
  }

  let totalReviews = 0
  let averageDisplay = '0.0'
  let averageNumber = 0
  let starRows: { stars: number; count: number; pct: number }[] = [
    { stars: 5, count: 0, pct: 0 },
    { stars: 4, count: 0, pct: 0 },
    { stars: 3, count: 0, pct: 0 },
    { stars: 2, count: 0, pct: 0 },
    { stars: 1, count: 0, pct: 0 },
  ]
  let withMediaCount = 0

  if (summaryQuery.data !== undefined) {
    const summaryData = takeData(summaryQuery.data)
    totalReviews = summaryData.reviewCount ?? 0
    if (summaryData.averageRating !== null && summaryData.averageRating !== undefined) {
      averageNumber = summaryData.averageRating
      averageDisplay = summaryData.averageRating.toFixed(1)
    }
    const counts = [
      summaryData.fiveStarCount ?? 0,
      summaryData.fourStarCount ?? 0,
      summaryData.threeStarCount ?? 0,
      summaryData.twoStarCount ?? 0,
      summaryData.oneStarCount ?? 0,
    ]
    starRows = counts.map((count, idx) => ({
      stars: 5 - idx,
      count,
      pct: starDistributionPct(count, totalReviews),
    }))
    withMediaCount = summaryData.withMediaCount ?? 0
  } else {
    const fallback = ratingSummary(reviews)
    totalReviews = fallback.count
    if (fallback.value !== null) {
      averageNumber = fallback.value
      averageDisplay = fallback.value.toFixed(1)
    }
    starRows = fallback.breakdown.map((pct, idx) => ({
      stars: 5 - idx,
      count: Math.round((pct / 100) * fallback.count),
      pct,
    }))
    withMediaCount = reviews.filter((r) => (r.media?.length ?? 0) > 0).length
  }

  let maxHelpfulCount = 0
  if (sort === 'HELPFUL') {
    for (const r of reviews) {
      const count = r.helpfulCount ?? 0
      if (count > maxHelpfulCount) {
        maxHelpfulCount = count
      }
    }
  }

  function handleToggleHelpful(review: ReviewResponse) {
    if (!review.id) {
      return
    }
    if (!isLoggedIn) {
      void navigate('/login', { state: { from: '/product/' + productId } })
      return
    }
    setHelpfulError(null)
    helpfulMutation.mutate(
      { reviewId: review.id },
      {
        onSuccess: function () {
          void queryClient.invalidateQueries({ queryKey: getList1QueryKey(productId) })
        },
        onError: function (err) {
          setHelpfulError(hookErrorMessage('reviewHelpful', err))
        },
      },
    )
  }

  return (
    <section className="mt-10 rounded-3xl border border-sky-100 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={function () {
            setTab('mo-ta')
          }}
          className={tabButtonClass(tab === 'mo-ta')}
        >
          Mô tả
        </button>
        <button
          type="button"
          onClick={function () {
            setTab('thong-so')
          }}
          className={tabButtonClass(tab === 'thong-so')}
        >
          Thông số
        </button>
        <button
          type="button"
          onClick={function () {
            setTab('danh-gia')
          }}
          className={tabButtonClass(tab === 'danh-gia')}
        >
          Đánh giá ({totalReviews})
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
        <div className="mt-5 space-y-5">
          {totalReviews > 0 && (
            <div className="grid grid-cols-1 gap-5 rounded-3xl bg-sky-50/70 p-5 md:grid-cols-[auto_1fr] dark:bg-white/5">
              <div className="text-center md:min-w-36">
                <p className="text-5xl font-extrabold tracking-tight">{averageDisplay}</p>
                <div className="mt-2 flex justify-center">
                  <Stars value={averageNumber} size={16} />
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {totalReviews} đánh giá
                </p>
              </div>
              <div className="space-y-1.5">
                {starRows.map(function (row) {
                  return (
                    <div key={row.stars} className="flex items-center gap-2 text-xs font-bold">
                      <span className="w-6 text-zinc-500">{row.stars}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-sky-100 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-900 to-sky-400"
                          style={{ width: row.pct + '%' }}
                        />
                      </div>
                      <span className="w-16 text-right text-zinc-500">
                        {row.count} ({row.pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {totalReviews > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={function () {
                    setStarsFilter(undefined)
                    setHasMediaOnly(false)
                  }}
                  className={filterChipClass(starsFilter === undefined && !hasMediaOnly)}
                >
                  Tất cả ({totalReviews})
                </button>
                {[5, 4, 3, 2, 1].map(function (s) {
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={function () {
                        if (starsFilter === s) {
                          setStarsFilter(undefined)
                        } else {
                          setStarsFilter(s)
                        }
                      }}
                      className={filterChipClass(starsFilter === s)}
                    >
                      {s}★
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={function () {
                    setHasMediaOnly(!hasMediaOnly)
                  }}
                  className={filterChipClass(hasMediaOnly)}
                >
                  Có hình ảnh / video ({withMediaCount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={function () {
                    setSort('HELPFUL')
                  }}
                  className={filterChipClass(sort === 'HELPFUL')}
                >
                  Hữu ích nhất
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setSort('NEWEST')
                  }}
                  className={filterChipClass(sort === 'NEWEST')}
                >
                  Mới nhất
                </button>
              </div>
            </div>
          )}

          {helpfulError !== null && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200">
              {helpfulError}
            </p>
          )}

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
                Chưa có đánh giá nào phù hợp cho sản phẩm này.
              </p>
            )}

          {reviews.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {reviews.map(function (r) {
                const count = r.helpfulCount ?? 0
                const isTopHelpful =
                  sort === 'HELPFUL' && maxHelpfulCount > 0 && count === maxHelpfulCount
                const isMine = r.mine === true
                const isLiked = r.helpfulByMe === true
                const media = r.media ?? []
                const imageMedia = media.filter((m) => m.kind === 'IMAGE')
                const videoMedia = media.find((m) => m.kind === 'VIDEO')
                const tags = r.tags ?? []

                let cardClass =
                  'flex flex-col justify-between rounded-3xl border border-sky-100 bg-white p-4 dark:border-white/10 dark:bg-white/5'
                if (isTopHelpful) {
                  cardClass =
                    'flex flex-col justify-between rounded-3xl border-2 border-sky-300 bg-sky-50/40 p-4 dark:border-sky-400/50 dark:bg-sky-500/10'
                }

                let helpfulButtonClass =
                  'inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10'
                if (isLiked) {
                  helpfulButtonClass =
                    'inline-flex items-center gap-1.5 rounded-full border border-blue-600 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-200'
                }

                let thumbsWeight: 'fill' | 'regular' = 'regular'
                if (isLiked) {
                  thumbsWeight = 'fill'
                }

                return (
                  <article key={r.id ?? r.buyerDisplayName} className={cardClass}>
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={r.buyerDisplayName ?? 'Người mua'} />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold">
                                {r.buyerDisplayName ?? 'Người mua'}
                              </p>
                              {isTopHelpful && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                                  Hữu ích nhất
                                </span>
                              )}
                              {Boolean(r.edited) && (
                                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                                  Đã chỉnh sửa
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              <Stars value={r.stars ?? 0} />
                              <span className="text-xs text-zinc-400">
                                {formatDateTime(r.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {Boolean(r.variantLabel) && (
                        <p className="mt-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Phân loại hàng: <span className="font-semibold">{r.variantLabel}</span>
                        </p>
                      )}

                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tags.map(function (tag) {
                            return (
                              <span
                                key={tag}
                                className="rounded-full border border-sky-100 bg-sky-50/70 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:border-white/10 dark:bg-white/10 dark:text-sky-200"
                              >
                                {tag}
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {Boolean(r.comment) && (
                        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                          “{r.comment}”
                        </p>
                      )}

                      {(imageMedia.length > 0 || videoMedia !== undefined) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {imageMedia.map(function (m) {
                            const url = urlOrPlaceholder(m.url)
                            return (
                              <button
                                key={m.uploadId ?? url}
                                type="button"
                                onClick={function () {
                                  setLightboxMedia({ type: 'image', url })
                                }}
                                className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200 transition hover:opacity-90 dark:border-white/15"
                              >
                                <img
                                  src={url}
                                  alt="Ảnh đánh giá từ người mua"
                                  loading="lazy"
                                  onError={fallbackImageOnError}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            )
                          })}
                          {videoMedia !== undefined && (
                            <button
                              type="button"
                              aria-label="Xem video đánh giá"
                              onClick={function () {
                                setLightboxMedia({
                                  type: 'video',
                                  url: urlOrPlaceholder(videoMedia.url),
                                })
                              }}
                              className="relative flex h-16 w-24 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 text-white transition hover:opacity-90 dark:border-white/15"
                            >
                              <video
                                src={urlOrPlaceholder(videoMedia.url)}
                                className="h-full w-full object-cover opacity-70"
                                muted
                              />
                              <span className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white">
                                <Play size={14} weight="fill" />
                              </span>
                            </button>
                          )}
                        </div>
                      )}

                      {Boolean(r.sellerReply) && (
                        <div className="mt-3 rounded-2xl bg-sky-50/80 p-3 text-xs dark:bg-white/10">
                          <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-blue-900 dark:text-sky-200">
                            <span className="inline-flex items-center gap-1.5">
                              <ChatCircleDots size={14} weight="bold" />
                              Phản hồi của Shop
                            </span>
                            {Boolean(r.repliedAt) && (
                              <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                                {formatDateTime(r.repliedAt)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 leading-relaxed text-zinc-700 dark:text-zinc-200">
                            {r.sellerReply}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-sky-100/80 pt-3 dark:border-white/10">
                      <button
                        type="button"
                        disabled={isMine || helpfulMutation.isPending}
                        onClick={function () {
                          handleToggleHelpful(r)
                        }}
                        className={helpfulButtonClass}
                      >
                        <ThumbsUp size={14} weight={thumbsWeight} />
                        <span>Hữu ích ({count})</span>
                      </button>
                      {isMine && (
                        <span className="text-[11px] font-semibold text-zinc-400">
                          Đánh giá của bạn
                        </span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {lightboxMedia !== null && (
        <Modal
          title="Media đánh giá thực tế"
          onClose={function () {
            setLightboxMedia(null)
          }}
          widthClass="max-w-2xl"
        >
          <div className="mt-4 overflow-hidden rounded-2xl bg-zinc-950">
            {lightboxMedia.type === 'image' && (
              <img
                src={lightboxMedia.url}
                alt="Ảnh đánh giá phóng to"
                onError={fallbackImageOnError}
                className="max-h-[70vh] w-full object-contain"
              />
            )}
            {lightboxMedia.type === 'video' && (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-h-[70vh] w-full object-contain"
              >
                <track kind="captions" />
              </video>
            )}
          </div>
        </Modal>
      )}
    </section>
  )
}
