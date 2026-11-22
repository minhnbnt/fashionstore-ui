import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import {
  getListProductQuestionsQueryKey,
  useCreateProductQuestion,
  useListProductQuestions,
} from '@generated/endpoints/product-q-a/product-q-a'
import { MagnifyingGlass, SpinnerGap, X } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { useSessionQuery } from '@/hooks/useSession'
import { takeData } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import {
  cn,
  FOCUS_RING_CLASS,
  INPUT_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  TEXTAREA_CLASS,
} from '@/lib/ui/styles'

import ProductQnaItem from './ProductQnaItem'

import type { ListProductQuestionsParams } from '@generated/model/listProductQuestionsParams'
import type { ProductQuestionPageResponse } from '@generated/model/productQuestionPageResponse'
import type { ProductQuestionResponse } from '@generated/model/productQuestionResponse'

interface ProductQnaSectionProps {
  productId: string
}

export default function ProductQnaSection(props: ProductQnaSectionProps) {
  const productId = props.productId
  const [searchParams] = useSearchParams()
  const deepLinkedQuestionId = searchParams.get('questionId') ?? ''

  const [searchInput, setSearchInput] = useState('')
  const [activeKeyword, setActiveKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [extraQuestions, setExtraQuestions] = useState<ProductQuestionResponse[]>([])

  // Ask question form state
  const [questionInput, setQuestionInput] = useState('')
  const [questionError, setQuestionError] = useState<string | null>(null)
  const [showAskConfirm, setShowAskConfirm] = useState(false)

  const prevProductIdRef = useRef(productId)
  useEffect(
    function () {
      if (prevProductIdRef.current !== productId) {
        prevProductIdRef.current = productId
        setSearchInput('')
        setActiveKeyword('')
        setPage(0)
        setExtraQuestions([])
        setQuestionInput('')
        setQuestionError(null)
        setShowAskConfirm(false)
      }
    },
    [productId],
  )

  const queryClient = useQueryClient()
  const sessionQuery = useSessionQuery()
  const { data: session } = sessionQuery
  const isSessionPending = sessionQuery.isPending === true
  const isLoggedIn = session !== null && session !== undefined

  let queryParams: ListProductQuestionsParams = { page, size: 10 }
  if (activeKeyword !== '') {
    queryParams = { q: activeKeyword, page, size: 10 }
  }

  const questionsQuery = useListProductQuestions(productId, queryParams, {
    query: { enabled: productId !== '' },
  })
  const createQuestionMutation = useCreateProductQuestion()

  let pageData: ProductQuestionPageResponse = {}
  if (questionsQuery.data !== undefined) {
    pageData = takeData(questionsQuery.data)
  }

  const total = pageData.total ?? 0
  const canAnswerAsBuyer = pageData.canAnswerAsBuyer === true
  const maxContentLength = pageData.maxContentLength ?? 1000
  const currentItems = pageData.items ?? []

  let displayedQuestions = currentItems
  if (page > 0) {
    const existingIds = new Set(
      extraQuestions.map(function (item) {
        return item.id
      }),
    )
    const uniqueNew = currentItems.filter(function (item) {
      return !existingIds.has(item.id)
    })
    displayedQuestions = [...extraQuestions, ...uniqueNew]
  }

  useEffect(
    function scrollToDeepLinkedQuestion() {
      if (deepLinkedQuestionId === '' || questionsQuery.data === undefined) {
        return
      }
      const questionElement = document.getElementById(deepLinkedQuestionId)
      const targetElement = questionElement ?? document.getElementById('product-qna')
      if (targetElement !== null) {
        targetElement.scrollIntoView({ block: 'center' })
      }
    },
    [deepLinkedQuestionId, questionsQuery.data],
  )

  function handleSearchSubmit(e?: React.FormEvent) {
    if (e !== undefined) {
      e.preventDefault()
    }
    setActiveKeyword(searchInput.trim())
    setPage(0)
    setExtraQuestions([])
  }

  function handleClearSearch() {
    setSearchInput('')
    setActiveKeyword('')
    setPage(0)
    setExtraQuestions([])
  }

  function handleItemMutated() {
    setPage(0)
    setExtraQuestions([])
  }

  function handleLoadMore() {
    setExtraQuestions(displayedQuestions)
    setPage(function (prev) {
      return prev + 1
    })
  }

  function handleOpenAskConfirm() {
    const trimmed = questionInput.trim()
    if (trimmed === '') {
      setQuestionError('Vui lòng nhập nội dung câu hỏi')
      return
    }
    if (trimmed.length > maxContentLength) {
      setQuestionError('Nội dung không được vượt quá ' + maxContentLength + ' ký tự')
      return
    }
    setQuestionError(null)
    setShowAskConfirm(true)
  }

  function handleConfirmCreateQuestion() {
    const trimmed = questionInput.trim()
    createQuestionMutation.mutate(
      {
        productId,
        data: { content: trimmed },
      },
      {
        onSuccess: function () {
          notify.success('Đã gửi câu hỏi thành công!')
          setQuestionInput('')
          setQuestionError(null)
          setShowAskConfirm(false)
          setPage(0)
          setExtraQuestions([])
          void queryClient.invalidateQueries({
            queryKey: getListProductQuestionsQueryKey(productId),
          })
        },
        onError: function () {
          notify.error('Không thể gửi câu hỏi. Vui lòng thử lại sau.')
        },
      },
    )
  }

  const hasSearchKeyword = activeKeyword !== ''
  const isSearchEmpty = hasSearchKeyword && displayedQuestions.length === 0
  const isFetchFailed = questionsQuery.isError === true
  const isOverallEmpty =
    !hasSearchKeyword &&
    displayedQuestions.length === 0 &&
    !questionsQuery.isPending &&
    !isFetchFailed
  const canLoadMore = displayedQuestions.length < total

  return (
    <section
      id="product-qna"
      className="mt-10 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 dark:border-white/10 dark:bg-[#11182a]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-[#17203a] dark:text-white">
            Hỏi đáp về sản phẩm
          </h2>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-sky-500/20 dark:text-sky-300">
            {total}
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative flex w-full max-w-md items-center">
          <input
            type="text"
            aria-label="Tìm kiếm câu hỏi hoặc câu trả lời"
            value={searchInput}
            onChange={function (e) {
              setSearchInput(e.target.value)
            }}
            placeholder="Tìm kiếm câu hỏi hoặc câu trả lời..."
            className={cn(INPUT_CLASS, 'pr-20')}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {searchInput !== '' && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Xóa từ khóa"
                className="p-1 text-zinc-600 transition hover:text-[#17203a] dark:text-zinc-400 dark:hover:text-white"
              >
                <X size={15} />
              </button>
            )}
            <button
              type="submit"
              aria-label="Tìm kiếm"
              className="p-1.5 text-zinc-600 transition hover:text-blue-600 dark:text-zinc-400 dark:hover:text-sky-400"
            >
              <MagnifyingGlass size={16} weight="bold" />
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 dark:border-white/10 dark:bg-white/5">
        {!isSessionPending && !isLoggedIn && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Đăng nhập để đặt câu hỏi về sản phẩm
            </p>
            <Link to="/login" className={cn(secondaryButtonClass(), 'px-4 py-2 text-xs font-bold')}>
              Đăng nhập
            </Link>
          </div>
        )}

        {!isSessionPending && isLoggedIn && (
          <div className="space-y-2.5">
            <label
              htmlFor="ask-question-textarea"
              className="block text-xs font-bold text-[#17203a] dark:text-zinc-200"
            >
              Đặt câu hỏi cho người bán hoặc cộng đồng người mua
            </label>
            <textarea
              id="ask-question-textarea"
              value={questionInput}
              onChange={function (e) {
                setQuestionInput(e.target.value)
                setQuestionError(null)
              }}
              maxLength={maxContentLength}
              rows={3}
              placeholder="Nhập câu hỏi của bạn về sản phẩm..."
              className={TEXTAREA_CLASS}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {questionInput.trim().length} / {maxContentLength}
              </span>
              <button
                type="button"
                onClick={handleOpenAskConfirm}
                disabled={createQuestionMutation.isPending}
                className={cn(
                  primaryButtonClass(),
                  'inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold',
                  FOCUS_RING_CLASS,
                )}
              >
                {createQuestionMutation.isPending && (
                  <SpinnerGap size={14} weight="bold" className="motion-safe:animate-spin" />
                )}
                <span>Gửi câu hỏi</span>
              </button>
            </div>
            {questionError !== null && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {questionError}
              </p>
            )}
          </div>
        )}
      </div>

      {questionsQuery.isPending && (
        <div className="mt-8 flex justify-center py-6">
          <SpinnerGap
            size={24}
            weight="bold"
            className="text-blue-600 motion-safe:animate-spin dark:text-sky-400"
          />
        </div>
      )}

      {isSearchEmpty && (
        <div className="mt-6">
          <EmptyState
            title="Không tìm thấy câu hỏi hoặc câu trả lời phù hợp với từ khóa"
            description="Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem toàn bộ câu hỏi."
            action={
              <button type="button" onClick={handleClearSearch} className={secondaryButtonClass()}>
                Xóa từ khóa
              </button>
            }
          />
        </div>
      )}

      {isFetchFailed && (
        <div className="mt-6">
          <EmptyState
            title="Không thể tải danh sách câu hỏi"
            description="Vui lòng thử lại sau ít phút."
            action={
              <button
                type="button"
                onClick={function () {
                  void questionsQuery.refetch()
                }}
                className={secondaryButtonClass()}
              >
                Thử lại
              </button>
            }
          />
        </div>
      )}

      {isOverallEmpty && (
        <div className="mt-6">
          <EmptyState
            title="Chưa có câu hỏi nào cho sản phẩm này. Hãy là người đầu tiên đặt câu hỏi!"
            description="Nếu bạn có bất kỳ thắc mắc nào về chất liệu, kích thước hoặc cách sử dụng sản phẩm, hãy đặt câu hỏi ngay để nhận phản hồi nhanh nhất."
          />
        </div>
      )}

      {displayedQuestions.length > 0 && (
        <div className="mt-6 space-y-4">
          {displayedQuestions.map(function (q) {
            const isHighlighted = q.id === deepLinkedQuestionId
            return (
              <ProductQnaItem
                key={q.id}
                question={q}
                productId={productId}
                isLoggedIn={isLoggedIn}
                canAnswerAsBuyer={canAnswerAsBuyer}
                maxContentLength={maxContentLength}
                isHighlighted={isHighlighted}
                onMutated={handleItemMutated}
              />
            )
          })}
        </div>
      )}

      {canLoadMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={questionsQuery.isPending}
            className={cn(secondaryButtonClass(), 'px-6 py-2.5 text-xs font-bold')}
          >
            {questionsQuery.isPending && (
              <SpinnerGap size={14} weight="bold" className="motion-safe:animate-spin" />
            )}
            <span>Tải thêm câu hỏi</span>
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showAskConfirm}
        title="Xác nhận gửi câu hỏi?"
        description="Bạn có chắc chắn muốn gửi câu hỏi này đến người bán và cộng đồng người mua không?"
        confirmLabel="Gửi câu hỏi"
        variant="primary"
        isPending={createQuestionMutation.isPending}
        onConfirm={handleConfirmCreateQuestion}
        onCancel={function () {
          setShowAskConfirm(false)
        }}
      />
    </section>
  )
}
