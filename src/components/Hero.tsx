import { Link } from 'react-router'

import { useSearch } from '@generated/endpoints/search/search'
import {
  ArrowRight,
  ArrowsLeftRight,
  ShieldCheck,
  ShoppingBag,
  Sparkle,
  Truck,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

import { imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'

export default function Hero() {
  const reduce = useReducedMotion()
  const initial = reduce ? false : { opacity: 0, y: 28 }

  const searchQuery = useSearch({ limit: 3 })
  let featuredProducts: ProductSummaryResponse[] = []
  if (searchQuery.data !== undefined) {
    const page = takeData(searchQuery.data)
    featuredProducts = page.items ?? []
  }

  const mainProduct = featuredProducts[0] ?? null
  const subProduct = featuredProducts[1] ?? null

  return (
    <section id="top" className="relative scroll-mt-24 overflow-hidden pt-32 lg:pt-36">
      <div
        className="absolute top-24 -left-28 h-96 w-96 rounded-full bg-indigo-900/40 pointer-events-none -z-10"
        style={{ filter: 'blur(90px)', borderRadius: '9999px' }}
      />
      <div
        className="absolute top-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-sky-400/35 pointer-events-none -z-10"
        style={{ filter: 'blur(90px)', borderRadius: '9999px' }}
      />
      <div
        className="absolute top-[420px] left-1/3 h-72 w-72 rounded-full bg-blue-300/30 pointer-events-none -z-10"
        style={{ filter: 'blur(90px)', borderRadius: '9999px' }}
      />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-4 pt-4 pb-8 lg:grid-cols-12 lg:pt-6">
        {/* Cột trái: Headline & Call To Action */}
        <motion.div
          initial={initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6"
        >
          <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-indigo-900 uppercase dark:text-indigo-200">
            <Sparkle size={14} weight="fill" />
            Sàn Thời Trang nét Chuẩn Gu
          </p>
          <h1 className="mt-4 text-4xl leading-[1.08] font-extrabold tracking-tighter sm:text-5xl lg:text-6xl">
            Mặc đẹp là
            <br />
            <span className="text-gradient">nét riêng</span> của bạn
          </h1>
          <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            Mua sắm quần áo, váy đầm, áo khoác chính hãng từ các local brand uy tín. Trải nghiệm săn
            deal Flash Sale mỗi ngày và đổi trả dễ dàng.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#shop"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold shadow-lg shadow-blue-500/20"
            >
              Mua sắm ngay
              <ArrowRight size={16} weight="bold" />
            </a>
            <a
              href="#flash-sale"
              className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-zinc-800 transition hover:bg-white/80 dark:text-white dark:hover:bg-white/10"
            >
              Săn Flash Sale
            </a>
          </div>

          {/* Cam kết sàn nét */}
          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-sky-100 pt-6 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-sky-300">
                <ShieldCheck size={20} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-zinc-900 dark:text-white">
                  100% Chính hãng
                </p>
                <p className="text-[11px] text-zinc-500">Kiểm duyệt kỹ càng</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                <Truck size={20} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-zinc-900 dark:text-white">
                  Giao hàng COD
                </p>
                <p className="text-[11px] text-zinc-500">Được xem hàng</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                <ArrowsLeftRight size={20} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-zinc-900 dark:text-white">
                  Đổi trả 30 ngày
                </p>
                <p className="text-[11px] text-zinc-500">Thủ tục nhanh gọn</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Cột phải: Shopee-style Banner Showcase lấy từ CSDL */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-12 lg:col-span-6"
        >
          {/* Main Product Banner (8 cols) */}
          <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-xl shadow-blue-500/10 sm:col-span-7 md:col-span-8 dark:border-white/10 dark:bg-zinc-800">
            {mainProduct !== null && (
              <Link to={'/product/' + mainProduct.id} className="group block">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-700">
                  <img
                    src={imageUrl(mainProduct.defaultImageKey)}
                    alt={mainProduct.name}
                    onError={function (e) {
                      if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                        e.currentTarget.src = PLACEHOLDER_IMAGE
                      }
                    }}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="glass absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                    Bán chạy nhất
                  </span>
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-extrabold text-zinc-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-sky-300">
                    {mainProduct.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-base font-extrabold text-blue-700 dark:text-sky-300">
                      {mainProduct.minPrice !== undefined && mainProduct.minPrice !== null
                        ? formatVnd(mainProduct.minPrice)
                        : 'Liên hệ'}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-white/10 dark:text-sky-300">
                      <ShoppingBag size={13} weight="fill" />
                      Chi tiết
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* Sub Banner Stack (4 cols) */}
          <div className="flex flex-col gap-4 sm:col-span-5 md:col-span-4">
            {subProduct !== null && (
              <Link
                to={'/product/' + subProduct.id}
                className="group relative flex-1 overflow-hidden rounded-3xl border border-sky-100 bg-white p-3 shadow-md transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-zinc-800"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-700">
                  <img
                    src={imageUrl(subProduct.defaultImageKey)}
                    alt={subProduct.name}
                    onError={function (e) {
                      if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                        e.currentTarget.src = PLACEHOLDER_IMAGE
                      }
                    }}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute top-2 left-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    Deal Hot
                  </span>
                </div>
                <p className="mt-2 truncate text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  {subProduct.name}
                </p>
                <p className="text-xs font-extrabold text-orange-600 dark:text-orange-400">
                  {subProduct.minPrice !== undefined && subProduct.minPrice !== null
                    ? formatVnd(subProduct.minPrice)
                    : 'Liên hệ'}
                </p>
              </Link>
            )}

            {/* Banner Khuyến Mãi Phụ */}
            <div className="flex flex-1 flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-900 to-blue-800 p-4 text-white shadow-md">
              <div>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                  Ưu đãi nét
                </span>
                <p className="mt-2 text-sm leading-snug font-extrabold">Free ship đơn từ 500K</p>
                <p className="mt-1 text-xs text-sky-200">Áp dụng cho mọi gian hàng</p>
              </div>
              <a
                href="#shop"
                className="mt-3 flex items-center justify-between rounded-full bg-white px-3 py-1.5 text-xs font-bold text-indigo-950 transition hover:bg-sky-50"
              >
                <span>Xem ngay</span>
                <ArrowRight size={12} weight="bold" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
