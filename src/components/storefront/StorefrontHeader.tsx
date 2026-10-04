import { useState } from 'react'
import type { FormEvent } from 'react'
import { Search, ShoppingBag, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { useSession } from '@/lib/auth'
import { useCart } from '@/hooks/useCart'

const NAV = [
  { label: 'Áo', to: '/?cat=ao' },
  { label: 'Váy & Đầm', to: '/?cat=vay-dam' },
  { label: 'Áo khoác', to: '/?cat=khoac' },
  { label: 'Phụ kiện', to: '/?cat=phu-kien' },
]

export default function StorefrontHeader({ onOpenCart }: { onOpenCart: () => void }) {
  const { session } = useSession()
  const { count } = useCart()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = keyword.trim()
    if (query.length > 0) {
      void navigate(`/?q=${encodeURIComponent(query)}`)
      return
    }
    void navigate('/')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link to="/" className="font-display text-xl font-semibold tracking-wide">
          FashionStore
        </Link>
        <nav aria-label="Danh mục" className="hidden items-center gap-5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form role="search" onSubmit={handleSearch} className="ml-auto hidden min-w-0 flex-1 max-w-xs items-center sm:flex">
          <label htmlFor="site-search" className="sr-only">
            Tìm sản phẩm
          </label>
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="site-search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm sản phẩm…"
              className="h-9 w-full border border-input bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
          </div>
        </form>
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          {session !== null && (
            <Link
              to="/account"
              aria-label="Tài khoản"
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <User className="size-5" aria-hidden="true" />
            </Link>
          )}
          {session === null && (
            <Link to="/login" className="px-2 text-sm font-medium hover:underline">
              Đăng nhập
            </Link>
          )}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Mở giỏ hàng, ${count} sản phẩm`}
            className="relative p-2 text-muted-foreground hover:text-foreground"
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute top-0 right-0 flex size-5 items-center justify-center bg-primary text-xs font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
