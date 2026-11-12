import { useRef, useState } from 'react'

import {
  getList3QueryKey,
  getSummaryQueryKey as getSellerReviewSummaryQueryKey,
  useList3,
  useListTemplates,
  useProducts,
  useReply,
  useReport,
  useSummary as useSellerReviewSummary,
} from '@generated/endpoints/seller-reviews/seller-reviews'
import {
  ChatCircleDots,
  CheckCircle,
  Flag,
  PaperPlaneRight,
  Play,
  SlidersHorizontal,
  Star,
  ThumbsUp,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import UserAvatar from '@/components/UserAvatar'
import { hookErrorMessage, PLACEHOLDER_IMAGE, takeData } from '@/lib/api/apiAdapters'
import {
  reviewItem,
  reviewProductOptionItem,
  reviewReplyTemplateItem,
} from '@/lib/seller/sellerAdapters'
import { useSellerPermissions } from '@/lib/seller/sellerPermissions'

import ReviewReplyTemplateModal from './ReviewReplyTemplateModal'
import ReviewTrendCard from './ReviewTrendCard'

import type { ReviewItem, ReviewProductOption, ReviewReplyTemplateItem } from '@/types/seller'
import type { List3Params } from '@generated/model/list3Params'
import type { ReviewSummaryResponse } from '@generated/model/reviewSummaryResponse'

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE
  }
}

function filterPillClass(active: boolean): string {
  if (active) {
    return 'rounded-2xl px-4 py-2 text-xs font-bold transition bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
  }
  return 'rounded-2xl px-4 py-2 text-xs font-bold transition text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white'
}

interface Props {
  shopId: string
}

