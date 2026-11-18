import { useState } from 'react'

import {
  useGetSellerQnaStats,
  useListSellerQnaProducts,
  useListSellerQuestions,
} from '@generated/endpoints/seller-q-a/seller-q-a'
import {
  ChatCircleDots,
  CheckCircle,
  Clock,
  Eye,
  MagnifyingGlass,
  Percent,
  Question,
  X,
} from '@phosphor-icons/react'

import Pagination from '@/components/search/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { fallbackImageOnError, takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { formatDateTime } from '@/lib/format'
import { useSellerPermissions } from '@/lib/seller/sellerPermissions'
import { cn, FOCUS_RING_CLASS, primaryButtonClass } from '@/lib/ui/styles'

import SellerQnaDetailModal from './SellerQnaDetailModal'

import type {
  ListSellerQuestionsParams,
  ListSellerQuestionsSort,
  ListSellerQuestionsStatus,
  SellerQnaProductOptionResponse,
  SellerQnaStatsResponse,
  SellerQuestionResponse,
} from '@generated/model'

export interface SellerQnaTabProps {
  shopId: string
  initialQuestionId?: string
}

type TabStatusFilter = 'ALL' | ListSellerQuestionsStatus

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

function filterPillClass(active: boolean): string {
  if (active) {
    return 'btn-primary rounded-full px-4 py-2 text-xs font-bold transition'
  }
  return 'rounded-full px-4 py-2 text-xs font-bold transition text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white'
}

