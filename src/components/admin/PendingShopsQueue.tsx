import { Link } from 'react-router'

import { useListAdminShops } from '@generated/endpoints/admin-shops/admin-shops'
import { ListAdminShopsStatus } from '@generated/model/listAdminShopsStatus'
import { HourglassMedium, Storefront } from '@phosphor-icons/react'

import { hookErrorMessage, imageUrl, takeData } from '@/lib/apiAdapters'

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
    status: ListAdminShopsStatus.PENDING,
    page: 0,
    size: QUEUE_SIZE,
  })

  let body = <p className="text-sm text-zinc-500 dark:text-zinc-400">Đang tải…</p>
  if (query.isError) {
    body = (
      <p className="text-sm text-red-600 dark:text-red-400">
        {hookErrorMessage('adminShops', query.error)}
      </p>
    )
  }
  if (query.isSuccess) {
    const shops = takeData(query.data).items ?? []
    body = <p className="text-sm text-zinc-500 dark:text-zinc-400">Không có shop nào chờ duyệt.</p>
    if (shops.length > 0) {
      body = (
        <ul className="space-y-2">
          {shops.map(function (shop) {
            return (
              <li
                key={shop.id}
                className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/5"
              >
                {shop.logoKey !== null && shop.logoKey !== undefined && (
                  <img
                    src={imageUrl(shop.logoKey)}
                    alt=""
                    width={36}
                    height={36}
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-2xl object-cover"
                  />
                )}
                {(shop.logoKey === null || shop.logoKey === undefined) && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40">
                    <Storefront
                      size={18}
                      weight="bold"
                      className="text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{shop.name}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {shop.ownerEmail ?? 'Chưa có chủ shop'}
                  </p>
                </div>
                <p className="shrink-0 text-right text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {formatSubmittedAt(shop.submittedAt)}
                </p>
                {shop.id !== undefined && (
                  <Link
                    to={'/admin/shops/' + shop.id}
                    className="shrink-0 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-400/10 dark:text-indigo-200 dark:hover:bg-indigo-400/20"
                  >
                    Kiểm tra
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )
    }
  }

  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-extrabold tracking-tighter">
          <HourglassMedium size={18} weight="bold" className="text-amber-600 dark:text-amber-400" />
          Shop chờ duyệt
        </h2>
        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {Math.min(pendingCount, QUEUE_SIZE)}/{pendingCount} cũ nhất
        </p>
      </div>
      {body}
    </section>
  )
}
