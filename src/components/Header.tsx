import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useList1 } from '@generated/endpoints/categories/categories'
import {
  Heart,
  MagnifyingGlass,
  Moon,
  ShieldCheck,
  ShoppingBag,
  SignOut,
  Storefront,
  Sun,
  User,
  UserCircle,
} from '@phosphor-icons/react'

import { takeData } from '@/lib/apiAdapters'

import { useSignOut } from '../hooks/useAuthMutations'
import { useSessionQuery } from '../hooks/useSession'
import { useTheme } from '../hooks/useTheme'
import { getDefaultPathForRole, getRoleFromSession } from '../lib/auth'
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

export default function Header() {
  const { data: session } = useSessionQuery()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const signOut = useSignOut()
  const [keyword, setKeyword] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const categoriesQuery = useList1()
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

  function handleBlur(e: React.FocusEvent) {
    if (dropdownRef.current !== null && dropdownRef.current.contains(e.relatedTarget)) {
      return
    }
    setDropdownOpen(false)
  }

  const isLoggedIn = session !== null && session !== undefined
  let role = 'customer'
  let dashboardPath = '/account'
  if (isLoggedIn) {
    role = getRoleFromSession(session)
    dashboardPath = getDefaultPathForRole(role as 'admin' | 'shop' | 'customer')
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
            className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-2 text-sm text-zinc-500 md:flex dark:border-white/15 dark:bg-white/10 dark:text-zinc-300"
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
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {/* User avatar / dropdown */}
            <div className="relative" ref={dropdownRef} onBlur={handleBlur}>
              <button
                type="button"
                id="btn-user-menu"
                aria-label="Tài khoản"
                onClick={handleAvatarClick}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-indigo-100 dark:hover:bg-white/10"
              >
                {isLoggedIn && session.user.email !== undefined ? (
                  <UserAvatar name={session.user.email} size={28} />
                ) : (
                  <User size={20} />
                )}
              </button>

              {dropdownOpen && isLoggedIn && (
                <div className="absolute top-full right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/30 bg-white/90 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/90">
                  {/* User info */}
                  <div className="border-b border-zinc-100 px-4 py-3 dark:border-white/10">
                    <p className="truncate text-xs font-bold text-zinc-800 dark:text-zinc-100">
                      {session.user.email}
                    </p>
                    <div className="mt-1">
                      <RoleBadge role={role} />
                    </div>
                  </div>

                  {/* Dashboard link */}
                  <Link
                    to={dashboardPath}
                    onClick={function () {
                      setDropdownOpen(false)
                    }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-indigo-50 dark:text-zinc-200 dark:hover:bg-white/10"
                  >
                    <UserCircle size={16} />
                    Trang cá nhân
                  </Link>

                  {/* Sign out */}
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

            <button
              type="button"
              aria-label="Yêu thích"
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-sky-100 dark:hover:bg-white/10"
            >
              <Heart size={20} />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label="Đổi giao diện sáng tối"
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-sky-100 dark:hover:bg-white/10"
            >
              {theme === 'dark' && <Sun size={20} />}
              {theme !== 'dark' && <Moon size={20} />}
            </button>
            <button
              type="button"
              aria-label="Giỏ hàng"
              className="btn-primary flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              <ShoppingBag size={18} weight="fill" />
              <span className="hidden sm:inline">Giỏ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
