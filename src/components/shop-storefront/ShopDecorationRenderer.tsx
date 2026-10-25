import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  CaretLeft,
  CaretRight,
  Lightning,
  Sparkle,
  Ticket,
  SquaresFour,
  ArrowRight,
} from '@phosphor-icons/react'

import { imageUrl, PLACEHOLDER_IMAGE } from '@/lib/apiAdapters'
import { formatVnd } from '@/lib/format'

import type { DecorationBlock } from '@/types/seller'

interface ShopDecorationRendererProps {
  blocks: DecorationBlock[]
}

function BannerSliderBlock({ block }: { block: DecorationBlock }) {
  const banners = block.banners ?? []
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % banners.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [banners.length])

  if (banners.length === 0) {
    return null
  }

  const activeBanner = banners[currentIdx] ?? banners[0]
  const imageSrc =
    activeBanner.imageKey !== ''
      ? activeBanner.imageKey.startsWith('http')
        ? activeBanner.imageKey
        : imageUrl(activeBanner.imageKey)
      : PLACEHOLDER_IMAGE

  return (
    <div className="relative overflow-hidden rounded-3xl bg-zinc-900 shadow-md">
      <div className="relative aspect-[3/1] min-h-[180px] w-full overflow-hidden">
        {activeBanner.linkUrl && (
          <Link to={activeBanner.linkUrl} className="block h-full w-full">
            <img
              src={imageSrc}
              alt={activeBanner.title ?? block.title}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </Link>
        )}
        {!activeBanner.linkUrl && (
          <img
            src={imageSrc}
            alt={activeBanner.title ?? block.title}
            className="h-full w-full object-cover"
          />
        )}

        {/* Title overlay if title exists */}
        {activeBanner.title && (
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 text-white">
            <h3 className="text-lg font-bold drop-shadow-md sm:text-2xl">{activeBanner.title}</h3>
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setCurrentIdx((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Previous banner"
          >
            <CaretLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIdx((prev) => (prev + 1) % banners.length)}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Next banner"
          >
            <CaretRight size={20} />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <div className="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5">
          {banners.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIdx ? 'w-6 bg-white shadow' : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCollectionBlock({ block }: { block: DecorationBlock }) {
  let badgeText = 'MỚI NHẤT'
  if (block.collectionType === 'BEST_SELLER') {
    badgeText = 'BÁN CHẠY NHẤT'
  }
  if (block.collectionType === 'SALE_OFF') {
    badgeText = 'GIẢM GIÁ SÂU'
  }
  if (block.collectionType === 'CUSTOM') {
    badgeText = 'TUYỂN CHỌN'
  }

  // Demo showcase items representing live collection preview
  const sampleProducts = [
    {
      id: 'demo-1',
      name: 'Áo Thun Cotton Nét Oversize Form Rộng',
      price: 249000,
      originalPrice: 350000,
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80',
    },
    {
      id: 'demo-2',
      name: 'Sơ Mi Lụa Hàn Quốc Thiết Kế Tối Giản',
      price: 389000,
      originalPrice: 490000,
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&q=80',
    },
    {
      id: 'demo-3',
      name: 'Quần Khaki Slim-fit Co Giãn 4 Chiều Cao Cấp',
      price: 450000,
      originalPrice: 590000,
      image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&q=80',
    },
    {
      id: 'demo-4',
      name: 'Áo Khoác Blazer Nam Nữ Phong Cách Hàn',
      price: 690000,
      originalPrice: 890000,
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80',
    },
  ]

  const limit = block.itemLimit ?? 4
  const displayItems = sampleProducts.slice(0, Math.min(limit, sampleProducts.length))

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <Sparkle size={14} weight="fill" />
            {badgeText}
          </span>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{block.title}</h2>
        </div>

        <Link
          to="/search"
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Xem tất cả ({limit})
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {displayItems.map((prod) => (
          <div
            key={prod.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-white/10">
              <img
                src={prod.image}
                alt={prod.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute top-2 right-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                -{Math.round((1 - prod.price / prod.originalPrice) * 100)}%
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-between p-3">
              <h4 className="line-clamp-2 text-xs font-semibold text-zinc-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-indigo-400">
                {prod.name}
              </h4>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  {formatVnd(prod.price)}
                </span>
                <span className="text-[11px] text-zinc-400 line-through">
                  {formatVnd(prod.originalPrice)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FlashSaleBlock({ block }: { block: DecorationBlock }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-5 text-white shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightning size={24} weight="fill" className="animate-pulse text-yellow-300" />
          <h2 className="text-lg font-extrabold tracking-wide uppercase sm:text-xl">
            {block.title || 'FLASH SALE GIỜ VÀNG'}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold">
          <span className="rounded bg-black/60 px-2 py-1 text-yellow-300">02</span> :
          <span className="rounded bg-black/60 px-2 py-1 text-yellow-300">45</span> :
          <span className="rounded bg-black/60 px-2 py-1 text-yellow-300">19</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white p-2.5 text-zinc-900 shadow-sm dark:bg-[#11182a] dark:text-white"
          >
            <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-white/10">
              <img
                src={`https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80`}
                alt="Flash sale product"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white">
                Đã bán 89%
              </span>
            </div>
            <p className="truncate text-xs font-semibold">Ưu Đãi Đặc Biệt #{i}</p>
            <span className="text-sm font-extrabold text-red-600">{formatVnd(199000)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoryGridBlock({ block }: { block: DecorationBlock }) {
  const categories = [
    { title: 'Áo Thun & Polo', icon: '👕', link: '/search?category=ao-thun' },
    { title: 'Sơ Mi & Công Sở', icon: '👔', link: '/search?category=ao-so-mi' },
    { title: 'Váy & Đầm Nữ', icon: '👗', link: '/search?category=vay-dam' },
    { title: 'Quần Jeans & Khaki', icon: '👖', link: '/search?category=quan-jeans' },
    { title: 'Áo Khoác & Blazer', icon: '🧥', link: '/search?category=ao-khoac' },
    { title: 'Phụ Kiện Thời Trang', icon: '👜', link: '/search?category=phu-kien' },
  ]

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
      <div className="flex items-center gap-2">
        <SquaresFour size={20} className="text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {block.title || 'Danh Mục Nổi Bật Của Shop'}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.title}
            to={c.link}
            className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-4 text-center transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <span className="text-2xl">{c.icon}</span>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {c.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function VoucherCarouselBlock({ block }: { block: DecorationBlock }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const vouchers = [
    { id: 'v1', code: 'NET20K', discount: 'Giảm 20.000₫', minOrder: 'Đơn từ 200.000₫' },
    { id: 'v2', code: 'NET50K', discount: 'Giảm 50.000₫', minOrder: 'Đơn từ 450.000₫' },
    { id: 'v3', code: 'FREESHIP', discount: 'Miễn phí vận chuyển', minOrder: 'Đơn từ 300.000₫' },
  ]

  const handleCopy = (id: string) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
      <div className="flex items-center gap-2">
        <Ticket size={20} className="text-rose-600 dark:text-rose-400" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {block.title || 'Mã Giảm Giá Độc Quyền Của Gian Hàng'}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {vouchers.map((v) => {
          const isCopied = copiedId === v.id
          return (
            <div
              key={v.id}
              className="relative flex items-center justify-between rounded-2xl border border-dashed border-rose-300 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/20"
            >
              <div>
                <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                  {v.code}
                </span>
                <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                  {v.discount}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{v.minOrder}</p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(v.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  isCopied && 'bg-emerald-600 text-white'
                } ${!isCopied && 'btn-primary'}`}
              >
                {isCopied && 'Đã lưu'}
                {!isCopied && 'Lưu mã'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ShopDecorationRenderer({ blocks }: ShopDecorationRendererProps) {
  const activeBlocks = blocks.filter((b) => b.enabled)

  if (activeBlocks.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center text-zinc-400 dark:border-white/10 dark:bg-white/5">
        <p className="text-sm">Gian hàng đang cập nhật trang trí giao diện mới.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {activeBlocks.map((b) => {
        if (b.type === 'BANNER_SLIDER') {
          return <BannerSliderBlock key={b.id} block={b} />
        }
        if (b.type === 'PRODUCT_COLLECTION' || b.type === 'COLLECTION') {
          return <ProductCollectionBlock key={b.id} block={b} />
        }
        if (b.type === 'FLASH_SALE') {
          return <FlashSaleBlock key={b.id} block={b} />
        }
        if (b.type === 'CATEGORY_GRID') {
          return <CategoryGridBlock key={b.id} block={b} />
        }
        if (b.type === 'VOUCHER_CAROUSEL') {
          return <VoucherCarouselBlock key={b.id} block={b} />
        }
        if (b.type === 'BANNER') {
          return <BannerSliderBlock key={b.id} block={b} />
        }
        return null
      })}
    </div>
  )
}
