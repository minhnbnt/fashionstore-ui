import { Star } from '@phosphor-icons/react'

import { formatCompactVnd, formatPercent, safeRatio } from '@/lib/admin/adminStats'
import { cn, PANEL_CLASS } from '@/lib/ui/styles'

interface Props {
  averageRating: number
  totalReviews: number
  activeBuyers: number
  repeatBuyers: number
  collectedRevenue: number
  grossMerchandiseValue: number
  /** Đơn chưa hủy, mẫu số của giá trị trung bình mỗi đơn. */
  liveOrders: number
}

/** Thanh đo tỷ lệ 0..1, một màu, nền nhạt; số đã ghi bằng chữ nên thanh chỉ là phụ trợ. */
function Meter({ ratio }: { ratio: number }) {
  const width = Math.max(0, Math.min(1, ratio)) * 100
  return (
    <span aria-hidden="true" className="mt-2 block h-1.5 rounded-full bg-zinc-100 dark:bg-white/10">
      {width > 0 && (
        <span
          className="block h-full rounded-full bg-blue-700 dark:bg-blue-500"
          style={{ width: `${width}%`, minWidth: 6 }}
        />
      )}
    </span>
  )
}

function Metric(props: { label: string; value: React.ReactNode; detail: string; ratio?: number }) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{props.label}</dt>
      <dd className="mt-0.5">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-xl font-semibold tracking-tight text-[#17203a] tabular-nums dark:text-[#e2e8f0]">
            {props.value}
          </span>
          <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {props.detail}
          </span>
        </span>
        {props.ratio !== undefined && <Meter ratio={props.ratio} />}
      </dd>
    </div>
  )
}

export default function MarketplaceHealth(props: Props) {
  const repeatRate = safeRatio(props.repeatBuyers, props.activeBuyers)
  const collectedRate = safeRatio(props.collectedRevenue, props.grossMerchandiseValue)
  const averageOrderValue = Math.round(safeRatio(props.grossMerchandiseValue, props.liveOrders))

  let ratingValue: React.ReactNode = 'Chưa có'
  let ratingDetail = 'Chưa có đánh giá nào'
  if (props.totalReviews > 0) {
    ratingValue = (
      <span className="inline-flex items-center gap-1">
        {props.averageRating.toLocaleString('vi-VN', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}
        <Star size={16} weight="fill" aria-hidden="true" className="text-amber-400" />
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">/ 5</span>
      </span>
    )
    ratingDetail = `${props.totalReviews.toLocaleString('vi-VN')} đánh giá`
  }

  return (
    <section aria-labelledby="health-title" className={cn(PANEL_CLASS, 'flex h-full flex-col')}>
      <h2
        id="health-title"
        className="font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]"
      >
        Chất lượng và giữ chân
      </h2>
      <dl className="mt-4 divide-y divide-zinc-100 dark:divide-white/[0.06]">
        <Metric
          label="Điểm đánh giá trung bình"
          value={ratingValue}
          detail={ratingDetail}
          ratio={safeRatio(props.averageRating, 5)}
        />
        <Metric
          label="Khách quay lại mua trong 30 ngày"
          value={formatPercent(repeatRate)}
          detail={`${props.repeatBuyers.toLocaleString('vi-VN')} / ${props.activeBuyers.toLocaleString('vi-VN')} người mua`}
          ratio={repeatRate}
        />
        <Metric
          label="Tiền COD đã thu trên GMV"
          value={formatPercent(collectedRate)}
          detail={`${formatCompactVnd(props.collectedRevenue)} / ${formatCompactVnd(props.grossMerchandiseValue)}`}
          ratio={collectedRate}
        />
        <Metric
          label="Giá trị trung bình mỗi đơn"
          value={formatCompactVnd(averageOrderValue)}
          detail={`${props.liveOrders.toLocaleString('vi-VN')} đơn chưa hủy`}
        />
      </dl>
    </section>
  )
}
