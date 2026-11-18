import { useState } from 'react'
import { Link } from 'react-router'

import {
  getListBannedKeywordsQueryKey,
  useCreateBannedKeyword,
  useDeleteBannedKeyword,
  useListBannedKeywords,
} from '@generated/endpoints/admin-banned-keywords/admin-banned-keywords'
import { ArrowLeft, Plus, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import AdminShell from '@/components/admin/AdminShell'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Select from '@/components/ui/Select'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import {
  formatDateTime,
  KEYWORD_MAX,
  keywordError,
  VIOLATION_OPTIONS,
  violationLabel,
} from '@/lib/admin/productModeration'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import {
  cn,
  FOCUS_RING_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  PANEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/lib/ui/styles'

import type { SelectOption } from '@/components/ui/Select'
import type { BannedKeywordResponse } from '@generated/model/bannedKeywordResponse'
import type { BanProductRequestViolationType } from '@generated/model/banProductRequestViolationType'

const VIOLATION_SELECT_OPTIONS: SelectOption[] = VIOLATION_OPTIONS.map(function (option) {
  return { value: option.type, label: option.label }
})

function isAdminProductKey(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0]
  return typeof head === 'string' && head.startsWith('/api/admin/products')
}

export default function AdminBannedKeywords() {
  const [keyword, setKeyword] = useState('')
  const [violationType, setViolationType] = useState<BanProductRequestViolationType>('COUNTERFEIT')
  const [touched, setTouched] = useState(false)
  const [deletingTarget, setDeletingTarget] = useState<BannedKeywordResponse | null>(null)
  const queryClient = useQueryClient()
  const listQuery = useListBannedKeywords()
  const create = useCreateBannedKeyword()
  const remove = useDeleteBannedKeyword()

  const problem = keywordError(keyword)
  let visibleProblem: string | null = null
  if (touched) {
    visibleProblem = problem
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: getListBannedKeywordsQueryKey() })
    // Thêm từ khóa có thể gắn cờ thêm sản phẩm vào hàng đợi báo cáo.
    void queryClient.invalidateQueries({ predicate: (query) => isAdminProductKey(query.queryKey) })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (problem !== null) {
      return
    }
    create.mutate(
      { data: { keyword: keyword.trim(), violationType } },
      {
        onSuccess: function (response) {
          setKeyword('')
          setTouched(false)
          if (response.status === 201) {
            const flagged = response.data.flaggedProducts ?? 0
            notify.success(
              `Đã thêm từ khóa "${response.data.keyword?.keyword ?? ''}"`,
              `Gắn cờ ${flagged} sản phẩm đang có vào hàng đợi báo cáo.`,
            )
          }
          refresh()
        },
        onError: function (err) {
          notify.fromError(err, 'adminKeywords')
        },
      },
    )
  }

  function confirmDelete() {
    if (deletingTarget === null || deletingTarget.id === undefined) {
      return
    }
    const targetLabel = deletingTarget.keyword ?? ''
    remove.mutate(
      { id: deletingTarget.id },
      {
        onSuccess: function () {
          setDeletingTarget(null)
          notify.success(`Đã xóa từ khóa "${targetLabel}".`)
          refresh()
        },
        onError: function (err) {
          notify.fromError(err, 'adminKeywords')
        },
      },
    )
  }

  let listBody: React.ReactNode = <TableRowsSkeleton rows={5} columns={3} />
  if (listQuery.isError) {
    listBody = (
      <p
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
      >
        {hookErrorMessage('adminKeywords', listQuery.error)}
      </p>
    )
  }
  if (listQuery.isSuccess) {
    const items = takeData(listQuery.data)
    listBody = (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chưa có từ khóa nào. Thêm từ khóa để hệ thống tự gắn cờ sản phẩm nghi vi phạm.
      </p>
    )
    if (items.length > 0) {
      listBody = (
        <ul className="divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
          {items.map(function (item) {
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold break-words text-[#17203a] dark:text-[#e2e8f0]">
                    {item.keyword}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {violationLabel(item.violationType)} · {item.createdByEmail ?? 'Không rõ'} ·{' '}
                    {formatDateTime(item.createdAt)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setDeletingTarget(item)}
                  aria-label={`Xóa từ khóa ${item.keyword ?? ''}`}
                  className={cn(
                    'cursor-pointer rounded-full border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/15',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <Trash size={16} weight="bold" />
                </button>
              </li>
            )
          })}
        </ul>
      )
    }
  }

  return (
    <AdminShell
      title="Từ khóa cấm"
      description="Sản phẩm có tên hoặc mô tả chứa từ khóa (khớp nguyên từ, không phân biệt hoa thường) được tự gắn cờ vào hàng đợi báo cáo. Hệ thống không tự gỡ, admin quyết định."
      actions={
        <Link to="/admin/products" className={secondaryButtonClass()}>
          <ArrowLeft size={17} weight="bold" />
          Hàng đợi kiểm duyệt
        </Link>
      }
    >
      <div className="space-y-5">
        <form
          onSubmit={handleSubmit}
          className={cn(PANEL_CLASS, 'flex flex-col gap-3 md:flex-row md:items-start')}
        >
          <div className="flex-1">
            <label htmlFor="keyword-input" className={LABEL_CLASS}>
              Từ khóa
            </label>
            <input
              id="keyword-input"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onBlur={() => setTouched(true)}
              maxLength={KEYWORD_MAX}
              placeholder="Ví dụ: replica, like auth, hàng nhái"
              aria-invalid={visibleProblem !== null}
              className={INPUT_CLASS}
            />
            {visibleProblem !== null && (
              <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                {visibleProblem}
              </p>
            )}
          </div>
          <div className="md:w-64">
            <label htmlFor="keyword-violation" className={LABEL_CLASS}>
              Loại vi phạm
            </label>
            <Select
              id="keyword-violation"
              value={violationType}
              onValueChange={function (nextVal) {
                setViolationType(nextVal as BanProductRequestViolationType)
              }}
              options={VIOLATION_SELECT_OPTIONS}
              ariaLabel="Chọn loại vi phạm"
            />
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className={cn(
              primaryButtonClass(),
              'flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 md:mt-7',
            )}
          >
            <Plus size={16} weight="bold" />
            {create.isPending && <span>Đang thêm và quét…</span>}
            {create.isPending === false && <span>Thêm từ khóa</span>}
          </button>
        </form>

        <section className={PANEL_CLASS}>{listBody}</section>
      </div>

      <ConfirmDialog
        open={deletingTarget !== null}
        title="Xóa từ khóa cấm?"
        description={`Xóa từ khóa "${deletingTarget?.keyword ?? ''}" khỏi danh sách tự động gắn cờ? Các báo cáo đã tạo trước đó sẽ không bị xóa.`}
        confirmLabel="Xóa từ khóa"
        variant="danger"
        isPending={remove.isPending}
        onCancel={() => setDeletingTarget(null)}
        onConfirm={confirmDelete}
      />
    </AdminShell>
  )
}
