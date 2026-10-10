import { Link } from 'react-router'

import {
  Heart,
  ShoppingBag,
  Star,
  Truck,
  ShieldCheck,
  ArrowsLeftRight,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

import { CATEGORIES, PRODUCTS, formatVnd } from '../data/products'

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

export function CategoryBento() {
  return (
    <section id="categories" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-12">
      <Reveal>
        <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">Mua theo vibe</h2>
        <p className="mt-2 max-w-[60ch] text-zinc-600 dark:text-zinc-300">
          5 ô bento, click là lọc lưới bên dưới.
        </p>
      </Reveal>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <a
          href="#shop"
          className="group relative col-span-2 overflow-hidden rounded-3xl lg:col-span-4 lg:row-span-2"
        >
          <img
            src={CATEGORIES[0].img}
            alt={CATEGORIES[0].label}
            loading="lazy"
            className="h-64 w-full object-cover transition duration-500 group-hover:scale-105 lg:h-[420px]"
          />
          <span className="glass absolute bottom-4 left-4 rounded-full px-5 py-2 text-sm font-bold">
            {CATEGORIES[0].label}
          </span>
        </a>
        {CATEGORIES.slice(1).map(function (c) {
          return (
            <a
              key={c.id}
              href="#shop"
              className="group relative overflow-hidden rounded-3xl lg:col-span-2"
            >
              <img
                src={c.img}
                alt={c.label}
                loading="lazy"
                className="h-44 w-full object-cover transition duration-500 group-hover:scale-105 lg:h-[202px]"
              />
              <span className="glass absolute bottom-3 left-3 rounded-full px-4 py-1.5 text-xs font-bold">
                {c.label}
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

export function ProductGrid() {
  return (
    <section id="shop" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-10">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl">8 món đang cháy</h2>
          <p className="text-sm text-zinc-500">8 sản phẩm</p>
        </div>
      </Reveal>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {PRODUCTS.map(function (p, i) {
          return (
            <Reveal key={p.id} delay={(i % 4) * 0.06}>
              <article className="group overflow-hidden rounded-3xl border border-sky-100 bg-white/80 shadow-sm transition hover:shadow-xl hover:shadow-sky-200 dark:border-white/10 dark:bg-white/5 dark:hover:shadow-black/50">
                <div className="relative">
                  <Link to={'/product/' + p.id}>
                    <img
                      src={p.img}
                      alt={p.name}
                      loading="lazy"
                      width={600}
                      height={750}
                      className="aspect-[4/5] w-full object-cover"
                    />
                  </Link>
                  {p.tag && (
                    <span className="absolute top-3 left-3 rounded-full bg-gradient-to-r from-indigo-900 to-sky-400 px-3 py-1 text-xs font-bold text-white">
                      {p.tag}
                    </span>
                  )}
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
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {p.desc}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-blue-700 dark:text-sky-300">
                      {formatVnd(p.price)}
                    </span>
                    {p.oldPrice && (
                      <span className="text-xs text-zinc-400 line-through dark:text-zinc-500">
                        {formatVnd(p.oldPrice)}
                      </span>
                    )}
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
              <figcaption className="mt-3 text-xs font-bold text-zinc-500 dark:text-zinc-400">
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
              <a href="#shop" className="hover:text-white">
                Hàng mới
              </a>
            </li>
            <li>
              <a href="#shop" className="hover:text-white">
                Sale
              </a>
            </li>
            <li>
              <a href="#categories" className="hover:text-white">
                Danh mục
              </a>
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
