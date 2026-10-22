import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useReportProduct } from '@generated/endpoints/product-reports/product-reports'
import { CheckCircle, Flag, X } from '@phosphor-icons/react'

import { hookErrorMessage } from '@/lib/apiAdapters'
import { BUYER_REPORT_REASONS, REPORT_DESCRIPTION_MAX } from '@/lib/productModeration'

import { useSessionQuery } from '../../hooks/useSession'

import type { BanProductRequestViolationType } from '@generated/model/banProductRequestViolationType'

/** "Báo cáo sản phẩm": đưa sản phẩm vào hàng đợi kiểm duyệt của admin. Chưa đăng nhập thì sang /login. */
export default function ReportProductButton({ productId }: { productId: string }) {
  const { data: session } = useSessionQuery()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<BanProductRequestViolationType | null>(null)
  const [description, setDescription] = useState('')
  const report = useReportProduct()

  function handleOpen() {
    if (session === null || session === undefined) {
      void navigate('/login', { state: { from: location.pathname } })
      return
    }
    report.reset()
    setReason(null)
    setDescription('')
    setOpen(true)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reason === null) {
      return
    }
    report.mutate({ id: productId, data: { reason, description: description.trim() } })
  }

  let body = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Sản phẩm này có vấn đề gì?</legend>
        <div className="space-y-1.5">
          {BUYER_REPORT_REASONS.map(function (option) {
            const checked = option.type === reason
            let optionClass =
              'flex cursor-pointer items-center gap-2.5 rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-sm transition hover:border-indigo-300 dark:border-white/10'
            if (checked) {
              optionClass =
                'flex cursor-pointer items-center gap-2.5 rounded-2xl border border-indigo-500 bg-indigo-50 px-3.5 py-2.5 text-sm font-semibold transition dark:bg-indigo-500/10'
            }
            return (
              <label key={option.type} className={optionClass}>
                <input
                  type="radio"
                  name="report-reason"
                  value={option.type}
                  checked={checked}
                  onChange={() => setReason(option.type)}
                  className="accent-indigo-600"
                />
                {option.label}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="report-description" className="mb-2 block text-sm font-bold">
          Mô tả thêm <span className="font-normal text-zinc-500">(không bắt buộc)</span>
        </label>
        <textarea
          id="report-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={REPORT_DESCRIPTION_MAX}
          placeholder="Ví dụ: logo in lệch, chất vải khác ảnh…"
          className="w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/5"
        />
        <p className="mt-1 text-right text-xs text-zinc-400 tabular-nums">
          {description.length}/{REPORT_DESCRIPTION_MAX}
        </p>
      </div>

      {report.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {hookErrorMessage('productReport', report.error)}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={reason === null || report.isPending}
          className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {report.isPending && <span>Đang gửi…</span>}
          {report.isPending === false && <span>Gửi báo cáo</span>}
        </button>
      </div>
    </form>
  )
  if (report.isSuccess) {
    body = (
      <div className="space-y-4 text-center">
        <CheckCircle size={44} weight="fill" className="mx-auto text-emerald-500" />
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Cảm ơn bạn đã báo cáo. Đội ngũ kiểm duyệt sẽ xem xét và xử lý nếu sản phẩm vi phạm chính
          sách của sàn.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-primary rounded-full px-6 py-2.5 text-sm font-bold"
        >
          Đóng
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
      >
        <Flag size={14} weight="bold" />
        Báo cáo sản phẩm
      </button>

      {open && (
        <dialog
          open
          aria-labelledby="report-product-title"
          className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/60 p-4 text-inherit backdrop-blur-xs"
        >
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="report-product-title" className="text-lg font-extrabold tracking-tighter">
                Báo cáo sản phẩm
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            {body}
          </div>
        </dialog>
      )}
    </>
  )
}
