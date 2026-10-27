import { useEffect, useState } from 'react'

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

import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'

import type { ShopResponse } from '@generated/model/shopResponse'

function getTabButtonClass(currentTab: StorefrontTab, targetTab: StorefrontTab): string {
  if (currentTab === targetTab) {
    return 'flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-bold transition-all border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
  }
  return 'flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-bold transition-all border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
}

interface ShopStorefrontHeaderProps {
  shop: ShopResponse
  activeTab: StorefrontTab
  onTabChange: (tab: StorefrontTab) => void
  isFollowing?: boolean
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
  onToggleFollow,
  onOpenChat,
  searchQuery,
  onSearch,
}: ShopStorefrontHeaderProps) {
  const [searchInput, setSearchInput] = useState(searchQuery ?? '')

  useEffect(() => {
    setSearchInput(searchQuery ?? '')
  }, [searchQuery])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchInput.trim())
    }
  }

  const handleClearSearch = () => {
    setSearchInput('')
    if (onSearch) {
      onSearch('')
    }
  }
  let logoSrc = PLACEHOLDER_IMAGE
  if (shop.logoKey !== null && shop.logoKey !== undefined && shop.logoKey !== '') {
    logoSrc = imageUrl(shop.logoKey)
  }

  let bannerSrc = 'https://picsum.photos/seed/netshopbanner/1600/500'
  if (shop.bannerKey !== null && shop.bannerKey !== undefined && shop.bannerKey !== '') {
    bannerSrc = imageUrl(shop.bannerKey)
  }

  let ratingDisplay = '5.0'
  if (shop.rating !== null && shop.rating !== undefined) {
    ratingDisplay = shop.rating.toFixed(1)
  }
  const isMall = shop.sellerType === 'BUSINESS'

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
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#11182a]">
      {/* Cover Banner with Gradient Overlay */}
      <div className="relative h-48 w-full overflow-hidden bg-zinc-900 md:h-64">
        <img
          src={bannerSrc}
          alt={shop.name}
          onError={handleImageError}
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {isMall && (
            <span className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-extrabold tracking-wider text-white uppercase shadow-md">
              <ShieldCheck size={16} weight="fill" />
              nét Mall
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
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl sm:h-28 sm:w-28 dark:border-[#11182a] dark:bg-white/10">
              <img
                src={logoSrc}
                alt={shop.name}
                onError={handleImageError}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
                  {shop.name}
                </h1>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                  {`@${shop.slug}`}
                </span>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
                <span className="flex items-center gap-1 font-semibold text-amber-500">
                  <Star size={15} weight="fill" />
                  {ratingDisplay}
                  <span className="font-normal text-zinc-400">({shop.ratingCount} đánh giá)</span>
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="font-medium">
                  <strong>{shop.followerCount}</strong> Người theo dõi
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
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
                onClick={onToggleFollow}
                className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold shadow-sm transition-all ${followButtonClass}`}
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
                className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
              >
                <ChatCircleDots size={16} />
                Chat với Shop
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation & Internal Search */}
        <div className="mt-6 flex flex-col gap-3 border-b border-zinc-200/80 pb-2 sm:flex-row sm:items-center sm:justify-between sm:pb-0 dark:border-white/10">
          <div className="flex overflow-x-auto">
            <button
              type="button"
              onClick={() => onTabChange('HOME')}
              className={getTabButtonClass(activeTab, 'HOME')}
            >
              <Storefront size={18} />
              Trang Chủ Gian Hàng
            </button>

            <button
              type="button"
              onClick={() => onTabChange('PRODUCTS')}
              className={getTabButtonClass(activeTab, 'PRODUCTS')}
            >
              <Package size={18} />
              Tất Cả Sản Phẩm
            </button>

            <button
              type="button"
              onClick={() => onTabChange('ABOUT')}
              className={getTabButtonClass(activeTab, 'ABOUT')}
            >
              <ShieldCheck size={18} />
              Hồ Sơ & Chính Sách
            </button>
          </div>

          {/* Internal Shop Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative mb-2 flex items-center sm:mb-0"
          >
            <input
              type="text"
              placeholder="Tìm trong Shop này..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-1.5 pr-8 pl-9 text-xs transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none sm:w-60 dark:border-white/10 dark:bg-white/5 dark:focus:bg-[#11182a]"
            />
            <MagnifyingGlass
              size={15}
              className="absolute left-3 text-zinc-400"
            />
            {searchInput !== '' && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
