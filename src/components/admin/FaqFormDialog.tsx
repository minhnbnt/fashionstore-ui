import { useState } from 'react'

import { useCreateFaq, useUpdateFaq } from '@generated/endpoints/admin-faq/admin-faq'

import { hookErrorMessage } from '@/lib/apiAdapters'
import { FAQ_CATEGORY_OPTIONS } from '@/lib/siteContent'

import Markdown from '../Markdown'
import ContentDialog, { HINT_CLASS, INPUT_CLASS, LABEL_CLASS } from './ContentDialog'

import type { FaqCategoryValue } from '@/lib/siteContent'
import type { FaqRequest } from '@generated/model/faqRequest'
import type { FaqResponse } from '@generated/model/faqResponse'

interface Props {
  /** null = tạo mới. */
  faq: FaqResponse | null
  defaultCategory: FaqCategoryValue
  onClose: () => void
  onDone: (message: string) => void
}

export default function FaqFormDialog({ faq, defaultCategory, onClose, onDone }: Props) {
  const [category, setCategory] = useState<FaqCategoryValue>(faq?.category ?? defaultCategory)
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [sortOrder, setSortOrder] = useState(String(faq?.sortOrder ?? 0))
  const [published, setPublished] = useState(faq?.published ?? true)
  const create = useCreateFaq()
  const update = useUpdateFaq()

  const order = Number(sortOrder)
  const canSubmit =
    question.trim() !== '' &&
    answer.trim() !== '' &&
    Number.isInteger(order) &&
    order >= 0 &&
    order <= 9999
  const pending = create.isPending || update.isPending

  let error: string | null = null
  if (create.isError) {
    error = hookErrorMessage('adminContent', create.error)
  }
  if (update.isError) {
    error = hookErrorMessage('adminContent', update.error)
  }

  function handleSubmit() {
    if (canSubmit === false) {
      return
    }
    const data: FaqRequest = {
      category,
      question: question.trim(),
      answer: answer.trim(),
      sortOrder: order,
      published,
    }
    if (faq?.id === undefined) {
      create.mutate({ data }, { onSuccess: () => onDone('Đã thêm câu hỏi.') })
      return
    }
    update.mutate({ id: faq.id, data }, { onSuccess: () => onDone('Đã lưu câu hỏi.') })
  }

  let dialogTitle = 'Sửa câu hỏi'
  if (faq === null) {
    dialogTitle = 'Thêm câu hỏi'
  }

  return (
    <ContentDialog
      title={dialogTitle}
      submitLabel="Lưu câu hỏi"
      pendingLabel="Đang lưu…"
      pending={pending}
      canSubmit={canSubmit}
      error={error}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="block">
          <span className={LABEL_CLASS}>Nhóm</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as FaqCategoryValue)}
            className={INPUT_CLASS}
          >
            {FAQ_CATEGORY_OPTIONS.map(function (option) {
              return (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              )
            })}
          </select>
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Thứ tự</span>
          <input
            type="number"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <label className="block">
        <span className={LABEL_CLASS}>Câu hỏi</span>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={300}
          placeholder="Tôi muốn đổi size thì làm thế nào?"
          className={INPUT_CLASS}
        />
      </label>

      <label className="block">
        <span className={LABEL_CLASS}>Câu trả lời</span>
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          maxLength={5000}
          rows={5}
          className={`${INPUT_CLASS} resize-y font-mono`}
        />
        <span className={HINT_CLASS}>
          Markdown: **đậm**, - gạch đầu dòng, [chữ](/pages/chinh-sach-doi-tra) để chèn link.
        </span>
      </label>

      {answer.trim() !== '' && (
        <div className="rounded-2xl border border-zinc-100 p-4 dark:border-white/10">
          <p className="mb-1 text-xs font-bold tracking-[0.14em] text-zinc-400 uppercase">
            Xem trước
          </p>
          <Markdown source={answer} />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={published}
          onChange={(event) => setPublished(event.target.checked)}
          className="h-4 w-4 accent-indigo-600"
        />
        Hiện trên trang FAQ
      </label>
    </ContentDialog>
  )
}
