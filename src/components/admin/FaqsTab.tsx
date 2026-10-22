import { useState } from 'react'
import { Link } from 'react-router'

import { useDeleteFaq, useListAdminFaqs } from '@generated/endpoints/admin-faq/admin-faq'
import { ArrowSquareOut, EyeSlash, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import {
  FAQ_CATEGORY_OPTIONS,
  faqCategoryLabel,
  groupBy,
  queryKeyStartsWith,
} from '@/lib/siteContent'

import ConfirmDialog from './ConfirmDialog'
import FaqFormDialog from './FaqFormDialog'

import type { FaqCategoryValue } from '@/lib/siteContent'
import type { FaqResponse } from '@generated/model/faqResponse'

const FAQ_KEYS = ['/api/admin/faqs', '/api/public/faqs']
const CATEGORY_ORDER = FAQ_CATEGORY_OPTIONS.map((option) => option.value)

export default function FaqsTab({ onNotice }: { onNotice: (message: string) => void }) {
  const [editing, setEditing] = useState<FaqResponse | null>(null)
  const [creatingIn, setCreatingIn] = useState<FaqCategoryValue | null>(null)
  const [deleting, setDeleting] = useState<FaqResponse | null>(null)
  const queryClient = useQueryClient()
  const listQuery = useListAdminFaqs()
  const remove = useDeleteFaq()

  function refresh(message: string) {
    setEditing(null)
    setCreatingIn(null)
    setDeleting(null)
    onNotice(message)
    void queryClient.invalidateQueries({
      predicate: (query) => queryKeyStartsWith(query.queryKey, FAQ_KEYS),
    })
  }

  let deleteError: string | null = null
  if (remove.isError) {
    deleteError = hookErrorMessage('adminContent', remove.error)
  }

  let body = <div className="h-40 animate-pulse rounded-2xl bg-white/60 dark:bg-white/5" />
  if (listQuery.isError) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">
        {hookErrorMessage('adminContent', listQuery.error)}
      </p>
    )
  }
  if (listQuery.isSuccess) {
    const groups = groupBy(takeData(listQuery.data), CATEGORY_ORDER, (faq) => faq.category)
    body = (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chưa có câu hỏi nào. Bấm "Thêm câu hỏi" để tạo.
      </p>
    )
    if (groups.length > 0) {
      body = (
        <div className="space-y-6">
          {groups.map(function (group) {
            return (
              <section key={group.key}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold tracking-[0.14em] text-indigo-600 uppercase dark:text-indigo-400">
                    {faqCategoryLabel(group.key)} · {group.items.length}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCreatingIn(group.key)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    <Plus size={12} weight="bold" />
                    Thêm vào nhóm
                  </button>
                </div>
                <ul className="space-y-2">
                  {group.items.map(function (faq) {
                    return (
                      <li
                        key={faq.id}
                        className="flex items-start gap-3 rounded-2xl bg-white/70 p-3 dark:bg-white/5"
                      >
                        <span className="mt-0.5 w-8 shrink-0 text-center text-xs font-bold text-zinc-400 tabular-nums">
                          #{faq.sortOrder}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-bold">
                            {faq.question}
                            {faq.published !== true && (
                              <span className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-white/10 dark:text-zinc-300">
                                <EyeSlash size={12} weight="bold" />
                                Đang ẩn
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {faq.answer}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditing(faq)}
                            aria-label="Sửa câu hỏi"
                            className="rounded-full border border-indigo-200 p-2 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(faq)}
                            aria-label="Xóa câu hỏi"
                            className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <Trash size={16} weight="bold" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )
    }
  }

  let defaultCategory: FaqCategoryValue = 'ORDER'
  if (creatingIn !== null) {
    defaultCategory = creatingIn
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/faq"
          target="_blank"
          className="flex w-fit items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
        >
          Xem trang FAQ
          <ArrowSquareOut size={14} weight="bold" />
        </Link>
        <button
          type="button"
          onClick={() => setCreatingIn('ORDER')}
          className="flex w-fit items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 dark:bg-indigo-500"
        >
          <Plus size={16} weight="bold" />
          Thêm câu hỏi
        </button>
      </div>

      {body}

      {(creatingIn !== null || editing !== null) && (
        <FaqFormDialog
          faq={editing}
          defaultCategory={defaultCategory}
          onClose={() => {
            setCreatingIn(null)
            setEditing(null)
          }}
          onDone={refresh}
        />
      )}

      {deleting !== null && (
        <ConfirmDialog
          open
          title="Xóa câu hỏi"
          description={`Xóa hẳn "${deleting.question ?? ''}"? Muốn ẩn tạm thời thì bỏ chọn "Hiện trên trang FAQ".`}
          confirmLabel="Xóa câu hỏi"
          pending={remove.isPending}
          error={deleteError ?? undefined}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            if (deleting.id === undefined) {
              return
            }
            remove.mutate({ id: deleting.id }, { onSuccess: () => refresh('Đã xóa câu hỏi.') })
          }}
        />
      )}
    </div>
  )
}
