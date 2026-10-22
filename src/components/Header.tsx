import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import {
  Bell,
  Heart,
  MagnifyingGlass,
  Moon,
  Question,
  ShieldCheck,
  ShoppingBag,
  SignOut,
  Storefront,
  Sun,
  User,
  UserCircle,
} from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import { useSignOut } from '../hooks/useAuthMutations'
import { useCart } from '../hooks/useCart'
import { useSessionQuery } from '../hooks/useSession'
import { useTheme } from '../hooks/useTheme'
import { useWishlist } from '../hooks/useWishlist'
import { getDefaultPathForRole, getRoleFromSession } from '../lib/auth'
import UserAvatar from './UserAvatar'

import type { CategoryResponse } from '@generated/model/categoryResponse'

const TRENDING_KEYWORDS = ['Áo thun', 'Quần ống suông', 'Chân váy chữ A', 'Áo khoác dạ', 'Blazer']

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-500/20 dark:text-red-300">
        <ShieldCheck size={11} weight="bold" />
        Admin
      </span>
    )
  }
  if (role === 'shop') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
        <Storefront size={11} weight="bold" />
        Shop
      </span>
    )
  }
  return (
    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
      Khách hàng
    </span>
  )
}

export default function Header() {
  const { data: session } = useSessionQuery()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const signOut = useSignOut()
  const cart = useCart()
  const wishlist = useWishlist()

  const [keyword, setKeyword] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const cartRef = useRef<HTMLDivElement>(null)

  const categoriesQuery = useListCategories()
  let categories: CategoryResponse[] = []
  if (categoriesQuery.data !== undefined) {
    categories = takeData(categoriesQuery.data)
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = keyword.trim()
    if (q !== '') {
      void navigate('/search?q=' + encodeURIComponent(q))
    }
  }

  function handleQuickSearch(tag: string) {
    void navigate('/search?q=' + encodeURIComponent(tag))
  }

  function handleSignOut() {
    setDropdownOpen(false)
    signOut.mutate(undefined, {
      onSuccess: function () {
        void navigate('/', { replace: true })
      },
    })
  }

  function handleAvatarClick() {
    if (session === null || session === undefined) {
      void navigate('/login')
      return
    }
    setDropdownOpen(function (prev) {
      return !prev
    })
  }

  function handleWishlistClick() {
    if (session === null || session === undefined) {
      void navigate('/login')
      return
    }
    void navigate('/account#wishlist')
  }

  function handleCartClick() {
    setCartPreviewOpen(false)
    void navigate('/cart')
  }

  function handleBlur(e: React.FocusEvent) {
    if (dropdownRef.current !== null && dropdownRef.current.contains(e.relatedTarget)) {
      return
    }
    setDropdownOpen(false)
  }

  const isLoggedIn = session !== null && session !== undefined
  let role = 'customer'
  let dashboardPath = '/account'
  let dashboardLabel = 'Trang cá nhân'
  if (isLoggedIn) {
    role = getRoleFromSession(session)
    dashboardPath = getDefaultPathForRole(role as 'admin' | 'shop' | 'customer')
    if (role === 'admin') {
      dashboardLabel = 'Bảng quản trị'
    }
    if (role === 'shop') {
      dashboardLabel = 'Kênh người bán'
    }
  }

  let sellerChannelPath = '/account#seller-channel'
  if (role === 'shop') {
    sellerChannelPath = '/shop'
  }

  let userEmail = ''
  if (isLoggedIn && session.user.email !== undefined) {
    userEmail = session.user.email
  }

  const previewItems = cart.items.slice(0, 5)

  return (
    <header className="fixed inset-x-0 top-0 z-50 shadow-xs">
      {/* 1. Shopee Topbar - Xanh Navy & Blue sang trọng đồng bộ */}
      <div className="border-b border-blue-500/30 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white shadow-xs">
        <div className="mx-auto flex h-8 max-w-[1400px] items-center justify-end px-4 text-xs font-semibold">
          {/* Right Topbar Links */}
          <div className="flex items-center gap-3.5">
            <Link
              to="/account#notifications"
              className="hidden items-center gap-1.5 text-white/90 transition hover:text-white sm:flex"
            >
              <div className="relative">
                <Bell size={14} weight="fill" />
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />
              </div>
              <span>Thông báo</span>
            </Link>

            <Link
              to="/search?q=ho-tro"
              className="flex items-center gap-1 text-white/90 transition hover:text-white"
            >
              <Question size={14} weight="bold" />
              <span>Hỗ trợ</span>
            </Link>

            <button
              type="button"
              onClick={toggle}
              aria-label="Đổi giao diện sáng tối"
              className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-white/90 transition hover:bg-white/20 hover:text-white"
            >
              {theme === 'dark' && <Sun size={13} weight="fill" />}
              {theme !== 'dark' && <Moon size={13} weight="fill" />}
              <span className="hidden text-[11px] md:inline">
                {theme === 'dark' && 'Sáng'}
                {theme !== 'dark' && 'Tối'}
              </span>
            </button>

            {/* Auth Section */}
            {!isLoggedIn && (
              <div className="flex items-center gap-2 pl-1">
                <Link
                  to="/login"
                  className="rounded-full bg-white/15 px-2.5 py-0.5 font-bold text-white transition hover:bg-white hover:text-blue-700"
                >
                  Đăng nhập
                </Link>
                <span className="text-white/40">/</span>
                <Link to="/login" className="font-bold text-white hover:underline">
                  Đăng ký
                </Link>
              </div>
            )}

            {isLoggedIn && (
              <Link
                to="/account"
                className="flex items-center gap-1.5 font-bold text-white hover:underline"
              >
                <div className="h-5 w-5 overflow-hidden rounded-full border border-white">
                  <UserAvatar name={userEmail || 'guest'} size={20} />
                </div>
                <span className="max-w-[120px] truncate sm:max-w-[180px]">{userEmail}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Header Bar - Trắng sang trọng, gắn kết đồng bộ */}
      <div className="border-b border-zinc-200/80 bg-white/95 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/95">
        <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between gap-4 px-4 md:px-6">
          {/* Logo Brand nét */}
          <div className="flex shrink-0 items-center gap-2.5">
            <Link to="/" className="flex items-center gap-1.5 tracking-tighter">
              <span className="text-2xl font-black text-zinc-900 md:text-3xl dark:text-white">
                nét
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-sm" />
            </Link>
            <span className="hidden rounded bg-gradient-to-r from-blue-700 to-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white uppercase shadow-xs sm:inline-block">
              MALL
            </span>
          </div>

          {/* Shopee Category Menu Links */}
          <nav className="ml-2 hidden items-center gap-4 text-xs font-bold xl:flex">
            {categories.slice(0, 5).map(function (c) {
              return (
                <Link
                  key={c.id}
                  to={'/search?category=' + encodeURIComponent(c.slug ?? '')}
                  className="text-zinc-600 transition hover:text-blue-600 dark:text-zinc-300 dark:hover:text-sky-400"
                >
                  {c.name}
                </Link>
              )
            })}
          </nav>

          {/* Thanh tìm kiếm Shopee Pill to & rõ ràng */}
          <div className="mx-auto flex max-w-xl flex-1 flex-col">
            <form
              onSubmit={submitSearch}
              className="flex items-center rounded-full border-2 border-blue-600 bg-white px-2 py-1 shadow-sm transition focus-within:ring-4 focus-within:ring-blue-500/15 dark:bg-zinc-800"
            >
              <input
                value={keyword}
                onChange={function (e) {
                  setKeyword(e.target.value)
                }}
                className="w-full bg-transparent px-3 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
                placeholder="Tìm áo thun, váy hoa, blazer, đồ công sở nét…"
              />
              <button
                type="submit"
                aria-label="Tìm kiếm"
                className="flex h-8 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs transition hover:bg-blue-700"
              >
                <MagnifyingGlass size={16} weight="bold" />
              </button>
            </form>

            {/* Gợi ý từ khóa Shopee */}
            <div className="mt-1 flex items-center gap-2 px-2 text-[10px] text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-400">Gợi ý:</span>
              {TRENDING_KEYWORDS.map(function (tag) {
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={function () {
                      handleQuickSearch(tag)
                    }}
                    className="hover:text-blue-600 hover:underline dark:hover:text-sky-400"
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Action Icons: Wishlist, Cart Shopee, User Dropdown */}
          <div className="flex items-center gap-3">
            {/* Wishlist Button */}
            <button
              type="button"
              id="header-wishlist-button"
              onClick={handleWishlistClick}
              aria-label="Sản phẩm yêu thích"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-xs transition hover:border-blue-500 hover:text-rose-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <Heart size={18} weight={wishlist.count > 0 ? 'fill' : 'regular'} />
              {wishlist.count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs">
                  {wishlist.count}
                </span>
              )}
            </button>

            {/* Shopee Cart Button with Mini Cart Preview Dropdown */}
            <div
              ref={cartRef}
              className="relative"
              onMouseEnter={function () {
                setCartPreviewOpen(true)
              }}
              onMouseLeave={function () {
                setCartPreviewOpen(false)
              }}
            >
              <button
                type="button"
                id="header-cart-button"
                onClick={handleCartClick}
                aria-label="Giỏ hàng"
                className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700"
              >
                <div className="relative">
                  <ShoppingBag size={18} weight="fill" />
                  {cart.totalCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-black text-blue-600 shadow-xs">
                      {cart.totalCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">Giỏ hàng</span>
              </button>

              {/* Shopee Mini Cart Preview Dropdown */}
              {cartPreviewOpen && (
                <div className="absolute top-full right-0 z-50 w-80 pt-2">
                  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b border-zinc-100 pb-2 text-xs font-bold text-zinc-400 uppercase dark:border-zinc-800">
                      Sản phẩm mới thêm ({cart.totalCount})
                    </div>

                    {cart.items.length === 0 && (
                      <div className="py-6 text-center text-xs text-zinc-400">
                        Chưa có sản phẩm nào trong giỏ
                      </div>
                    )}

                    {cart.items.length > 0 && (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {previewItems.map(function (item, index) {
                          return (
                            <div
                              key={item.variantId ?? index}
                              className="flex items-center gap-2.5 py-2.5 text-xs"
                            >
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50 shadow-xs dark:border-zinc-800 dark:bg-zinc-800">
                                <img
                                  src={imageUrl(item.imageKey)}
                                  alt={item.productName ?? 'Sản phẩm'}
                                  className="h-full w-full object-cover"
                                  onError={function (e) {
                                    e.currentTarget.src = PLACEHOLDER_IMAGE
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                {item.productId ? (
                                  <Link
                                    to={`/products/${item.productId}`}
                                    onClick={function () {
                                      setCartPreviewOpen(false)
                                    }}
                                    className="truncate block font-bold text-zinc-800 transition hover:text-blue-600 hover:underline dark:text-zinc-200 dark:hover:text-sky-400"
                                    title={item.productName ?? 'Sản phẩm'}
                                  >
                                    {item.productName ?? 'Sản phẩm'}
                                  </Link>
                                ) : (
                                  <p className="truncate font-bold text-zinc-800 dark:text-zinc-200">
                                    {item.productName ?? 'Sản phẩm'}
                                  </p>
                                )}
                                <p className="text-[11px] text-zinc-400">
                                  x{item.quantity} {item.variantLabel}
                                </p>
                              </div>
                              <p className="font-extrabold text-blue-600 dark:text-sky-400 shrink-0">
                                {formatVnd((item.unitPrice ?? 0) * (item.quantity ?? 1))}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-500">Tổng cộng:</span>
                        <span className="text-sm font-black text-blue-600 dark:text-sky-400">
                          {formatVnd(cart.subtotal)}
                        </span>
                      </div>
                      <Link
                        to="/cart"
                        onClick={function () {
                          setCartPreviewOpen(false)
                        }}
                        className="mt-3 block w-full rounded-full bg-blue-600 py-2 text-center text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                      >
                        Xem giỏ hàng & Thanh toán
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown Avatar */}
            <div ref={dropdownRef} onBlur={handleBlur} className="relative">
              <button
                type="button"
                id="header-user-avatar-button"
                onClick={handleAvatarClick}
                aria-label="Tài khoản"
                className="flex items-center gap-1 rounded-full p-0.5 transition hover:ring-2 hover:ring-orange-500/30"
              >
                {isLoggedIn && <UserAvatar name={userEmail || 'guest'} size={38} />}
                {!isLoggedIn && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <UserCircle size={24} weight="duotone" />
                  </div>
                )}
              </button>

              {dropdownOpen && isLoggedIn && (
                <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                    <p className="truncate text-xs font-extrabold text-zinc-900 dark:text-white">
                      {userEmail}
                    </p>
                    <div className="mt-1">
                      <RoleBadge role={role} />
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to={dashboardPath}
                      onClick={function () {
                        setDropdownOpen(false)
                      }}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <User size={15} weight="bold" />
                      <span>{dashboardLabel}</span>
                    </Link>

                    <Link
                      to="/account"
                      onClick={function () {
                        setDropdownOpen(false)
                      }}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <ShoppingBag size={15} weight="bold" />
                      <span>Đơn mua của tôi</span>
                    </Link>

                    <Link
                      to={sellerChannelPath}
                      onClick={function () {
                        setDropdownOpen(false)
                      }}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Storefront size={15} weight="bold" />
                      <span>Kênh Người Bán</span>
                    </Link>
                  </div>

                  <div className="border-t border-zinc-100 pt-1 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signOut.isPending}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10"
                    >
                      <SignOut size={15} weight="bold" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
