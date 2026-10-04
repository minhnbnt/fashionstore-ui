import { useRef } from 'react'
import { BadgeCheck, ChevronLeft, ChevronRight, Truck, Undo2 } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import type { Product } from '@/lib/api'
import { CATEGORIES, categoryOf, isBestseller } from '@/lib/catalog'
import { resolveImageUrl } from '@/lib/format'
import ShopCard from '@/components/storefront/ShopCard'

const HERO_IMAGE =
  'https://images.pexels.com/photos/1488470/pexels-photo-1488470.jpeg?auto=compress&cs=tinysrgb&w=1600'
const BANNER_IMAGE =
  'https://images.pexels.com/photos/1082526/pexels-photo-1082526.jpeg?auto=compress&cs=tinysrgb&w=1600'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-muted">
      <img
        src={HERO_IMAGE}
        alt="Bộ sưu tập thời trang tối giản mới"
        loading="eager"
        width={1600}
        height={900}
        className="h-105 w-full object-cover md:h-130"
      />
      <div className="absolute inset-0 flex items-center bg-primary/40">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-sm font-medium tracking-widest text-primary-foreground/80 uppercase">
            Bộ sưu tập mới
          </p>
          <h1 className="mt-2 max-w-xl font-display text-4xl leading-tight text-primary-foreground md:text-6xl">
            Mặc đẹp mỗi ngày, tối giản mà sang
          </h1>
          <div className="mt-6 flex gap-3">
            <Button asChild size="lg">
              <a href="#san-pham">Mua ngay</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/?cat=vay-dam">Khám phá</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function tileImage(categoryId: string, products: Product[]) {
  const found = products.find((product) => categoryOf(product) === categoryId)
  if (found === undefined) {
    return null
  }
  return resolveImageUrl(found.imageKey)
}

export function CategoryTiles({ products }: { products: Product[] }) {
  return (
    <section aria-label="Danh mục" className="mx-auto w-full max-w-6xl px-6 pt-12">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CATEGORIES.slice(0, 4).map((category) => {
          const image = tileImage(category.id, products)
          return (
            <Link
              key={category.id}
              to={`/?cat=${category.id}`}
              className="group relative overflow-hidden border border-border"
            >
              {image !== null && (
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  width={800}
                  height={800}
                  className="aspect-square w-full object-cover"
                />
              )}
              {image === null && <div className="aspect-square bg-muted" aria-hidden="true" />}
              <span className="absolute inset-x-0 bottom-0 bg-primary/60 px-4 py-3 font-display text-lg text-primary-foreground">
                {category.label}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export function BestsellerCarousel({
  products,
  wishedIds,
  onToggleWishlist,
}: {
  products: Product[]
  wishedIds: Set<number>
  onToggleWishlist: (id: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const bestsellers = products.filter((product) => isBestseller(product))
  if (bestsellers.length === 0) {
    return null
  }

  function scrollByPage(direction: number) {
    const track = trackRef.current
    if (track === null) {
      return
    }
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' })
  }

  return (
    <section aria-label="Bán chạy nhất" className="mx-auto w-full max-w-6xl px-6 pt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-3xl">Bán chạy nhất</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollByPage(-1)}
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollByPage(1)}
            aria-label="Cuộn sang phải"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div ref={trackRef} className="flex snap-x gap-4 overflow-x-auto pb-2">
        {bestsellers.map((product) => (
          <div key={product.id} className="w-56 shrink-0 snap-start sm:w-64">
            <ShopCard
              product={product}
              wished={wishedIds.has(product.id)}
              onToggleWishlist={onToggleWishlist}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export function CollectionBanner() {
  return (
    <section className="relative mt-12 overflow-hidden bg-muted">
      <img
        src={BANNER_IMAGE}
        alt="Váy midi trong bộ sưu tập mới"
        loading="lazy"
        width={1600}
        height={800}
        className="h-72 w-full object-cover md:h-96"
      />
      <div className="absolute inset-0 flex items-center bg-primary/40">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="max-w-lg font-display text-3xl text-primary-foreground md:text-5xl">
            Váy & Đầm cho mùa mới
          </h2>
          <Button asChild size="lg" className="mt-6">
            <Link to="/?cat=vay-dam">Khám phá bộ sưu tập</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

const COMMITMENTS = [
  { icon: Undo2, title: 'Đổi trả 30 ngày', text: 'Đổi size, đổi mẫu thoải mái trong 30 ngày.' },
  { icon: Truck, title: 'Giao hàng toàn quốc', text: 'Miễn phí vận chuyển đơn từ 500K.' },
  { icon: BadgeCheck, title: 'Hàng chính hãng', text: 'Chất liệu tốt, giá minh bạch.' },
]

export function Commitments() {
  return (
    <section aria-label="Cam kết" className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="grid gap-6 sm:grid-cols-3">
        {COMMITMENTS.map((item) => (
          <div key={item.title} className="border border-border p-6 text-center">
            <item.icon className="mx-auto size-6" aria-hidden="true" />
            <p className="mt-3 font-display text-xl">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
