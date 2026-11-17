import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { useMyConversations } from '@generated/endpoints/chat/chat'
import { useMine } from '@generated/endpoints/shops/shops'
import { useMe } from '@generated/endpoints/users/users'
import {
  Camera,
  ChatCircleDots,
  Heart,
  MagnifyingGlass,
  Moon,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  SignOut,
  Storefront,
  Sun,
  User,
  UserCircle,
} from '@phosphor-icons/react'

import { useTheme } from '@/hooks/useTheme'
import { urlOrPlaceholder, takeData } from '@/lib/api/apiAdapters'
import {
  cn,
  iconChipClass,
  menuItemClass,
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
  const signOut = useSignOut()
  const { totalQuantity } = useCart()
  const { count: wishlistCount } = useWishlist()
  const { theme, toggle: toggleTheme } = useTheme()

  let themeKnobStyle: React.CSSProperties = {}
  if (theme === 'dark') {
    themeKnobStyle = { transform: 'translateX(12px)' }
  }
  const [keyword, setKeyword] = useState('')
  const accountMenuContainerRef = useRef<HTMLDivElement>(null)
  const accountMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const menu = useMenuDisclosure({
    containerRef: accountMenuContainerRef,
    triggerRef: accountMenuTriggerRef,
  })

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

  function handleSignOut() {
    menu.close()
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

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="glass mt-3 flex h-16 items-center gap-4 rounded-full px-4 md:px-6">
          <Link to="/" className="flex items-center gap-1 text-2xl font-extrabold tracking-tighter">
            <span>nét</span>
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-900 to-sky-400" />
          </Link>
          <nav className="ml-4 hidden items-center gap-6 text-sm font-medium lg:flex">
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
          <form
            onSubmit={submitSearch}
            className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-full border border-zinc-300 bg-white/80 px-4 py-2 text-sm text-zinc-500 md:flex dark:border-white/15 dark:bg-white/10 dark:text-zinc-300"
          >
            <MagnifyingGlass size={16} weight="bold" />
            <input
              value={keyword}
              onChange={function (e) {
                setKeyword(e.target.value)
              }}
              className="w-full bg-transparent outline-none placeholder:text-zinc-400"
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
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {/* Seller Channel Link */}
            <Link
              to={sellerChannelPath}
              id="header-seller-link"
              className="hidden items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/80 px-3 py-1.5 text-xs font-bold text-orange-700 transition hover:bg-orange-100 sm:flex dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
            >
              <Storefront size={14} weight="bold" />
              <span>Kênh Người Bán</span>
            </Link>

            {/* Messages Link */}
            <Link
              to="/messages"
              id="header-messages-link"
              aria-label="Tin nhắn"
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-sky-100 dark:hover:bg-white/10"
            >
              <ChatCircleDots size={20} />
              {isLoggedIn && totalUnread > 0 && (
                <span
                  id="header-messages-badge"
                  data-testid="header-messages-badge"
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-extrabold text-white shadow"
                >
                  {unreadBadgeText}
                </span>
              )}
            </Link>

            {/* Notification Bell */}
            <NotificationBell categories={['ORDER', 'ACTIVITY']} />

            {/* User avatar / dropdown */}
            <div className="relative" ref={accountMenuContainerRef}>
              <button
                type="button"
                id="btn-user-menu"
                ref={accountMenuTriggerRef}
                aria-label="Tài khoản"
                aria-expanded={menu.open}
                aria-controls="account-menu"
                onClick={handleAvatarClick}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-indigo-100 active:scale-[0.98] dark:hover:bg-white/10"
              >
                {isLoggedIn && session.user.email !== undefined && (
                  <UserAvatar name={session.user.email} size={28} src={avatarSrc} />
                )}
                {(!isLoggedIn || session.user.email === undefined) && <User size={20} />}
              </button>

              {menu.open && isLoggedIn && (
                <div
                  id="account-menu"
                  className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-3xl border border-white/30 bg-white/90 shadow-xl backdrop-blur-md motion-safe:transition-[opacity,translate,scale] motion-safe:duration-150 motion-safe:ease-out dark:border-white/15 dark:bg-[#0a0f1e] dark:shadow-indigo-500/10 motion-safe:starting:translate-y-1 motion-safe:starting:scale-[0.96] motion-safe:starting:opacity-0"
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
                            className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
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
                      className="group flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
                        <SignOut size={16} weight="bold" />
                      </span>
                      {signOut.isPending && <span>Đang đăng xuất…</span>}
                      {signOut.isPending === false && <span>Đăng xuất</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/cart"
              aria-label="Giỏ hàng"
              className="btn-primary relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              <ShoppingBag size={18} weight="fill" />
              <span className="hidden sm:inline">Giỏ</span>
              {totalQuantity > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-extrabold text-indigo-700 shadow">
                  {totalQuantity}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
