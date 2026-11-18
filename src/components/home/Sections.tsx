import { useState } from 'react'
import { Link } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { useSearch } from '@generated/endpoints/search/search'
import { useListPageLinks } from '@generated/endpoints/site-content/site-content'
import { SearchSort } from '@generated/model/searchSort'
import {
  ArrowRight,
  ArrowsLeftRight,
  BaseballCap,
  ChartLineUp,
  CoatHanger,
  CreditCard,
  Dress,
  Handbag,
  Package,
  Pants,
  ShieldCheck,
  Sneaker,
  Sparkle,
  Storefront,
  Tag,
  Truck,
  TShirt,
  X,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

import { EmptyState } from '@/components/ui/EmptyState'
import { ProductCard } from '@/components/ui/ProductCard'
import { ProductCardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { hookErrorMessage, takeData } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'
import {
  cn,
  FOCUS_RING_CLASS,
  iconChipClass,
  secondaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
} from '@/lib/ui/styles'

import type { CategoryResponse } from '@generated/model/categoryResponse'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { PublicPageLinkResponse } from '@generated/model/publicPageLinkResponse'

export { ProductCard } from '@/components/ui/ProductCard'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const HOME_SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: SearchSort.NEWEST, label: 'Mới về' },
  { value: SearchSort.PRICE_ASC, label: 'Giá tăng dần' },
  { value: SearchSort.PRICE_DESC, label: 'Giá giảm dần' },
]

function Reveal(props: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <div>{props.children}</div>
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay: props.delay || 0, ease: [0.16, 1, 0.3, 1] }}
    >
      {props.children}
    </motion.div>
  )
}

function renderCategoryIcon(slug: string | undefined, name: string | undefined, size: number) {
  const source = ((slug ?? '') + ' ' + (name ?? '')).toLowerCase()
  if (source.includes('vay') || source.includes('dam') || source.includes('dress')) {
    return <Dress size={size} weight="duotone" />
  }
  if (source.includes('quan') || source.includes('pant') || source.includes('jean')) {
    return <Pants size={size} weight="duotone" />
  }
  if (source.includes('giay') || source.includes('dep') || source.includes('shoe')) {
    return <Sneaker size={size} weight="duotone" />
  }
  if (source.includes('tui') || source.includes('vi') || source.includes('bag')) {
    return <Handbag size={size} weight="duotone" />
  }
  if (source.includes('mu') || source.includes('non') || source.includes('cap')) {
    return <BaseballCap size={size} weight="duotone" />
  }
  if (source.includes('khoac') || source.includes('jacket') || source.includes('coat')) {
    return <CoatHanger size={size} weight="duotone" />
  }
  if (source.includes('ao') || source.includes('shirt') || source.includes('top')) {
    return <TShirt size={size} weight="duotone" />
  }
  return <Tag size={size} weight="duotone" />
}

function categorySurfaceAccent(index: number): string {
  const slot = index % 4
  if (slot === 0) {
    return 'from-indigo-900/10 via-blue-600/8 to-sky-400/15 dark:from-indigo-500/20 dark:via-blue-500/10 dark:to-sky-400/15'
  }
  if (slot === 1) {
    return 'from-sky-400/15 via-blue-500/8 to-indigo-900/10 dark:from-sky-400/15 dark:via-blue-500/10 dark:to-indigo-900/20'
  }
  if (slot === 2) {
    return 'from-blue-700/12 via-sky-300/10 to-indigo-800/8 dark:from-blue-500/15 dark:via-sky-400/10 dark:to-indigo-800/15'
  }
  return 'from-indigo-800/8 via-sky-400/12 to-blue-600/10 dark:from-indigo-400/15 dark:via-sky-400/10 dark:to-blue-600/15'
}

const PLATFORM_HIGHLIGHTS = [
  { key: 'ekyc', label: 'Gian hàng eKYC', icon: ShieldCheck },
  { key: 'freeship', label: 'Freeship đơn từ 500K', icon: Truck },
  { key: 'return', label: 'Đổi trả 30 ngày', icon: ArrowsLeftRight },
  { key: 'ai', label: 'Tư vấn DHMQ AI', icon: Sparkle },
  { key: 'payment', label: 'Thanh toán linh hoạt', icon: CreditCard },
]

