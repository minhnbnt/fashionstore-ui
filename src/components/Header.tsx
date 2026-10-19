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

import { takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import { useSignOut } from '../hooks/useAuthMutations'
import { useCart } from '../hooks/useCart'
import { useSessionQuery } from '../hooks/useSession'
import { useTheme } from '../hooks/useTheme'
import { useWishlist } from '../hooks/useWishlist'
import { getDefaultPathForRole, getRoleFromSession } from '../lib/auth'
import UserAvatar from './UserAvatar'

import type { CategoryResponse } from '@generated/model/categoryResponse'

const TRENDING_KEYWORDS = ['Áo thun', 'Quần ống suông', 'Chân váy', 'Áo khoác', 'Blazer']

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
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Topbar Phong Cách Shopee */}
      <div className="border-b border-white/20 bg-gradient-to-r from-indigo-950/90 via-indigo-900/90 to-blue-950/90 text-white backdrop-blur-md">
        <div className="mx-auto flex h-8 max-w-[1400px] items-center justify-between px-4 text-xs font-medium">
          <div className="flex items-center gap-4">
            <Link
              to={sellerChannelPath}
              className="flex items-center gap-1 text-zinc-300 transition hover:text-white"
            >
              <Storefront size={13} weight="bold" />
              <span>Kênh Người Bán</span>
            </Link>
            <span className="hidden text-zinc-500 sm:inline">|</span>
            <span className="hidden text-zinc-300 sm:inline">Hotline: 1900 6868</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/account#notifications"
              className="hidden items-center gap-1 text-zinc-300 transition hover:text-white sm:flex"
            >
              <Bell size={13} />
              <span>Thông báo</span>
            </Link>
            <Link
              to="/search?q=ho-tro"
              className="flex items-center gap-1 text-zinc-300 transition hover:text-white"
            >
              <Question size={13} />
              <span>Trợ giúp</span>
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label="Đổi giao diện sáng tối"
              className="flex items-center gap-1 text-zinc-300 transition hover:text-white"
            >
              {theme === 'dark' && <Sun size={13} />}
              {theme !== 'dark' && <Moon size={13} />}
              <span className="hidden md:inline">
                {theme === 'dark' && 'Chế độ Sáng'}
                {theme !== 'dark' && 'Chế độ Tối'}
              </span>
            </button>
            {!isLoggedIn && (
              <div className="flex items-center gap-2">
                <Link to="/login" className="font-bold text-sky-300 hover:underline">
                  Đăng nhập
                </Link>
                <span className="text-zinc-500">/</span>
                <Link to="/login" className="font-bold text-white hover:underline">
                  Đăng ký
                </Link>
              </div>
            )}
            {isLoggedIn && (
              <Link to="/account" className="truncate font-semibold text-sky-200 hover:underline">
                {userEmail}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="glass mt-2 flex h-16 items-center gap-4 rounded-full px-4 md:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 text-2xl font-extrabold tracking-tighter">
            <span>nét</span>
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-900 to-sky-400" />
          </Link>

          {/* Danh mục menu */}
          <nav className="ml-2 hidden items-center gap-5 text-sm font-medium xl:flex">
            {categories.map(function (c) {
              return (
                <Link
                  key={c.id}
                  to={'/search?category=' + encodeURIComponent(c.slug ?? '')}
                  className="text-zinc-600 transition hover:text-blue-700 dark:text-zinc-300 dark:hover:text-sky-300"
                >
                  {c.name}
                </Link>
              )
            })}
          </nav>

          {/* Thanh tìm kiếm Shopee style */}
          <div className="mx-auto hidden max-w-lg flex-1 flex-col md:flex">
            <form
              onSubmit={submitSearch}
              className="flex items-center rounded-full border border-sky-200/80 bg-white/90 px-3 py-1.5 text-sm shadow-inner transition focus-within:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
            >
              <input
                value={keyword}
                onChange={function (e) {
                  setKeyword(e.target.value)
                }}
                className="w-full bg-transparent px-2 outline-none placeholder:text-zinc-400"
                placeholder="Tìm áo, váy, khoác, phụ kiện..."
              />
              <button
                type="submit"
                aria-label="Tìm kiếm"
                className="btn-primary flex h-8 w-10 shrink-0 items-center justify-center rounded-full text-white shadow"
              >
                <MagnifyingGlass size={16} weight="bold" />
              </button>
            </form>
            {/* Gợi ý từ khóa Shopee */}
            <div className="mt-1 flex items-center gap-2 px-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-400 dark:text-zinc-500">Gợi ý:</span>
              {TRENDING_KEYWORDS.map(function (tag) {
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={function () {
                      handleQuickSearch(tag)
                    }}
                    className="hover:text-blue-600 hover:underline dark:hover:text-sky-300"
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action icons bên phải */}
          <div className="ml-auto flex items-center gap-2">
            {/* Wishlist Button với số đếm live */}
            <button
              type="button"
              id="header-wishlist-button"
              aria-label="Sản phẩm yêu thích"
              onClick={handleWishlistClick}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-sky-100 dark:hover:bg-white/10"
            >
              <Heart size={20} weight={wishlist.count > 0 ? 'fill' : 'regular'} className={wishlist.count > 0 ? 'text-rose-500' : ''} />
              {wishlist.count > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                  {wishlist.count > 99 && '99+'}
                  {wishlist.count <= 99 && wishlist.count}
                </span>
              )}
            </button>

            {/* Giỏ Hàng tương tác với Mini Cart Popover */}
            <div
              className="relative"
              ref={cartRef}
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
                aria-label="Giỏ hàng"
                onClick={handleCartClick}
                className="btn-primary relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-md shadow-blue-500/20"
              >
                <ShoppingBag size={18} weight="fill" />
                <span className="hidden sm:inline">Giỏ</span>
                {cart.totalQuantity > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-extrabold text-indigo-900 shadow">
                    {cart.totalQuantity > 99 && '99+'}
                    {cart.totalQuantity <= 99 && cart.totalQuantity}
                  </span>
                )}
              </button>

              {/* Popover Mini Cart xem nhanh */}
              {cartPreviewOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-white/30 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-white/10">
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      Sản phẩm mới thêm
                    </p>
                    <span className="text-xs font-semibold text-blue-600 dark:text-sky-300">
                      {cart.totalQuantity} món
                    </span>
                  </div>

                  {cart.items.length === 0 && (
                    <div className="py-6 text-center">
                      <ShoppingBag size={32} className="mx-auto text-zinc-300 dark:text-zinc-600" />
                      <p className="mt-2 text-xs font-medium text-zinc-500">Giỏ hàng của bạn đang rỗng</p>
                    </div>
                  )}

                  {cart.items.length > 0 && (
                    <div className="mt-2 max-h-60 divide-y divide-zinc-100 overflow-y-auto dark:divide-white/10">
                      {previewItems.map(function (item) {
                        return (
                          <div key={item.variantId} className="flex items-center gap-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-zinc-800 dark:text-zinc-100">
                                {item.productName}
                              </p>
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                {item.variantLabel} × {item.quantity}
                              </p>
                            </div>
                            <span className="text-xs font-extrabold text-blue-700 dark:text-sky-300">
                              {item.unitPrice !== undefined && item.unitPrice !== null
                                ? formatVnd(item.unitPrice * (item.quantity ?? 1))
                                : '0 ₫'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-white/10">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Tạm tính:</span>
                      <span className="font-extrabold text-blue-700 dark:text-sky-300">
                        {formatVnd(cart.subtotal)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCartClick}
                      className="btn-primary w-full rounded-full py-2 text-center text-xs font-bold"
                    >
                      Xem Giỏ Hàng &amp; Thanh Toán
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar & Menu */}
            <div className="relative" ref={dropdownRef} onBlur={handleBlur}>
              <button
                type="button"
                id="btn-user-menu"
                aria-label="Tài khoản"
                onClick={handleAvatarClick}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-indigo-100 dark:hover:bg-white/10"
              >
                {isLoggedIn && userEmail !== '' && <UserAvatar name={userEmail} size={28} />}
                {(!isLoggedIn || userEmail === '') && <User size={20} />}
              </button>

              {dropdownOpen && isLoggedIn && (
                <div className="absolute top-full right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/30 bg-white/90 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/90">
                  <div className="border-b border-zinc-100 px-4 py-3 dark:border-white/10">
                    <p className="truncate text-xs font-bold text-zinc-800 dark:text-zinc-100">
                      {userEmail}
                    </p>
                    <div className="mt-1">
                      <RoleBadge role={role} />
                    </div>
                  </div>

                  <Link
                    to={dashboardPath}
                    onClick={function () {
                      setDropdownOpen(false)
                    }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-indigo-50 dark:text-zinc-200 dark:hover:bg-white/10"
                  >
                    <UserCircle size={16} />
                    {dashboardLabel}
                  </Link>

                  <Link
                    to="/account#orders"
                    onClick={function () {
                      setDropdownOpen(false)
                    }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-indigo-50 dark:text-zinc-200 dark:hover:bg-white/10"
                  >
                    <ShoppingBag size={16} />
                    Đơn mua của tôi
                  </Link>

                  {role !== 'customer' && (
                    <Link
                      to="/account"
                      onClick={function () {
                        setDropdownOpen(false)
                      }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-indigo-50 dark:text-zinc-200 dark:hover:bg-white/10"
                    >
                      <User size={16} />
                      Tài khoản &amp; shop của tôi
                    </Link>
                  )}

                  <button
                    type="button"
                    id="btn-sign-out"
                    onClick={handleSignOut}
                    disabled={signOut.isPending}
                    className="flex w-full items-center gap-2.5 border-t border-zinc-100 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-white/10 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <SignOut size={16} weight="bold" />
                    {signOut.isPending && <span>Đang đăng xuất…</span>}
                    {signOut.isPending === false && <span>Đăng xuất</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
