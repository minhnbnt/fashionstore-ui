import { Link } from 'react-router'

import { useSearch } from '@generated/endpoints/search/search'
import { ArrowRight, ArrowUpRight, ShieldCheck, Sparkle, Storefront } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

import { Skeleton } from '@/components/ui/Skeleton'
import { PLACEHOLDER_IMAGE, takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { priceLabel } from '@/lib/format'
import { cn, FOCUS_RING_CLASS, iconChipClass } from '@/lib/ui/styles'

import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE
  }
}

function imageInitial(reduce: boolean | null): { opacity: number; scale: number } | false {
  if (reduce) {
    return false
  }
  return { opacity: 0, scale: 0.96 }
}

function HeroShowcaseSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-12 gap-3.5">
      <Skeleton className="col-span-12 h-[360px] rounded-3xl sm:col-span-7 sm:h-[480px]" />
      <div className="col-span-12 grid grid-cols-2 gap-3.5 sm:col-span-5 sm:grid-cols-1">
        <Skeleton className="h-[190px] rounded-3xl sm:h-[233px]" />
        <Skeleton className="h-[190px] rounded-3xl sm:h-[233px]" />
      </div>
    </div>
  )
}

function HeroEmptyBrandCard() {
  return (
    <div className="glass relative overflow-hidden rounded-3xl p-8 lg:p-10">
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-900/20 via-blue-600/20 to-sky-400/30 blur-3xl" />
      <div className="relative flex min-h-[380px] flex-col justify-between gap-8">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-900 dark:bg-white/10 dark:text-sky-200">
            <Storefront size={14} weight="bold" />
            DHMQ Marketplace
          </span>
          <span className="h-3 w-3 rounded-full bg-gradient-to-br from-indigo-900 to-sky-400" />
        </div>

        <div className="space-y-3">
          <p className="text-3xl leading-tight font-extrabold tracking-tighter md:text-4xl">
            Thời trang tuyển chọn từ <span className="text-gradient">gian hàng uy tín</span>
          </p>
          <p className="max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Cập nhật liên tục thiết kế mới mỗi ngày, kiểm duyệt minh bạch và giao nhanh toàn quốc.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
            <ShieldCheck size={20} weight="duotone" className="text-blue-700 dark:text-sky-300" />
            <p className="mt-2 text-xs font-bold">Gian hàng xác thực</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Kiểm duyệt eKYC rõ ràng
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
            <Sparkle size={20} weight="duotone" className="text-indigo-800 dark:text-indigo-300" />
            <p className="mt-2 text-xs font-bold">Gợi ý thông minh</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Tìm đồ chuẩn gu cùng DHMQ AI
            </p>
          </div>
        </div>

        <div>
          <Link
            to="/search"
            className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            Khám phá cửa hàng
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function HeroAccentFallbackCard() {
  return (
    <Link
      to="/search"
      className="glass group relative flex h-[190px] flex-col justify-between overflow-hidden rounded-3xl p-5 transition hover:border-blue-400/50 sm:h-[233px] dark:hover:border-sky-400/40"
    >
      <div className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-900/15 to-sky-400/30 blur-2xl" />
      <div className="flex items-center justify-between">
        <span className={cn(iconChipClass(), 'h-9 w-9 rounded-2xl')}>
          <Sparkle size={18} weight="fill" />
        </span>
        <ArrowUpRight
          size={18}
          weight="bold"
          className="text-zinc-400 group-hover:text-blue-700 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 dark:group-hover:text-sky-300"
        />
      </div>
      <div>
        <p className="text-sm font-extrabold tracking-tight text-[#17203a] dark:text-white">
          Khám phá bộ sưu tập
        </p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
          Xem toàn bộ sản phẩm đang mở bán trên DHMQ
        </p>
      </div>
    </Link>
  )
}

function HeroProductShowcase(props: { items: ProductSummaryResponse[]; isPending: boolean }) {
  if (props.isPending) {
    return <HeroShowcaseSkeleton />
  }

  const primary = props.items[0]
  if (primary === undefined) {
    return <HeroEmptyBrandCard />
  }

  const second = props.items[1]
  const third = props.items[2]

  return (
    <div className="grid grid-cols-12 gap-3.5">
      {/* Primary tall editorial card */}
      <Link
        to={'/product/' + (primary.id ?? '')}
        className="group relative col-span-12 block h-[360px] overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-xl shadow-indigo-900/10 sm:col-span-7 sm:h-[480px] dark:border-white/10 dark:bg-[#11182a] dark:shadow-black/50"
      >
        <img
          src={urlOrPlaceholder(primary.defaultImageUrl)}
          alt={primary.name ?? 'Sản phẩm nổi bật DHMQ'}
          width={640}
          height={800}
          onError={handleImageError}
          className="h-full w-full object-cover group-hover:scale-[1.03] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0f1e]/80 via-[#0a0f1e]/25 to-transparent" />
        <span className="btn-primary absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold">
          <Sparkle size={12} weight="fill" />
          Nổi bật
        </span>
        <div className="glass absolute right-4 bottom-4 left-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-[#17203a] dark:text-white">
              {primary.name}
            </p>
            <p className="mt-0.5 text-sm font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
              {priceLabel(primary.minPrice)}
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700/10 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white dark:bg-white/10 dark:text-sky-200 dark:group-hover:bg-sky-400 dark:group-hover:text-[#0a0f1e]">
            <ArrowUpRight size={16} weight="bold" />
          </span>
        </div>
      </Link>

      {/* Two stacked accent cards */}
      <div className="col-span-12 grid grid-cols-2 gap-3.5 sm:col-span-5 sm:grid-cols-1">
        {second !== undefined && (
          <Link
            to={'/product/' + (second.id ?? '')}
            className="group relative block h-[190px] overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-lg shadow-indigo-900/10 sm:h-[233px] dark:border-white/10 dark:bg-[#11182a] dark:shadow-black/50"
          >
            <img
              src={urlOrPlaceholder(second.defaultImageUrl)}
              alt={second.name ?? 'Sản phẩm DHMQ'}
              width={420}
              height={420}
              onError={handleImageError}
              className="h-full w-full object-cover group-hover:scale-[1.04] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0a0f1e]/75 via-[#0a0f1e]/20 to-transparent" />
            <div className="glass absolute right-3 bottom-3 left-3 rounded-2xl px-3 py-2">
              <p className="truncate text-xs font-extrabold text-[#17203a] dark:text-white">
                {second.name}
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
                {priceLabel(second.minPrice)}
              </p>
            </div>
          </Link>
        )}
        {second === undefined && <HeroAccentFallbackCard />}

        {third !== undefined && (
          <Link
            to={'/product/' + (third.id ?? '')}
            className="group relative block h-[190px] overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-lg shadow-indigo-900/10 sm:h-[233px] dark:border-white/10 dark:bg-[#11182a] dark:shadow-black/50"
          >
            <img
              src={urlOrPlaceholder(third.defaultImageUrl)}
              alt={third.name ?? 'Sản phẩm DHMQ'}
              width={420}
              height={420}
              onError={handleImageError}
              className="h-full w-full object-cover group-hover:scale-[1.04] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0a0f1e]/75 via-[#0a0f1e]/20 to-transparent" />
            <div className="glass absolute right-3 bottom-3 left-3 rounded-2xl px-3 py-2">
              <p className="truncate text-xs font-extrabold text-[#17203a] dark:text-white">
                {third.name}
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
                {priceLabel(third.minPrice)}
              </p>
            </div>
          </Link>
        )}
        {third === undefined && <HeroAccentFallbackCard />}
      </div>
    </div>
  )
}

export default function Hero() {
  const reduce = useReducedMotion()
  let initial: { opacity: number; y: number } | false = { opacity: 0, y: 24 }
  if (reduce) {
    initial = false
  }

  const showcaseQuery = useSearch({ limit: 3 })
  let showcaseItems: ProductSummaryResponse[] = []
  if (showcaseQuery.data !== undefined) {
    const page = takeData(showcaseQuery.data)
    showcaseItems = page.items ?? []
  }

  return (
    <section id="top" className="relative scroll-mt-24 overflow-hidden pt-[76px]">
      <div className="hero-blob top-24 left-[-120px] h-96 w-96 bg-indigo-800/25" />
      <div className="hero-blob top-40 right-[-100px] h-[28rem] w-[28rem] bg-sky-400/35" />
      <div className="hero-blob top-[420px] left-1/3 h-72 w-72 bg-blue-400/25" />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-4 pt-6 pb-12 lg:grid-cols-12 lg:pt-10">
        <motion.div
          initial={initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6"
        >
          <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-blue-700 uppercase dark:text-sky-200">
            <Sparkle size={14} weight="fill" />
            Bộ sưu tập mới · DHMQ Marketplace
          </p>

          <h1 className="mt-5 text-4xl leading-[1.06] font-extrabold tracking-tighter md:text-5xl lg:text-6xl">
            Phong cách chuẩn gu,
            <br />
            <span className="text-gradient">đậm chất DHMQ</span>
          </h1>

          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            Khám phá hàng trăm gian hàng thời trang tuyển chọn, giao nhanh và đổi trả minh bạch.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#shop"
              className={cn(
                'btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold',
                FOCUS_RING_CLASS,
              )}
            >
              Mua sắm ngay
              <ArrowRight size={16} weight="bold" />
            </a>
            <a
              href="#categories"
              className={cn(
                'glass inline-flex items-center rounded-full px-7 py-3.5 text-sm font-semibold text-[#17203a] transition hover:border-blue-300 dark:text-white dark:hover:border-sky-400/40',
                FOCUS_RING_CLASS,
              )}
            >
              Xem danh mục
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={imageInitial(reduce)}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative lg:col-span-6"
        >
          <HeroProductShowcase items={showcaseItems} isPending={showcaseQuery.isPending} />
        </motion.div>
      </div>
    </section>
  )
}
