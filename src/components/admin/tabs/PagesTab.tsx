import { useState } from 'react'

import { useGetAdminPage, useListAdminPages } from '@generated/endpoints/admin-pages/admin-pages'
import { FileText, Plus } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/admin/productModeration'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import {
  footerGroupLabel,
  pageStatusBadgeClass,
  pageStatusLabel,
  queryKeyStartsWith,
} from '@/lib/content/siteContent'
import { cn, FOCUS_RING_CLASS, primaryButtonClass } from '@/lib/ui/styles'

import PageEditor from '../PageEditor'

import type { SitePageResponse } from '@generated/model/sitePageResponse'

const PAGE_KEYS = ['/api/admin/pages', '/api/public/pages']

/** null = đang xem danh sách; id null = trang mới. */
type EditorTarget = { id: string | null } | null

function ExistingPageEditor({
  id,
  onBack,
  onSaved,
  onDeleted,
}: {
  id: string
  onBack: () => void
  onSaved: (page: SitePageResponse, message: string) => void
  onDeleted: (message: string) => void
}) {
  const query = useGetAdminPage(id)
  if (query.isError) {
    return (
      <p
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
      >
        {hookErrorMessage('adminContent', query.error)}
      </p>
    )
  }
  if (query.isSuccess === false) {
    return <TableRowsSkeleton rows={5} columns={2} />
  }
  const page = takeData(query.data)
  // key theo updatedAt: lưu xong form nạp lại đúng bản trên server
  return (
    <PageEditor
      key={page.updatedAt}
      page={page}
      onBack={onBack}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  )
}

export default function PagesTab({ onNotice }: { onNotice: (message: string) => void }) {
  const [editor, setEditor] = useState<EditorTarget>(null)
  const queryClient = useQueryClient()
  const listQuery = useListAdminPages()

  function invalidate() {
    void queryClient.invalidateQueries({
      predicate: (query) => queryKeyStartsWith(query.queryKey, PAGE_KEYS),
    })
  }

  function handleSaved(page: SitePageResponse, message: string) {
    onNotice(message)
    invalidate()
    setEditor({ id: page.id ?? null })
  }

  function handleDeleted(message: string) {
    onNotice(message)
    invalidate()
    setEditor(null)
  }

  if (editor !== null) {
    if (editor.id === null) {
      return (
        <PageEditor
          page={null}
          onBack={() => setEditor(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )
    }
    return (
      <ExistingPageEditor
        id={editor.id}
        onBack={() => setEditor(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    )
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
    const pages = takeData(listQuery.data)
    body = (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chưa có trang nào. Bấm "Thêm trang" để tạo.
      </p>
    )
    if (pages.length > 0) {
      body = (
        <ul className="space-y-2.5">
          {pages.map(function (page) {
            return (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => setEditor({ id: page.id ?? null })}
                  className={cn(
                    'flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3 text-left transition hover:border-blue-300 hover:bg-sky-50/60 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-400/40 dark:hover:bg-white/10',
                    FOCUS_RING_CLASS,
                  )}
                >
                  <FileText
                    size={22}
                    className="hidden shrink-0 text-blue-700 sm:block dark:text-sky-300"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
                      {page.title}
                    </span>
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      /pages/{page.slug} · {footerGroupLabel(page.footerGroup)} · Thứ tự{' '}
                      {page.sortOrder}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className={pageStatusBadgeClass(page.status)}>
                      {pageStatusLabel(page.status)}
                    </span>
                    <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                      {formatDateTime(page.updatedAt)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Giới thiệu, chính sách, điều khoản... Trang mới là nháp, xuất bản rồi mới hiện ở footer.
        </p>
        <button
          type="button"
          onClick={() => setEditor({ id: null })}
          className={cn(
            primaryButtonClass(),
            'flex w-fit shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold',
          )}
        >
          <Plus size={16} weight="bold" />
          Thêm trang
        </button>
      </div>
      {body}
    </div>
  )
}
