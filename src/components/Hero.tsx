import { ArrowRight, Sparkle } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

export default function Hero() {
  const reduce = useReducedMotion()
  const initial = reduce ? false : { opacity: 0, y: 28 }

  return (
    <section id="top" className="relative scroll-mt-24 overflow-hidden pt-[76px]">
      <div className="hero-blob top-24 left-[-120px] h-96 w-96 bg-indigo-900/40" />
      <div className="hero-blob top-40 right-[-100px] h-[28rem] w-[28rem] bg-sky-400/50" />
      <div className="hero-blob top-[420px] left-1/3 h-72 w-72 bg-blue-300/40" />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-4 pt-6 pb-12 lg:grid-cols-2 lg:pt-10">
        <motion.div
          initial={initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-indigo-900 uppercase dark:text-indigo-200">
            <Sparkle size={14} weight="fill" />
            Bộ sưu tập thu đông 2026
          </p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold tracking-tighter md:text-5xl lg:text-6xl">
            Mặc đẹp là
            <br />
            <span className="text-gradient">nét riêng</span> của bạn
          </h1>
          <p className="mt-4 max-w-[45ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            Basics phối sẵn từ Uniqlo-gọn, năng động kiểu Adidas, giá săn sale như AliExpress.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#shop"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              Mua ngay
              <ArrowRight size={16} weight="bold" />
            </a>
            <a
              href="#categories"
              className="glass inline-flex items-center rounded-full px-7 py-3.5 text-sm font-semibold text-zinc-800 dark:text-white"
            >
              Khám phá
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-white">12k+</p>
              <p>khách đã mua</p>
            </div>
            <div className="h-10 w-px bg-zinc-200 dark:bg-white/15" />
            <div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-white">4.9/5</p>
              <p>đánh giá thật</p>
            </div>
            <div className="h-10 w-px bg-zinc-200 dark:bg-white/15" />
            <div>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-white">30 ngày</p>
              <p>đổi trả free</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="relative"
        >
          <img
            src="https://picsum.photos/seed/net-hero/900/1100"
            alt="Người mẫu mặc đồ nét"
            width={900}
            height={1100}
            className="h-[480px] w-full rounded-3xl object-cover shadow-2xl shadow-blue-300/40 lg:h-[560px]"
          />
          <div className="glass absolute right-5 bottom-5 left-5 flex items-center gap-4 rounded-3xl p-4 md:right-auto md:left-8">
            <img
              src="https://picsum.photos/seed/net-mini/200/200"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-2xl object-cover"
            />
            <div>
              <p className="text-sm font-bold">Áo thun oversize nét</p>
              <p className="text-sm font-bold text-blue-700 dark:text-sky-300">391.000 ₫</p>
            </div>
            <span className="ml-4 rounded-full bg-gradient-to-r from-indigo-900 to-sky-400 px-3 py-1 text-xs font-bold text-white">
              Mới
            </span>
          </div>
          <div className="glass absolute -top-4 right-6 rounded-full px-4 py-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
            Free ship đơn từ 500K
          </div>
        </motion.div>
      </div>
    </section>
  )
}
