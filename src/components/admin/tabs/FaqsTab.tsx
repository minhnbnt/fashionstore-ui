import { useState } from 'react'
import { Link } from 'react-router'

import { useDeleteFaq, useListAdminFaqs } from '@generated/endpoints/admin-faq/admin-faq'
import { ArrowSquareOut, EyeSlash, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import {
  FAQ_CATEGORY_OPTIONS,
  faqCategoryLabel,
  groupBy,
  queryKeyStartsWith,
} from '@/lib/content/siteContent'
import { notify } from '@/lib/notifications'
import { cn, FOCUS_RING_CLASS, primaryButtonClass } from '@/lib/ui/styles'

import FaqFormDialog from '../dialogs/FaqFormDialog'

import type { FaqCategoryValue } from '@/lib/content/siteContent'
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

  let body: React.ReactNode = <TableRowsSkeleton rows={4} columns={3} />
  if (listQuery.isError) {
    body = (
      <p
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
      >
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
                  <h2 className="text-xs font-bold tracking-[0.14em] text-blue-700 uppercase dark:text-sky-300">
                    {faqCategoryLabel(group.key)} · {group.items.length}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCreatingIn(group.key)}
                    className={cn(
                      'flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    <Plus size={12} weight="bold" />
                    Thêm vào nhóm
                  </button>
                </div>
                <ul className="space-y-2">
                  {group.items.map(function (faq) {
                    const questionText = faq.question ?? ''
                    return (
                      <li
                        key={faq.id}
                        className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-white/10 dark:bg-white/5"
                      >
                        <span className="mt-0.5 w-8 shrink-0 text-center text-xs font-bold text-zinc-500 tabular-nums dark:text-zinc-400">
                          #{faq.sortOrder}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
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
                            aria-label={`Sửa câu hỏi: ${questionText}`}
                            className={cn(
                              'cursor-pointer rounded-full border border-indigo-200 p-2 text-blue-700 transition hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/10',
                              FOCUS_RING_CLASS,
                            )}
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(faq)}
                            aria-label={`Xóa câu hỏi: ${questionText}`}
                            className={cn(
                              'cursor-pointer rounded-full border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/15',
                              FOCUS_RING_CLASS,
                            )}
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
          className={cn(
            'flex w-fit cursor-pointer items-center gap-1.5 rounded-full text-sm font-semibold text-blue-700 hover:underline dark:text-sky-300',
            FOCUS_RING_CLASS,
          )}
        >
          Xem trang FAQ
          <ArrowSquareOut size={14} weight="bold" />
        </Link>
        <button
          type="button"
          onClick={() => setCreatingIn('ORDER')}
          className={cn(
            primaryButtonClass(),
            'flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold',
          )}
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

      <ConfirmDialog
        open={deleting !== null}
        variant="danger"
        title="Xóa câu hỏi"
        description={`Xóa hẳn "${deleting?.question ?? ''}"? Muốn ẩn tạm thời thì bỏ chọn "Hiện trên trang FAQ".`}
        confirmLabel="Xóa câu hỏi"
        isPending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting === null || deleting.id === undefined) {
            return
          }
          remove.mutate(
            { id: deleting.id },
            {
              onSuccess: () => refresh('Đã xóa câu hỏi.'),
              onError: (err) => notify.fromError(err, 'adminContent'),
            },
          )
        }}
      />
    </div>
  )
}
