import { Link } from 'react-router'

import { useListAdminShops } from '@generated/endpoints/admin-shops/admin-shops'
import { ArrowRight, HourglassMedium, Storefront } from '@phosphor-icons/react'

import { TableRowsSkeleton } from '@/components/ui/Skeleton'
import {
  hookErrorMessage,
  PLACEHOLDER_IMAGE,
  takeData,
  urlOrPlaceholder,
} from '@/lib/api/apiAdapters'
import { cn, FOCUS_RING_CLASS, iconChipClass, PANEL_CLASS } from '@/lib/ui/styles'

const QUEUE_SIZE = 5

function formatSubmittedAt(iso: string | undefined): string {
  if (iso === undefined) {
    return ''
  }
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

/** Hàng đợi duyệt shop: backend xếp PENDING theo lần nộp, cũ nhất lên đầu. */
export default function PendingShopsQueue({ pendingCount }: { pendingCount: number }) {
  const query = useListAdminShops({
    status: 'PENDING',
    page: 0,
    size: QUEUE_SIZE,
  })

  let body: React.ReactNode = <TableRowsSkeleton rows={3} columns={3} />
  if (query.isError) {
    body = (
      <p
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
      >
        {hookErrorMessage('adminShops', query.error)}
      </p>
    )
  }
  if (query.isSuccess) {
    const shops = takeData(query.data).items ?? []
    body = (
      <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
        Không có shop nào chờ duyệt.
      </p>
    )
    if (shops.length > 0) {
      body = (
        <ul className="space-y-2.5">
          {shops.map(function (shop) {
            return (
              <li
                key={shop.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {shop.logoUrl !== null && shop.logoUrl !== undefined && (
                    <img
                      src={urlOrPlaceholder(shop.logoUrl)}
                      alt=""
                      width={36}
                      height={36}
                      loading="lazy"
                      onError={function (e) {
                        if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                          e.currentTarget.src = PLACEHOLDER_IMAGE
                        }
                      }}
                      className="h-9 w-9 shrink-0 rounded-2xl object-cover"
                    />
                  )}
                  {(shop.logoUrl === null || shop.logoUrl === undefined) && (
                    <div className={cn(iconChipClass(), 'h-9 w-9 rounded-2xl')}>
                      <Storefront size={18} weight="bold" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]">
                      {shop.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {shop.ownerEmail ?? 'Chưa có chủ shop'}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {formatSubmittedAt(shop.submittedAt)}
                  </p>
                  {shop.id !== undefined && (
                    <Link
                      to={'/admin/shops/' + shop.id}
                      aria-label={`Kiểm tra hồ sơ shop ${shop.name ?? ''}`}
                      className={cn(
                        'shrink-0 cursor-pointer rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-400/15 dark:text-sky-300 dark:hover:bg-indigo-400/25',
                        FOCUS_RING_CLASS,
                      )}
                    >
                      Kiểm tra
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )
    }
  }

  return (
    <section className={PANEL_CLASS}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HourglassMedium size={18} weight="bold" className="text-amber-600 dark:text-amber-400" />
          <h2 className="font-extrabold tracking-tighter text-[#17203a] dark:text-[#e2e8f0]">
            Shop chờ duyệt
          </h2>
          <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            ({Math.min(pendingCount, QUEUE_SIZE)}/{pendingCount} cũ nhất)
          </span>
        </div>
        <Link
          to="/admin/shops?status=PENDING"
          className={cn(
            'inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-white/10',
            FOCUS_RING_CLASS,
          )}
        >
          <span>Xem tất cả</span>
          <ArrowRight size={13} weight="bold" />
        </Link>
      </div>
      {body}
    </section>
  )
}