export default function SellerQnaTab({ shopId, initialQuestionId }: SellerQnaTabProps) {
  const { can } = useSellerPermissions(shopId)
  const canReply = can('REVIEW_REPLY')

  const [statusFilter, setStatusFilter] = useState<TabStatusFilter>('ALL')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<ListSellerQuestionsSort>('NEWEST')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const [prevInitialQuestionId, setPrevInitialQuestionId] = useState(initialQuestionId)
  let initialSelectedId: string | null = null
  if (initialQuestionId !== undefined && initialQuestionId !== '') {
    initialSelectedId = initialQuestionId
  }
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(initialSelectedId)

  if (initialQuestionId !== prevInitialQuestionId) {
    setPrevInitialQuestionId(initialQuestionId)
    let nextId: string | null = null
    if (initialQuestionId !== undefined && initialQuestionId !== '') {
      nextId = initialQuestionId
    }
    setActiveQuestionId(nextId)
  }

  // Stats Query
  const statsQuery = useGetSellerQnaStats({ shopId }, { query: { enabled: shopId !== '' } })
  let stats: SellerQnaStatsResponse = {
    totalQuestions: 0,
    unansweredCount: 0,
    answeredCount: 0,
    closedCount: 0,
    responseRate: 0,
  }
  if (statsQuery.data !== undefined) {
    const rawStats = takeData(statsQuery.data)
    if (rawStats) {
      stats = rawStats
    }
  }

  // Products Query
  const productsQuery = useListSellerQnaProducts({ shopId }, { query: { enabled: shopId !== '' } })
  let products: SellerQnaProductOptionResponse[] = []
  if (productsQuery.data !== undefined) {
    const rawProducts = takeData(productsQuery.data)
    if (Array.isArray(rawProducts)) {
      products = rawProducts
    }
  }

  // Date range validation
  let dateError = ''
  if (fromDate !== '' && toDate !== '' && fromDate > toDate) {
    dateError = 'Ngày bắt đầu không được lớn hơn ngày kết thúc'
  }
  const isDateValid = dateError === ''

  // Build List Params
  const queryParams: ListSellerQuestionsParams = {
    shopId,
    page,
    size: pageSize,
    sort: sortOrder,
  }
  if (statusFilter !== 'ALL') {
    queryParams.status = statusFilter
  }
  if (selectedProductId !== '') {
    queryParams.productId = selectedProductId
  }
  if (fromDate !== '' && isDateValid) {
    queryParams.from = fromDate
  }
  if (toDate !== '' && isDateValid) {
    queryParams.to = toDate
  }
  const trimmedQuery = searchQuery.trim()
  if (trimmedQuery !== '') {
    queryParams.q = trimmedQuery
  }

  const questionsQuery = useListSellerQuestions(queryParams, {
    query: {
      enabled: shopId !== '' && isDateValid,
    },
  })

  let questions: SellerQuestionResponse[] = []
  let totalItems = 0
  let totalPages = 1
  if (questionsQuery.data !== undefined) {
    const pageData = takeData(questionsQuery.data)
    if (pageData && Array.isArray(pageData.items)) {
      questions = pageData.items
      totalItems = pageData.total ?? questions.length
      if (pageSize > 0) {
        totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
      }
    }
  }

  function handleFilterStatus(status: TabStatusFilter) {
    setStatusFilter(status)
    setPage(0)
  }

  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedProductId(e.target.value)
    setPage(0)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value)
    setPage(0)
  }

  function handleClearSearch() {
    setSearchQuery('')
    setPage(0)
  }

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSortOrder(e.target.value as ListSellerQuestionsSort)
    setPage(0)
  }

  function handleFromDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFromDate(e.target.value)
    setPage(0)
  }

  function handleToDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setToDate(e.target.value)
    setPage(0)
  }

  function getActionLabel(itemStatus?: string): string {
    if (canReply && itemStatus !== 'CLOSED') {
      return 'Xem & Trả lời'
    }
    return 'Xem chi tiết'
  }

  const rateValue = stats.responseRate ?? 0
  const formattedRate = `${rateValue}%`

  return (
    <div className="space-y-6">
      {/* Page Title & Intro */}
      <div>
        <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
          Hỏi đáp sản phẩm (Q&A)
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Quản lý và giải đáp các thắc mắc từ khách hàng về sản phẩm của gian hàng.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Questions */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Tổng số câu hỏi</span>
            <Question size={18} className="text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-900 dark:text-white">
            {stats.totalQuestions ?? 0}
          </p>
        </div>

        {/* Unanswered */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
            <span>Chưa trả lời</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
            {stats.unansweredCount ?? 0}
          </p>
        </div>

        {/* Answered */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span>Đã trả lời</span>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
            {stats.answeredCount ?? 0}
          </p>
        </div>

        {/* Closed */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-xs dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Đã đóng</span>
            <X size={18} className="text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-700 dark:text-zinc-300">
            {stats.closedCount ?? 0}
          </p>
        </div>

        {/* Response Rate */}
        <div className="col-span-2 rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-xs sm:col-span-1 lg:col-span-1 dark:border-sky-900/30 dark:bg-sky-950/20">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-sky-400">
            <span>Tỷ lệ phản hồi</span>
            <Percent size={18} className="text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-900 dark:text-sky-200">
            {formattedRate}
          </p>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3 dark:border-white/10">
        <button
          type="button"
          onClick={function () {
            handleFilterStatus('ALL')
          }}
          className={filterPillClass(statusFilter === 'ALL')}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={function () {
            handleFilterStatus('UNANSWERED')
          }}
          className={filterPillClass(statusFilter === 'UNANSWERED')}
        >
          Chưa trả lời
        </button>
        <button
          type="button"
          onClick={function () {
            handleFilterStatus('ANSWERED')
          }}
          className={filterPillClass(statusFilter === 'ANSWERED')}
        >
          Đã trả lời
        </button>
        <button
          type="button"
          onClick={function () {
            handleFilterStatus('CLOSED')
          }}
          className={filterPillClass(statusFilter === 'CLOSED')}
        >
          Đã đóng
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#11182a]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Product Filter Dropdown */}
          <div>
            <label
              htmlFor="qna-product-filter"
              className="mb-1 block text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              Lọc theo sản phẩm
            </label>
            <select
              id="qna-product-filter"
              aria-label="Lọc theo sản phẩm"
              value={selectedProductId}
              onChange={handleProductChange}
              className={cn(
                'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white',
                FOCUS_RING_CLASS,
              )}
            >
              <option value="">Tất cả sản phẩm</option>
              {products.map(function (prod) {
                const count = prod.questionCount ?? 0
                return (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          {/* Sort Select */}
          <div>
            <label
              htmlFor="qna-sort-filter"
              className="mb-1 block text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              Sắp xếp
            </label>
            <select
              id="qna-sort-filter"
              aria-label="Sắp xếp"
              value={sortOrder}
              onChange={handleSortChange}
              className={cn(
                'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white',
                FOCUS_RING_CLASS,
              )}
            >
              <option value="NEWEST">Mới nhất trước</option>
              <option value="OLDEST">Cũ nhất trước</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label
              htmlFor="qna-from-date"
              className="mb-1 block text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              Từ ngày
            </label>
            <input
              type="date"
              id="qna-from-date"
              aria-label="Từ ngày"
              value={fromDate}
              onChange={handleFromDateChange}
              className={cn(
                'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white',
                FOCUS_RING_CLASS,
              )}
            />
          </div>

          {/* To Date */}
          <div>
            <label
              htmlFor="qna-to-date"
              className="mb-1 block text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              Đến ngày
            </label>
            <input
              type="date"
              id="qna-to-date"
              aria-label="Đến ngày"
              value={toDate}
              onChange={handleToDateChange}
              className={cn(
                'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white',
                FOCUS_RING_CLASS,
              )}
            />
          </div>
        </div>

        {/* Date Validation Error */}
        {dateError !== '' && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
            {dateError}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <MagnifyingGlass size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Tìm tên sản phẩm, SKU, mã câu hỏi, người hỏi, nội dung..."
            className={cn(
              'w-full rounded-xl border border-zinc-300 bg-white py-2 pl-9 pr-9 text-xs text-zinc-900 placeholder-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-white',
              FOCUS_RING_CLASS,
            )}
          />
          {searchQuery !== '' && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Xóa từ khóa"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Question List Content */}
      <div className="space-y-3">
        {questionsQuery.isPending && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-xs dark:border-white/10 dark:bg-[#11182a]">
            Đang tải danh sách câu hỏi...
          </div>
        )}

        {!questionsQuery.isPending && questions.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xs dark:border-white/10 dark:bg-[#11182a]">
            <EmptyState
              icon={<ChatCircleDots size={32} className="text-zinc-400" />}
              title="Không tìm thấy câu hỏi nào"
              description="Chưa có câu hỏi nào từ khách hàng phù hợp với bộ lọc hiện tại."
            />
          </div>
        )}

        {!questionsQuery.isPending && questions.length > 0 && (
          <div className="space-y-3">
            {questions.map(function (item) {
              const actionLabel = getActionLabel(item.status)
              const answersCount = item.answerCount ?? 0

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition hover:border-zinc-300 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-[#11182a] dark:hover:border-white/20"
                >
                  {/* Left: Product & Question Info */}
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <img
                      src={urlOrPlaceholder(item.productImageUrl)}
                      alt={item.productName ?? 'Sản phẩm'}
                      onError={fallbackImageOnError}
                      className="h-14 w-14 shrink-0 rounded-xl border border-zinc-200 object-cover dark:border-white/10"
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          {item.code}
                        </span>
                        {renderStatusBadge(item.status)}
                        <span className="text-[11px] text-zinc-400">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                        {item.productName ?? 'Sản phẩm'}
                      </p>

                      <p className="line-clamp-2 text-xs text-zinc-700 dark:text-zinc-300">
                        {item.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                        <span>
                          Người hỏi:{' '}
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {item.askerDisplayName ?? 'Khách hàng'}
                          </span>
                        </span>
                        <span>·</span>
                        <span>{answersCount} câu trả lời</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div className="flex shrink-0 items-center justify-end pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={function () {
                        setActiveQuestionId(item.id ?? null)
                      }}
                      className={cn(
                        primaryButtonClass(),
                        'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold',
                      )}
                    >
                      <Eye size={14} />
                      <span>{actionLabel}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPage={function (newPage) {
              setPage(newPage)
            }}
          />
        )}
      </div>

      {/* Detail Modal */}
      <SellerQnaDetailModal
        shopId={shopId}
        questionId={activeQuestionId}
        isOpen={activeQuestionId !== null}
        onClose={function () {
          setActiveQuestionId(null)
        }}
      />
    </div>
  )
}
