import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useListBanners } from '@generated/endpoints/site-content/site-content'
import { CaretLeft, CaretRight, Pause, Play } from '@phosphor-icons/react'
import { useReducedMotion } from 'motion/react'

import { imageUrl, PLACEHOLDER_IMAGE, takeData } from '@/lib/apiAdapters'
import { isInternalLink } from '@/lib/siteContent'

import type { PublicBannerResponse } from '@generated/model/publicBannerResponse'

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE
  }
}

const AUTOPLAY_MS = 5000
const CONTENT_STALE_MS = 5 * 60_000

function BannerLink({
  banner,
  className,
  children,
}: {
  banner: PublicBannerResponse
  className: string
  children: React.ReactNode
}) {
  const link = banner.linkUrl ?? ''
  if (link === '') {
    return <div className={className}>{children}</div>
  }
  if (isInternalLink(link)) {
    return (
      <Link to={link} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}

function BannerPicture({
  banner,
  width,
  height,
  className,
  eager,
}: {
  banner: PublicBannerResponse
  width: number
  height: number
  className: string
  eager: boolean
}) {
  const mobileKey = banner.mobileImageKey ?? ''
  let loading: 'eager' | 'lazy' = 'lazy'
  if (eager) {
    loading = 'eager'
  }
  return (
    <picture>
      {mobileKey !== '' && <source media="(max-width: 767px)" srcSet={imageUrl(mobileKey)} />}
      <img
        src={imageUrl(banner.imageKey)}
        alt={banner.title ?? ''}
        width={width}
        height={height}
        loading={loading}
        onError={handleImageError}
        className={className}
      />
    </picture>
  )
}

/** Carousel HOME_CAROUSEL ngay dưới hero; không có banner nào đang chạy thì không chiếm chỗ. */
export function BannerCarousel() {
  const reduce = useReducedMotion()
  const query = useListBanners(
    { placement: 'HOME_CAROUSEL' },
    { query: { staleTime: CONTENT_STALE_MS } },
  )
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  let banners: PublicBannerResponse[] = []
  if (query.isSuccess) {
    banners = takeData(query.data)
  }
  const count = banners.length

  useEffect(
    function () {
      if (count < 2 || paused || reduce === true) {
        return
      }
      const timer = window.setInterval(function () {
        setIndex((current) => (current + 1) % count)
      }, AUTOPLAY_MS)
      return () => window.clearInterval(timer)
    },
    [count, paused, reduce],
  )

  if (count === 0) {
    return null
  }

  const current = banners[index % count]
  if (current === undefined) {
    return null
  }

  function go(step: number) {
    setIndex((value) => (value + step + count) % count)
  }

  // Nội dung tự chạy > 5 giây phải có nút dừng (WCAG 2.2.2).
  const autoplay = reduce !== true
  let pauseLabel = 'Dừng tự chuyển banner'
  if (paused) {
    pauseLabel = 'Tiếp tục tự chuyển banner'
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Khuyến mãi nổi bật"
      className="mx-auto max-w-[1400px] px-4 pb-6"
    >
      <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-blue-300/30 dark:shadow-none">
        <BannerLink banner={current} className="block">
          <BannerPicture
            banner={current}
            width={1500}
            height={500}
            eager
            className="aspect-[4/3] w-full bg-zinc-100 object-cover md:aspect-[3/1] dark:bg-white/5"
          />
        </BannerLink>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Banner trước"
              className="glass absolute top-1/2 left-3 -translate-y-1/2 rounded-full p-2.5 text-zinc-900 dark:text-white"
            >
              <CaretLeft size={18} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Banner sau"
              className="glass absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-2.5 text-zinc-900 dark:text-white"
            >
              <CaretRight size={18} weight="bold" />
            </button>
            {autoplay && (
              <button
                type="button"
                onClick={() => setPaused(paused === false)}
                aria-label={pauseLabel}
                className="glass absolute right-3 bottom-3 rounded-full p-2 text-zinc-900 dark:text-white"
              >
                {paused && <Play size={14} weight="fill" />}
                {paused === false && <Pause size={14} weight="fill" />}
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {banners.map(function (banner, dot) {
                let dotClass = 'h-2 w-2 rounded-full bg-white/60 transition-all'
                if (dot === index % count) {
                  dotClass = 'h-2 w-6 rounded-full bg-white transition-all'
                }
                return (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setIndex(dot)}
                    aria-label={`Xem banner ${dot + 1}`}
                    aria-current={dot === index % count}
                    className={dotClass}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/** Dải HOME_STRIP giữa trang chủ, lưới 2 cột từ md. */
export function BannerStrip() {
  const query = useListBanners(
    { placement: 'HOME_STRIP' },
    { query: { staleTime: CONTENT_STALE_MS } },
  )
  if (query.isSuccess === false) {
    return null
  }
  const banners = takeData(query.data)
  if (banners.length === 0) {
    return null
  }

  let gridClass = 'grid grid-cols-1 gap-4'
  if (banners.length > 1) {
    gridClass = 'grid grid-cols-1 gap-4 md:grid-cols-2'
  }

  return (
    <section aria-label="Ưu đãi" className="mx-auto max-w-[1400px] px-4 py-8">
      <div className={gridClass}>
        {banners.map(function (banner) {
          return (
            <BannerLink
              key={banner.id}
              banner={banner}
              className="block overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <BannerPicture
                banner={banner}
                width={1200}
                height={300}
                eager={false}
                className="aspect-[4/1] w-full bg-zinc-100 object-cover dark:bg-white/5"
              />
            </BannerLink>
          )
        })}
      </div>
    </section>
  )
}
