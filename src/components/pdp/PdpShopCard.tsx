import { Link, useLocation, useNavigate } from 'react-router'

import { useBySlug } from '@generated/endpoints/shops/shops'
import {
  Storefront,
  Star,
  ChatCircleDots,
  ShieldCheck,
  Clock,
  ArrowRight,
} from '@phosphor-icons/react'

import UserAvatar from '@/components/UserAvatar'
import { useSessionQuery } from '@/hooks/useSession'
import { takeData } from '@/lib/apiAdapters'

import type { ShopResponse } from '@generated/model/shopResponse'

export interface PdpShopCardProps {
  shopId: string
}

export function PdpShopCard({ shopId }: PdpShopCardProps) {
  const sessionQuery = useSessionQuery()
  const navigate = useNavigate()
  const location = useLocation()

  // Lưu ý: truyền shopId (UUID) vào endpoint by-slug — BE ShopService.getBySlug có fallback
  // parse UUID, nên card vẫn hoạt động; nếu BE siết endpoint này thì card sẽ biến mất lặng lẽ.
  const shopQuery = useBySlug(shopId, {
    query: {
      enabled: shopId !== '',
    },
  })

  let shop: ShopResponse | null = null
  if (shopQuery.data !== undefined && shopQuery.data.status === 200) {
    shop = takeData(shopQuery.data)
  }

  if (shopQuery.isLoading) {
    return (
      <div className="my-6 animate-pulse rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-zinc-200 dark:bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 rounded bg-zinc-200 dark:bg-white/10" />
            <div className="h-3 w-48 rounded bg-zinc-200 dark:bg-white/10" />
          </div>
        </div>
      </div>
    )
  }

  if (shop === null) {
    return null
  }

  const shopName = shop.name ?? 'Gian hàng'
  let shopSlug = shop.id ?? ''
  if (shop.slug !== undefined && shop.slug !== null && shop.slug !== '') {
    shopSlug = shop.slug
  }
  const rating = shop.rating ?? 5.0
  const ratingCount = shop.ratingCount ?? 0
  const followerCount = shop.followerCount ?? 0
  const processingDays = shop.processingDays ?? 1
  const isTrusted = shop.isTrusted ?? false
  const sellerType = shop.sellerType ?? 'INDIVIDUAL'

  // BE chỉ gửi INDIVIDUAL/CORPORATE (CHECK constraint V8__seller_center.sql)
  let sellerTypeBadge = ''
  if (sellerType === 'CORPORATE') {
    sellerTypeBadge = 'Chính hãng (Mall)'
  }

  const handleOpenChat = () => {
    const session = sessionQuery.data
    if (session === null || session === undefined) {
      void navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (!shopId) return
    window.dispatchEvent(
      new CustomEvent('fashionstore:open-chat', {
        detail: { shopId, shopName: shop?.name },
      }),
    )
  }

  return (
    <section
      aria-label="Thông tin gian hàng"
      className="my-6 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all sm:p-5 dark:border-white/10 dark:bg-[#11182a]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Avatar & Basic Info */}
        <div className="flex items-center gap-4">
          <Link
            to={`/shops/${shopSlug}`}
            className="group relative flex-shrink-0"
            title={`Xem gian hàng ${shopName}`}
          >
            <div className="rounded-full ring-2 ring-indigo-100 transition-transform group-hover:scale-105 dark:ring-white/10">
              <UserAvatar name={shopName} size={56} />
            </div>
            {isTrusted && (
              <span
                className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm"
                title="Shop uy tín được xác thực"
              >
                <ShieldCheck size={13} weight="fill" />
              </span>
            )}
          </Link>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/shops/${shopSlug}`}
                className="text-base font-bold text-zinc-900 transition-colors hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400"
              >
                {shopName}
              </Link>
              {sellerTypeBadge !== '' && (
                <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  {sellerTypeBadge}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1 font-medium text-amber-500">
                <Star size={14} weight="fill" />
                <span>{rating.toFixed(1)}</span>
                <span className="text-zinc-400 dark:text-zinc-500">({ratingCount})</span>
              </div>
              <span className="text-zinc-300 dark:text-white/20">•</span>
              <span>{followerCount.toLocaleString('vi-VN')} Người theo dõi</span>
              <span className="text-zinc-300 dark:text-white/20">•</span>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Clock size={13} />
                <span>Chuẩn bị hàng: {processingDays} ngày</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            to={`/shops/${shopSlug}`}
            className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 transition-all hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
          >
            <Storefront size={16} />
            <span>Xem Shop</span>
            <ArrowRight size={13} />
          </Link>

          <button
            type="button"
            onClick={handleOpenChat}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <ChatCircleDots size={16} />
            <span>Chat ngay</span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default PdpShopCard
