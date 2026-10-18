import { useState } from 'react'

import { useGetAdminPage, useListAdminPages } from '@generated/endpoints/admin-pages/admin-pages'
import { FileText, Plus } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatDateTime } from '@/lib/productModeration'
import {
  footerGroupLabel,
  pageStatusBadgeClass,
  pageStatusLabel,
  queryKeyStartsWith,
} from '@/lib/siteContent'

import PageEditor from './PageEditor'

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
      <p className="text-sm text-red-600 dark:text-red-400">
        {hookErrorMessage('adminContent', query.error)}
      </p>
    )
  }
  if (query.isSuccess === false) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white/60 dark:bg-white/5" />
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

  let body = <div className="h-40 animate-pulse rounded-2xl bg-white/60 dark:bg-white/5" />
  if (listQuery.isError) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">
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
        <ul className="space-y-2">
          {pages.map(function (page) {
            return (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => setEditor({ id: page.id ?? null })}
                  className="flex w-full flex-col gap-2 rounded-2xl bg-white/70 p-3 text-left transition hover:bg-white sm:flex-row sm:items-center dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <FileText size={22} className="hidden shrink-0 text-indigo-500 sm:block" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{page.title}</span>
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
          className="flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 dark:bg-indigo-500"
        >
          <Plus size={16} weight="bold" />
          Thêm trang
        </button>
      </div>
      {body}
    </div>
  )
}
