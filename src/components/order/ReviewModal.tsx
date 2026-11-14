import { useState } from 'react'

import { Star } from '@phosphor-icons/react'

import Modal from '../Modal'

import type { ReviewResponse } from '@generated/model/reviewResponse'

interface Props {
  open: boolean
  productName: string
  existingReview?: ReviewResponse | null
  isPending?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (stars: number, comment: string) => void
}

function starIconWeight(star: number, selected: number): 'fill' | 'regular' {
  if (star <= selected) {
    return 'fill'
  }
  return 'regular'
}

export default function ReviewModal(props: Props) {
  const existing = props.existingReview ?? null
  const [stars, setStars] = useState<number>(existing?.stars ?? 5)
  const [comment, setComment] = useState<string>(existing?.comment ?? '')

  if (!props.open) {
    return null
  }

  const isEditLocked = existing !== null && Boolean(existing.edited)
  const isEditing = existing !== null && !isEditLocked

  let title = `Đánh giá ${props.productName}`
  if (isEditing) {
    title = `Chỉnh sửa đánh giá — ${props.productName}`
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEditLocked) {
      return
    }
    props.onSubmit(stars, comment.trim())
  }

  return (
    <Modal title={title} onClose={props.onClose} widthClass="max-w-md">
      <div className="mt-4 space-y-4">
        {isEditing && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
            Lưu ý: Bạn chỉ được chỉnh sửa đánh giá này 1 lần duy nhất.
          </p>
        )}

        {isEditLocked && (
          <div className="space-y-3 rounded-2xl border border-sky-100 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
            <p className="font-semibold text-zinc-700 dark:text-zinc-200">
              Bạn đã sử dụng hết lượt chỉnh sửa cho đánh giá này.
            </p>
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={18} weight={starIconWeight(n, existing.stars ?? 5)} />
              ))}
            </div>
            {Boolean(existing.comment) && (
              <p className="text-zinc-600 dark:text-zinc-300">{existing.comment}</p>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 dark:border-white/15 dark:text-zinc-200"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {!isEditLocked && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} sao`}
                  onClick={() => setStars(n)}
                  className="text-amber-400 transition hover:scale-110"
                >
                  <Star size={26} weight={starIconWeight(n, stars)} />
                </button>
              ))}
            </div>

            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Chia sẻ trải nghiệm sản phẩm..."
                className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500"
              />
              <p className="mt-1 text-right text-[11px] text-zinc-400">{comment.length} / 2000</p>
            </div>

            {Boolean(props.error) && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200">
                {props.error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 dark:border-white/15 dark:text-zinc-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={props.isPending}
                className="btn-primary rounded-full px-5 py-2 text-xs font-bold disabled:opacity-50"
              >
                {isEditing && 'Lưu chỉnh sửa'}
                {!isEditing && 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
