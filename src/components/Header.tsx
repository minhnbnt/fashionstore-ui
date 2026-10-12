import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useList1 } from '@generated/endpoints/categories/categories'
import { Heart, MagnifyingGlass, Moon, ShoppingBag, Sun, User } from '@phosphor-icons/react'

import { takeData } from '@/lib/apiAdapters'

import { useSessionQuery } from '../hooks/useSession'
import { useTheme } from '../hooks/useTheme'
import UserAvatar from './UserAvatar'

import type { CategoryResponse } from '@generated/model/categoryResponse'

export default function Header() {
  const { data: session } = useSessionQuery()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
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

  let accountTo = '/login'
  if (session !== null && session !== undefined) {
    accountTo = '/account'
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
            <Link
              to={accountTo}
              aria-label="Tài khoản"
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-indigo-100 dark:hover:bg-white/10"
            >
              {session !== null && session !== undefined && session.user.email !== undefined ? (
                <UserAvatar name={session.user.email} size={28} />
              ) : (
                <User size={20} />
              )}
            </Link>
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
