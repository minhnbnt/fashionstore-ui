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
import { takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { CARD_CLASS, cn, FOCUS_RING_CLASS, secondaryButtonClass } from '@/lib/ui/styles'

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
      <div className={cn(CARD_CLASS, 'my-6 motion-safe:animate-pulse p-4 sm:p-5')}>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-zinc-200 dark:bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 rounded-full bg-zinc-200 dark:bg-white/10" />
            <div className="h-3 w-48 rounded-full bg-zinc-200 dark:bg-white/10" />
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
  let logoSrc: string | undefined
  if (shop.logoUrl !== undefined && shop.logoUrl !== null && shop.logoUrl !== '') {
    logoSrc = urlOrPlaceholder(shop.logoUrl)
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
      className={cn(CARD_CLASS, 'my-6 p-4 transition-all sm:p-5')}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Avatar & Basic Info */}
        <div className="flex items-center gap-4">
          <Link
            to={`/shops/${shopSlug}`}
            className={cn('group relative flex-shrink-0 rounded-full', FOCUS_RING_CLASS)}
            title={`Xem gian hàng ${shopName}`}
          >
            {/* flex: tránh line-box cộng descender dưới inline-block làm khung avatar méo ellipse */}
            <div className="flex rounded-full ring-2 ring-sky-100 transition-transform group-hover:scale-105 dark:ring-white/10">
              <UserAvatar name={shopName} size={56} src={logoSrc} />
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
                className={cn(
                  'rounded-2xl text-base font-bold text-[#17203a] transition-colors hover:text-blue-700 dark:text-[#e2e8f0] dark:hover:text-sky-300',
                  FOCUS_RING_CLASS,
                )}
              >
                {shopName}
              </Link>
              {sellerTypeBadge !== '' && (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
                  {sellerTypeBadge}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1 font-semibold text-amber-500 tabular-nums">
                <Star size={14} weight="fill" className="text-amber-400" />
                <span>{rating.toFixed(1)}</span>
                <span className="font-normal text-zinc-400 dark:text-zinc-500">
                  ({ratingCount})
                </span>
              </div>
              <span className="text-zinc-300 dark:text-white/20">•</span>
              <span className="tabular-nums">
                {followerCount.toLocaleString('vi-VN')} Người theo dõi
              </span>
              <span className="text-zinc-300 dark:text-white/20">•</span>
              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
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
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-2 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300 dark:hover:bg-sky-400/20',
              FOCUS_RING_CLASS,
            )}
          >
            <Storefront size={16} />
            <span>Xem Shop</span>
            <ArrowRight size={13} />
          </Link>

          <button
            type="button"
            onClick={handleOpenChat}
            className={cn(secondaryButtonClass(), 'px-3.5 py-2 text-xs')}
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
