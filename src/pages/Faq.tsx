import { useState } from 'react'
import { Link } from 'react-router'

import { useListFaqs } from '@generated/endpoints/site-content/site-content'
import { CaretDown, MagnifyingGlass, Question } from '@phosphor-icons/react'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { FAQ_CATEGORY_OPTIONS, faqCategoryLabel, groupBy, slugify } from '@/lib/content/siteContent'
import { CARD_CLASS, cn } from '@/lib/ui/styles'

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
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2, 3].map(function (index) {
        return <Skeleton key={index} className="h-14 w-full rounded-3xl" />
      })}
    </div>
  )
  if (query.isError) {
    body = (
      <div className={cn(CARD_CLASS, 'px-6 py-10 text-center')}>
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {hookErrorMessage('faqs', query.error)}
        </p>
      </div>
    )
  }
  if (query.isSuccess) {
    const faqs = takeData(query.data).filter((faq) => matches(faq, keyword))
    const groups = groupBy(faqs, CATEGORY_ORDER, (faq) => faq.category)
    body = (
      <EmptyState
        icon={<Question size={26} weight="duotone" />}
        title="Không có câu hỏi nào khớp"
        description="Thử tìm với từ khóa khác hoặc xem chính sách chi tiết bên dưới."
      />
    )
    if (groups.length > 0) {
      body = (
        <div className="space-y-8">
          {groups.map(function (group) {
            return (
              <section key={group.key} aria-labelledby={`faq-${group.key}`}>
                <h2
                  id={`faq-${group.key}`}
                  className="mb-3 text-sm font-bold tracking-[0.14em] text-blue-700 uppercase dark:text-sky-300"
                >
                  {faqCategoryLabel(group.key)}
                </h2>
                <div className="space-y-2.5">
                  {group.items.map(function (faq) {
                    return (
                      <details
                        key={faq.id}
                        className={cn(
                          CARD_CLASS,
                          'group px-5 py-4 transition hover:border-zinc-300 dark:hover:border-white/20',
                        )}
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-[#17203a] dark:text-[#e2e8f0]">
                          {faq.question}
                          <CaretDown
                            size={16}
                            weight="bold"
                            className="shrink-0 text-zinc-500 transition group-open:rotate-180 dark:text-zinc-400"
                          />
                        </summary>
                        <div className="mt-3 border-t border-zinc-200/70 pt-3 text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-300">
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
        <h1 className="text-2xl font-extrabold tracking-tighter text-[#17203a] dark:text-[#e2e8f0]">
          Câu hỏi thường gặp
        </h1>
      </div>

      <label className="mb-6 flex items-center gap-2 rounded-full border border-zinc-300 bg-white/80 px-4 py-2.5 transition focus-within:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:focus-within:border-sky-400">
        <MagnifyingGlass size={16} weight="bold" className="shrink-0 text-zinc-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm câu hỏi, ví dụ: đổi size"
          aria-label="Tìm câu hỏi"
          className="w-full bg-transparent text-sm text-[#17203a] outline-none placeholder:text-zinc-400 dark:text-white"
        />
      </label>

      {body}

      <p className="mt-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
        Chưa thấy câu trả lời? Xem{' '}
        <Link
          to="/pages/chinh-sach-doi-tra"
          className="cursor-pointer font-semibold text-blue-700 underline dark:text-sky-300"
        >
          chính sách đổi trả
        </Link>{' '}
        hoặc gọi 028 3861 4613.
      </p>
    </main>
  )
}
