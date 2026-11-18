import { useState } from 'react'

import {
  getListProductQuestionsQueryKey,
  useCreateProductAnswer,
  useDeleteProductAnswer,
  useDeleteProductQuestion,
  useUpdateProductAnswer,
  useUpdateProductQuestion,
} from '@generated/endpoints/product-q-a/product-q-a'
import {
  CaretDown,
  CaretUp,
  ChatCircleDots,
  CheckCircle,
  PencilSimple,
  SpinnerGap,
  Storefront,
  Trash,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import ConfirmDialog from '@/components/ui/ConfirmDialog'
import UserAvatar from '@/components/UserAvatar'
import { formatDateTime } from '@/lib/format'
import { notify } from '@/lib/notifications'
import {
  CARD_CLASS,
  cn,
  FOCUS_RING_CLASS,
  ghostButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  TEXTAREA_CLASS,
} from '@/lib/ui/styles'

import type { ProductAnswerResponse } from '@generated/model/productAnswerResponse'
import type { ProductQuestionResponse } from '@generated/model/productQuestionResponse'

interface ProductQnaItemProps {
  question: ProductQuestionResponse
  productId: string
  isLoggedIn: boolean
  canAnswerAsBuyer: boolean
  maxContentLength: number
  isHighlighted: boolean
  onMutated?: () => void
}

function answerContainerClass(role?: string): string {
  if (role === 'SHOP') {
    return 'rounded-2xl border border-sky-200/80 bg-sky-50/85 p-3.5 dark:border-sky-400/20 dark:bg-sky-500/10'
  }
  return 'rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 dark:border-white/10 dark:bg-white/5'
}

function AnswerItem(props: {
  answer: ProductAnswerResponse
  productId: string
  questionId: string
  maxContentLength: number
  onMutated?: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(props.answer.content ?? '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const queryClient = useQueryClient()
  const updateAnswerMutation = useUpdateProductAnswer()
  const deleteAnswerMutation = useDeleteProductAnswer()

  const answer = props.answer
  const isShop = answer.authorRole === 'SHOP'
  const isVerifiedBuyer = answer.verifiedBuyer === true
  const canEdit = answer.canEdit === true
  const canDelete = answer.canDelete === true
  const hasEdited = Boolean(answer.editedAt)

  function handleSaveEdit() {
    const trimmed = content.trim()
    if (trimmed === '') {
      setErrorMessage('Vui lòng nhập nội dung câu trả lời')
      return
    }
    if (trimmed.length > props.maxContentLength) {
      setErrorMessage('Nội dung không được vượt quá ' + props.maxContentLength + ' ký tự')
      return
    }
    setErrorMessage(null)
    updateAnswerMutation.mutate(
      {
        productId: props.productId,
        questionId: props.questionId,
        answerId: answer.id ?? '',
        data: { content: trimmed },
      },
      {
        onSuccess: function () {
          notify.success('Đã cập nhật câu trả lời!')
          setIsEditing(false)
          void queryClient.invalidateQueries({
            queryKey: getListProductQuestionsQueryKey(props.productId),
          })
          if (props.onMutated !== undefined) {
            props.onMutated()
          }
        },
        onError: function () {
          notify.error('Không thể cập nhật câu trả lời. Vui lòng thử lại sau.')
        },
      },
    )
  }

  function handleDeleteAnswer() {
    deleteAnswerMutation.mutate(
      {
        productId: props.productId,
        questionId: props.questionId,
        answerId: answer.id ?? '',
      },
      {
        onSuccess: function () {
          notify.success('Đã xóa câu trả lời!')
          setShowDeleteConfirm(false)
          void queryClient.invalidateQueries({
            queryKey: getListProductQuestionsQueryKey(props.productId),
          })
          if (props.onMutated !== undefined) {
            props.onMutated()
          }
        },
        onError: function () {
          notify.error('Không thể xóa câu trả lời. Vui lòng thử lại sau.')
        },
      },
    )
  }

  return (
    <div className={answerContainerClass(answer.authorRole)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <UserAvatar name={answer.authorDisplayName ?? 'Người mua'} size={28} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#17203a] dark:text-zinc-100">
              {answer.authorDisplayName ?? 'Người mua'}
            </span>
            {isShop && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-blue-900 dark:border-sky-400/30 dark:bg-sky-400/20 dark:text-sky-200">
                <Storefront size={13} weight="bold" />
                Shop
              </span>
            )}
            {isVerifiedBuyer && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle size={13} weight="fill" />
                Đã mua hàng
              </span>
            )}
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {formatDateTime(answer.createdAt)}
            </span>
            {hasEdited && (
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400">(đã chỉnh sửa)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {canEdit && !isEditing && (
            <button
              type="button"
              onClick={function () {
                setIsEditing(true)
                setContent(answer.content ?? '')
                setErrorMessage(null)
              }}
              className={cn(ghostButtonClass(), 'px-2 py-1 text-xs')}
            >
              <PencilSimple size={13} />
              Chỉnh sửa
            </button>
          )}
          {canDelete && !isEditing && (
            <button
              type="button"
              onClick={function () {
                setShowDeleteConfirm(true)
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <Trash size={13} />
              Xóa
            </button>
          )}
        </div>
      </div>

      {!isEditing && (
        <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          {answer.content}
        </p>
      )}

      {isEditing && (
        <div className="mt-2.5 space-y-2">
          <textarea
            value={content}
            onChange={function (e) {
              setContent(e.target.value)
              setErrorMessage(null)
            }}
            maxLength={props.maxContentLength}
            rows={3}
            className={TEXTAREA_CLASS}
            placeholder="Nhập câu trả lời..."
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {content.trim().length} / {props.maxContentLength}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={function () {
                  setIsEditing(false)
                  setContent(answer.content ?? '')
                  setErrorMessage(null)
                }}
                className={cn(secondaryButtonClass(), 'px-3 py-1.5 text-xs')}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateAnswerMutation.isPending}
                className={cn(
                  primaryButtonClass(),
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold',
                  FOCUS_RING_CLASS,
                )}
              >
                {updateAnswerMutation.isPending && (
                  <SpinnerGap size={13} weight="bold" className="motion-safe:animate-spin" />
                )}
                <span>Lưu</span>
              </button>
            </div>
          </div>
          {errorMessage !== null && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{errorMessage}</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Xác nhận xóa câu trả lời?"
        description="Bạn có chắc chắn muốn xóa câu trả lời này không? Thao tác này không thể hoàn tác."
        confirmLabel="Xóa câu trả lời"
        variant="danger"
        isPending={deleteAnswerMutation.isPending}
        onConfirm={handleDeleteAnswer}
        onCancel={function () {
          setShowDeleteConfirm(false)
        }}
      />
    </div>
  )
}

export default function ProductQnaItem(props: ProductQnaItemProps) {
  const q = props.question
  const answers = q.answers ?? []
  const answerCount = answers.length

  const defaultExpanded = props.isHighlighted || answerCount <= 2
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isEditingQuestion, setIsEditingQuestion] = useState(false)
  const [editQuestionContent, setEditQuestionContent] = useState(q.content ?? '')
  const [editQuestionError, setEditQuestionError] = useState<string | null>(null)
  const [showDeleteQuestionConfirm, setShowDeleteQuestionConfirm] = useState(false)

  // Reply state
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const updateQuestionMutation = useUpdateProductQuestion()
  const deleteQuestionMutation = useDeleteProductQuestion()
  const createAnswerMutation = useCreateProductAnswer()

  const isClosed = q.status === 'CLOSED'
  const isUnanswered = answerCount === 0 && !isClosed
  const hasEditedQuestion = Boolean(q.editedAt)
  const canEditQuestion = q.canEdit === true
  const canDeleteQuestion = q.canDelete === true
  const canReply = props.isLoggedIn && props.canAnswerAsBuyer && !isClosed

  let cardClass = cn(CARD_CLASS, 'p-5 transition')
  if (props.isHighlighted) {
    cardClass = cn(cardClass, 'ring-2 ring-blue-600/40 dark:ring-sky-400/40')
  }

  function handleSaveQuestionEdit() {
    const trimmed = editQuestionContent.trim()
    if (trimmed === '') {
      setEditQuestionError('Vui lòng nhập nội dung câu hỏi')
      return
    }
    if (trimmed.length > props.maxContentLength) {
      setEditQuestionError('Nội dung không được vượt quá ' + props.maxContentLength + ' ký tự')
      return
    }
    setEditQuestionError(null)
    updateQuestionMutation.mutate(
      {
        productId: props.productId,
        questionId: q.id ?? '',
        data: { content: trimmed },
      },
      {
        onSuccess: function () {
          notify.success('Đã cập nhật câu hỏi!')
          setIsEditingQuestion(false)
          void queryClient.invalidateQueries({
            queryKey: getListProductQuestionsQueryKey(props.productId),
          })
          if (props.onMutated !== undefined) {
            props.onMutated()
          }
        },
        onError: function () {
          notify.error('Không thể cập nhật câu hỏi. Vui lòng thử lại sau.')
        },
      },
    )
  }

  function handleDeleteQuestion() {
    deleteQuestionMutation.mutate(
      {
        productId: props.productId,
        questionId: q.id ?? '',
      },
      {
        onSuccess: function () {
          notify.success('Đã xóa câu hỏi!')
          setShowDeleteQuestionConfirm(false)
          void queryClient.invalidateQueries({
            queryKey: getListProductQuestionsQueryKey(props.productId),
          })
          if (props.onMutated !== undefined) {
            props.onMutated()
          }
        },
        onError: function () {
          notify.error('Không thể xóa câu hỏi. Vui lòng thử lại sau.')
        },
      },
    )
  }

  function handleSubmitReply() {
    const trimmed = replyContent.trim()
    if (trimmed === '') {
      setReplyError('Vui lòng nhập nội dung câu trả lời')
      return
    }
    if (trimmed.length > props.maxContentLength) {
      setReplyError('Nội dung không được vượt quá ' + props.maxContentLength + ' ký tự')
      return
    }
    setReplyError(null)
    createAnswerMutation.mutate(
      {
        productId: props.productId,
        questionId: q.id ?? '',
        data: { content: trimmed },
      },
      {
        onSuccess: function () {
          notify.success('Đã gửi câu trả lời!')
          setReplyContent('')
          setIsReplying(false)
          setIsExpanded(true)
          void queryClient.invalidateQueries({
            queryKey: getListProductQuestionsQueryKey(props.productId),
          })
          if (props.onMutated !== undefined) {
            props.onMutated()
          }
        },
        onError: function () {
          notify.error('Không thể gửi câu trả lời. Vui lòng thử lại sau.')
        },
      },
    )
  }

  let expandToggleLabel = 'Xem ' + answerCount + ' câu trả lời'
  if (isExpanded) {
    expandToggleLabel = 'Thu gọn câu trả lời'
  }

  return (
    <article id={q.id} className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={q.askerDisplayName ?? 'Người dùng'} size={36} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-[#17203a] dark:text-white">
                {q.askerDisplayName ?? 'Người dùng'}
              </span>
              {isUnanswered && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                  Chưa có câu trả lời
                </span>
              )}
              {isClosed && (
                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300">
                  Đã đóng
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span>{formatDateTime(q.createdAt)}</span>
              {hasEditedQuestion && <span>(đã chỉnh sửa)</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {canEditQuestion && !isEditingQuestion && (
            <button
              type="button"
              onClick={function () {
                setIsEditingQuestion(true)
                setEditQuestionContent(q.content ?? '')
                setEditQuestionError(null)
              }}
              className={cn(ghostButtonClass(), 'px-2.5 py-1 text-xs')}
            >
              <PencilSimple size={14} />
              Chỉnh sửa
            </button>
          )}
          {canDeleteQuestion && !isEditingQuestion && (
            <button
              type="button"
              onClick={function () {
                setShowDeleteQuestionConfirm(true)
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <Trash size={14} />
              Xóa
            </button>
          )}
        </div>
      </div>

      {!isEditingQuestion && (
        <p className="mt-3 text-sm leading-relaxed text-[#17203a] dark:text-zinc-100">
          {q.content}
        </p>
      )}

      {isEditingQuestion && (
        <div className="mt-3 space-y-2">
          <textarea
            value={editQuestionContent}
            onChange={function (e) {
              setEditQuestionContent(e.target.value)
              setEditQuestionError(null)
            }}
            maxLength={props.maxContentLength}
            rows={3}
            className={TEXTAREA_CLASS}
            placeholder="Nhập nội dung câu hỏi..."
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {editQuestionContent.trim().length} / {props.maxContentLength}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={function () {
                  setIsEditingQuestion(false)
                  setEditQuestionContent(q.content ?? '')
                  setEditQuestionError(null)
                }}
                className={cn(secondaryButtonClass(), 'px-3 py-1.5 text-xs')}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveQuestionEdit}
                disabled={updateQuestionMutation.isPending}
                className={cn(
                  primaryButtonClass(),
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold',
                  FOCUS_RING_CLASS,
                )}
              >
                {updateQuestionMutation.isPending && (
                  <SpinnerGap size={14} weight="bold" className="motion-safe:animate-spin" />
                )}
                <span>Lưu</span>
              </button>
            </div>
          </div>
          {editQuestionError !== null && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {editQuestionError}
            </p>
          )}
        </div>
      )}

      {answerCount > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={function () {
              setIsExpanded(!isExpanded)
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            {isExpanded && <CaretUp size={14} weight="bold" />}
            {!isExpanded && <CaretDown size={14} weight="bold" />}
            <span>{expandToggleLabel}</span>
          </button>
        </div>
      )}

      {isExpanded && answerCount > 0 && (
        <div className="mt-3.5 space-y-2.5 border-t border-zinc-200/80 pt-3 dark:border-white/10">
          {answers.map(function (ans) {
            return (
              <AnswerItem
                key={ans.id}
                answer={ans}
                productId={props.productId}
                questionId={q.id ?? ''}
                maxContentLength={props.maxContentLength}
                onMutated={props.onMutated}
              />
            )
          })}
        </div>
      )}

      {canReply && (
        <div className="mt-3.5 border-t border-zinc-200/80 pt-3 dark:border-white/10">
          {!isReplying && (
            <button
              type="button"
              onClick={function () {
                setIsReplying(true)
                setReplyContent('')
                setReplyError(null)
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-sky-100 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25"
            >
              <ChatCircleDots size={14} weight="bold" />
              <span>Trả lời câu hỏi</span>
            </button>
          )}

          {isReplying && (
            <div className="space-y-2">
              <textarea
                value={replyContent}
                onChange={function (e) {
                  setReplyContent(e.target.value)
                  setReplyError(null)
                }}
                maxLength={props.maxContentLength}
                rows={3}
                className={TEXTAREA_CLASS}
                placeholder="Nhập câu trả lời của bạn..."
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {replyContent.trim().length} / {props.maxContentLength}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={function () {
                      setIsReplying(false)
                      setReplyContent('')
                      setReplyError(null)
                    }}
                    className={cn(secondaryButtonClass(), 'px-3 py-1.5 text-xs')}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitReply}
                    disabled={createAnswerMutation.isPending}
                    className={cn(
                      primaryButtonClass(),
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    {createAnswerMutation.isPending && (
                      <SpinnerGap size={14} weight="bold" className="motion-safe:animate-spin" />
                    )}
                    <span>Gửi câu trả lời</span>
                  </button>
                </div>
              </div>
              {replyError !== null && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{replyError}</p>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showDeleteQuestionConfirm}
        title="Xác nhận xóa câu hỏi?"
        description="Bạn có chắc chắn muốn xóa câu hỏi này không? Thao tác này không thể hoàn tác."
        confirmLabel="Xóa câu hỏi"
        variant="danger"
        isPending={deleteQuestionMutation.isPending}
        onConfirm={handleDeleteQuestion}
        onCancel={function () {
          setShowDeleteQuestionConfirm(false)
        }}
      />
    </article>
  )
}
