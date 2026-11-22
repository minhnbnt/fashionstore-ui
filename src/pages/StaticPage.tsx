import { useEffect } from 'react'
import { Link, useParams } from 'react-router'

import { useGetPage } from '@generated/endpoints/site-content/site-content'

import { Skeleton } from '@/components/ui/Skeleton'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { formatDateTime } from '@/lib/format'
import { CARD_CLASS, cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import Markdown from '../components/Markdown'

function useDocumentMeta(title: string | null, description: string | null) {
  useEffect(
    function () {
      if (title === null) {
        return
      }
      const previousTitle = document.title
      document.title = `${title} · DHMQ`

      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      let created = false
      if (meta === null) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
        created = true
      }
      const previousDescription = meta.content
      meta.content = description ?? ''

      const element = meta
      return function () {
        document.title = previousTitle
        if (created) {
          element.remove()
          return
        }
        element.content = previousDescription
      }
    },
    [title, description],
  )
}

export default function StaticPage() {
  const { slug = '' } = useParams()
  const query = useGetPage(slug, { query: { enabled: slug !== '', staleTime: 5 * 60_000 } })

  let page = null
  if (query.isSuccess) {
    page = takeData(query.data)
  }
  useDocumentMeta(page?.title ?? null, page?.metaDescription ?? null)

  let body = (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-10 w-2/3 rounded-2xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
  if (query.isError) {
    body = (
      <div className="py-10 text-center">
        <p className="text-lg font-bold text-[#17203a] dark:text-[#e2e8f0]">
          {hookErrorMessage('sitePage', query.error)}
        </p>
        <Link
          to="/"
          className={cn(
            'btn-primary mt-5 inline-flex cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold',
            FOCUS_RING_CLASS,
          )}
        >
          Về trang chủ
        </Link>
      </div>
    )
  }
  if (page !== null) {
    const pageTitle = page.title ?? ''
    body = (
      <div className="text-[#17203a] dark:text-[#e2e8f0]">
        {pageTitle !== '' && (
          <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-[#17203a] md:text-3xl dark:text-white">
            {pageTitle}
          </h1>
        )}
        <Markdown source={page.content ?? ''} />
        <p className="mt-10 border-t border-zinc-200/80 pt-4 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-300">
          Cập nhật lần cuối: {formatDateTime(page.updatedAt)}
        </p>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pt-24 pb-16">
      <section className={cn(CARD_CLASS, 'p-6 md:p-10')}>{body}</section>
    </main>
  )
}
