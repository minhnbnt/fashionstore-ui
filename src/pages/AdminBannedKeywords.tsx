import { useState } from 'react'
import { Link } from 'react-router'

import {
  getListBannedKeywordsQueryKey,
  useCreateBannedKeyword,
  useDeleteBannedKeyword,
  useListBannedKeywords,
} from '@generated/endpoints/admin-banned-keywords/admin-banned-keywords'
import { ArrowLeft, Plus, Trash, X } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import {
  formatDateTime,
  KEYWORD_MAX,
  keywordError,
  VIOLATION_OPTIONS,
  violationLabel,
} from '@/lib/productModeration'

import AdminShell from '../components/admin/AdminShell'

import type { BanProductRequestViolationType } from '@generated/model/banProductRequestViolationType'

function isAdminProductKey(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0]
  return typeof head === 'string' && head.startsWith('/api/admin/products')
}

export default function AdminBannedKeywords() {
  const [keyword, setKeyword] = useState('')
  const [violationType, setViolationType] = useState<BanProductRequestViolationType>('COUNTERFEIT')
  const [touched, setTouched] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
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
            setNotice(
              `Đã thêm "${response.data.keyword?.keyword ?? ''}". Gắn cờ ${flagged} sản phẩm đang có vào hàng đợi báo cáo.`,
            )
          }
          refresh()
        },
      },
    )
  }

  function handleDelete(id: string) {
    remove.mutate(
      { id },
      {
        onSuccess: function () {
          setConfirmId(null)
          refresh()
        },
      },
    )
  }

  let listBody = <p className="text-sm text-zinc-500 dark:text-zinc-400">Đang tải…</p>
  if (listQuery.isError) {
    listBody = (
      <p className="text-sm text-red-600 dark:text-red-400">
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
        <ul className="divide-y divide-zinc-100 rounded-2xl bg-white/70 dark:divide-white/10 dark:bg-white/5">
          {items.map(function (item) {
            const confirming = item.id !== undefined && item.id === confirmId
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold break-words">{item.keyword}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {violationLabel(item.violationType)} · {item.createdByEmail ?? 'Không rõ'} ·{' '}
                    {formatDateTime(item.createdAt)}
                  </span>
                </span>
                {confirming === false && (
                  <button
                    type="button"
                    onClick={() => setConfirmId(item.id ?? null)}
                    aria-label={`Xóa từ khóa ${item.keyword ?? ''}`}
                    className="rounded-full p-2 text-zinc-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash size={16} weight="bold" />
                  </button>
                )}
                {confirming && item.id !== undefined && (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id ?? '')}
                      disabled={remove.isPending}
                      className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </span>
                )}
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
        <Link
          to="/admin/products"
          className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-white/70 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10"
        >
          <ArrowLeft size={17} weight="bold" />
          Hàng đợi kiểm duyệt
        </Link>
      }
    >
      {notice !== null && (
        <output className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          {notice}
          <button type="button" aria-label="Ẩn thông báo" onClick={() => setNotice(null)}>
            <X size={16} weight="bold" />
          </button>
        </output>
      )}

      <form
        onSubmit={handleSubmit}
        className="mb-6 flex flex-col gap-3 rounded-2xl bg-white/70 p-4 md:flex-row md:items-start dark:bg-white/5"
      >
        <div className="flex-1">
          <label htmlFor="keyword-input" className="mb-1.5 block text-sm font-bold">
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
            className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5"
          />
          {visibleProblem !== null && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{visibleProblem}</p>
          )}
        </div>
        <div className="md:w-64">
          <label htmlFor="keyword-violation" className="mb-1.5 block text-sm font-bold">
            Loại vi phạm
          </label>
          <select
            id="keyword-violation"
            value={violationType}
            onChange={(event) =>
              setViolationType(event.target.value as BanProductRequestViolationType)
            }
            className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-zinc-900"
          >
            {VIOLATION_OPTIONS.map(function (option) {
              return (
                <option key={option.type} value={option.type}>
                  {option.label}
                </option>
              )
            })}
          </select>
        </div>
        <button
          type="submit"
          disabled={create.isPending}
          className="flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 md:mt-7 dark:bg-indigo-500"
        >
          <Plus size={16} weight="bold" />
          {create.isPending && <span>Đang thêm và quét…</span>}
          {create.isPending === false && <span>Thêm từ khóa</span>}
        </button>
      </form>

      {create.isError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('adminKeywords', create.error)}
        </p>
      )}
      {remove.isError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('adminKeywords', remove.error)}
        </p>
      )}

      {listBody}
    </AdminShell>
  )
}
