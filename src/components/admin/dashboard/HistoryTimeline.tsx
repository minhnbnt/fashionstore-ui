import StatusBadge from '@/components/ui/StatusBadge'
import { formatDateTime } from '@/lib/admin/admin'
import { cn } from '@/lib/ui/styles'

import type { StatusHistoryResponse } from '@generated/model/statusHistoryResponse'

function dotClassForStatus(status: string | null | undefined): string {
  if (status === 'APPROVED' || status === 'ACTIVE' || status === 'DELIVERED') {
    return 'bg-emerald-500 ring-4 ring-emerald-500/15'
  }
  if (status === 'PENDING') {
    return 'bg-amber-500 ring-4 ring-amber-500/15'
  }
  if (
    status === 'SUSPENDED' ||
    status === 'LOCKED' ||
    status === 'REJECTED' ||
    status === 'CANCELLED'
  ) {
    return 'bg-rose-500 ring-4 ring-rose-500/15'
  }
  if (status === 'CONFIRMED' || status === 'SHIPPING') {
    return 'bg-sky-500 ring-4 ring-sky-500/15'
  }
  return 'bg-zinc-400 ring-4 ring-zinc-400/15'
}

export default function HistoryTimeline({ items }: { items: StatusHistoryResponse[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Chưa có lịch sử trạng thái.</p>
  }

  return (
    <ol className="space-y-4">
      {items.map(function (item, index) {
        return (
          <li key={(item.createdAt ?? '') + '-' + index} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                  dotClassForStatus(item.toStatus),
                )}
              />
              {index < items.length - 1 && (
                <span className="mt-2 h-full w-px bg-zinc-200 dark:bg-white/10" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.toStatus} />
                <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
              {item.reason !== undefined && item.reason !== '' && (
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{item.reason}</p>
              )}
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Thực hiện bởi {item.changedByEmail ?? 'hệ thống'}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
