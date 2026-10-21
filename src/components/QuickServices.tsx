import { Link } from 'react-router'

import {
  ArrowsLeftRight,
  Coins,
  Fire,
  Gift,
  ShieldCheck,
  Sparkle,
  Tag,
  Truck,
} from '@phosphor-icons/react'

interface ServiceItem {
  icon: typeof Tag
  label: string
  link: string
  color: string
}

const SERVICES: ServiceItem[] = [
  {
    icon: Fire,
    label: 'Flash Sale',
    link: '#flash-sale',
    color: 'from-orange-500 to-amber-500 text-white',
  },
  {
    icon: Tag,
    label: 'Mã Giảm Giá',
    link: '#shop',
    color: 'from-rose-500 to-pink-500 text-white',
  },
  {
    icon: Truck,
    label: 'Freeship Xtra',
    link: '#shop',
    color: 'from-emerald-500 to-teal-500 text-white',
  },
  {
    icon: ShieldCheck,
    label: 'nét Mall',
    link: '/search',
    color: 'from-blue-600 to-indigo-600 text-white',
  },
  {
    icon: Sparkle,
    label: 'Hàng Mới Về',
    link: '#shop',
    color: 'from-violet-500 to-purple-600 text-white',
  },
  {
    icon: ArrowsLeftRight,
    label: 'Đổi Trả 30D',
    link: '/search?q=chinh-sach',
    color: 'from-cyan-500 to-blue-500 text-white',
  },
  {
    icon: Coins,
    label: 'Ưu Đãi Xu',
    link: '/account',
    color: 'from-amber-400 to-yellow-500 text-white',
  },
  {
    icon: Gift,
    label: 'Quà Tặng nét',
    link: '#shop',
    color: 'from-fuchsia-500 to-rose-500 text-white',
  },
]

export default function QuickServices() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="glass grid grid-cols-4 gap-3 rounded-3xl p-4 sm:grid-cols-4 md:grid-cols-8 md:p-6">
        {SERVICES.map(function (s) {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              to={s.link}
              className="group flex flex-col items-center text-center transition hover:-translate-y-1"
            >
              <div
                className={
                  'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md transition group-hover:scale-110 md:h-14 md:w-14 ' +
                  s.color
                }
              >
                <Icon size={24} weight="fill" />
              </div>
              <span className="mt-2 text-xs font-semibold text-zinc-700 transition group-hover:text-blue-700 dark:text-zinc-300 dark:group-hover:text-sky-300">
                {s.label}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
