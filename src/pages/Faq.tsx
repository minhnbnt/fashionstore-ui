import { useState } from 'react'
import { Link } from 'react-router'

import { useListFaqs } from '@generated/endpoints/site-content/site-content'
import { CaretDown, MagnifyingGlass, Question } from '@phosphor-icons/react'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { FAQ_CATEGORY_OPTIONS, faqCategoryLabel, groupBy, slugify } from '@/lib/siteContent'

import Markdown from '../components/Markdown'

import type { PublicFaqResponse } from '@generated/model/publicFaqResponse'

const CATEGORY_ORDER = FAQ_CATEGORY_OPTIONS.map((option) => option.value)

/** Lọc không dấu: gõ "doi tra" vẫn ra "đổi trả". */
function matches(faq: PublicFaqResponse, keyword: string): boolean {
  if (keyword === '') {
    return true
  }
  const haystack = slugify(`${faq.question ?? ''} ${faq.answer ?? ''}`)
  return haystack.includes(keyword)
}

export default function Faq() {
  const query = useListFaqs({ query: { staleTime: 5 * 60_000 } })
  const [search, setSearch] = useState('')
  const keyword = slugify(search)

  let body = (
    <div className="space-y-2" aria-busy="true">
      {[0, 1, 2, 3].map(function (index) {
        return (
          <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/60 dark:bg-white/5" />
        )
      })}
    </div>
  )
  if (query.isError) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">
        {hookErrorMessage('faqs', query.error)}
      </p>
    )
  }
  if (query.isSuccess) {
    const faqs = takeData(query.data).filter((faq) => matches(faq, keyword))
    const groups = groupBy(faqs, CATEGORY_ORDER, (faq) => faq.category)
    body = (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Không có câu hỏi nào khớp.
      </p>
    )
    if (groups.length > 0) {
      body = (
        <div className="space-y-8">
          {groups.map(function (group) {
            return (
              <section key={group.key} aria-labelledby={`faq-${group.key}`}>
                <h2
                  id={`faq-${group.key}`}
                  className="mb-3 text-sm font-bold tracking-[0.14em] text-indigo-600 uppercase dark:text-indigo-400"
                >
                  {faqCategoryLabel(group.key)}
                </h2>
                <div className="space-y-2">
                  {group.items.map(function (faq) {
                    return (
                      <details
                        key={faq.id}
                        className="group rounded-2xl bg-white/70 px-5 py-4 dark:bg-white/5"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
                          {faq.question}
                          <CaretDown
                            size={16}
                            weight="bold"
                            className="shrink-0 transition group-open:rotate-180"
                          />
                        </summary>
                        <div className="mt-2">
                          <Markdown source={faq.answer ?? ''} />
                        </div>
                      </details>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-[110px] pb-16">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
          <Question size={22} weight="bold" className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tighter">Câu hỏi thường gặp</h1>
      </div>

      <label className="mb-6 flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
        <MagnifyingGlass size={16} weight="bold" className="shrink-0 text-zinc-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm câu hỏi, ví dụ: đổi size"
          aria-label="Tìm câu hỏi"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      {body}

      <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chưa thấy câu trả lời? Xem{' '}
        <Link
          to="/pages/chinh-sach-doi-tra"
          className="font-semibold text-indigo-600 underline dark:text-indigo-300"
        >
          chính sách đổi trả
        </Link>{' '}
        hoặc gọi 028 3861 4613.
      </p>
    </main>
  )
}
