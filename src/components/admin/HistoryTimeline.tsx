import StatusBadge from '@/components/ui/StatusBadge'
import { formatDateTime, statusMeta } from '@/lib/admin'

import type { StatusHistoryResponse } from '@generated/model/statusHistoryResponse'

export default function HistoryTimeline({ items }: { items: StatusHistoryResponse[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Chưa có lịch sử trạng thái.</p>
  }

  return (
    <ol className="space-y-4">
      {items.map(function (item, index) {
        const to = statusMeta(item.toStatus)
        return (
          <li key={(item.createdAt ?? '') + '-' + index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={'mt-1 h-3 w-3 rounded-full ' + to.className} />
              {index < items.length - 1 && (
                <span className="mt-1 h-full w-px bg-zinc-200 dark:bg-white/10" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.toStatus} />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
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
