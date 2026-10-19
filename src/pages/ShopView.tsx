import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { useSearch } from '@generated/endpoints/search/search'
import {
  getBySlugQueryKey,
  useBySlug,
  useFollow,
  useUnfollow,
} from '@generated/endpoints/shops/shops'
import { useGetPublishedLayout } from '@generated/endpoints/shops-decoration/shops-decoration'
import {
  ArrowClockwise,
  ArrowRight,
  ArrowsDownUp,
  CheckCircle,
  ChatCircleDots,
  Clock,
  Heart,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkle,
  Star,
  Storefront,
  UserPlus,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { useSessionQuery } from '@/hooks/useSession'
import { useWishlist } from '@/hooks/useWishlist'
import { imageUrl, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'
import { decorationBlocks } from '@/lib/sellerAdapters'

import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { ShopResponse } from '@generated/model/shopResponse'
import type { DecorationBlock } from '@/types/seller'

type SortOption = 'POPULAR' | 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'

export default function ShopView() {
  const { slug } = useParams<{ slug: string }>()
  const safeSlug = slug ?? ''
  const queryClient = useQueryClient()
  const { data: session } = useSessionQuery()
  const wishlist = useWishlist()

  const [activeTab, setActiveTab] = useState<'HOME' | 'ALL_PRODUCTS'>('ALL_PRODUCTS')
  const [sortOption, setSortOption] = useState<SortOption>('POPULAR')
  const [toastNotice, setToastNotice] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)

  function showToast(msg: string) {
    setToastNotice(msg)
    window.setTimeout(function () {
      setToastNotice(null)
    }, 3000)
  }

  // 1. Fetch Shop by Slug
  const shopQuery = useBySlug(safeSlug, {
    query: {
      enabled: safeSlug !== '',
    },
  })

  let shop: ShopResponse | null = null
  if (shopQuery.data !== undefined) {
    try {
      shop = takeData(shopQuery.data)
    } catch {
      shop = null
    }
  }

  // 2. Fetch Shop Decoration (if shop exists)
  const shopId = shop?.id ?? ''
  const decorationQuery = useGetPublishedLayout(shopId, {
    query: {
      enabled: shopId !== '',
    },
  })

  let publishedBlocks: DecorationBlock[] = []
  if (decorationQuery.data !== undefined) {
    try {
      const deco = takeData(decorationQuery.data)
      publishedBlocks = decorationBlocks(deco)
    } catch {
      publishedBlocks = []
    }
  }

  // 3. Fetch Products for this shop
  const productsQuery = useSearch(
    { limit: 40 },
    {
      query: {
        enabled: shopId !== '',
      },
    },
  )

  let allProducts: ProductSummaryResponse[] = []
  if (productsQuery.data !== undefined) {
    try {
      const searchRes = takeData(productsQuery.data)
      if (searchRes.items !== undefined) {
        // Filter products belonging to this shop if shopId is defined
        allProducts = searchRes.items.filter(function (p) {
          if (p.shopId !== undefined && p.shopId !== null && p.shopId !== '') {
            return p.shopId === shopId
          }
          return true
        })
      }
    } catch {
      allProducts = []
    }
  }

  // Follow & Unfollow Mutations
  const followMutation = useFollow({
    mutation: {
      onSuccess: function () {
        setIsFollowing(true)
        showToast(`Đã theo dõi gian hàng ${shop?.name ?? ''}`)
        void queryClient.invalidateQueries({ queryKey: getBySlugQueryKey(safeSlug) })
      },
      onError: function () {
        showToast('Không thể theo dõi gian hàng lúc này. Vui lòng đăng nhập.')
      },
    },
  })

  const unfollowMutation = useUnfollow({
    mutation: {
      onSuccess: function () {
        setIsFollowing(false)
        showToast(`Đã bỏ theo dõi gian hàng ${shop?.name ?? ''}`)
        void queryClient.invalidateQueries({ queryKey: getBySlugQueryKey(safeSlug) })
      },
      onError: function () {
        showToast('Không thể hủy theo dõi. Vui lòng thử lại.')
      },
    },
  })

  function handleToggleFollow() {
    if (shopId === '') {
      return
    }
    if (session === null || session === undefined) {
      showToast('Vui lòng đăng nhập để theo dõi gian hàng.')
      return
    }
    if (isFollowing) {
      unfollowMutation.mutate({ id: shopId })
      return
    }
    followMutation.mutate({ id: shopId })
  }

  function handleOpenChat() {
    window.dispatchEvent(
      new CustomEvent('open-shop-chat', {
        detail: {
          shopId: shop?.id,
          shopName: shop?.name,
        },
      }),
    )
    showToast(`Đang mở hội thoại với ${shop?.name ?? 'Shop'}…`)
  }

  // Sort products
  const sortedProducts = [...allProducts].sort(function (a, b) {
    if (sortOption === 'PRICE_ASC') {
      return (a.minPrice ?? 0) - (b.minPrice ?? 0)
    }
    if (sortOption === 'PRICE_DESC') {
      return (b.minPrice ?? 0) - (a.minPrice ?? 0)
    }
    return 0
  })

  // Loading State
  if (shopQuery.isLoading) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-32 md:pt-36 pb-24 text-center">
        <div className="flex flex-col items-center justify-center py-20">
          <ArrowClockwise size={36} className="animate-spin text-blue-600" />
          <p className="mt-4 text-sm font-semibold text-zinc-500">
            Đang tải dữ liệu gian hàng từ CSDL…
          </p>
        </div>
      </main>
    )
  }

  // 404 Not Found State
  if (shop === null) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-32 md:pt-36 pb-24 text-center">
        <div className="mx-auto max-w-md rounded-3xl border border-dashed border-zinc-300 bg-white p-10 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/10">
            <Storefront size={32} weight="duotone" />
          </div>
          <h1 className="mt-4 text-xl font-black text-zinc-900 dark:text-white">
            Gian hàng không tồn tại
          </h1>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Gian hàng với đường dẫn "{safeSlug}" có thể đã đổi tên, tạm khóa hoặc chưa được phê
            duyệt bởi ban quản trị nét.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
            >
              <span>Về trang chủ</span>
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </main>
    )
  }

  let bannerSrc = ''
  if (shop.bannerKey !== null && shop.bannerKey !== undefined && shop.bannerKey !== '') {
    try {
      bannerSrc = imageUrl(shop.bannerKey)
    } catch {
      bannerSrc = ''
    }
  }

  let logoSrc = ''
  if (shop.logoKey !== null && shop.logoKey !== undefined && shop.logoKey !== '') {
    try {
      logoSrc = imageUrl(shop.logoKey)
    } catch {
      logoSrc = ''
    }
  }

  let followBtnClass =
    'flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700'
  if (isFollowing) {
    followBtnClass =
      'flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
  }

  let allProductsTabClass =
    'px-6 py-4 text-sm font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
  if (activeTab === 'ALL_PRODUCTS') {
    allProductsTabClass =
      'border-b-2 border-blue-600 px-6 py-4 text-sm font-extrabold text-blue-600 dark:text-sky-400'
  }

  let homeTabClass =
    'px-6 py-4 text-sm font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
  if (activeTab === 'HOME') {
    homeTabClass =
      'border-b-2 border-blue-600 px-6 py-4 text-sm font-extrabold text-blue-600 dark:text-sky-400'
  }

  let popularBtnClass =
    'rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200'
  if (sortOption === 'POPULAR') {
    popularBtnClass =
      'rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs'
  }

  let newestBtnClass =
    'rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200'
  if (sortOption === 'NEWEST') {
    newestBtnClass =
      'rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs'
  }

  let priceBtnClass =
    'flex items-center gap-1 rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200'
  if (sortOption === 'PRICE_ASC' || sortOption === 'PRICE_DESC') {
    priceBtnClass =
      'flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs'
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Toast Notification */}
      {toastNotice !== null && (
        <div className="fixed top-24 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900/90 px-4 py-3 text-xs font-bold text-white shadow-xl backdrop-blur-md dark:bg-white/90 dark:text-zinc-900">
          <CheckCircle size={16} weight="fill" className="text-emerald-500" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Shop Hero Header Section */}
      <div className="relative pt-[104px]">
        {/* Banner Background */}
        <div className="relative h-64 w-full overflow-hidden bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 md:h-72">
          {bannerSrc !== '' && (
            <img
              src={bannerSrc}
              alt={shop.name ?? 'Shop Banner'}
              className="h-full w-full object-cover opacity-50"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        {/* Shop Profile Floating Card */}
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="-mt-32 relative z-10 rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-md dark:border-zinc-700/60 dark:bg-zinc-900/95 md:p-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Avatar & Basic Info */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:col-span-5">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md dark:border-zinc-800">
                  {logoSrc !== '' && (
                    <img
                      src={logoSrc}
                      alt={shop.name ?? 'Shop Logo'}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {logoSrc === '' && (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                      {shop.name?.charAt(0).toUpperCase() ?? 'S'}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-black text-zinc-900 dark:text-white md:text-2xl">
                      {shop.name}
                    </h1>
                    {shop.status === 'APPROVED' && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-black text-white">
                        <ShieldCheck size={12} weight="fill" />
                        Chính hãng
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    net.vn/shops/{shop.slug}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      id="btn-shop-follow"
                      onClick={handleToggleFollow}
                      disabled={followMutation.isPending || unfollowMutation.isPending}
                      className={followBtnClass}
                    >
                      <UserPlus size={15} weight="bold" />
                      {isFollowing && <span>Đang theo dõi</span>}
                      {isFollowing === false && <span>+ Theo dõi</span>}
                    </button>

                    <button
                      type="button"
                      id="btn-shop-chat"
                      onClick={handleOpenChat}
                      className="flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-50/60 px-4 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-sky-400 dark:hover:bg-blue-500/20"
                    >
                      <ChatCircleDots size={16} weight="bold" />
                      <span>Chat ngay</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Store Statistics */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-4 lg:col-span-7 lg:border-t-0 lg:border-l lg:border-zinc-100 lg:pt-0 lg:pl-8 dark:border-zinc-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Package size={14} />
                    <span>Sản phẩm</span>
                  </div>
                  <p className="text-base font-black text-zinc-900 dark:text-white">
                    {allProducts.length}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Star size={14} weight="fill" className="text-amber-500" />
                    <span>Đánh giá</span>
                  </div>
                  <p className="text-base font-black text-zinc-900 dark:text-white">
                    5.0{' '}
                    <span className="text-[11px] font-normal text-zinc-400">(CSDL thời gian)</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Clock size={14} />
                    <span>Phản hồi chat</span>
                  </div>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    99%{' '}
                    <span className="text-[11px] font-normal text-zinc-400">(trong vài phút)</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Sparkle size={14} />
                    <span>Vận chuyển</span>
                  </div>
                  <p className="text-base font-black text-zinc-900 dark:text-white">
                    {shop.processingDays ?? 2} ngày
                  </p>
                </div>

                {/* Additional Contact/Address info */}
                {shop.address && (
                  <div className="col-span-2 flex items-center gap-2 text-xs text-zinc-600 sm:col-span-4 dark:text-zinc-300">
                    <MapPin size={15} className="shrink-0 text-blue-600 dark:text-sky-400" />
                    <span className="truncate">Kho lấy hàng: {shop.address}</span>
                    {shop.phone && (
                      <span className="ml-2 flex items-center gap-1 font-mono text-zinc-500">
                        <Phone size={13} /> {shop.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Navigation Tabs & Product Catalog */}
      <div className="mx-auto mt-8 max-w-[1400px] px-4">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={function () {
                setActiveTab('ALL_PRODUCTS')
              }}
              className={allProductsTabClass}
            >
              TẤT CẢ SẢN PHẨM ({allProducts.length})
            </button>
            {publishedBlocks.length > 0 && (
              <button
                type="button"
                onClick={function () {
                  setActiveTab('HOME')
                }}
                className={homeTabClass}
              >
                DẠO GIAN HÀNG
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Shop Decoration Home (if published blocks exist) */}
        {activeTab === 'HOME' && publishedBlocks.length > 0 && (
          <div className="mt-6 space-y-6">
            {publishedBlocks
              .filter(function (b) {
                return b.enabled
              })
              .map(function (block) {
                return (
                  <div
                    key={block.id}
                    className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                        {block.title || block.type}
                      </h3>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-500/20 dark:text-sky-300">
                        {block.type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Block trang trí đã được xuất bản từ Kênh Người Bán của {shop?.name}.
                    </p>
                  </div>
                )
              })}
          </div>
        )}

        {/* Tab 2: All Products with Sorting Toolbar */}
        {activeTab === 'ALL_PRODUCTS' && (
          <div className="mt-6 space-y-6">
            {/* Sorting Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-zinc-100/80 p-3 dark:bg-zinc-800/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Sắp xếp:</span>
                <button
                  type="button"
                  onClick={function () {
                    setSortOption('POPULAR')
                  }}
                  className={popularBtnClass}
                >
                  Phổ biến
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setSortOption('NEWEST')
                  }}
                  className={newestBtnClass}
                >
                  Mới nhất
                </button>
                <button
                  type="button"
                  onClick={function () {
                    if (sortOption === 'PRICE_ASC') {
                      setSortOption('PRICE_DESC')
                      return
                    }
                    setSortOption('PRICE_ASC')
                  }}
                  className={priceBtnClass}
                >
                  <ArrowsDownUp size={13} />
                  {sortOption === 'PRICE_ASC' && <span>Giá: Thấp đến Cao</span>}
                  {sortOption === 'PRICE_DESC' && <span>Giá: Cao đến Thấp</span>}
                  {sortOption !== 'PRICE_ASC' && sortOption !== 'PRICE_DESC' && <span>Giá</span>}
                </button>
              </div>

              <span className="text-xs font-semibold text-zinc-500">
                Hiển thị {sortedProducts.length} sản phẩm
              </span>
            </div>

            {/* Products Empty State */}
            {sortedProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                  <ShoppingBag size={32} weight="duotone" />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-white">
                  Gian hàng chưa có sản phẩm nào
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Hãy quay lại sau khi chủ shop đăng tải các bộ sưu tập mới.
                </p>
              </div>
            )}

            {/* Products Grid */}
            {sortedProducts.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {sortedProducts.map(function (product) {
                  let img = ''
                  if (product.defaultImageKey) {
                    try {
                      img = imageUrl(product.defaultImageKey)
                    } catch {
                      img = ''
                    }
                  }

                  const isFav = wishlist.isFavorited(product.id)
                  let favWeight: 'fill' | 'regular' = 'regular'
                  let favClass = ''
                  if (isFav) {
                    favWeight = 'fill'
                    favClass = 'text-rose-500'
                  }

                  return (
                    <article
                      key={product.id}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      {/* Product Image Link */}
                      <Link
                        to={`/product/${product.slug ?? product.id}`}
                        className="relative aspect-3/4 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                      >
                        {img !== '' && (
                          <img
                            src={img}
                            alt={product.name ?? 'Sản phẩm'}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        )}
                        {img === '' && (
                          <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                            <ShoppingBag size={40} weight="duotone" />
                          </div>
                        )}

                        {/* Official Tag */}
                        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-sm bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase shadow-xs">
                          Chính hãng
                        </div>

                        {/* Wishlist Heart Button */}
                        <button
                          type="button"
                          title="Yêu thích"
                          onClick={function (e) {
                            e.preventDefault()
                            e.stopPropagation()
                            if (wishlist.isLoggedIn === false) {
                              showToast('Vui lòng đăng nhập để lưu sản phẩm yêu thích.')
                              return
                            }
                            if (product.id) {
                              wishlist.toggle.mutate({ data: { productId: product.id } })
                            }
                          }}
                          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-400 shadow-md backdrop-blur-xs transition hover:text-rose-500 dark:bg-zinc-800/90"
                        >
                          <Heart
                            size={14}
                            weight={favWeight}
                            className={favClass}
                          />
                        </button>
                      </Link>

                      {/* Product Info */}
                      <div className="flex flex-1 flex-col justify-between p-3">
                        <div>
                          <Link
                            to={`/product/${product.slug ?? product.id}`}
                            className="line-clamp-2 text-xs font-bold text-zinc-800 transition hover:text-blue-600 dark:text-zinc-100 dark:hover:text-sky-400"
                          >
                            {product.name}
                          </Link>

                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-sm font-black text-blue-700 dark:text-sky-300">
                              {formatVnd(product.minPrice ?? 0)}
                            </span>
                          </div>
                        </div>

                        {/* Sold & Rating footer */}
                        <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2 text-[11px] text-zinc-400 dark:border-zinc-800">
                          <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                            <Star size={12} weight="fill" />
                            <span>5.0</span>
                          </div>
                          <span>Đã bán 100+</span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
