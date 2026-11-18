import { useState } from 'react'
import { Link } from 'react-router'

import {
  getGetSellerQnaStatsQueryKey,
  getGetSellerQuestionQueryKey,
  getListSellerQuestionsQueryKey,
  useCloseSellerQuestion,
  useCreateSellerAnswer,
  useDeleteSellerAnswer,
  useGetSellerQuestion,
  useReopenSellerQuestion,
  useUpdateSellerAnswer,
} from '@generated/endpoints/seller-q-a/seller-q-a'
import { ArrowSquareOut, Clock, Lock, LockOpen, PencilSimple, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import UserAvatar from '@/components/UserAvatar'
import { fallbackImageOnError, takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { formatDateTime } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { useSellerPermissions } from '@/lib/seller/sellerPermissions'
import { cn, FOCUS_RING_CLASS, primaryButtonClass, secondaryButtonClass } from '@/lib/ui/styles'

import type { ProductAnswerResponse } from '@generated/model/productAnswerResponse'
import type { SellerQuestionResponse } from '@generated/model/sellerQuestionResponse'

export interface SellerQnaDetailModalProps {
  shopId: string
  questionId: string | null
  isOpen: boolean
  onClose: () => void
}

function renderStatusBadge(status?: string) {
  if (status === 'UNANSWERED') {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
        Chưa trả lời
      </span>
    )
  }
  if (status === 'ANSWERED') {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
        Đã trả lời
      </span>
    )
  }
  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      Đã đóng
    </span>
  )
}