export default function SellerReviewsTab({ shopId }: Props) {
  const { can } = useSellerPermissions(shopId)
  const queryClient = useQueryClient()
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [onlyUnreplied, setOnlyUnreplied] = useState(false)
  const [selectedStars, setSelectedStars] = useState<number | undefined>(undefined)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [reportTargetId, setReportTargetId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState(
    'Đánh giá sai sự thật / Cạnh tranh không lành mạnh',
  )
  const [notification, setNotification] = useState<string | null>(null)
  const [lightboxMedia, setLightboxMedia] = useState<{
    type: 'image' | 'video'
    url: string
  } | null>(null)

  const listParams: List3Params = { shopId }
  if (onlyUnreplied) {
    listParams.unreplied = true
  }
  if (selectedStars !== undefined) {
    listParams.stars = selectedStars
  }
  if (selectedProductId !== '') {
    listParams.productId = selectedProductId
  }

  const reviewsQuery = useList3(listParams, { query: { enabled: shopId !== '' } })
  const summaryQuery = useSellerReviewSummary({ shopId }, { query: { enabled: shopId !== '' } })
  const productsQuery = useProducts({ shopId }, { query: { enabled: shopId !== '' } })
  const templatesQuery = useListTemplates({ shopId }, { query: { enabled: shopId !== '' } })

  const replyMutation = useReply({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList3QueryKey() })
        void queryClient.invalidateQueries({ queryKey: getSellerReviewSummaryQueryKey() })
      },
    },
  })
  const reportMutation = useReport({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList3QueryKey() })
        void queryClient.invalidateQueries({ queryKey: getSellerReviewSummaryQueryKey() })
      },
    },
  })

  let productOptions: ReviewProductOption[] = []
  const productNameById = new Map<string, string>()
  if (productsQuery.data !== undefined && productsQuery.data.status === 200) {
    productOptions = takeData(productsQuery.data).map(reviewProductOptionItem)
    for (const option of productOptions) {
      productNameById.set(option.id, option.name)
    }
  }

  let templates: ReviewReplyTemplateItem[] = []
  if (templatesQuery.data !== undefined && templatesQuery.data.status === 200) {
    templates = takeData(templatesQuery.data).map(reviewReplyTemplateItem)
  }

  let reviews: ReviewItem[] = []
  if (reviewsQuery.data !== undefined && reviewsQuery.data.status === 200) {
    reviews = takeData(reviewsQuery.data).map(function (r) {
      return reviewItem(r, productNameById.get(r.productId ?? ''))
    })
  }

  function showToast(msg: string) {
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current)
    }
    setNotification(msg)
    toastTimerRef.current = setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  function handleInsertTemplate(templateContent: string) {
    setReplyError(null)
    if (replyContent.trim() === '') {
      setReplyContent(templateContent)
      return
    }
    setReplyContent(`${replyContent}\n${templateContent}`)
  }

  function handleSendReply(reviewId: string) {
    const trimmed = replyContent.trim()
    if (trimmed === '') {
      setReplyError('Vui lòng nhập nội dung phản hồi.')
      return
    }
    if (trimmed.length > 2000) {
      setReplyError('Nội dung phản hồi tối đa 2000 ký tự.')
      return
    }
    setReplyError(null)
    replyMutation.mutate(
      { id: reviewId, data: { reply: trimmed } },
      {
        onSuccess: function () {
          setReplyTargetId(null)
          setReplyContent('')
          setReplyError(null)
          showToast('Đã gửi phản hồi đánh giá của khách hàng!')
        },
        onError: function (error) {
          setReplyError(hookErrorMessage('sellerReviewReply', error))
        },
      },
    )
  }

  function handleConfirmReport() {
    if (reportTargetId === null) {
      return
    }
    reportMutation.mutate(
      { id: reportTargetId, data: { reason: reportReason } },
      {
        onSuccess: function () {
          setReportTargetId(null)
          showToast('Đã gửi báo cáo đánh giá lên bộ phận kiểm duyệt của sàn!')
        },
      },
    )
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map(function (star) {
          const isFilled = star <= rating
          if (isFilled) {
            return <Star key={star} size={14} weight="fill" className="text-amber-400" />
          }
          return (
            <Star
              key={star}
              size={14}
              weight="regular"
              className="text-zinc-300 dark:text-zinc-600"
            />
          )
        })}
      </div>
    )
  }

  const isAllSelected = !onlyUnreplied && selectedStars === undefined && selectedProductId === ''
  const canReply = can('REVIEW_REPLY')

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification !== null && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-zinc-900">
          <CheckCircle size={18} weight="bold" className="text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            Xem & Phản hồi Đánh giá
          </h2>
          <p className="text-xs text-zinc-500">
            Quản lý phản hồi đánh giá sản phẩm từ người mua và theo dõi chất lượng theo thời gian
          </p>
        </div>

        <button
          type="button"
          onClick={function () {
            setIsTemplateModalOpen(true)
          }}
          className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
        >
          <SlidersHorizontal size={15} weight="bold" />
          Quản lý mẫu ({templates.length})
        </button>
      </div>

      {/* Thống kê đánh giá */}
      {(() => {
        let summaryData: ReviewSummaryResponse | undefined
        if (summaryQuery.data !== undefined && summaryQuery.data.status === 200) {
          summaryData = summaryQuery.data.data
        }
        const reviewCount = summaryData?.reviewCount ?? reviews.length
        let averageValue = 0
        let averageDisplay = '0.0'
        if (summaryData?.averageRating !== null && summaryData?.averageRating !== undefined) {
          averageValue = summaryData.averageRating
          averageDisplay = summaryData.averageRating.toFixed(1)
        }
        const starCounts = [
          { stars: 5, count: summaryData?.fiveStarCount ?? 0, barClass: 'bg-amber-400' },
          { stars: 4, count: summaryData?.fourStarCount ?? 0, barClass: 'bg-amber-400' },
          { stars: 3, count: summaryData?.threeStarCount ?? 0, barClass: 'bg-sky-400' },
          { stars: 2, count: summaryData?.twoStarCount ?? 0, barClass: 'bg-orange-400' },
          { stars: 1, count: summaryData?.oneStarCount ?? 0, barClass: 'bg-red-400' },
        ]
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
              <span className="text-xs font-semibold text-zinc-500">Đánh giá trung bình</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {averageDisplay}
                </span>
                <span className="text-xs text-zinc-400">/ 5.0 sao</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map(function (s) {
                  let weight: 'fill' | 'regular' = 'regular'
                  if (s <= Math.round(averageValue)) {
                    weight = 'fill'
                  }
                  return <Star key={s} size={16} weight={weight} />
                })}
              </div>
              <p className="mt-2 text-xs text-zinc-500">Dựa trên {reviewCount} lượt đánh giá</p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm sm:col-span-2 dark:border-white/10 dark:bg-[#11182a]">
              <span className="text-xs font-semibold text-zinc-500">
                Phân bố đánh giá theo mức sao
              </span>
              <div className="mt-4 space-y-2 text-xs">
                {starCounts.map(function (row) {
                  let pct = 0
                  if (reviewCount > 0) {
                    pct = Math.round((row.count / reviewCount) * 100)
                  }
                  return (
                    <div key={row.stars} className="flex items-center gap-3">
                      <span className="w-12 font-bold text-zinc-700 dark:text-zinc-300">
                        {row.stars} sao
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                        <div
                          className={`h-full rounded-full ${row.barClass}`}
                          style={{ width: pct + '%' }}
                        />
                      </div>
                      <span className="w-16 text-right font-medium text-zinc-500">
                        {row.count} ({pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Xu hướng đánh giá theo thời gian */}
      <ReviewTrendCard shopId={shopId} />

      {/* Bộ lọc & Danh sách đánh giá */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={function () {
                setOnlyUnreplied(false)
                setSelectedStars(undefined)
                setSelectedProductId('')
              }}
              className={filterPillClass(isAllSelected)}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={function () {
                setOnlyUnreplied(!onlyUnreplied)
              }}
              className={filterPillClass(onlyUnreplied)}
            >
              Chưa phản hồi
            </button>
            {[5, 4, 3, 2, 1].map(function (star) {
              const active = selectedStars === star
              return (
                <button
                  key={star}
                  type="button"
                  onClick={function () {
                    if (active) {
                      setSelectedStars(undefined)
                      return
                    }
                    setSelectedStars(star)
                  }}
                  className={filterPillClass(active)}
                >
                  {star} sao
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Lọc theo sản phẩm"
              value={selectedProductId}
              onChange={function (e) {
                setSelectedProductId(e.target.value)
              }}
              className="rounded-2xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            >
              <option value="">Tất cả sản phẩm ({productOptions.length})</option>
              {productOptions.map(function (opt) {
                return (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.reviewCount})
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {reviews.map(function (rev) {
            const isReplying = replyTargetId === rev.id
            return (
              <div
                key={rev.id}
                className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={rev.buyerName} size={36} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">
                          {rev.buyerName}
                        </p>
                        {rev.anonymous && (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                            Ẩn danh
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                          <ThumbsUp size={10} weight="fill" />
                          {rev.helpfulCount}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        {renderStars(rev.rating)}
                        <span className="text-[11px] text-zinc-400">• {rev.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {rev.isReported && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                        Đang khiếu nại
                      </span>
                    )}
                    {canReply && (
                      <button
                        type="button"
                        onClick={function () {
                          setReportTargetId(rev.id)
                        }}
                        title="Báo cáo vi phạm"
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <Flag size={14} weight="bold" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-zinc-500">
                    <span>Sản phẩm:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-100">
                      {rev.productName}
                    </span>
                    {rev.variantLabel !== undefined && (
                      <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                        Phân loại: {rev.variantLabel}
                      </span>
                    )}
                  </div>
                  {rev.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rev.tags.map(function (tag) {
                        return (
                          <span
                            key={tag}
                            className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
                          >
                            {tag}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <p className="mt-1.5 leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {rev.comment}
                  </p>

                  {/* Ảnh & video thực tế khách đăng */}
                  {(rev.images.length > 0 || rev.videoUrl !== undefined) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {rev.images.map(function (img, idx) {
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={function () {
                              setLightboxMedia({ type: 'image', url: img })
                            }}
                            className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10"
                          >
                            <img
                              src={img}
                              alt="Ảnh đánh giá khách hàng"
                              onError={handleImageError}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        )
                      })}
                      {rev.videoUrl !== undefined && (
                        <button
                          type="button"
                          onClick={function () {
                            if (rev.videoUrl !== undefined) {
                              setLightboxMedia({ type: 'video', url: rev.videoUrl })
                            }
                          }}
                          className="relative flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 text-white dark:border-white/10"
                        >
                          <video
                            src={rev.videoUrl}
                            className="h-full w-full object-cover opacity-70"
                            muted
                          />
                          <span className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-black/70">
                            <Play size={12} weight="fill" />
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Phản hồi của shop */}
                  {rev.sellerReply !== undefined && (
                    <div className="mt-3 rounded-2xl bg-indigo-50/80 p-3 text-xs text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200">
                      <p className="flex items-center gap-1.5 font-bold">
                        <ChatCircleDots size={14} weight="bold" className="text-indigo-600" />
                        Phản hồi của Người bán:
                      </p>
                      <p className="mt-1 leading-relaxed whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                        {rev.sellerReply}
                      </p>
                    </div>
                  )}

                  {/* Form trả lời */}
                  {isReplying && (
                    <div className="mt-3 rounded-2xl border border-indigo-200 bg-white p-3.5 dark:border-indigo-900/40 dark:bg-white/10">
                      {templates.length > 0 && (
                        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            Chèn mẫu nhanh:
                          </span>
                          {templates.map(function (tpl) {
                            return (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={function () {
                                  handleInsertTemplate(tpl.content)
                                }}
                                className="rounded-full border border-indigo-200 bg-indigo-50/70 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/25"
                              >
                                {tpl.title}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={replyContent}
                        onChange={function (e) {
                          setReplyContent(e.target.value)
                          if (replyError !== null) {
                            setReplyError(null)
                          }
                        }}
                        placeholder="Nhập nội dung phản hồi công khai dưới đánh giá..."
                        className="w-full resize-none bg-transparent text-xs outline-none dark:text-white"
                      />

                      {replyError !== null && (
                        <p className="mt-2 rounded-xl bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
                          {replyError}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-400">
                          {replyContent.trim().length}/2000
                        </span>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={function () {
                              setReplyTargetId(null)
                              setReplyContent('')
                              setReplyError(null)
                            }}
                            className="rounded-xl px-3 py-1 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={replyMutation.isPending}
                            onClick={function () {
                              handleSendReply(rev.id)
                            }}
                            className="btn-primary flex items-center gap-1 rounded-xl px-3.5 py-1 text-[11px] font-bold disabled:opacity-50"
                          >
                            <PaperPlaneRight size={12} weight="bold" />
                            Gửi phản hồi
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {rev.sellerReply === undefined && !isReplying && canReply && (
                    <button
                      type="button"
                      onClick={function () {
                        setReplyTargetId(rev.id)
                        setReplyContent('')
                        setReplyError(null)
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      <ChatCircleDots size={14} weight="bold" />
                      Trả lời đánh giá này
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {reviews.length === 0 && (
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm">Không có đánh giá nào phù hợp bộ lọc hiện tại.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal quản lý mẫu phản hồi nhanh */}
      {isTemplateModalOpen && (
        <ReviewReplyTemplateModal
          shopId={shopId}
          templates={templates}
          canManage={canReply}
          onClose={function () {
            setIsTemplateModalOpen(false)
          }}
          onChanged={function (msg) {
            showToast(msg)
          }}
        />
      )}

      {/* Modal Báo cáo vi phạm */}
      {reportTargetId !== null && (
        <Modal
          title="Báo cáo đánh giá xấu / vi phạm"
          onClose={function () {
            setReportTargetId(null)
          }}
          widthClass="max-w-md"
        >
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Nếu đánh giá chứa từ ngữ xúc phạm hoặc nghi vấn đối thủ cạnh tranh chơi xấu, ban quản
            trị sàn sẽ xem xét gỡ bỏ.
          </p>

          <div className="mt-4">
            <label
              htmlFor="reportReviewReason"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Lý do báo cáo
            </label>
            <select
              id="reportReviewReason"
              value={reportReason}
              onChange={function (e) {
                setReportReason(e.target.value)
              }}
              className="mt-1.5 w-full rounded-full border border-zinc-300 p-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
            >
              <option value="Đánh giá sai sự thật / Cạnh tranh không lành mạnh">
                Đánh giá sai sự thật / Cạnh tranh không lành mạnh
              </option>
              <option value="Từ ngữ thô tục, xúc phạm">Từ ngữ thô tục, xúc phạm</option>
              <option value="Đánh giá không liên quan tới sản phẩm">
                Đánh giá không liên quan tới sản phẩm
              </option>
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={function () {
                setReportTargetId(null)
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmReport}
              className="rounded-2xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Gửi báo cáo
            </button>
          </div>
        </Modal>
      )}
      {/* Modal xem ảnh / video phóng to */}
      {lightboxMedia !== null && (
        <Modal
          title="Media đánh giá của khách hàng"
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
                onError={handleImageError}
                className="max-h-[70vh] w-full object-contain"
              />
            )}
            {lightboxMedia.type === 'video' && (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-h-[70vh] w-full object-contain"
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
