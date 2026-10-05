import { ArrowRight, Sparkle } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'

export default function Hero() {
  const reduce = useReducedMotion()
  const initial = reduce ? false : { opacity: 0, y: 28 }

  return (
    <section id="top" className="relative overflow-hidden pt-24">
      <div className="hero-blob top-24 left-[-120px] h-96 w-96 bg-purple-400/50" />
      <div className="hero-blob top-40 right-[-100px] h-[28rem] w-[28rem] bg-pink-400/50" />
      <div className="hero-blob top-[420px] left-1/3 h-72 w-72 bg-fuchsia-300/40" />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-4 pt-10 pb-16 lg:grid-cols-2 lg:pt-16">
        <motion.div
          initial={initial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-purple-700 uppercase">
            <Sparkle size={14} weight="fill" />
            Bộ sưu tập thu đông 2026
          </p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold tracking-tighter md:text-5xl lg:text-6xl">
            Mặc đẹp là
            <br />
            <span className="text-gradient">nét riêng</span> của bạn
          </h1>
          <p className="mt-4 max-w-[45ch] text-base leading-relaxed text-zinc-600">
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
              className="glass inline-flex items-center rounded-full px-7 py-3.5 text-sm font-semibold text-zinc-800"
            >
              Khám phá
            </a>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-zinc-600">
            <div>
              <p className="text-xl font-extrabold text-zinc-900">12k+</p>
              <p>khách đã mua</p>
            </div>
            <div className="h-10 w-px bg-zinc-200" />
            <div>
              <p className="text-xl font-extrabold text-zinc-900">4.9/5</p>
              <p>đánh giá thật</p>
            </div>
            <div className="h-10 w-px bg-zinc-200" />
            <div>
              <p className="text-xl font-extrabold text-zinc-900">30 ngày</p>
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
            className="h-[480px] w-full rounded-3xl object-cover shadow-2xl shadow-purple-300/40 lg:h-[560px]"
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
              <p className="text-sm font-bold text-pink-600">391.000 ₫</p>
            </div>
            <span className="ml-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-bold text-white">
              Mới
            </span>
          </div>
          <div className="glass absolute -top-4 right-6 rounded-full px-4 py-2 text-xs font-bold text-purple-700">
            Free ship đơn từ 500K
          </div>
        </motion.div>
      </div>
    </section>
  )
}
