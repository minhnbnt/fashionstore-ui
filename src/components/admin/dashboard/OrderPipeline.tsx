import { Link } from 'react-router'

import { formatDuration, formatPercent, safeRatio } from '@/lib/admin/adminStats'
import { cn, FOCUS_RING_CLASS, PANEL_CLASS } from '@/lib/ui/styles'

export interface PipelineStage {
  status: string
  label: string
  count: number
  /** Lớp nền của đoạn thanh; màu trạng thái luôn đi kèm nhãn chữ bên dưới. */
  fillClass: string
}

interface Props {
  stages: PipelineStage[]
  total: number
  cancelled: number
  avgConfirmHours: number
  avgDeliveryHours: number
}

/**
 * Đơn hàng theo trạng thái dưới dạng một thanh chia đoạn (khe 2px giữa các đoạn),
 * kèm ba số vận hành: thời gian xác nhận, thời gian giao, tỷ lệ hủy.
 */
export default function OrderPipeline({
  stages,
  total,
  cancelled,
  avgConfirmHours,
  avgDeliveryHours,
}: Props) {
  const cancelRate = safeRatio(cancelled, total)

  return (
    <section aria-labelledby="order-pipeline-title" className={cn(PANEL_CLASS, 'h-full')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="order-pipeline-title"
          className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]"
        >
          Đơn hàng theo trạng thái
        </h2>
        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {total.toLocaleString('vi-VN')} đơn từ trước tới nay
        </p>
      </div>

      {total === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          Chưa có đơn hàng nào trên sàn.
        </p>
      )}

      {total > 0 && (
        <>
          <div
            aria-hidden="true"
            className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
          >
            {stages.map(function (stage) {
              if (stage.count === 0) {
                return null
              }
              return (
                <span
                  key={stage.status}
                  className={cn('h-full first:rounded-l-full last:rounded-r-full', stage.fillClass)}
                  style={{ flexGrow: stage.count, flexBasis: 0, minWidth: 4 }}
                />
              )
            })}
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {stages.map(function (stage) {
              return (
                <li key={stage.status}>
                  <Link
                    to={`/admin/orders?status=${stage.status}`}
                    className={cn(
                      'group block cursor-pointer rounded-xl px-1 py-0.5 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04]',
                      FOCUS_RING_CLASS,
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                      <span
                        aria-hidden="true"
                        className={cn('h-2 w-2 shrink-0 rounded-full', stage.fillClass)}
                      />
                      {stage.label}
                    </span>
                    <span className="mt-0.5 block text-lg font-semibold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
                      {stage.count.toLocaleString('vi-VN')}
                      <span className="ml-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {formatPercent(safeRatio(stage.count, total))}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-3 dark:border-white/[0.06]">
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Shop xác nhận đơn sau</dt>
          <dd className="mt-0.5 text-base font-semibold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
            {formatDuration(avgConfirmHours)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Đơn tới tay khách sau</dt>
          <dd className="mt-0.5 text-base font-semibold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
            {formatDuration(avgDeliveryHours)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">Tỷ lệ đơn bị hủy</dt>
          <dd className="mt-0.5 text-base font-semibold text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
            {formatPercent(cancelRate)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
        Thời gian trung bình tính trên đơn đặt trong 30 ngày gần nhất.
      </p>
    </section>
  )
}