export function LogoStrip() {
  return (
    <section className="border-y border-sky-100 bg-white/60 dark:border-white/10 dark:bg-white/5">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-4">
        {PLATFORM_HIGHLIGHTS.map(function (item) {
          const Icon = item.icon
          return (
            <div
              key={item.key}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-600 sm:text-sm dark:text-zinc-300"
            >
              <Icon size={17} weight="duotone" className="text-blue-700 dark:text-sky-300" />
              <span>{item.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function CategoryBento(props: {
  onSelect: (category: CategoryResponse) => void
  activeSlug?: string | null
}) {
  const categoriesQuery = useListCategories()
  const payload = categoriesQuery.data

  if (categoriesQuery.isPending) {
    return (
      <section id="categories" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-12">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
          <Skeleton className="col-span-2 h-56 rounded-3xl lg:col-span-4 lg:row-span-2 lg:h-[360px]" />
          <Skeleton className="h-40 rounded-3xl lg:col-span-2 lg:h-[172px]" />
          <Skeleton className="h-40 rounded-3xl lg:col-span-2 lg:h-[172px]" />
        </div>
      </section>
    )
  }

  if (payload === undefined) {
    return null
  }
  const categories = takeData(payload)
  if (categories.length === 0) {
    return null
  }
  const first = categories[0]
  const rest = categories.slice(1)
  if (first === undefined) {
    return null
  }

  const firstActive =
    props.activeSlug !== null && props.activeSlug !== undefined && first.slug === props.activeSlug

  return (
    <section id="categories" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">
              Danh mục nổi bật
            </h2>
            <p className="mt-2 max-w-[60ch] text-zinc-600 dark:text-zinc-300">
              Chọn danh mục để lọc nhanh lưới sản phẩm bên dưới.
            </p>
          </div>
          <Link
            to="/search"
            className={cn(
              'inline-flex items-center gap-1 rounded-full text-sm font-bold text-blue-700 hover:underline dark:text-sky-300',
              FOCUS_RING_CLASS,
            )}
          >
            Tất cả danh mục
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <button
          type="button"
          aria-label={'Lọc danh mục ' + (first.name ?? '')}
          aria-pressed={firstActive}
          onClick={function () {
            props.onSelect(first)
          }}
          className={cn(
            'glass group relative col-span-2 flex min-h-[220px] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl p-6 text-left transition hover:border-blue-400/50 hover:shadow-xl hover:shadow-indigo-900/10 lg:col-span-4 lg:row-span-2 lg:min-h-[360px] lg:p-8 dark:hover:border-sky-400/40 dark:hover:shadow-black/50',
            FOCUS_RING_CLASS,
            firstActive &&
              'border-blue-600 ring-2 ring-blue-600/70 dark:border-sky-400 dark:ring-sky-400/70',
          )}
        >
          <div
            className={cn(
              'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-85 transition-opacity duration-300 group-hover:opacity-100',
              categorySurfaceAccent(0),
            )}
          />
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-52 w-52 rounded-full bg-gradient-to-br from-indigo-900/15 via-blue-600/15 to-sky-400/25 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <span className={cn(iconChipClass(), 'h-14 w-14 rounded-2xl shadow-xs')}>
              {renderCategoryIcon(first.slug, first.name, 28)}
            </span>
            {firstActive && (
              <span className="btn-primary rounded-full px-3 py-1 text-xs font-bold">
                Đang chọn
              </span>
            )}
            {firstActive === false && (
              <span className="rounded-full border border-indigo-200/80 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-sky-200">
                Xu hướng
              </span>
            )}
          </div>

          <div className="relative mt-8">
            <p className="text-2xl font-extrabold tracking-tight text-[#17203a] lg:text-3xl dark:text-white">
              {first.name}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 dark:text-sky-300">
              Khám phá ngay
              <ArrowRight
                size={15}
                weight="bold"
                className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
              />
            </p>
          </div>
        </button>

        {rest.map(function (c, idx) {
          const isActive =
            props.activeSlug !== null &&
            props.activeSlug !== undefined &&
            c.slug === props.activeSlug
          return (
            <button
              key={c.id}
              type="button"
              aria-label={'Lọc danh mục ' + (c.name ?? '')}
              aria-pressed={isActive}
              onClick={function () {
                props.onSelect(c)
              }}
              className={cn(
                'glass group relative flex min-h-[164px] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl p-5 text-left transition hover:border-blue-400/50 hover:shadow-lg hover:shadow-indigo-900/10 lg:col-span-2 lg:min-h-[172px] dark:hover:border-sky-400/40 dark:hover:shadow-black/50',
                FOCUS_RING_CLASS,
                isActive &&
                  'border-blue-600 ring-2 ring-blue-600/70 dark:border-sky-400 dark:ring-sky-400/70',
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity duration-300 group-hover:opacity-100',
                  categorySurfaceAccent(idx + 1),
                )}
              />
              <div className="relative flex items-start justify-between gap-2">
                <span className={cn(iconChipClass(), 'h-11 w-11 rounded-2xl shadow-xs')}>
                  {renderCategoryIcon(c.slug, c.name, 22)}
                </span>
                {isActive && (
                  <span className="btn-primary rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                    Đang chọn
                  </span>
                )}
              </div>

              <div className="relative mt-5">
                <p className="line-clamp-1 text-base font-extrabold tracking-tight text-[#17203a] lg:text-lg dark:text-white">
                  {c.name}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-sky-300">
                  Khám phá ngay
                  <ArrowRight
                    size={13}
                    weight="bold"
                    className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                  />
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// Lưới trang chủ: chưa chọn danh mục thì hiện hàng mới về, chọn rồi thì lọc theo danh mục đó.
export function ProductGrid(props: {
  category: CategoryResponse | null
  onClearCategory?: () => void
  limit?: number
}) {
  const [sort, setSort] = useState<SearchSort>(SearchSort.NEWEST)
  const limit = props.limit ?? 8
  const slug = props.category?.slug
  const searchQuery = useSearch({ category: slug, limit, sort })
  const payload = searchQuery.data
  let items: ProductSummaryResponse[] = []
  let total = 0
  if (payload !== undefined) {
    const page = takeData(payload)
    items = page.items ?? []
    total = page.total ?? 0
  }
  let title = 'Mới về'
  let seeAll = '/search'
  if (props.category !== null) {
    title = props.category.name ?? title
    seeAll = '/search?category=' + encodeURIComponent(slug ?? '')
  }

  const skeletonKeys = Array.from({ length: Math.min(limit, 8) }, function (_, idx) {
    return idx
  })

  return (
    <section id="shop" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">{title}</h2>
            {props.category !== null && props.onClearCategory !== undefined && (
              <button
                type="button"
                onClick={props.onClearCategory}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25',
                  FOCUS_RING_CLASS,
                )}
              >
                <X size={12} weight="bold" />
                <span>Xem tất cả mới về</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={cn(segmentedTrackClass(), 'overflow-x-auto')}>
              {HOME_SORT_OPTIONS.map(function (opt) {
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={sort === opt.value}
                    onClick={function () {
                      setSort(opt.value)
                    }}
                    className={cn(segmentedItemClass(sort === opt.value), 'whitespace-nowrap')}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            <Link
              to={seeAll}
              className={cn(
                'flex items-center gap-1 rounded-full text-sm font-bold text-blue-700 hover:underline dark:text-sky-300',
                FOCUS_RING_CLASS,
              )}
            >
              Xem tất cả
              {total > 0 && <span className="tabular-nums">({total})</span>}
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </Reveal>

      {searchQuery.isPending && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {skeletonKeys.map(function (key) {
            return <ProductCardSkeleton key={key} />
          })}
        </div>
      )}

      {searchQuery.isError && (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50/80 p-5 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {hookErrorMessage('search', searchQuery.error)}
        </div>
      )}

      {searchQuery.isSuccess && items.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Chưa có sản phẩm trong danh mục này"
            description="Các gian hàng DHMQ đang cập nhật thêm mẫu mới. Bạn có thể xem toàn bộ sản phẩm đang mở bán."
            action={
              <div className="flex flex-wrap justify-center gap-2.5">
                {props.category !== null && props.onClearCategory !== undefined && (
                  <button
                    type="button"
                    onClick={props.onClearCategory}
                    className={secondaryButtonClass()}
                  >
                    Quay lại Mới về
                  </button>
                )}
                <Link
                  to="/search"
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
                >
                  Xem tất cả sản phẩm
                  <ArrowRight size={15} weight="bold" />
                </Link>
              </div>
            }
          />
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {items.map(function (p, i) {
            return (
              <Reveal key={p.id} delay={(i % 4) * 0.06}>
                <ProductCard item={p} />
              </Reveal>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function DealMarquee() {
  const items = [
    'Freeship đơn từ 500K',
    'Đổi trả miễn phí 30 ngày',
    'Gian hàng xác thực DHMQ Mall',
    'Hàng mới cập nhật mỗi ngày',
  ]
  const doubled = items.concat(items)
  return (
    <section className="mt-8 overflow-hidden bg-gradient-to-r from-indigo-900 via-blue-700 to-sky-400 py-3 text-white">
      <div className="marquee-track text-sm font-bold tracking-widest uppercase">
        {doubled.map(function (t, i) {
          return (
            <span key={i} className="flex items-center gap-3">
              <Sparkle size={14} weight="fill" aria-hidden="true" />
              <span>{t}</span>
            </span>
          )
        })}
      </div>
    </section>
  )
}

export function Editorial() {
  return (
    <section className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-8 px-4 py-12 lg:grid-cols-2">
      {/* Architectural DHMQ Marketplace visual card (Mở gian hàng & DHMQ AI) */}
      <Reveal>
        <div className="glass relative overflow-hidden rounded-3xl p-7 lg:p-10">
          <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-indigo-800/15 blur-3xl dark:bg-indigo-500/20" />
          <div className="pointer-events-none absolute -right-12 -bottom-16 h-56 w-56 rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-400/20" />

          <div className="relative space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-sky-200">
                <Storefront size={14} weight="bold" />
                Mở gian hàng & DHMQ AI
              </span>
              <span className="text-lg font-extrabold tracking-tighter text-[#17203a] dark:text-white">
                DHMQ<span className="text-sky-400">.</span>
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <span className={cn(iconChipClass(), 'h-10 w-10 rounded-xl')}>
                  <Sparkle size={20} weight="duotone" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Trợ lý phối đồ DHMQ AI</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                    Mô tả phong cách, dịp mặc hoặc ngân sách — AI đề xuất ngay trang phục khớp gu
                    trực tiếp từ kho hàng thật.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <span className={cn(iconChipClass(), 'h-10 w-10 rounded-xl')}>
                  <Storefront size={20} weight="duotone" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Trang trí gian hàng chuẩn thương hiệu</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                    Tự thiết kế banner, bộ sưu tập và video lookbook để nổi bật bản sắc riêng của
                    thương hiệu.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <span className={cn(iconChipClass(), 'h-10 w-10 rounded-xl')}>
                  <ChartLineUp size={20} weight="duotone" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Quản lý bán hàng tập trung</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                    Đăng sản phẩm, đồng bộ tồn kho, xử lý đơn hàng và trò chuyện khách mua trên một
                    bảng điều khiển duy nhất.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-sky-50/80 px-3.5 py-1 text-xs font-bold text-blue-700 dark:border-white/15 dark:bg-white/10 dark:text-sky-200">
            Dành cho thương hiệu & tín đồ thời trang
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tighter md:text-4xl">
            Phối đồ chuẩn gu với AI, <span className="text-gradient">mở gian hàng dễ dàng</span>
          </h2>
          <p className="mt-3 max-w-[56ch] leading-relaxed text-zinc-600 dark:text-zinc-300">
            Tìm nhanh trang phục ưng ý cùng trợ lý DHMQ AI, hoặc đưa bộ sưu tập của thương hiệu bạn
            tiếp cận hàng nghìn khách hàng yêu thời trang mỗi ngày.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/search"
              className={cn(
                'btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold',
                FOCUS_RING_CLASS,
              )}
            >
              Khám phá sản phẩm
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link
              to="/account#seller-channel"
              className={cn(secondaryButtonClass(), 'px-6 py-3 text-sm')}
            >
              <Storefront size={16} weight="bold" />
              Mở gian hàng ngay
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const EXPERIENCE_STEPS = [
  {
    step: '01',
    title: 'Tìm nhanh với DHMQ AI',
    description:
      'Mô tả phong cách, màu sắc hoặc mức giá mong muốn — trợ lý AI gợi ý ngay sản phẩm khớp nhu cầu từ kho hàng thật.',
    icon: Sparkle,
  },
  {
    step: '02',
    title: 'Chọn gian hàng xác thực',
    description:
      'Mua trực tiếp từ các cửa hàng đã xác minh eKYC, xem rõ bảng size, hình ảnh và đánh giá minh bạch theo từng đơn.',
    icon: Storefront,
  },
  {
    step: '03',
    title: 'Giao nhanh & đổi trả dễ',
    description:
      'Theo dõi hành trình đơn hàng theo thời gian thực, thanh toán linh hoạt và hỗ trợ đổi trả thuận tiện trong 30 ngày.',
    icon: Package,
  },
]

export function Testimonials() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-12">
      <Reveal>
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">Trải nghiệm DHMQ</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Ba bước mua sắm rõ ràng, nhanh gọn và an tâm trên mọi đơn hàng.
          </p>
        </div>
      </Reveal>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {EXPERIENCE_STEPS.map(function (item, idx) {
          const Icon = item.icon
          return (
            <Reveal key={item.step} delay={idx * 0.06}>
              <div className="glass flex h-full flex-col rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <span className={cn(iconChipClass(), 'h-11 w-11 rounded-2xl')}>
                    <Icon size={22} weight="duotone" />
                  </span>
                  <span className="text-gradient text-2xl font-extrabold tracking-tighter tabular-nums">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-extrabold tracking-tight text-[#17203a] dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {item.description}
                </p>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

function FooterPageLinks({ links }: { links: PublicPageLinkResponse[] }) {
  return (
    <>
      {links.map(function (link) {
        return (
          <li key={link.slug}>
            <Link to={`/pages/${link.slug ?? ''}`} className="transition hover:text-white">
              {link.title}
            </Link>
          </li>
        )
      })}
    </>
  )
}

export function Footer() {
  const [email, setEmail] = useState('')
  const pagesQuery = useListPageLinks({ query: { staleTime: 5 * 60_000 } })
  let links: PublicPageLinkResponse[] = []
  if (pagesQuery.isSuccess) {
    links = takeData(pagesQuery.data)
  }
  const aboutLinks = links.filter((link) => link.footerGroup === 'ABOUT')
  const supportLinks = links.filter((link) => link.footerGroup === 'SUPPORT')
  const policyLinks = links.filter((link) => link.footerGroup === 'POLICY')

  function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (EMAIL_PATTERN.test(trimmed) === false) {
      notify.warning('Email chưa hợp lệ', 'Vui lòng nhập đúng địa chỉ email.')
      return
    }
    notify.success('Đã ghi nhận email', 'Bạn sẽ nhận thông báo ưu đãi mới nhất từ DHMQ.')
    setEmail('')
  }

  let footerGridClass = 'mx-auto grid max-w-[1400px] grid-cols-2 gap-8 md:grid-cols-5'
  if (policyLinks.length === 0) {
    footerGridClass = 'mx-auto grid max-w-[1400px] grid-cols-2 gap-8 md:grid-cols-4'
  }

  return (
    <footer className="rounded-t-[2.5rem] bg-[#070b16] px-6 pt-10 pb-8 text-zinc-300 md:px-10 md:pt-12">
      <div className={footerGridClass}>
        <div>
          <p className="text-2xl font-extrabold tracking-tighter text-white">
            DHMQ<span className="text-sky-400">.</span>
          </p>
          <p className="mt-2 text-sm text-zinc-400">Phong cách chuẩn gu, đậm chất DHMQ.</p>
          {aboutLinks.length > 0 && (
            <ul className="mt-3 space-y-2 text-sm">
              <FooterPageLinks links={aboutLinks} />
            </ul>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-white">Mua sắm</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/#shop" className="transition hover:text-white">
                Hàng mới
              </Link>
            </li>
            <li>
              <Link to="/search" className="transition hover:text-white">
                Tất cả sản phẩm
              </Link>
            </li>
            <li>
              <Link to="/#categories" className="transition hover:text-white">
                Danh mục
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Hỗ trợ</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/faq" className="transition hover:text-white">
                Câu hỏi thường gặp
              </Link>
            </li>
            <FooterPageLinks links={supportLinks} />
            <li>
              <a href="tel:02838614613" className="transition hover:text-white">
                028 3861 4613
              </a>
            </li>
          </ul>
        </div>
        {policyLinks.length > 0 && (
          <div>
            <p className="text-sm font-bold text-white">Chính sách</p>
            <ul className="mt-3 space-y-2 text-sm">
              <FooterPageLinks links={policyLinks} />
            </ul>
          </div>
        )}
        <div className="col-span-2 md:col-span-1">
          <p className="text-sm font-bold text-white">Nhận ưu đãi</p>
          <p className="mt-1.5 text-xs text-zinc-400">
            Cập nhật bộ sưu tập mới và mã giảm giá từ DHMQ.
          </p>
          <form
            noValidate
            className="mt-3 flex overflow-hidden rounded-full border border-white/15 bg-white/10 p-1 focus-within:border-sky-400"
            onSubmit={handleNewsletterSubmit}
          >
            <input
              id="footer-newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={function (e) {
                setEmail(e.target.value)
              }}
              aria-label="Email nhận ưu đãi"
              placeholder="Email của bạn"
              className="w-full bg-transparent px-4 text-sm text-white outline-none placeholder:text-zinc-400"
            />
            <button
              type="submit"
              className="btn-primary shrink-0 cursor-pointer rounded-full px-5 py-2 text-sm font-bold"
            >
              Gửi
            </button>
          </form>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-[1400px] border-t border-white/10 pt-5 text-xs text-zinc-500">
        © 2026 DHMQ Marketplace. Bảo lưu mọi quyền.
      </p>
    </footer>
  )
}
