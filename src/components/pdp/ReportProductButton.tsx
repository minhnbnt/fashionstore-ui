import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useReportProduct } from '@generated/endpoints/product-reports/product-reports'
import { CheckCircle, Flag } from '@phosphor-icons/react'

import Modal from '@/components/Modal'
import { BUYER_REPORT_REASONS, REPORT_DESCRIPTION_MAX } from '@/lib/admin/productModeration'
import { hookErrorMessage } from '@/lib/api/apiAdapters'
import { cn, FOCUS_RING_CLASS, secondaryButtonClass, TEXTAREA_CLASS } from '@/lib/ui/styles'

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
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Sản phẩm này có vấn đề gì?</legend>
        <div className="space-y-1.5">
          {BUYER_REPORT_REASONS.map(function (option) {
            const checked = option.type === reason
            let optionClass =
              'flex cursor-pointer items-center gap-2.5 rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-sm transition hover:border-blue-400 dark:border-white/10 dark:hover:border-sky-400/50'
            if (checked) {
              optionClass =
                'flex cursor-pointer items-center gap-2.5 rounded-2xl border border-blue-600 bg-blue-50/80 px-3.5 py-2.5 text-sm font-semibold transition dark:border-sky-400 dark:bg-sky-400/10'
            }
            return (
              <label key={option.type} className={optionClass}>
                <input
                  type="radio"
                  name="report-reason"
                  value={option.type}
                  checked={checked}
                  onChange={() => setReason(option.type)}
                  className="accent-blue-600 dark:accent-sky-400"
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
          className={cn(TEXTAREA_CLASS, 'resize-y')}
        />
        <p className="mt-1 text-right text-xs text-zinc-400 tabular-nums">
          {description.length}/{REPORT_DESCRIPTION_MAX}
        </p>
      </div>

      {report.isError && (
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          {hookErrorMessage('productReport', report.error)}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={cn(secondaryButtonClass(), 'px-5 py-2.5')}
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={reason === null || report.isPending}
          className={cn(
            'btn-primary cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
            FOCUS_RING_CLASS,
          )}
        >
          {report.isPending && <span>Đang gửi…</span>}
          {report.isPending === false && <span>Gửi báo cáo</span>}
        </button>
      </div>
    </form>
  )
  if (report.isSuccess) {
    body = (
      <div className="mt-4 space-y-4 text-center">
        <CheckCircle size={44} weight="fill" className="mx-auto text-emerald-500" />
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Cảm ơn bạn đã báo cáo. Đội ngũ kiểm duyệt sẽ xem xét và xử lý nếu sản phẩm vi phạm chính
          sách của sàn.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={cn(
            'btn-primary cursor-pointer rounded-full px-6 py-2.5 text-sm font-bold',
            FOCUS_RING_CLASS,
          )}
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
        className={cn(
          'flex cursor-pointer items-center gap-1.5 rounded-full text-sm font-semibold text-zinc-500 transition hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400',
          FOCUS_RING_CLASS,
        )}
      >
        <Flag size={14} weight="bold" />
        Báo cáo sản phẩm
      </button>

      {open && (
        <Modal
          title="Báo cáo sản phẩm"
          onClose={() => setOpen(false)}
          widthClass="max-w-md"
          closeOnBackdrop
        >
          {body}
        </Modal>
      )}
    </>
  )
}