export default function SellerQnaDetailModal({
  shopId,
  questionId,
  isOpen,
  onClose,
}: SellerQnaDetailModalProps) {
  const queryClient = useQueryClient()
  const { can } = useSellerPermissions(shopId)
  const canReply = can('REVIEW_REPLY')

  const activeQuestionId = questionId ?? ''
  const isQueryEnabled = isOpen && activeQuestionId !== ''

  const questionQuery = useGetSellerQuestion(activeQuestionId, {
    query: {
      enabled: isQueryEnabled,
    },
  })

  const createAnswerMutation = useCreateSellerAnswer()
  const updateAnswerMutation = useUpdateSellerAnswer()
  const deleteAnswerMutation = useDeleteSellerAnswer()
  const closeQuestionMutation = useCloseSellerQuestion()
  const reopenQuestionMutation = useReopenSellerQuestion()

  const [replyContent, setReplyContent] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingAnswerId, setDeletingAnswerId] = useState<string | null>(null)
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false)

  if (!isOpen || !questionId) {
    return null
  }

  let question: SellerQuestionResponse | null = null
  if (questionQuery.data !== undefined) {
    const raw = takeData(questionQuery.data)
    if (raw) {
      question = raw
    }
  }

  function handleCloseModal() {
    setReplyContent('')
    setReplyError(null)
    setEditingAnswerId(null)
    setEditContent('')
    setEditError(null)
    setDeletingAnswerId(null)
    setIsConfirmCloseOpen(false)
    onClose()
  }

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: getListSellerQuestionsQueryKey() })
    if (activeQuestionId !== '') {
      void queryClient.invalidateQueries({
        queryKey: getGetSellerQuestionQueryKey(activeQuestionId),
      })
    }
    void queryClient.invalidateQueries({ queryKey: getGetSellerQnaStatsQueryKey() })
  }

  function handleSendReply() {
    const trimmed = replyContent.trim()
    if (trimmed === '') {
      setReplyError('Nội dung phản hồi không được để trống.')
      return
    }
    if (trimmed.length > 1000) {
      setReplyError('Nội dung phản hồi không được vượt quá 1000 ký tự.')
      return
    }
    setReplyError(null)

    createAnswerMutation.mutate(
      {
        questionId: activeQuestionId,
        data: { content: trimmed },
      },
      {
        onSuccess: function () {
          setReplyContent('')
          setReplyError(null)
          invalidateAll()
          notify.success('Đã gửi phản hồi thành công!')
        },
        onError: function () {
          notify.error('Không thể gửi phản hồi. Vui lòng thử lại!')
        },
      },
    )
  }

  function handleStartEditAnswer(answer: ProductAnswerResponse) {
    setEditingAnswerId(answer.id ?? null)
    setEditContent(answer.content ?? '')
    setEditError(null)
  }

  function handleCancelEdit() {
    setEditingAnswerId(null)
    setEditContent('')
    setEditError(null)
  }

  function handleSaveEditAnswer() {
    if (editingAnswerId === null) {
      return
    }
    const trimmed = editContent.trim()
    if (trimmed === '') {
      setEditError('Nội dung câu trả lời không được để trống.')
      return
    }
    if (trimmed.length > 1000) {
      setEditError('Nội dung câu trả lời không được vượt quá 1000 ký tự.')
      return
    }
    setEditError(null)

    updateAnswerMutation.mutate(
      {
        answerId: editingAnswerId,
        data: { content: trimmed },
      },
      {
        onSuccess: function () {
          setEditingAnswerId(null)
          setEditContent('')
          setEditError(null)
          invalidateAll()
          notify.success('Đã cập nhật câu trả lời thành công!')
        },
        onError: function () {
          notify.error('Không thể cập nhật câu trả lời. Vui lòng thử lại!')
        },
      },
    )
  }

  function handleConfirmDeleteAnswer() {
    if (deletingAnswerId === null) {
      return
    }
    deleteAnswerMutation.mutate(
      {
        answerId: deletingAnswerId,
      },
      {
        onSuccess: function () {
          setDeletingAnswerId(null)
          invalidateAll()
          notify.success('Đã xóa câu trả lời thành công!')
        },
        onError: function () {
          notify.error('Không thể xóa câu trả lời. Vui lòng thử lại!')
        },
      },
    )
  }

  function handleConfirmCloseQuestion() {
    closeQuestionMutation.mutate(
      {
        questionId: activeQuestionId,
      },
      {
        onSuccess: function () {
          setIsConfirmCloseOpen(false)
          invalidateAll()
          notify.success('Đã đóng câu hỏi thành công!')
        },
        onError: function () {
          notify.error('Không thể đóng câu hỏi. Vui lòng thử lại!')
        },
      },
    )
  }

  function handleReopenQuestion() {
    reopenQuestionMutation.mutate(
      {
        questionId: activeQuestionId,
      },
      {
        onSuccess: function () {
          invalidateAll()
          notify.success('Đã mở lại câu hỏi thành công!')
        },
        onError: function () {
          notify.error('Không thể mở lại câu hỏi. Vui lòng thử lại!')
        },
      },
    )
  }

  let title = 'Chi tiết câu hỏi'
  if (question && question.code) {
    title = `Chi tiết câu hỏi: ${question.code}`
  }

  let hasShopAnswer = false
  if (question && question.shopAnswerCount && question.shopAnswerCount > 0) {
    hasShopAnswer = true
  }
  if (question && question.answers) {
    for (const ans of question.answers) {
      if (ans.authorRole === 'SHOP') {
        hasShopAnswer = true
        break
      }
    }
  }

  let replySubmitLabel = 'Gửi phản hồi'
  if (hasShopAnswer) {
    replySubmitLabel = 'Gửi phản hồi bổ sung'
  }

  const answers = question?.answers ?? []

  return (
    <>
      <Modal title={title} onClose={handleCloseModal} widthClass="max-w-2xl">
        <div className="space-y-6">
          {questionQuery.isPending && (
            <div className="py-12 text-center text-sm text-zinc-500">
              Đang tải thông tin câu hỏi...
            </div>
          )}

          {!questionQuery.isPending && question === null && (
            <div className="py-12 text-center text-sm text-rose-500">
              Không tìm thấy thông tin câu hỏi.
            </div>
          )}

          {!questionQuery.isPending && question !== null && (
            <>
              {/* Header Info & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    {question.code}
                  </span>
                  {renderStatusBadge(question.status)}
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                    <Clock size={13} />
                    {formatDateTime(question.createdAt)}
                  </span>
                </div>

                {/* Close / Reopen Actions */}
                {canReply && question.status !== 'CLOSED' && (
                  <button
                    type="button"
                    onClick={function () {
                      setIsConfirmCloseOpen(true)
                    }}
                    className={cn(
                      secondaryButtonClass(),
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30',
                    )}
                  >
                    <Lock size={13} />
                    <span>Đóng câu hỏi</span>
                  </button>
                )}

                {canReply && question.status === 'CLOSED' && (
                  <button
                    type="button"
                    onClick={handleReopenQuestion}
                    disabled={reopenQuestionMutation.isPending}
                    className={cn(
                      secondaryButtonClass(),
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30',
                    )}
                  >
                    <LockOpen size={13} />
                    <span>Mở lại câu hỏi</span>
                  </button>
                )}
              </div>

              {/* Product Reference Card */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={urlOrPlaceholder(question.productImageUrl)}
                    alt={question.productName ?? 'Sản phẩm'}
                    onError={fallbackImageOnError}
                    className="h-12 w-12 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-white/10"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                      {question.productName ?? 'Sản phẩm'}
                    </p>
                    <p className="text-[11px] text-zinc-500">ID sản phẩm: {question.productId}</p>
                  </div>
                </div>

                {question.productId && (
                  <Link
                    to={`/product/${question.productId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-sky-400 dark:hover:bg-white/5"
                  >
                    <span>Xem sản phẩm</span>
                    <ArrowSquareOut size={14} />
                  </Link>
                )}
              </div>

              {/* Customer Question Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#11182a]">
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={question.askerDisplayName ?? 'Khách hàng'} size={32} />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      {question.askerDisplayName ?? 'Khách hàng'}
                    </p>
                    <p className="text-[11px] text-zinc-500">Người đặt câu hỏi</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-800 dark:text-zinc-200">{question.content}</p>
              </div>

              {/* Chronological Answers List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Câu trả lời ({answers.length})
                </h3>

                {answers.length === 0 && (
                  <p className="text-xs text-zinc-500 italic">
                    Chưa có câu trả lời nào từ shop hoặc người mua khác.
                  </p>
                )}

                {answers.map(function (ans) {
                  const isShopAnswer = ans.authorRole === 'SHOP'
                  const isEditingThis = editingAnswerId === ans.id

                  let containerClass =
                    'rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#11182a]'
                  if (isShopAnswer) {
                    containerClass =
                      'rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-800/40 dark:bg-sky-950/20'
                  }

                  return (
                    <div key={ans.id ?? ans.createdAt} className={containerClass}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <UserAvatar name={ans.authorDisplayName ?? 'Người dùng'} size={28} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                {ans.authorDisplayName ?? 'Người dùng'}
                              </span>

                              {isShopAnswer && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-sky-300">
                                  Shop
                                </span>
                              )}

                              {!isShopAnswer && ans.verifiedBuyer && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  Đã mua hàng
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-zinc-500">
                              {formatDateTime(ans.createdAt)}
                              {ans.editedAt && ' (Đã chỉnh sửa)'}
                            </p>
                          </div>
                        </div>

                        {/* Edit & Delete ONLY on SHOP answers */}
                        {isShopAnswer &&
                          canReply &&
                          question.status !== 'CLOSED' &&
                          !isEditingThis && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={function () {
                                  handleStartEditAnswer(ans)
                                }}
                                className="inline-flex items-center gap-1 rounded-full p-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-white/10"
                                aria-label="Chỉnh sửa câu trả lời"
                              >
                                <PencilSimple size={14} />
                                <span className="text-[11px]">Chỉnh sửa</span>
                              </button>
                              <button
                                type="button"
                                onClick={function () {
                                  setDeletingAnswerId(ans.id ?? null)
                                }}
                                className="inline-flex items-center gap-1 rounded-full p-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                aria-label="Xóa câu trả lời"
                              >
                                <Trash size={14} />
                                <span className="text-[11px]">Xóa</span>
                              </button>
                            </div>
                          )}
                      </div>

                      {/* Content or Inline Edit form */}
                      {isEditingThis && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={editContent}
                            onChange={function (e) {
                              setEditContent(e.target.value)
                            }}
                            maxLength={1000}
                            rows={3}
                            className={cn(
                              'w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white',
                              FOCUS_RING_CLASS,
                            )}
                          />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">{editContent.length} / 1000</span>
                            {editError !== null && (
                              <span className="font-medium text-rose-600 dark:text-rose-400">
                                {editError}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className={cn(
                                secondaryButtonClass(),
                                'rounded-full px-3 py-1.5 text-xs font-semibold',
                              )}
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEditAnswer}
                              disabled={updateAnswerMutation.isPending}
                              className={cn(
                                primaryButtonClass(),
                                'rounded-full px-4 py-1.5 text-xs font-semibold',
                              )}
                            >
                              Lưu thay đổi
                            </button>
                          </div>
                        </div>
                      )}

                      {!isEditingThis && (
                        <p className="mt-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                          {ans.content}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Reply / Follow-up Composer */}
              {canReply && question.status !== 'CLOSED' && (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <label
                    htmlFor="seller-reply-input"
                    className="block text-xs font-bold text-zinc-800 dark:text-zinc-200"
                  >
                    Phản hồi từ người bán
                  </label>
                  <textarea
                    id="seller-reply-input"
                    value={replyContent}
                    onChange={function (e) {
                      setReplyContent(e.target.value)
                      if (replyError !== null) {
                        setReplyError(null)
                      }
                    }}
                    placeholder="Nhập nội dung phản hồi cho khách hàng..."
                    maxLength={1000}
                    rows={3}
                    className={cn(
                      'mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white',
                      FOCUS_RING_CLASS,
                    )}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{replyContent.length} / 1000</span>
                    {replyError !== null && (
                      <span className="font-medium text-rose-600 dark:text-rose-400">
                        {replyError}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={createAnswerMutation.isPending}
                      className={cn(
                        primaryButtonClass(),
                        'rounded-full px-5 py-2 text-xs font-bold',
                      )}
                    >
                      {replySubmitLabel}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Confirm Delete Answer Dialog */}
      <ConfirmDialog
        open={deletingAnswerId !== null}
        title="Xóa câu trả lời"
        description="Bạn có chắc chắn muốn xóa câu trả lời này? Thao tác này không thể hoàn tác."
        variant="danger"
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
        isPending={deleteAnswerMutation.isPending}
        onCancel={function () {
          setDeletingAnswerId(null)
        }}
        onConfirm={handleConfirmDeleteAnswer}
      />

      {/* Confirm Close Question Dialog */}
      <ConfirmDialog
        open={isConfirmCloseOpen}
        title="Đóng câu hỏi"
        description="Bạn có chắc chắn muốn đóng câu hỏi này? Sau khi đóng, khách hàng và shop sẽ không thể gửi thêm phản hồi mới."
        variant="danger"
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
        isPending={closeQuestionMutation.isPending}
        onCancel={function () {
          setIsConfirmCloseOpen(false)
        }}
        onConfirm={handleConfirmCloseQuestion}
      />
    </>
  )
}
