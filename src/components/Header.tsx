import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { useMyConversations } from '@generated/endpoints/chat/chat'
import { useMine } from '@generated/endpoints/shops/shops'
import { useMe } from '@generated/endpoints/users/users'
import {
  Camera,
  ChatCircleDots,
  Heart,
  List,
  MagnifyingGlass,
  Moon,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  SignIn,
  SignOut,
  SquaresFour,
  Storefront,
  Sun,
  Tag,
  User,
  UserCircle,
} from '@phosphor-icons/react'

import { Drawer } from '@/components/ui/Drawer'
import { useTheme } from '@/hooks/useTheme'
import { takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import {
  badgeToneClass,
  chipClass,
  cn,
  FOCUS_RING_CLASS,
  iconChipClass,
  INPUT_CLASS,
  menuItemClass,
  sectionLabelClass,
  switchKnobClass,
  switchTrackClass,
} from '@/lib/ui/styles'

import { useSignOut } from '../hooks/useAuthMutations'
import { useCart } from '../hooks/useCart'
import { useMenuDisclosure } from '../hooks/useMenuDisclosure'
import { useSessionQuery } from '../hooks/useSession'
import { useWishlist } from '../hooks/useWishlist'
import { getDefaultPathForRole, getRoleFromSession } from '../lib/auth'
import NotificationBell from './NotificationBell'
import UserAvatar from './UserAvatar'

import type { CategoryResponse } from '@generated/model/categoryResponse'

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span
        className={cn(
          badgeToneClass('danger'),
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
        )}
      >
        <ShieldCheck size={11} weight="bold" />
        Admin
      </span>
    )
  }
  if (role === 'shop') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-300">
        <Storefront size={11} weight="bold" />
        Shop
      </span>
    )
  }
  return (
    <span
      className={cn(
        badgeToneClass('info'),
        'inline-flex rounded-full px-2 py-0.5 text-xs font-bold',
      )}
    >
      Khách hàng
    </span>
  )
}

function desktopNavLinkClass(active: boolean): string {
  if (active) {
    return cn(
      'cursor-pointer rounded-full bg-indigo-50/90 px-3 py-1.5 font-bold whitespace-nowrap text-blue-700 transition dark:bg-white/10 dark:text-sky-300',
      FOCUS_RING_CLASS,
    )
  }
  return cn(
    'cursor-pointer rounded-full px-2.5 py-1.5 whitespace-nowrap text-zinc-600 transition hover:bg-sky-50/80 hover:text-blue-700 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-sky-300',
    FOCUS_RING_CLASS,
  )
}

function MenuLink(props: {
  to: string
  label: string
  icon: React.ReactNode
  onNavigate: () => void
  trailing?: React.ReactNode
}) {
  return (
    <Link to={props.to} onClick={props.onNavigate} className={cn(menuItemClass())}>
      <span
        className={cn(
          iconChipClass(),
          'motion-safe:transition-transform motion-safe:group-hover:scale-105',
        )}
      >
        {props.icon}
      </span>
      <span className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5">
        {props.label}
      </span>
      {props.trailing}
    </Link>
  )
}

