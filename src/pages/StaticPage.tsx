import { useEffect } from 'react'
import { Link, useParams } from 'react-router'

import { useGetPage } from '@generated/endpoints/site-content/site-content'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatDateTime } from '@/lib/productModeration'

import Markdown from '../components/Markdown'

function useDocumentMeta(title: string | null, description: string | null) {
  useEffect(
    function () {
      if (title === null) {
        return
      }
      const previousTitle = document.title
      document.title = `${title} · nét`

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
      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-white/60 dark:bg-white/5" />
      <div className="h-4 w-full animate-pulse rounded-full bg-white/60 dark:bg-white/5" />
      <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/60 dark:bg-white/5" />
    </div>
  )
  if (query.isError) {
    body = (
      <div className="py-10 text-center">
        <p className="text-lg font-bold">{hookErrorMessage('sitePage', query.error)}</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-indigo-600 underline dark:text-indigo-300"
        >
          Về trang chủ
        </Link>
      </div>
    )
  }
  if (page !== null) {
    body = (
      <article>
        <Markdown source={page.content ?? ''} />
        <p className="mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          Cập nhật lần cuối: {formatDateTime(page.updatedAt)}
        </p>
      </article>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-[110px] pb-16">
      <section className="glass rounded-3xl p-6 md:p-10">{body}</section>
    </main>
  )
}
