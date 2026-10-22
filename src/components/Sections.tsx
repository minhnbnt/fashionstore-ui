import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useListCategories } from '@generated/endpoints/categories/categories'
import { useList } from '@generated/endpoints/reviews/reviews'
import { useSearch } from '@generated/endpoints/search/search'
import { useListPageLinks } from '@generated/endpoints/site-content/site-content'
import {
  ArrowRight,
  ArrowsLeftRight,
  CheckCircle,
  CreditCard,
  Headset,
  Heart,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkle,
  Star,
  Tag,
  Truck,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

import { hookErrorMessage, imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { calculateDiscountPercent, formatSoldCount, formatVnd } from '@/lib/format'

import { useCart } from '../hooks/useCart'
import { useWishlist } from '../hooks/useWishlist'
import UserAvatar from './UserAvatar'

import type { CategoryResponse } from '@generated/model/categoryResponse'
import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'
import type { PublicPageLinkResponse } from '@generated/model/publicPageLinkResponse'
import type { ReviewResponse } from '@generated/model/reviewResponse'

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
  const logos = ['UNIQLO-Style', 'Local Brands', 'Adidas-Style', 'Streetwear', 'nét Original']
  return (
    <section className="border-y border-sky-100 bg-white/60 dark:border-white/10 dark:bg-white/5">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 py-4 text-xs font-bold tracking-wider text-zinc-400 uppercase">
        {logos.map(function (l) {
          return (
            <span key={l} className="flex items-center gap-2">
              <Sparkle size={12} weight="fill" className="text-sky-400" />
              {l}
            </span>
          )
        })}
      </div>
    </section>
  )
}

export function CategoryBento(props: { onSelect: (category: CategoryResponse) => void }) {
  const categoriesQuery = useListCategories()
  const payload = categoriesQuery.data
  if (categoriesQuery.isPending) {
    return (
      <section id="categories" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-8">
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

  const categoryGradients = [
    'from-indigo-900 to-blue-700',
    'from-blue-700 to-sky-600',
    'from-sky-700 to-teal-600',
    'from-purple-800 to-indigo-700',
    'from-slate-800 to-zinc-700',
  ]

  return (
    <section id="categories" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-10">
      <Reveal>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs font-bold tracking-widest text-indigo-900 uppercase dark:text-sky-300">
              Danh mục tuyển chọn
            </span>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Khám Phá Theo Phong Cách
            </h2>
          </div>
          <Link
            to="/search"
            className="flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline dark:text-sky-300"
          >
            <span>Tất cả danh mục</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </Reveal>

      {/* Grid danh mục phong cách Shopee */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {categories.map(function (c, index) {
          const gradient = categoryGradients[index % categoryGradients.length]
          return (
            <button
              key={c.id}
              type="button"
              onClick={function () {
                props.onSelect(c)
              }}
              className="group relative flex flex-col items-center justify-between overflow-hidden rounded-3xl border border-sky-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-zinc-800/80"
            >
              <div
                className={
                  'flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md transition duration-300 group-hover:scale-110 ' +
                  gradient
                }
              >
                <Tag size={28} weight="fill" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-extrabold text-zinc-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-sky-300">
                  {c.name}
                </p>
                <span className="mt-1 inline-block text-[11px] font-medium text-zinc-400">
                  Xem ngay
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function ProductCard(props: { item: ProductSummaryResponse }) {
  const p = props.item
  const wishlist = useWishlist()
  const cart = useCart()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)

  const isFav = wishlist.isFavorited(p.id)
  const price = p.minPrice ?? 0
  const compareAt = price > 0 ? Math.round(price * 1.25) : 0
  const discount = calculateDiscountPercent(price, compareAt)
  const soldCount = 50 + (((p.name?.length ?? 5) * 13) % 200)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(function () {
      setToast(null)
    }, 2500)
  }

  function handleWishlistClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!wishlist.isLoggedIn) {
      void navigate('/login')
      return
    }
    if (p.id !== undefined) {
      wishlist.toggle.mutate(
        { data: { productId: p.id } },
        {
          onSuccess: function () {
            if (isFav) {
              showToast('Đã xóa khỏi danh sách yêu thích')
            }
            if (!isFav) {
              showToast('Đã thêm vào danh sách yêu thích')
            }
          },
        },
      )
    }
  }

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    void navigate('/product/' + p.id)
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-sky-100 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-100 dark:border-white/10 dark:bg-white/5 dark:hover:shadow-black/50">
      {/* Toast thông báo */}
      {toast !== null && (
        <div className="glass fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-bold shadow-lg">
          {toast}
        </div>
      )}

      <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <Link to={'/product/' + p.id}>
          <img
            src={imageUrl(p.defaultImageKey)}
            alt={p.name}
            loading="lazy"
            onError={function (e) {
              if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                e.currentTarget.src = PLACEHOLDER_IMAGE
              }
            }}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Shopee Badge Yêu Thích */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
          <Star size={10} weight="fill" />
          Yêu thích
        </div>

        {/* Shopee Badge Giảm Giá */}
        {discount > 0 && (
          <div className="absolute top-2.5 right-2.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-zinc-950 shadow">
            -{discount}%
          </div>
        )}

        {/* Nút tim lưu yêu thích kết nối API thật */}
        <button
          type="button"
          aria-label="Yêu thích"
          onClick={handleWishlistClick}
          className="glass absolute right-2.5 bottom-2.5 rounded-full p-2 transition hover:scale-110"
        >
          <Heart
            size={16}
            weight={isFav ? 'fill' : 'bold'}
            className={isFav ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-200'}
          />
        </button>
      </div>

      {/* Thông tin sản phẩm */}
      <div className="flex flex-1 flex-col p-4">
        <Link
          to={'/product/' + p.id}
          className="group-hover:text-blue-700 dark:group-hover:text-sky-300"
        >
          <h3 className="line-clamp-2 text-sm leading-snug font-bold text-zinc-900 dark:text-zinc-100">
            {p.name}
          </h3>
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-base font-extrabold text-blue-700 dark:text-sky-300">
            {price > 0 ? formatVnd(price) : 'Liên hệ'}
          </span>
          {compareAt > price && (
            <span className="text-xs text-zinc-400 line-through dark:text-zinc-500">
              {formatVnd(compareAt)}
            </span>
          )}
        </div>

        {/* Hàng thông số Shopee: Sao + Đã bán + Vị trí */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1">
            <Star size={12} weight="fill" className="text-amber-400" />
            <span className="font-bold text-zinc-700 dark:text-zinc-200">4.9</span>
            <span>·</span>
            <span>Đã bán {formatSoldCount(soldCount)}</span>
          </div>
          <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
            <MapPin size={11} />
            Hà Nội
          </span>
        </div>

        {/* Nút Thêm Giỏ / Xem Chi Tiết */}
        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={cart.addItem.isPending}
            className="btn-primary flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold shadow-md shadow-blue-500/15"
          >
            <ShoppingBag size={14} weight="fill" />
            <span>Chọn mua</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export function ProductGrid(props: { category: CategoryResponse | null; limit?: number }) {
  const limit = props.limit ?? 12
  const slug = props.category?.slug
  const searchQuery = useSearch({ category: slug, limit })
  const payload = searchQuery.data
  let items: ProductSummaryResponse[] = []
  let total = 0
  if (payload !== undefined) {
    const page = takeData(payload)
    items = page.items ?? []
    total = page.total ?? 0
  }
  let title = 'Gợi Ý Dành Riêng Cho Bạn'
  let seeAll = '/search'
  if (props.category !== null) {
    title = props.category.name ?? title
    seeAll = '/search?category=' + encodeURIComponent(slug ?? '')
  }

  return (
    <section id="shop" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold tracking-widest text-indigo-900 uppercase dark:text-sky-300">
              Bộ sưu tập thịnh hành
            </span>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
              {title}
            </h2>
          </div>
          <Link
            to={seeAll}
            className="flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline dark:text-sky-300"
          >
            Xem tất cả {total > 0 && '(' + total + ')'}
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </Reveal>
      {searchQuery.isPending && (
        <p className="mt-8 text-center text-sm text-zinc-500">Đang tải sản phẩm từ hệ thống…</p>
      )}
      {searchQuery.isError && (
        <p className="mt-8 text-center text-sm text-red-600">
          {hookErrorMessage('search', searchQuery.error)}
        </p>
      )}
      {searchQuery.isSuccess && items.length === 0 && (
        <p className="mt-8 text-center text-sm text-zinc-500">
          Danh mục này hiện chưa có sản phẩm.
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
        {items.map(function (p, i) {
          return (
            <Reveal key={p.id} delay={(i % 4) * 0.05}>
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
    'Miễn phí vận chuyển từ 500K',
    'Đổi trả 30 ngày tận nhà',
    'Chính hãng 100% kiểm duyệt',
    'Flash Sale giá tốt mỗi ngày',
    'Thanh toán COD khi nhận hàng',
  ]
  const repeated = [...items, ...items, ...items, ...items]
  return (
    <section className="overflow-hidden bg-gradient-to-r from-indigo-950 via-blue-900 to-sky-900 py-3 text-white">
      <div
        className="flex w-max shrink-0 items-center gap-12 text-xs font-bold tracking-widest uppercase"
        style={{ animation: 'marquee 25s linear infinite' }}
      >
        {repeated.map(function (t, i) {
          return (
            <span key={i} className="inline-flex shrink-0 items-center gap-3 whitespace-nowrap">
              <Sparkle size={12} weight="fill" className="shrink-0 text-sky-300" />
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
    <section className="mx-auto max-w-[1400px] px-4 py-12">
      <div className="glass overflow-hidden rounded-3xl border border-sky-100 p-8 md:p-12 dark:border-white/10">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-sky-300">
              Chất lượng vượt trội
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
              Thời Trang Basix <span className="text-gradient">Chuẩn Gu Giới Trẻ</span>
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600 dark:text-zinc-300">
              Mỗi sản phẩm trên sàn nét được chọn lọc kỹ lưỡng từ chất liệu cotton thoáng mát, đường
              may tỉ mỉ, form dáng hiện đại, mang lại sự tự tin và nét riêng cho phong cách của bạn.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-4 dark:bg-white/5">
                <Truck size={24} className="text-blue-700 dark:text-sky-300" />
                <div>
                  <p className="text-xs font-extrabold">Giao toàn quốc</p>
                  <p className="text-[11px] text-zinc-400">Kiểm tra trước khi trả</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-4 dark:bg-white/5">
                <ArrowsLeftRight size={24} className="text-indigo-700 dark:text-indigo-300" />
                <div>
                  <p className="text-xs font-extrabold">Đổi trả 30 ngày</p>
                  <p className="text-[11px] text-zinc-400">Không cần lý do</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-4 dark:bg-white/5">
                <ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-extrabold">Chính hãng 100%</p>
                  <p className="text-[11px] text-zinc-400">Đền bù 200% nếu giả</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-indigo-900 to-blue-800 p-8 text-white shadow-xl lg:col-span-5">
            <p className="text-xs font-bold tracking-widest text-sky-300 uppercase">
              Ưu đãi thành viên
            </p>
            <h3 className="mt-2 text-2xl font-extrabold">
              Đăng Ký Tài Khoản Nhận Ngay Voucher 50K
            </h3>
            <p className="mt-3 text-sm text-sky-100">
              Áp dụng cho đơn hàng đầu tiên của bạn tại bất kỳ gian hàng nào trên nét.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-indigo-950 shadow-md transition hover:bg-sky-50"
              >
                <span>Nhận ưu đãi ngay</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Testimonials() {
  const searchQuery = useSearch({ limit: 4 })
  let targetProductId = '154a782d-9b21-43ac-81c8-c47bcb8d6a62'
  let targetProductName = 'Áo thun oversize nét'

  if (searchQuery.data !== undefined) {
    const page = takeData(searchQuery.data)
    const items = page.items ?? []
    if (items.length > 0) {
      let matchedItem = items[0]
      for (const item of items) {
        if (item.name !== undefined && item.name.toLowerCase().includes('áo thun')) {
          matchedItem = item
          break
        }
      }
      if (matchedItem && matchedItem.id !== undefined) {
        targetProductId = matchedItem.id
      }
      if (matchedItem && matchedItem.name !== undefined) {
        targetProductName = matchedItem.name
      }
    }
  }

  const reviewsQuery = useList(targetProductId, {
    query: {
      enabled: targetProductId !== '',
    },
  })

  let realReviews: ReviewResponse[] = []
  if (reviewsQuery.data !== undefined) {
    realReviews = takeData(reviewsQuery.data)
  }

  if (realReviews.length === 0 && reviewsQuery.isPending === false) {
    return null
  }

  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-12">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs font-bold tracking-widest text-indigo-900 uppercase dark:text-sky-300">
            Người mua nói gì
          </span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Đánh Giá Thực Tế Từ Khách Hàng
          </h2>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {realReviews.slice(0, 3).map(function (rev) {
          const starsCount = rev.stars ?? 5
          const starArray = [1, 2, 3, 4, 5]
          const buyerName = rev.buyerDisplayName ?? 'Khách hàng nét'
          const reviewText = rev.comment ?? 'Sản phẩm chất lượng, đóng gói cẩn thận.'

          return (
            <figure
              key={rev.id}
              className="glass relative flex flex-col justify-between rounded-3xl p-6 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-amber-400">
                    {starArray.map(function (starNum) {
                      let isFilled = false
                      if (starNum <= starsCount) {
                        isFilled = true
                      }
                      if (isFilled) {
                        return <Star key={starNum} size={14} weight="fill" />
                      }
                      return (
                        <Star key={starNum} size={14} weight="regular" className="text-zinc-300" />
                      )
                    })}
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={13} weight="fill" />
                    Đã mua hàng
                  </span>
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                  “{reviewText}”
                </blockquote>
              </div>
              <figcaption className="mt-4 border-t border-zinc-100 pt-3 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={buyerName} size={32} />
                  <div>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                      {buyerName}
                    </p>
                    <p className="text-[11px] text-zinc-400">{targetProductName}</p>
                  </div>
                </div>
              </figcaption>
            </figure>
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
            <Link to={`/pages/${link.slug ?? ''}`} className="hover:text-white">
              {link.title}
            </Link>
          </li>
        )
      })}
    </>
  )
}

export function Footer() {
  const pagesQuery = useListPageLinks({ query: { staleTime: 5 * 60_000 } })
  let links: PublicPageLinkResponse[] = []
  if (pagesQuery.isSuccess) {
    links = takeData(pagesQuery.data)
  }
  const aboutLinks = links.filter((link) => link.footerGroup === 'ABOUT')
  const supportLinks = links.filter((link) => link.footerGroup === 'SUPPORT')
  const policyLinks = links.filter((link) => link.footerGroup === 'POLICY')

  return (
    <footer className="rounded-t-[2.5rem] bg-zinc-950 px-6 pt-12 pb-8 text-zinc-300 md:px-10">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-8 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <p className="text-2xl font-extrabold text-white">
            nét<span className="text-sky-400">.</span>
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Sàn thương mại điện tử thời trang đa gian hàng. Mặc đẹp là nét riêng của bạn.
          </p>
          <div className="mt-4 flex flex-col gap-1 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Headset size={16} /> Hotline: 1900 6868 · 028 3861 4613
            </span>
            <span>cskh@fashionstore.vn</span>
          </div>
          {aboutLinks.length > 0 && (
            <ul className="mt-3 space-y-2 text-xs">
              <FooterPageLinks links={aboutLinks} />
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm font-bold text-white">Chăm sóc khách hàng</p>
          <ul className="mt-3 space-y-2 text-xs">
            <li>
              <Link to="/search?q=chinh-sach" className="hover:text-white">
                Chính sách đổi trả 30 ngày
              </Link>
            </li>
            <li>
              <Link to="/search?q=van-chuyen" className="hover:text-white">
                Chính sách vận chuyển
              </Link>
            </li>
            <li>
              <Link to="/search?q=huong-dan" className="hover:text-white">
                Hướng dẫn mua hàng
              </Link>
            </li>
            <li>
              <Link to="/account#orders" className="hover:text-white">
                Tra cứu đơn hàng
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold text-white">Về nét</p>
          <ul className="mt-3 space-y-2 text-xs">
            <li>
              <Link to="/search?q=gioi-thieu" className="hover:text-white">
                Giới thiệu về nét
              </Link>
            </li>
            <li>
              <Link to="/account#seller-channel" className="hover:text-white">
                Bán hàng cùng nét (Kênh người bán)
              </Link>
            </li>
            <li>
              <Link to="/search?q=chinh-hang" className="hover:text-white">
                Cam kết hàng chính hãng
              </Link>
            </li>
            {aboutLinks.length > 0 && <FooterPageLinks links={aboutLinks} />}
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold text-white">Hỗ trợ &amp; Chính sách</p>
          <ul className="mt-3 space-y-2 text-xs">
            <li>
              <Link to="/faq" className="hover:text-white">
                Câu hỏi thường gặp (FAQ)
              </Link>
            </li>
            {supportLinks.length > 0 && <FooterPageLinks links={supportLinks} />}
            {policyLinks.length > 0 && <FooterPageLinks links={policyLinks} />}
          </ul>
        </div>

        <div>
          <p className="text-sm font-bold text-white">Thanh toán &amp; Vận chuyển</p>
          <div className="mt-3 space-y-2 text-xs text-zinc-400">
            <p className="flex items-center gap-1.5">
              <CreditCard size={15} /> COD (Nhận hàng thanh toán)
            </p>
            <p className="flex items-center gap-1.5">
              <Truck size={15} /> Giao hàng hỏa tốc toàn quốc
            </p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck size={15} /> Bảo vệ người mua 100%
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-[1400px] flex-wrap items-center justify-between border-t border-white/10 pt-6 text-xs text-zinc-500">
        <p>© 2026 nét Marketplace. Bản quyền thuộc về Công ty TNHH Thời Trang Nét.</p>
        <p>Hệ thống phục vụ toàn quốc · Đã đăng ký Bộ Công Thương</p>
      </div>
    </footer>
  )
}