export default function Header() {
  const { data: session } = useSessionQuery()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const signOut = useSignOut()
  const { totalQuantity } = useCart()
  const { count: wishlistCount } = useWishlist()
  const { theme, toggle: toggleTheme } = useTheme()

  const isSearchPage = location.pathname === '/search'
  let activeCategorySlug = ''
  if (isSearchPage) {
    activeCategorySlug = searchParams.get('category') ?? ''
  }
  const isAllCategoriesActive = isSearchPage && activeCategorySlug === ''
  let allAriaCurrent: 'page' | undefined = undefined
  if (isAllCategoriesActive) {
    allAriaCurrent = 'page'
  }

  let themeKnobStyle: React.CSSProperties = {}
  if (theme === 'dark') {
    themeKnobStyle = { transform: 'translateX(12px)' }
  }

  const [keyword, setKeyword] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)
  const accountMenuContainerRef = useRef<HTMLDivElement>(null)
  const accountMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const menu = useMenuDisclosure({
    containerRef: accountMenuContainerRef,
    triggerRef: accountMenuTriggerRef,
  })

  useEffect(
    function () {
      if (mobileSearchOpen === false) {
        return
      }
      const frame = window.requestAnimationFrame(function () {
        mobileSearchInputRef.current?.focus()
      })
      return function () {
        window.cancelAnimationFrame(frame)
      }
    },
    [mobileSearchOpen],
  )

  const categoriesQuery = useListCategories()
  let categories: CategoryResponse[] = []
  if (categoriesQuery.data !== undefined) {
    categories = takeData(categoriesQuery.data)
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = keyword.trim()
    if (q !== '') {
      setMobileSearchOpen(false)
      void navigate('/search?q=' + encodeURIComponent(q))
    }
  }

  function handleSignOut() {
    menu.close()
    setMobileNavOpen(false)
    signOut.mutate(undefined, {
      onSuccess: function () {
        notify.success('Đã đăng xuất', 'Hẹn gặp lại bạn tại DHMQ.')
        void navigate('/', { replace: true })
      },
      onError: function (err) {
        notify.fromError(err, 'auth', 'Không thể đăng xuất')
      },
    })
  }

  function handleAvatarClick() {
    if (session === null || session === undefined) {
      void navigate('/login')
      return
    }
    menu.toggle()
  }

  const isLoggedIn = session !== null && session !== undefined
  const meQuery = useMe({
    query: {
      enabled: isLoggedIn,
    },
  })
  const mineQuery = useMine({
    query: {
      enabled: isLoggedIn,
    },
  })

  let hasAnyShop = false
  if (mineQuery.data !== undefined) {
    const shopList = takeData(mineQuery.data)
    if (Array.isArray(shopList) && shopList.length > 0) {
      hasAnyShop = true
    }
  }

  let avatarSrc: string | undefined
  let displayName = ''
  if (meQuery.data !== undefined) {
    const me = takeData(meQuery.data)
    if (me.avatarUrl !== null && me.avatarUrl !== undefined && me.avatarUrl !== '') {
      avatarSrc = urlOrPlaceholder(me.avatarUrl)
    }
    if (me.displayName !== undefined && me.displayName !== '') {
      displayName = me.displayName
    }
  }
  let cardName = displayName
  if (cardName === '' && isLoggedIn && session.user.email !== undefined) {
    cardName = session.user.email
  }

  let role = 'customer'
  let dashboardPath = '/account'
  let dashboardLabel = 'Tài khoản của tôi'
  let settingsLabel: string | null = null
  if (isLoggedIn) {
    role = getRoleFromSession(session)
    dashboardPath = getDefaultPathForRole(role as 'admin' | 'shop' | 'customer')
    settingsLabel = 'Cài đặt tài khoản'
    if (role === 'admin') {
      dashboardLabel = 'Bảng quản trị'
    }
    if (role === 'shop' || hasAnyShop) {
      dashboardLabel = 'Kênh người bán'
      if (role !== 'admin') {
        dashboardPath = '/shop'
      }
      settingsLabel = 'Cài đặt tài khoản & shop'
    }
    if (role !== 'admin' && role !== 'shop' && !hasAnyShop) {
      settingsLabel = null
    }
  }

  let sellerChannelPath = '/account#seller-channel'
  if (role === 'shop' || hasAnyShop) {
    sellerChannelPath = '/shop'
  }

  const convQuery = useMyConversations({
    query: {
      enabled: isLoggedIn,
    },
  })
  let totalUnread = 0
  if (convQuery.data !== undefined) {
    const convList = takeData(convQuery.data)
    if (Array.isArray(convList)) {
      totalUnread = convList.reduce(function (sum, conv) {
        return sum + (conv.unreadCount ?? 0)
      }, 0)
    }
  }
  let unreadBadgeText = String(totalUnread)
  if (totalUnread > 99) {
    unreadBadgeText = '99+'
  }

  function closeMobileNav() {
    setMobileNavOpen(false)
  }

  let userMenuTriggerClass = cn(
    'flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-zinc-300/90 bg-white/85 px-2.5 text-sm font-bold text-[#17203a] transition hover:border-blue-600/40 hover:bg-sky-50 hover:text-blue-700 active:scale-[0.98] sm:px-3.5 dark:border-white/15 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15',
    FOCUS_RING_CLASS,
  )
  if (isLoggedIn) {
    userMenuTriggerClass = cn(
      'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition hover:bg-indigo-100 active:scale-[0.98] dark:hover:bg-white/10',
      FOCUS_RING_CLASS,
    )
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="glass mt-3 flex h-16 items-center gap-2 rounded-full px-3 md:gap-4 md:px-6">
          {/* Mobile menu trigger */}
          <button
            type="button"
            aria-label="Mở menu điều hướng"
            onClick={function () {
              setMobileNavOpen(true)
            }}
            className={cn(
              'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition hover:bg-sky-100 lg:hidden dark:text-zinc-200 dark:hover:bg-white/10',
              FOCUS_RING_CLASS,
            )}
          >
            <List size={20} weight="bold" />
          </button>

          {/* Brand wordmark */}
          <Link
            to="/"
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-1 rounded-full text-xl font-extrabold tracking-tighter md:text-2xl',
              FOCUS_RING_CLASS,
            )}
          >
            <span>DHMQ</span>
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-900 to-sky-400" />
          </Link>

          {/* Desktop category nav */}
          <nav
            aria-label="Danh mục chính"
            className="ml-3 hidden items-center gap-1 text-sm font-medium lg:flex"
          >
            {categories.slice(0, 5).map(function (c) {
              const slug = c.slug ?? ''
              const isActive = isSearchPage && slug !== '' && activeCategorySlug === slug
              let ariaCurrent: 'page' | undefined = undefined
              if (isActive) {
                ariaCurrent = 'page'
              }
              return (
                <Link
                  key={c.id}
                  to={'/search?category=' + encodeURIComponent(slug)}
                  aria-current={ariaCurrent}
                  className={desktopNavLinkClass(isActive)}
                >
                  {c.name}
                </Link>
              )
            })}
            <Link
              to="/search"
              aria-current={allAriaCurrent}
              className={desktopNavLinkClass(isAllCategoriesActive)}
            >
              Tất cả
            </Link>
          </nav>

          {/* Desktop search bar */}
          <form
            onSubmit={submitSearch}
            className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-full border border-zinc-300 bg-white/80 px-4 py-2 text-sm text-zinc-500 transition-colors focus-within:border-blue-600 md:flex dark:border-white/15 dark:bg-white/10 dark:text-zinc-300 dark:focus-within:border-sky-400"
          >
            <MagnifyingGlass size={16} weight="bold" className="shrink-0" />
            <input
              id="header-search-input"
              name="q"
              aria-label="Tìm kiếm sản phẩm"
              value={keyword}
              onChange={function (e) {
                setKeyword(e.target.value)
              }}
              className="w-full bg-transparent text-[#17203a] outline-none placeholder:text-zinc-400 dark:text-white"
              placeholder="Tìm áo, váy, khoác…"
            />
            <button
              type="button"
              aria-label="Tìm bằng ảnh"
              title="Tìm bằng ảnh"
              onClick={function () {
                void navigate('/search?by-image=1')
              }}
              className="shrink-0 rounded-full p-0.5 text-zinc-400 transition hover:bg-sky-100 hover:text-blue-700 active:scale-95 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-sky-300"
            >
              <Camera size={16} weight="bold" />
            </button>
          </form>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:ml-0">
            {/* Mobile search trigger */}
            <button
              type="button"
              aria-label="Tìm kiếm sản phẩm"
              onClick={function () {
                setMobileSearchOpen(true)
              }}
              className={cn(
                'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition hover:bg-sky-100 md:hidden dark:text-zinc-200 dark:hover:bg-white/10',
                FOCUS_RING_CLASS,
              )}
            >
              <MagnifyingGlass size={20} weight="bold" />
            </button>

            {/* Seller Channel Link */}
            <Link
              to={sellerChannelPath}
              id="header-seller-link"
              className={cn(
                'hidden cursor-pointer items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-indigo-800 transition hover:bg-indigo-100 sm:flex dark:border-white/15 dark:bg-white/10 dark:text-sky-200 dark:hover:bg-white/15',
                FOCUS_RING_CLASS,
              )}
            >
              <Storefront size={14} weight="bold" />
              <span>Kênh Người Bán</span>
            </Link>

            {/* Guest Desktop Theme Toggle */}
            {isLoggedIn === false && (
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Đổi giao diện sáng tối"
                title="Đổi giao diện sáng tối"
                className={cn(
                  'hidden h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition hover:bg-sky-100 active:scale-[0.98] md:flex dark:text-zinc-200 dark:hover:bg-white/10',
                  FOCUS_RING_CLASS,
                )}
              >
                {theme === 'dark' && <Sun size={18} weight="bold" />}
                {theme !== 'dark' && <Moon size={18} weight="bold" />}
              </button>
            )}

            {/* Messages Link */}
            <Link
              to="/messages"
              id="header-messages-link"
              aria-label="Tin nhắn"
              className={cn(
                'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition hover:bg-sky-100 dark:hover:bg-white/10',
                FOCUS_RING_CLASS,
              )}
            >
              <ChatCircleDots size={20} />
              {isLoggedIn && totalUnread > 0 && (
                <span
                  id="header-messages-badge"
                  data-testid="header-messages-badge"
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-extrabold text-white tabular-nums shadow"
                >
                  {unreadBadgeText}
                </span>
              )}
            </Link>

            {/* Notification Bell */}
            <NotificationBell categories={['ORDER', 'ACTIVITY']} />

            {/* Cart link */}
            <Link
              to="/cart"
              aria-label="Giỏ hàng"
              className={cn(
                'btn-primary relative flex h-10 w-10 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold sm:h-auto sm:w-auto sm:px-4 sm:py-2.5',
                FOCUS_RING_CLASS,
              )}
            >
              <ShoppingBag size={18} weight="fill" />
              <span className="hidden sm:inline">Giỏ</span>
              {totalQuantity > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold text-indigo-700 tabular-nums shadow">
                  {totalQuantity}
                </span>
              )}
            </Link>

            {/* User avatar / login & account dropdown (rightmost) */}
            <div className="relative" ref={accountMenuContainerRef}>
              <button
                type="button"
                id="btn-user-menu"
                ref={accountMenuTriggerRef}
                aria-label="Tài khoản"
                aria-expanded={menu.open}
                aria-controls="account-menu"
                onClick={handleAvatarClick}
                className={userMenuTriggerClass}
              >
                {isLoggedIn && session.user.email !== undefined && (
                  <UserAvatar name={session.user.email} size={28} src={avatarSrc} />
                )}
                {isLoggedIn && session.user.email === undefined && <User size={20} />}
                {isLoggedIn === false && (
                  <>
                    <User size={18} weight="bold" />
                    <span className="hidden whitespace-nowrap sm:inline">Đăng nhập</span>
                  </>
                )}
              </button>

              {menu.open && isLoggedIn && (
                <div
                  id="account-menu"
                  className="fixed inset-x-4 top-[76px] z-50 origin-top-right overflow-hidden rounded-3xl border border-zinc-200/90 bg-white/95 shadow-xl backdrop-blur-md motion-safe:transition-[opacity,translate,scale] motion-safe:duration-150 motion-safe:ease-out sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80 dark:border-white/15 dark:bg-[#0a0f1e] dark:shadow-indigo-500/10 motion-safe:starting:translate-y-1 motion-safe:starting:scale-[0.96] motion-safe:starting:opacity-0"
                >
                  {/* Identity card */}
                  <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-white/10">
                    <UserAvatar name={session.user.email ?? 'user'} size={40} src={avatarSrc} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        {cardName}
                      </p>
                      {displayName !== '' && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {session.user.email}
                        </p>
                      )}
                      <div className="mt-1.5">
                        <RoleBadge role={role} />
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="py-1.5">
                    <MenuLink
                      to={dashboardPath}
                      label={dashboardLabel}
                      icon={<UserCircle size={16} />}
                      onNavigate={function () {
                        menu.close()
                      }}
                    />
                    <MenuLink
                      to="/account/orders"
                      label="Đơn hàng của tôi"
                      icon={<Receipt size={16} />}
                      onNavigate={function () {
                        menu.close()
                      }}
                    />
                    {settingsLabel !== null && (
                      <MenuLink
                        to="/account"
                        label={settingsLabel}
                        icon={<User size={16} />}
                        onNavigate={function () {
                          menu.close()
                        }}
                      />
                    )}
                  </div>

                  {/* Tuỳ chọn cá nhân */}
                  <div className="border-t border-zinc-100 py-1.5 dark:border-white/10">
                    <MenuLink
                      to="/wishlist"
                      label="Sản phẩm yêu thích"
                      icon={<Heart size={16} />}
                      onNavigate={function () {
                        menu.close()
                      }}
                      trailing={
                        wishlistCount > 0 && (
                          <span
                            data-testid="account-wishlist-count"
                            className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 tabular-nums dark:bg-indigo-500/20 dark:text-indigo-200"
                          >
                            {wishlistCount}
                          </span>
                        )
                      }
                    />
                    <button
                      type="button"
                      role="switch"
                      aria-checked={theme === 'dark'}
                      onClick={toggleTheme}
                      className={cn(menuItemClass(), 'w-full')}
                    >
                      <span className={cn(iconChipClass())}>
                        {theme === 'dark' && <Moon size={16} />}
                        {theme !== 'dark' && <Sun size={16} />}
                      </span>
                      <span>Giao diện tối</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          switchTrackClass(theme === 'dark'),
                          'ml-auto flex h-4 w-7 items-center rounded-full p-0.5 transition-colors',
                        )}
                      >
                        <span className={cn(switchKnobClass())} style={themeKnobStyle} />
                      </span>
                    </button>
                  </div>

                  {/* Danger zone */}
                  <div className="border-t border-zinc-100 dark:border-white/10">
                    <button
                      type="button"
                      id="btn-sign-out"
                      onClick={handleSignOut}
                      disabled={signOut.isPending}
                      className={cn(
                        'group flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10',
                        FOCUS_RING_CLASS,
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
                        <SignOut size={16} weight="bold" />
                      </span>
                      {signOut.isPending && <span>Đang đăng xuất…</span>}
                      {signOut.isPending === false && <span>Đăng xuất</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      <Drawer
        open={mobileNavOpen}
        side="left"
        title="Danh mục & Điều hướng"
        onClose={closeMobileNav}
      >
        <div className="space-y-6">
          {/* Categories */}
          <div>
            <p className={cn(sectionLabelClass(), 'mb-2 px-3')}>Danh mục sản phẩm</p>
            <div className="space-y-1">
              <Link
                to="/search"
                onClick={closeMobileNav}
                className={cn(menuItemClass(), 'rounded-full')}
              >
                <span className={cn(iconChipClass())}>
                  <SquaresFour size={16} />
                </span>
                <span>Tất cả sản phẩm</span>
              </Link>
              {categories.map(function (c) {
                return (
                  <Link
                    key={c.id}
                    to={'/search?category=' + encodeURIComponent(c.slug ?? '')}
                    onClick={closeMobileNav}
                    className={cn(menuItemClass(), 'rounded-full')}
                  >
                    <span className={cn(iconChipClass())}>
                      <Tag size={16} />
                    </span>
                    <span>{c.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Marketplace & Account Shortcuts */}
          <div className="border-t border-zinc-200/80 pt-4 dark:border-white/10">
            <p className={cn(sectionLabelClass(), 'mb-2 px-3')}>Tiện ích & Tài khoản</p>
            <div className="space-y-1">
              <Link
                to={sellerChannelPath}
                onClick={closeMobileNav}
                className={cn(menuItemClass(), 'rounded-full')}
              >
                <span className={cn(iconChipClass())}>
                  <Storefront size={16} />
                </span>
                <span>Kênh Người Bán</span>
              </Link>
              <Link
                to="/messages"
                onClick={closeMobileNav}
                className={cn(menuItemClass(), 'rounded-full')}
              >
                <span className={cn(iconChipClass())}>
                  <ChatCircleDots size={16} />
                </span>
                <span>Tin nhắn</span>
                {isLoggedIn && totalUnread > 0 && (
                  <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                    {unreadBadgeText}
                  </span>
                )}
              </Link>
              <Link
                to="/wishlist"
                onClick={closeMobileNav}
                className={cn(menuItemClass(), 'rounded-full')}
              >
                <span className={cn(iconChipClass())}>
                  <Heart size={16} />
                </span>
                <span>Sản phẩm yêu thích</span>
                {wishlistCount > 0 && (
                  <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 tabular-nums dark:bg-indigo-500/20 dark:text-indigo-200">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {isLoggedIn && (
                <>
                  <Link
                    to={dashboardPath}
                    onClick={closeMobileNav}
                    className={cn(menuItemClass(), 'rounded-full')}
                  >
                    <span className={cn(iconChipClass())}>
                      <UserCircle size={16} />
                    </span>
                    <span>{dashboardLabel}</span>
                  </Link>
                  <Link
                    to="/account/orders"
                    onClick={closeMobileNav}
                    className={cn(menuItemClass(), 'rounded-full')}
                  >
                    <span className={cn(iconChipClass())}>
                      <Receipt size={16} />
                    </span>
                    <span>Đơn hàng của tôi</span>
                  </Link>
                </>
              )}

              {isLoggedIn === false && (
                <Link
                  to="/login"
                  onClick={closeMobileNav}
                  className="btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold"
                >
                  <SignIn size={16} weight="bold" />
                  <span>Đăng nhập / Đăng ký</span>
                </Link>
              )}
            </div>
          </div>

          {/* Display preferences */}
          <div className="border-t border-zinc-200/80 pt-4 dark:border-white/10">
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={toggleTheme}
              className={cn(menuItemClass(), 'w-full rounded-full')}
            >
              <span className={cn(iconChipClass())}>
                {theme === 'dark' && <Moon size={16} />}
                {theme !== 'dark' && <Sun size={16} />}
              </span>
              <span>Giao diện tối</span>
              <span
                aria-hidden="true"
                className={cn(
                  switchTrackClass(theme === 'dark'),
                  'ml-auto flex h-4 w-7 items-center rounded-full p-0.5 transition-colors',
                )}
              >
                <span className={cn(switchKnobClass())} style={themeKnobStyle} />
              </span>
            </button>

            {isLoggedIn && (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signOut.isPending}
                className={cn(
                  'mt-2 flex w-full cursor-pointer items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10',
                  FOCUS_RING_CLASS,
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
                  <SignOut size={16} weight="bold" />
                </span>
                {signOut.isPending && <span>Đang đăng xuất…</span>}
                {signOut.isPending === false && <span>Đăng xuất</span>}
              </button>
            )}
          </div>
        </div>
      </Drawer>

      {/* Mobile Search Bottom Sheet */}
      <Drawer
        open={mobileSearchOpen}
        side="bottom"
        title="Tìm kiếm sản phẩm"
        onClose={function () {
          setMobileSearchOpen(false)
        }}
      >
        <div className="space-y-5">
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={16}
                weight="bold"
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                ref={mobileSearchInputRef}
                id="mobile-search-input"
                name="q"
                aria-label="Tìm kiếm sản phẩm"
                value={keyword}
                onChange={function (e) {
                  setKeyword(e.target.value)
                }}
                placeholder="Tìm áo, váy, áo khoác, phụ kiện…"
                className={cn(INPUT_CLASS, 'pl-10')}
              />
            </div>
            <button
              type="submit"
              className={cn(
                'btn-primary shrink-0 cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold',
                FOCUS_RING_CLASS,
              )}
            >
              Tìm kiếm
            </button>
          </form>

          {categories.length > 0 && (
            <div>
              <p className={cn(sectionLabelClass(), 'mb-2.5')}>Danh mục nổi bật</p>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 8).map(function (c) {
                  return (
                    <Link
                      key={c.id}
                      to={'/search?category=' + encodeURIComponent(c.slug ?? '')}
                      onClick={function () {
                        setMobileSearchOpen(false)
                      }}
                      className={cn(chipClass(false), 'px-3.5 py-1.5 text-xs')}
                    >
                      {c.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </header>
  )
}
