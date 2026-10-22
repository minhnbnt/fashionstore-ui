import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useSearch } from '@generated/endpoints/search/search'
import { ArrowRight, Fire, Lightning } from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { calculateDiscountPercent, formatVnd } from '@/lib/format'

import type { ProductSummaryResponse } from '@generated/model/productSummaryResponse'

export default function FlashSale() {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 12 })

  useEffect(function () {
    const timer = setInterval(function () {
      setTimeLeft(function (prev) {
        if (prev.seconds > 0) {
          return { hours: prev.hours, minutes: prev.minutes, seconds: prev.seconds - 1 }
        }
        if (prev.minutes > 0) {
          return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 }
        }
        if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return { hours: 2, minutes: 0, seconds: 0 }
      })
    }, 1000)

    return function () {
      clearInterval(timer)
    }
  }, [])

  const searchQuery = useSearch({ limit: 6 })
  let items: ProductSummaryResponse[] = []
  if (searchQuery.data !== undefined) {
    const page = takeData(searchQuery.data)
    items = page.items ?? []
  }

  if (items.length === 0 && searchQuery.isLoading === false) {
    return null
  }

  const hoursStr = String(timeLeft.hours).padStart(2, '0')
  const minutesStr = String(timeLeft.minutes).padStart(2, '0')
  const secondsStr = String(timeLeft.seconds).padStart(2, '0')

  return (
    <section id="flash-sale" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-8">
      <div className="rounded-3xl border border-orange-200/60 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-6 shadow-sm dark:border-orange-500/20 dark:bg-orange-950/20">
        {/* Header Flash Sale */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-3.5 py-1 text-sm font-extrabold text-white shadow-md shadow-orange-500/30">
              <Lightning size={16} weight="fill" />
              <span>FLASH SALE</span>
            </div>
            {/* Đồng hồ đếm ngược */}
            <div className="flex items-center gap-1 text-xs font-extrabold text-zinc-900 dark:text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                {hoursStr}
              </span>
              <span>:</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                {minutesStr}
              </span>
              <span>:</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                {secondsStr}
              </span>
            </div>
          </div>
          <Link
            to="/search"
            className="flex items-center gap-1 text-sm font-bold text-orange-600 transition hover:underline dark:text-orange-400"
          >
            <span>Xem tất cả</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>

        {/* Lưới sản phẩm Flash Sale */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {items.map(function (p, index) {
            const price = p.minPrice ?? 0
            const compareAt = price > 0 ? Math.round(price * 1.3) : 0
            const discount = calculateDiscountPercent(price, compareAt)
            const soldCount = 20 + ((index * 17) % 70)

            return (
              <Link
                key={p.id}
                to={'/product/' + p.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white/90 p-2.5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-zinc-800/80"
              >
                {/* Badge giảm giá */}
                {discount > 0 && (
                  <div className="absolute top-2 right-2 z-10 rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                    -{discount}%
                  </div>
                )}

                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-700">
                  <img
                    src={imageUrl(p.defaultImageKey)}
                    alt={p.name}
                    loading="lazy"
                    onError={function (e) {
                      if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
                        e.currentTarget.src = PLACEHOLDER_IMAGE
                      }
                    }}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="mt-2.5 flex flex-1 flex-col">
                  <p className="line-clamp-1 text-xs font-bold text-zinc-800 dark:text-zinc-100">
                    {p.name}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-red-600 dark:text-red-400">
                    {formatVnd(price)}
                  </p>

                  {/* Thanh tiến độ bán chạy Shopee */}
                  <div className="mt-auto pt-2">
                    <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                        style={{ width: `${Math.min(100, soldCount * 1.2)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-orange-950 uppercase dark:text-orange-200">
                        <Fire size={10} weight="fill" className="mr-0.5 inline text-red-500" />
                        Đã bán {soldCount}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
