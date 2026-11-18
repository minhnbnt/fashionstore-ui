import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useOpenConversationWithBuyer } from '@generated/endpoints/chat/chat'
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
  CaretDown,
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
import { notify } from '@/lib/notifications'
import {
  groupReviewsByProduct,
  reviewItem,
  reviewProductOptionItem,
  reviewReplyTemplateItem,
} from '@/lib/seller/sellerAdapters'
import { useSellerPermissions } from '@/lib/seller/sellerPermissions'
import {
  badgeToneClass,
  cn,
  dangerButtonClass,
  FOCUS_RING_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/lib/ui/styles'

import ReviewReplyTemplateModal from './ReviewReplyTemplateModal'
import ReviewTrendCard from './ReviewTrendCard'

import type { ReviewGroup } from '@/lib/seller/sellerAdapters'
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
    return 'btn-primary rounded-full px-4 py-2 text-xs font-bold transition'
  }
  return 'rounded-full px-4 py-2 text-xs font-bold transition text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white'
}

interface Props {
  shopId: string
}

export default function SellerReviewsTab({ shopId }: Props) {
  const { can } = useSellerPermissions(shopId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const openWithBuyerMutation = useOpenConversationWithBuyer()

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
  const [lightboxMedia, setLightboxMedia] = useState<{
    type: 'image' | 'video'
    url: string
  } | null>(null)

  const [openGroupIds, setOpenGroupIds] = useState<Set<string>>(new Set())

  function toggleGroup(productId: string) {
    setOpenGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

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

  const groups: ReviewGroup[] = groupReviewsByProduct(reviews)

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
          notify.success('Đã gửi phản hồi đánh giá của khách hàng!')
        },
        onError: function (error) {
          const msg = hookErrorMessage('sellerReviewReply', error)
          setReplyError(msg)
          notify.error(msg)
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
          notify.success('Đã gửi báo cáo đánh giá lên bộ phận kiểm duyệt của sàn!')
        },
        onError: function (error) {
          notify.fromError(error, undefined, 'Không thể gửi báo cáo đánh giá. Vui lòng thử lại.')
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
          className={cn(secondaryButtonClass(), 'self-start text-xs')}
        >
          <SlidersHorizontal size={15} weight="bold" />
          Quản lý mẫu ({templates.length})
        </button>
      </div>

      {/* Thống kê đánh giá */}
      {(() => {
        let summaryData: ReviewSummaryResponse | undefined
        if (summaryQuery.data !== undefined) {
          summaryData = takeData(summaryQuery.data)
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
          { stars: 2, count: summaryData?.twoStarCount ?? 0, barClass: 'bg-amber-500' },
          { stars: 1, count: summaryData?.oneStarCount ?? 0, barClass: 'bg-rose-500' },
        ]
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={cn(PANEL_CLASS, 'p-6')}>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Đánh giá trung bình
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-black text-blue-700 dark:text-sky-300">
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
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Dựa trên {reviewCount} lượt đánh giá
              </p>
            </div>

            <div className={cn(PANEL_CLASS, 'p-6 sm:col-span-2')}>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
                      <span className="w-16 text-right font-medium text-zinc-500 dark:text-zinc-400">
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
      <div className={cn(PANEL_CLASS, 'p-6')}>
        <div className="flex flex-col gap-3 border-b border-zinc-200/80 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-white/10">
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
              className="rounded-full border border-zinc-300 bg-white/85 px-4 py-2 text-xs font-semibold text-[#17203a] outline-none focus:border-blue-600 dark:border-white/15 dark:bg-[#0a0f1e] dark:text-zinc-200"
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

        <div className="mt-5 space-y-3">
          {groups.map(function (group: ReviewGroup) {
            const isOpen = openGroupIds.has(group.productId)
            const unrepliedCount = group.reviews.filter((r) => r.sellerReply === undefined).length
            let caretClass = 'transition-transform'
            if (isOpen) {
              caretClass += ' rotate-180'
            }
            return (
              <div
                key={group.productId}
                className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-white/10"
              >
                {/* Group header — button cả dòng để toggle; Link stopPropagation để chỉ navigate */}
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-white/5"
                  onClick={function () {
                    toggleGroup(group.productId)
                  }}
                  aria-expanded={isOpen}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    {group.productId !== '' && (
                      <Link
                        to={`/product/${group.productId}`}
                        onClick={function (e) {
                          e.stopPropagation()
                        }}
                        className="text-sm font-bold text-zinc-900 hover:underline dark:text-white"
                      >
                        {group.productName}
                      </Link>
                    )}
                    {group.productId === '' && (
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">
                        {group.productName}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">{group.reviews.length} đánh giá</span>
                    {unrepliedCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        {unrepliedCount} chưa phản hồi
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <CaretDown size={14} weight="bold" className={caretClass} />
                  </span>
                </button>

                {/* Review list — chỉ render khi open */}
                {isOpen && (
                  <div className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-white/5 dark:border-white/10">
                    {group.reviews.map(function (rev) {
                      const isReplying = replyTargetId === rev.id
                      return (
                        <div key={rev.id} className="bg-zinc-50/50 p-4 dark:bg-white/5">
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
                                  {!rev.anonymous && rev.buyerId !== undefined && (
                                    <button
                                      type="button"
                                      title="Nhắn tin hỗ trợ người mua"
                                      onClick={function () {
                                        openWithBuyerMutation.mutate(
                                          { data: { shopId: shopId, buyerId: rev.buyerId! } },
                                          {
                                            onSuccess: function (result) {
                                              if (result.status === 200) {
                                                const convId = result.data.id ?? ''
                                                let targetUrl = `/shop?shopId=${encodeURIComponent(shopId)}&tab=chat`
                                                if (convId !== '') {
                                                  targetUrl = `${targetUrl}&convId=${encodeURIComponent(convId)}`
                                                }
                                                void navigate(targetUrl)
                                              }
                                            },
                                          },
                                        )
                                      }}
                                      disabled={openWithBuyerMutation.isPending}
                                      className={cn(
                                        'inline-flex cursor-pointer items-center gap-1 rounded-full border border-zinc-300 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 transition hover:border-blue-600 hover:text-blue-700 disabled:opacity-50 dark:border-white/15 dark:text-zinc-300 dark:hover:border-sky-400 dark:hover:text-sky-300',
                                        FOCUS_RING_CLASS,
                                      )}
                                    >
                                      <ChatCircleDots size={11} weight="bold" />
                                      Nhắn tin
                                    </button>
                                  )}
                                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-500/20 dark:text-sky-200">
                                    <ThumbsUp size={10} weight="fill" />
                                    {rev.helpfulCount}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2">
                                  {renderStars(rev.rating)}
                                  <span className="text-[11px] text-zinc-400">
                                    • {rev.createdAt}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {rev.isReported && (
                                <span
                                  className={cn(
                                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                                    badgeToneClass('danger'),
                                  )}
                                >
                                  Đang khiếu nại
                                </span>
                              )}
                              {canReply && (
                                <button
                                  type="button"
                                  aria-label="Báo cáo vi phạm"
                                  onClick={function () {
                                    setReportTargetId(rev.id)
                                  }}
                                  title="Báo cáo vi phạm"
                                  className={cn(
                                    'cursor-pointer rounded-full p-1.5 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300',
                                    FOCUS_RING_CLASS,
                                  )}
                                >
                                  <Flag size={14} weight="bold" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 text-xs">
                            <div className="flex flex-wrap items-center gap-2 font-semibold text-zinc-500">
                              {rev.variantLabel !== undefined && (
                                <span className="rounded-full bg-zinc-200/70 px-2.5 py-0.5 text-[11px] text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
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
                                      className={cn(
                                        'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                                        badgeToneClass('info'),
                                      )}
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
                                      aria-label={`Xem ảnh đánh giá ${idx + 1} phóng to`}
                                      onClick={function () {
                                        setLightboxMedia({ type: 'image', url: img })
                                      }}
                                      className="h-16 w-16 cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10"
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
                                    aria-label="Xem video đánh giá phóng to"
                                    onClick={function () {
                                      if (rev.videoUrl !== undefined) {
                                        setLightboxMedia({ type: 'video', url: rev.videoUrl })
                                      }
                                    }}
                                    className="relative flex h-16 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 text-white dark:border-white/10"
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
                              <div className="mt-3 rounded-2xl border border-sky-200/80 bg-sky-50/70 p-3 text-xs text-[#17203a] dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200">
                                <p className="flex items-center gap-1.5 font-bold">
                                  <ChatCircleDots
                                    size={14}
                                    weight="bold"
                                    className="text-blue-700 dark:text-sky-300"
                                  />
                                  Phản hồi của Người bán:
                                </p>
                                <p className="mt-1 leading-relaxed whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                                  {rev.sellerReply}
                                </p>
                              </div>
                            )}

                            {/* Form trả lời */}
                            {isReplying && (
                              <div className="mt-3 rounded-2xl border border-sky-200 bg-white p-3.5 dark:border-sky-500/30 dark:bg-white/10">
                                {templates.length > 0 && (
                                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
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
                                          className="cursor-pointer rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200 dark:hover:bg-sky-500/25"
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
                                  <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
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
                                      className="cursor-pointer rounded-full px-3.5 py-1 text-[11px] font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      type="button"
                                      disabled={replyMutation.isPending}
                                      onClick={function () {
                                        handleSendReply(rev.id)
                                      }}
                                      className={cn(
                                        primaryButtonClass(),
                                        'inline-flex items-center gap-1 rounded-full px-4 py-1 text-[11px] font-bold disabled:opacity-50',
                                      )}
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
                                className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300"
                              >
                                <ChatCircleDots size={14} weight="bold" />
                                Trả lời đánh giá này
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {reviewsQuery.isLoading && (
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm">Đang tải danh sách đánh giá...</p>
            </div>
          )}

          {!reviewsQuery.isLoading && reviewsQuery.isError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
              {hookErrorMessage('sellerReviewList', reviewsQuery.error)}
            </div>
          )}

          {!reviewsQuery.isLoading && !reviewsQuery.isError && groups.length === 0 && (
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
            notify.success(msg)
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
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
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
              className="mt-1.5 w-full rounded-full border border-zinc-300 bg-white/85 px-4 py-2.5 text-xs outline-none focus:border-blue-600 dark:border-white/15 dark:bg-[#0a0f1e] dark:text-white"
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
              className={cn(secondaryButtonClass(), 'text-xs')}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmReport}
              className={cn(dangerButtonClass(), 'px-5 text-xs')}
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
              >
                <track kind="captions" />
              </video>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
