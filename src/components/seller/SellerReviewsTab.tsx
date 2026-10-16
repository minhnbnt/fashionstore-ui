import { useState } from 'react'

import { Star, ChatCircleDots, Flag, CheckCircle, X, PaperPlaneRight } from '@phosphor-icons/react'

import type { ReviewItem } from './sellerData'

interface Props {
  reviews: ReviewItem[]
  onReplyReview: (reviewId: string, replyText: string) => void
  onReportReview: (reviewId: string, reason: string) => void
}

export default function SellerReviewsTab({ reviews, onReplyReview, onReportReview }: Props) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREPLIED' | '5_STAR' | 'LOW_STAR'>(
    'ALL',
  )
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [reportTargetId, setReportTargetId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState(
    'Đánh giá sai sự thật / Cạnh tranh không lành mạnh',
  )
  const [notification, setNotification] = useState<string | null>(null)

  function showToast(msg: string) {
    setNotification(msg)
    setTimeout(function () {
      setNotification(null)
    }, 3000)
  }

  function handleSendReply(reviewId: string) {
    if (replyContent.trim() === '') {
      alert('Vui lòng nhập nội dung phản hồi.')
      return
    }
    onReplyReview(reviewId, replyContent)
    setReplyTargetId(null)
    setReplyContent('')
    showToast('Đã gửi phản hồi đánh giá của khách hàng!')
  }

  function handleConfirmReport() {
    if (reportTargetId !== null) {
      onReportReview(reportTargetId, reportReason)
      setReportTargetId(null)
      showToast('Đã gửi báo cáo đánh giá lên bộ phận kiểm duyệt của sàn!')
    }
  }

  const filteredReviews = reviews.filter(function (r) {
    if (activeFilter === 'UNREPLIED' && r.sellerReply !== undefined) {
      return false
    }
    if (activeFilter === '5_STAR' && r.rating !== 5) {
      return false
    }
    if (activeFilter === 'LOW_STAR' && r.rating > 3) {
      return false
    }
    return true
  })

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map(function (star) {
          const isFilled = star <= rating
          return (
            <Star
              key={star}
              size={14}
              weight={isFilled ? 'fill' : 'regular'}
              className={isFilled ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}
            />
          )
        })}
      </div>
    )
  }

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
      <div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">
          Xem & Phản hồi Đánh giá
        </h2>
        <p className="text-xs text-zinc-500">
          Quản lý phản hồi đánh giá sản phẩm từ người mua và khiếu nại đánh giá xấu
        </p>
      </div>

      {/* Thống kê đánh giá */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-semibold text-zinc-500">Đánh giá trung bình</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black text-orange-600 dark:text-orange-400">4.9</span>
            <span className="text-xs text-zinc-400">/ 5.0 sao</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-amber-400">
            {[1, 2, 3, 4, 5].map(function (s) {
              return <Star key={s} size={16} weight="fill" />
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">Dựa trên 1,248 lượt đánh giá</p>
        </div>

        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:col-span-2 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-semibold text-zinc-500">Tỷ lệ hài lòng của khách hàng</span>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-12 font-bold text-zinc-700 dark:text-zinc-300">5 sao</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-amber-400" style={{ width: '92%' }} />
              </div>
              <span className="w-10 text-right font-medium text-zinc-500">92%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-12 font-bold text-zinc-700 dark:text-zinc-300">4 sao</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-amber-400" style={{ width: '6%' }} />
              </div>
              <span className="w-10 text-right font-medium text-zinc-500">6%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-12 font-bold text-zinc-700 dark:text-zinc-300">1-3 sao</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-red-400" style={{ width: '2%' }} />
              </div>
              <span className="w-10 text-right font-medium text-zinc-500">2%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bộ lọc & Danh sách đánh giá */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          {[
            { id: 'ALL', label: 'Tất cả đánh giá' },
            { id: 'UNREPLIED', label: 'Chưa phản hồi' },
            { id: '5_STAR', label: '5 sao tuyệt vời' },
            { id: 'LOW_STAR', label: '1 - 3 sao cần chú ý' },
          ].map(function (tab) {
            const isCurrent = activeFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={function () {
                  setActiveFilter(tab.id as 'ALL' | 'UNREPLIED' | '5_STAR' | 'LOW_STAR')
                }}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
                  isCurrent
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="mt-5 space-y-4">
          {filteredReviews.map(function (rev) {
            const isReplying = replyTargetId === rev.id
            return (
              <div
                key={rev.id}
                className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white uppercase">
                      {rev.buyerName.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {rev.buyerName}
                      </p>
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
                  </div>
                </div>

                <div className="mt-3 text-xs">
                  <p className="font-semibold text-zinc-500">Sản phẩm: {rev.productName}</p>
                  <p className="mt-1 leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {rev.comment}
                  </p>

                  {/* Ảnh thực tế khách đăng */}
                  {rev.images.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-2">
                      {rev.images.map(function (img, idx) {
                        return (
                          <img
                            key={idx}
                            src={img}
                            alt=""
                            className="h-16 w-16 rounded-xl border border-zinc-200 object-cover"
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Phản hồi của shop */}
                  {rev.sellerReply !== undefined && (
                    <div className="mt-3 rounded-2xl bg-orange-50/80 p-3 text-xs text-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
                      <p className="flex items-center gap-1.5 font-bold">
                        <ChatCircleDots size={14} weight="bold" className="text-orange-600" />
                        Phản hồi của Người bán:
                      </p>
                      <p className="mt-1 leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {rev.sellerReply}
                      </p>
                    </div>
                  )}

                  {/* Form trả lời */}
                  {isReplying && (
                    <div className="mt-3 rounded-2xl border border-orange-200 bg-white p-3 dark:border-orange-900/40 dark:bg-zinc-900">
                      <textarea
                        rows={2}
                        value={replyContent}
                        onChange={function (e) {
                          setReplyContent(e.target.value)
                        }}
                        placeholder="Nhập câu trả lời cảm ơn hoặc giải đáp thắc mắc của bạn..."
                        className="w-full bg-transparent text-xs outline-none"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={function () {
                            setReplyTargetId(null)
                          }}
                          className="rounded-xl px-3 py-1 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={function () {
                            handleSendReply(rev.id)
                          }}
                          className="flex items-center gap-1 rounded-xl bg-orange-600 px-3.5 py-1 text-[11px] font-bold text-white hover:bg-orange-700"
                        >
                          <PaperPlaneRight size={12} weight="bold" />
                          Gửi phản hồi
                        </button>
                      </div>
                    </div>
                  )}

                  {rev.sellerReply === undefined && !isReplying && (
                    <button
                      type="button"
                      onClick={function () {
                        setReplyTargetId(rev.id)
                        setReplyContent('')
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline dark:text-orange-400"
                    >
                      <ChatCircleDots size={14} weight="bold" />
                      Trả lời đánh giá này
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {filteredReviews.length === 0 && (
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm">Không có đánh giá nào trong danh mục này.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Báo cáo vi phạm */}
      {reportTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Báo cáo đánh giá xấu / vi phạm
              </h3>
              <button
                type="button"
                onClick={function () {
                  setReportTargetId(null)
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

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
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
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
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
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
          </div>
        </div>
      )}
    </div>
  )
}
