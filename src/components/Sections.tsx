import { Link } from 'react-router'

import { useList1 } from '@generated/endpoints/categories/categories'
import { useSearch } from '@generated/endpoints/search/search'
import {
  Heart,
  ShoppingBag,
  Star,
  Truck,
  ShieldCheck,
  ArrowsLeftRight,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

import { hookErrorMessage, imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import UserAvatar from './UserAvatar'

import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'

export const DEFAULT_SEARCH_KEYWORD = 'áo'

function Reveal(props: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <div>{props.children}</div>
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: props.delay || 0, ease: [0.16, 1, 0.3, 1] }}
    >
      {props.children}
    </motion.div>
  )
}

export function LogoStrip() {
  const logos = ['UNIQLO-style', 'adidas-style', 'local brand', 'BTSS', 'nét lab']
  return (
    <section className="border-y border-sky-100 bg-white/60 dark:border-white/10 dark:bg-white/5">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 py-4 text-sm font-semibold text-zinc-400">
        {logos.map(function (l) {
          return (
            <span key={l} className="tracking-wide">
              {l}
            </span>
          )
        })}
      </div>
    </section>
  )
}

export function CategoryBento(props: { onSelect: (keyword: string) => void }) {
  const categoriesQuery = useList1()
  const payload = categoriesQuery.data
  if (categoriesQuery.isPending) {
    return (
      <section id="categories" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-12">
        <p className="text-sm text-zinc-500">Đang tải danh mục…</p>
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
  // TODO(mock): backend chưa có ảnh danh mục nên dùng ảnh placeholder theo slug
  function categoryImage(slug: string | undefined): string {
    return `https://picsum.photos/seed/net-${slug ?? 'all'}/600/700`
  }
  return (
    <section id="categories" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-12">
      <Reveal>
        <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">Mua theo vibe</h2>
        <p className="mt-2 max-w-[60ch] text-zinc-600 dark:text-zinc-300">
          Bấm danh mục để lọc lưới bên dưới.
        </p>
      </Reveal>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <button
          type="button"
          onClick={function () {
            props.onSelect(first.name ?? '')
          }}
          className="group relative col-span-2 overflow-hidden rounded-3xl text-left lg:col-span-4 lg:row-span-2"
        >
          <img
            src={categoryImage(first.slug)}
            alt={first.name}
            loading="lazy"
            className="h-64 w-full object-cover transition duration-500 group-hover:scale-105 lg:h-[420px]"
          />
          <span className="glass absolute bottom-4 left-4 rounded-full px-5 py-2 text-sm font-bold">
            {first.name}
          </span>
        </button>
        {rest.map(function (c) {
          return (
            <button
              key={c.id}
              type="button"
              onClick={function () {
                props.onSelect(c.name ?? '')
              }}
              className="group relative overflow-hidden rounded-3xl text-left lg:col-span-2"
            >
              <img
                src={categoryImage(c.slug)}
                alt={c.name}
                loading="lazy"
                className="h-44 w-full object-cover transition duration-500 group-hover:scale-105 lg:h-[202px]"
              />
              <span className="glass absolute bottom-3 left-3 rounded-full px-4 py-1.5 text-xs font-bold">
                {c.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function ProductCard(props: { item: ProductSummaryResponse }) {
  const p = props.item
  return (
    <article className="group overflow-hidden rounded-3xl border border-sky-100 bg-white/80 shadow-sm transition hover:shadow-xl hover:shadow-sky-200 dark:border-white/10 dark:bg-white/5 dark:hover:shadow-black/50">
      <div className="relative">
        <Link to={'/product/' + p.id}>
          <img
            src={imageUrl(p.defaultImageKey)}
            alt={p.name}
            loading="lazy"
            width={600}
            height={750}
            onError={function (e) {
              if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                e.currentTarget.src = PLACEHOLDER_IMAGE
              }
            }}
            className="aspect-[4/5] w-full object-cover"
          />
        </Link>
        <button
          type="button"
          aria-label="Yêu thích"
          className="glass absolute top-3 right-3 rounded-full p-2"
        >
          <Heart size={16} />
        </button>
      </div>
      <div className="p-4">
        <Link to={'/product/' + p.id}>
          <h3 className="truncate text-sm font-bold hover:underline">{p.name}</h3>
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-extrabold text-blue-700 dark:text-sky-300">
            {p.minPrice !== undefined && p.minPrice !== null ? formatVnd(p.minPrice) : 'Liên hệ'}
          </span>
        </div>
        <button
          type="button"
          className="btn-primary mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold"
        >
          <ShoppingBag size={16} weight="fill" />
          Thêm giỏ
        </button>
      </div>
    </article>
  )
}

export function ProductGrid(props: { keyword: string; limit?: number }) {
  const limit = props.limit ?? 8
  const searchQuery = useSearch({ q: props.keyword, limit })
  const payload = searchQuery.data
  const items = payload === undefined ? [] : takeData(payload)
  return (
    <section id="shop" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-10">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">
            Kết quả cho “{props.keyword}”
          </h2>
          <p className="text-sm text-zinc-500">{items.length} sản phẩm</p>
        </div>
      </Reveal>
      {searchQuery.isPending && <p className="mt-6 text-sm text-zinc-500">Đang tải sản phẩm…</p>}
      {searchQuery.isError && (
        <p className="mt-6 text-sm text-red-600">{hookErrorMessage('search', searchQuery.error)}</p>
      )}
      {searchQuery.isSuccess && items.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">Không tìm thấy sản phẩm. Thử từ khóa khác.</p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {items.map(function (p, i) {
          return (
            <Reveal key={p.id} delay={(i % 4) * 0.06}>
              <ProductCard item={p} />
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

export function DealMarquee() {
  const items = [
    'Sale tới -25% đến 08.10',
    'Free ship từ 500K',
    'Đổi trả 30 ngày',
    'Hàng mới mỗi tuần',
  ]
  const doubled = items.concat(items)
  return (
    <section className="mt-8 overflow-hidden bg-gradient-to-r from-indigo-900 via-blue-700 to-sky-400 py-3 text-white">
      <div className="marquee-track text-sm font-bold tracking-widest uppercase">
        {doubled.map(function (t, i) {
          return (
            <span key={i} className="flex items-center gap-10">
              ✦ {t}
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
      <img
        src="https://picsum.photos/seed/net-editorial/900/700"
        alt="Bộ sưu tập nét thu đông"
        loading="lazy"
        className="h-80 w-full rounded-3xl object-cover shadow-xl shadow-sky-200 lg:h-[440px] dark:shadow-black/60"
      />
      <Reveal>
        <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">
          Học Uniqlo về chất, <span className="text-gradient">học Adidas về lửa</span>
        </h2>
        <p className="mt-3 max-w-[55ch] leading-relaxed text-zinc-600 dark:text-zinc-300">
          Phom tối giản dễ mặc mỗi ngày, điểm thêm chi tiết street-sport để không nhạt. Chất cotton,
          dạ, denim chọn kỹ từng lô.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-3xl border border-sky-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <Truck size={22} className="mx-auto text-indigo-800 dark:text-indigo-300" />
            <p className="mt-2 text-xs font-bold">Giao toàn quốc</p>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <ArrowsLeftRight size={22} className="mx-auto text-blue-700 dark:text-sky-300" />
            <p className="mt-2 text-xs font-bold">Đổi trả 30 ngày</p>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <ShieldCheck size={22} className="mx-auto text-blue-600 dark:text-sky-400" />
            <p className="mt-2 text-xs font-bold">Chính hãng</p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const QUOTES = [
  { text: 'Áo dày dặn mà giá sinh viên, mặc 3 tháng chưa xù.', name: 'Linh, Hà Nội' },
  { text: 'Đặt hôm trước hôm sau có, gói hộp hồng xinh xỉu.', name: 'Trâm, Sài Gòn' },
  { text: 'Váy lên form đúng ảnh, đi làm ai cũng hỏi link.', name: 'An, Đà Nẵng' },
]

export function Testimonials() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-12">
      <h2 className="text-3xl font-extrabold tracking-tighter">Khách nói gì</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {QUOTES.map(function (q) {
          return (
            <figure key={q.name} className="glass rounded-3xl p-6">
              <div className="flex gap-1 text-sky-400">
                <Star size={14} weight="fill" />
                <Star size={14} weight="fill" />
                <Star size={14} weight="fill" />
                <Star size={14} weight="fill" />
                <Star size={14} weight="fill" />
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed">“{q.text}”</blockquote>
              <figcaption className="mt-3 flex items-center gap-2.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                <UserAvatar name={q.name} size={28} />
                {q.name}
              </figcaption>
            </figure>
          )
        })}
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="rounded-t-[2.5rem] bg-zinc-950 px-6 pt-10 pb-8 text-zinc-300 md:px-10 md:pt-12">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-8 md:grid-cols-4">
        <div>
          <p className="text-2xl font-extrabold text-white">
            nét<span className="text-sky-400">.</span>
          </p>
          <p className="mt-2 text-sm text-zinc-400">Mặc đẹp là nét riêng của bạn.</p>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Mua sắm</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/#shop" className="hover:text-white">
                Hàng mới
              </Link>
            </li>
            <li>
              <Link to="/#shop" className="hover:text-white">
                Sale
              </Link>
            </li>
            <li>
              <Link to="/#categories" className="hover:text-white">
                Danh mục
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Hỗ trợ</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Đổi trả 30 ngày</li>
            <li>Giao hàng toàn quốc</li>
            <li>028 3861 4613</li>
          </ul>
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className="text-sm font-bold text-white">Nhận deal</p>
          <form
            className="mt-3 flex overflow-hidden rounded-full bg-white/10 p-1"
            onSubmit={function (e) {
              e.preventDefault()
            }}
          >
            <input
              placeholder="Email của bạn"
              className="w-full bg-transparent px-4 text-sm outline-none placeholder:text-zinc-500"
            />
            <button type="submit" className="btn-primary rounded-full px-5 py-2 text-sm font-bold">
              Gửi
            </button>
          </form>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-[1400px] border-t border-white/10 pt-5 text-xs text-zinc-500">
        © 2026 nét. Ảnh demo từ picsum.
      </p>
    </footer>
  )
}
