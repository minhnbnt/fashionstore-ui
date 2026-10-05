import { Link } from 'react-router'

import { Heart, MagnifyingGlass, Moon, ShoppingBag, Sun, User } from '@phosphor-icons/react'

import { useSessionQuery } from '../hooks/useSession'
import { useTheme } from '../hooks/useTheme'

const NAV = ['Nữ', 'Nam', 'Unisex', 'Sale']

export default function Header() {
  const { data: session } = useSessionQuery()
  const { theme, toggle } = useTheme()

  let accountTo = '/login'
  if (session !== null && session !== undefined) {
    accountTo = '/account'
  }
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="glass mt-3 flex h-16 items-center gap-4 rounded-full px-4 md:px-6">
          <a
            href="#top"
            className="flex items-center gap-1 text-2xl font-extrabold tracking-tighter"
          >
            <span>nét</span>
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-900 to-sky-400" />
          </a>
          <nav className="ml-4 hidden items-center gap-6 text-sm font-medium lg:flex">
            {NAV.map(function (item) {
              return (
                <a
                  key={item}
                  href="#shop"
                  className="text-zinc-600 transition hover:text-blue-700 dark:text-zinc-300 dark:hover:text-sky-300"
                >
                  {item}
                </a>
              )
            })}
          </nav>
          <div className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-2 text-sm text-zinc-500 md:flex dark:border-white/15 dark:bg-white/10 dark:text-zinc-300">
            <MagnifyingGlass size={16} weight="bold" />
            <input
              className="w-full bg-transparent outline-none placeholder:text-zinc-400"
              placeholder="Tìm áo, váy, khoác…"
            />
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link
              to={accountTo}
              aria-label="Tài khoản"
              className="rounded-full p-2.5 transition hover:bg-indigo-100 dark:hover:bg-white/10"
            >
              <User size={20} />
            </Link>
            <button
              type="button"
              aria-label="Yêu thích"
              className="rounded-full p-2.5 transition hover:bg-sky-100 dark:hover:bg-white/10"
            >
              <Heart size={20} />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label="Đổi giao diện sáng tối"
              className="rounded-full p-2.5 transition hover:bg-sky-100 dark:hover:bg-white/10"
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
