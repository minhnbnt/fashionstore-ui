import { useState } from 'react'

import {
  ChatCircleDots,
  Heart,
  MapPin,
  ShieldCheck,
  Star,
  Storefront,
  Clock,
  Package,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react'

import UserAvatar from '@/components/UserAvatar'
import { urlOrPlaceholder, PLACEHOLDER_IMAGE } from '@/lib/api/apiAdapters'
import { CARD_CLASS, cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { ShopResponse } from '@generated/model/shopResponse'

export type StorefrontTab = 'HOME' | 'PRODUCTS' | 'ABOUT'

function getTabButtonClass(currentTab: StorefrontTab, targetTab: StorefrontTab): string {
  if (currentTab === targetTab) {
    return cn(
      'flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 border-blue-700 px-5 py-3 text-sm font-bold text-blue-700 transition-all dark:border-sky-400 dark:text-sky-300',
      FOCUS_RING_CLASS,
    )
  }
  return cn(
    'flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-5 py-3 text-sm font-bold text-zinc-500 transition-all hover:text-[#17203a] dark:text-zinc-400 dark:hover:text-white',
    FOCUS_RING_CLASS,
  )
}

interface ShopStorefrontHeaderProps {
  shop: ShopResponse
  activeTab: StorefrontTab
  onTabChange: (tab: StorefrontTab) => void
  isFollowing?: boolean
  isFollowPending?: boolean
  onToggleFollow?: () => void
  onOpenChat?: () => void
  searchQuery?: string
  onSearch?: (keyword: string) => void
}

export default function ShopStorefrontHeader({
  shop,
  activeTab,
  onTabChange,
  isFollowing = false,
  isFollowPending = false,
  onToggleFollow,
  onOpenChat,
  searchQuery,
  onSearch,
}: ShopStorefrontHeaderProps) {
  const [localSearch, setLocalSearch] = useState<string | null>(null)
  // Logo có key nhưng object 404 / load lỗi thì dùng avatar generated thay vì placeholder.
  // Lưu key của logo đã lỗi: đổi shop (logoUrl khác) thì tự coi như chưa lỗi, không cần effect.
  const [failedLogoUrl, setFailedLogoKey] = useState<string | null>(null)

  let searchInput = searchQuery ?? ''
  if (localSearch !== null) {
    searchInput = localSearch
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchInput.trim())
    }
    setLocalSearch(null)
  }

  const handleClearSearch = () => {
    setLocalSearch(null)
    if (onSearch) {
      onSearch('')
    }
  }
  const hasLogo = shop.logoUrl !== null && shop.logoUrl !== undefined && shop.logoUrl !== ''
  const logoFailed = hasLogo && failedLogoUrl !== null && failedLogoUrl === shop.logoUrl
  let logoSrc = PLACEHOLDER_IMAGE
  if (hasLogo) {
    logoSrc = urlOrPlaceholder(shop.logoUrl)
  }

  const hasBanner = shop.bannerUrl !== null && shop.bannerUrl !== undefined && shop.bannerUrl !== ''
  let bannerSrc = ''
  if (hasBanner) {
    bannerSrc = urlOrPlaceholder(shop.bannerUrl)
  }

  let ratingDisplay = '5.0'
  if (shop.rating !== null && shop.rating !== undefined) {
    ratingDisplay = shop.rating.toFixed(1)
  }
  // BE chỉ gửi INDIVIDUAL/CORPORATE (CHECK constraint V8__seller_center.sql)
  const isMall = shop.sellerType === 'CORPORATE'

  function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
    e.currentTarget.onerror = null
    e.currentTarget.src = PLACEHOLDER_IMAGE
  }

  let followButtonClass = 'btn-primary'
  let heartWeight: 'fill' | 'regular' = 'regular'
  let heartClass = ''
  if (isFollowing) {
    followButtonClass =
      'border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200'
    heartWeight = 'fill'
    heartClass = 'text-rose-500'
  }

  return (
    <div className={cn(CARD_CLASS, 'relative overflow-hidden')}>
      {/* Cover Banner with Gradient Overlay */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] md:h-64">
        {hasBanner && (
          <img
            src={bannerSrc}
            alt={shop.name}
            onError={handleImageError}
            className="h-full w-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {isMall && (
            <span className="flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-extrabold tracking-wider text-white uppercase shadow-md">
              <ShieldCheck size={16} weight="fill" />
              DHMQ Mall
            </span>
          )}
          {!isMall && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-sm">
              <ShieldCheck size={16} />
              Gian hàng xác thực
            </span>
          )}
        </div>
      </div>

      {/* Main Info Card */}
      <div className="relative -mt-16 px-6 pb-4">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          {/* Avatar and Basic Details */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full shadow-xl">
              {hasLogo && !logoFailed && (
                <img
                  src={logoSrc}
                  alt={shop.name}
                  onError={function () {
                    setFailedLogoKey(shop.logoUrl ?? null)
                  }}
                  className="h-full w-full object-cover"
                />
              )}
              {(!hasLogo || logoFailed) && (
                <div className="flex h-full w-full items-center justify-center">
                  {/* Size 128 > khung 112 để mép antialias của svg tràn ra ngoài clip — hết viền sáng */}
                  <UserAvatar name={shop.name ?? 'Shop'} size={128} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-[#17203a] sm:text-2xl dark:text-white">
                  {shop.name}
                </h1>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                  {`@${shop.slug}`}
                </span>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
                <span className="flex items-center gap-1 font-semibold text-amber-500 tabular-nums">
                  <Star size={15} weight="fill" className="text-amber-400" />
                  {ratingDisplay}
                  <span className="font-normal text-zinc-400">({shop.ratingCount} đánh giá)</span>
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="font-medium tabular-nums">
                  <strong>{shop.followerCount}</strong> Người theo dõi
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                  <Clock size={14} />
                  {`Chuẩn bị hàng: ${shop.processingDays} ngày`}
                </span>
              </div>

              {shop.address && (
                <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <MapPin size={14} className="shrink-0 text-zinc-400" />
                  <span className="max-w-md truncate">{shop.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: Follow & Chat */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {onToggleFollow && (
              <button
                type="button"
                disabled={isFollowPending}
                onClick={onToggleFollow}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60',
                  FOCUS_RING_CLASS,
                  followButtonClass,
                )}
              >
                <Heart size={16} weight={heartWeight} className={heartClass} />
                {isFollowing && 'Đang theo dõi'}
                {!isFollowing && '+ Theo dõi Shop'}
              </button>
            )}

            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-5 py-2.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300 dark:hover:bg-sky-400/20',
                  FOCUS_RING_CLASS,
                )}
              >
                <ChatCircleDots size={16} />
                Chat với Shop
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation & Internal Search */}
        <div className="mt-6 flex flex-col gap-3 border-b border-zinc-200/80 pb-2 sm:flex-row sm:items-center sm:justify-between sm:pb-0 dark:border-white/10">
          <div role="tablist" aria-label="Điều hướng gian hàng" className="flex overflow-x-auto">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'HOME'}
              onClick={() => onTabChange('HOME')}
              className={getTabButtonClass(activeTab, 'HOME')}
            >
              <Storefront size={18} />
              Trang Chủ Gian Hàng
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'PRODUCTS'}
              onClick={() => onTabChange('PRODUCTS')}
              className={getTabButtonClass(activeTab, 'PRODUCTS')}
            >
              <Package size={18} />
              Tất Cả Sản Phẩm
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ABOUT'}
              onClick={() => onTabChange('ABOUT')}
              className={getTabButtonClass(activeTab, 'ABOUT')}
            >
              <ShieldCheck size={18} />
              Hồ Sơ & Chính Sách
            </button>
          </div>

          {/* Internal Shop Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative mb-2 flex items-center sm:mb-0">
            <input
              id="shop-storefront-search"
              name="shopSearch"
              type="text"
              placeholder="Tìm trong Shop này..."
              aria-label="Tìm trong Shop"
              value={searchInput}
              onChange={(e) => setLocalSearch(e.target.value)}
              className={cn(
                'w-full rounded-full border border-zinc-300 bg-white/85 py-1.5 pr-8 pl-9 text-xs text-[#17203a] transition-colors placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none sm:w-60 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus:border-sky-400',
                FOCUS_RING_CLASS,
              )}
            />
            <MagnifyingGlass size={15} className="absolute left-3 text-zinc-400" />
            {searchInput !== '' && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2.5 cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={13} />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
