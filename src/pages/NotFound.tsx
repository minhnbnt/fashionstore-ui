import { Link } from 'react-router'

import { Compass, House, MagnifyingGlass } from '@phosphor-icons/react'

import { cn, FOCUS_RING_CLASS, iconChipClass, secondaryButtonClass } from '@/lib/ui/styles'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[72dvh] max-w-[1400px] items-center justify-center px-4 pt-24 pb-16">
      <div className="glass relative w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200/90 p-8 text-center md:p-12 dark:border-white/10">
        <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-blue-700/15 blur-3xl" />

        <div className="relative flex flex-col items-center">
          <span className={cn(iconChipClass(), 'h-16 w-16 rounded-2xl shadow-sm')}>
            <Compass size={32} weight="duotone" />
          </span>

          <span className="mt-5 inline-flex items-center rounded-full border border-indigo-200/80 bg-indigo-50/80 px-4 py-1 text-xs font-extrabold tracking-[0.2em] uppercase dark:border-white/15 dark:bg-white/10">
            <span className="text-gradient tabular-nums">404</span>
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tighter text-[#17203a] md:text-4xl dark:text-white">
            Không tìm thấy trang
          </h1>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Đường dẫn bạn vừa mở không tồn tại hoặc sản phẩm đã được cập nhật. Bạn có thể quay về
            trang chủ hoặc tìm kiếm mẫu thời trang phù hợp trên DHMQ.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className={cn(
                'btn-primary inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-3 text-sm font-bold',
                FOCUS_RING_CLASS,
              )}
            >
              <House size={16} weight="bold" />
              Về trang chủ
            </Link>
            <Link
              to="/search"
              className={cn(secondaryButtonClass(), 'px-6 py-3 text-sm', FOCUS_RING_CLASS)}
            >
              <MagnifyingGlass size={16} weight="bold" />
              Tìm kiếm sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
