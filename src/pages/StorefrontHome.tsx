import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import ShopCard from '@/components/storefront/ShopCard'
import {
  BestsellerCarousel,
  CategoryTiles,
  CollectionBanner,
  Commitments,
  Hero,
} from '@/components/storefront/HomeSections'
import { useProducts } from '@/hooks/useProducts'
import type { Product } from '@/lib/api'
import { CATEGORIES, categoryOf } from '@/lib/catalog'

const WISHLIST_KEY = 'fashionstore:wishlist'
const ALL = 'all'

type SortId = 'moi-nhat' | 'gia-tang' | 'gia-giam'

function validCategory(raw: string | null): string {
  if (raw === null) {
    return ALL
  }
  const known = CATEGORIES.some((category) => category.id === raw)
  if (known === false) {
    return ALL
  }
  return raw
}

function loadWishlist(): Set<number> {
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY)
    if (raw === null) {
      return new Set()
    }
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) === false) {
      return new Set()
    }
    return new Set((parsed as number[]).filter((id) => typeof id === 'number'))
  } catch {
    return new Set()
  }
}

function applySort(products: Product[], sort: SortId): Product[] {
  const sorted = [...products]
  if (sort === 'gia-tang') {
    sorted.sort((a, b) => a.price - b.price)
  }
  if (sort === 'gia-giam') {
    sorted.sort((a, b) => b.price - a.price)
  }
  if (sort === 'moi-nhat') {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return sorted
}

function LoadingGrid() {
  return (
    <div
      role="status"
      aria-label="Đang tải sản phẩm"
      aria-busy="true"
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} aria-hidden="true" className="border border-border">
          <Skeleton className="aspect-square" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function StorefrontHome() {
  const [params] = useSearchParams()
  const query = useProducts()
  const [keyword, setKeyword] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState(validCategory(params.get('cat')))
  const [sort, setSort] = useState<SortId>('moi-nhat')
  const [maxPrice, setMaxPrice] = useState('')
  const [wishedIds, setWishedIds] = useState<Set<number>>(() => loadWishlist())

  useEffect(() => {
    setKeyword(params.get('q') ?? '')
    setCategory(validCategory(params.get('cat')))
  }, [params])

  useEffect(() => {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify([...wishedIds]))
  }, [wishedIds])

  function toggleWishlist(id: number) {
    setWishedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      next.add(id)
      return next
    })
  }

  function clearFilters() {
    setKeyword('')
    setCategory(ALL)
    setMaxPrice('')
  }

  if (query.isPending) {
    return (
      <>
        <Hero />
        <div className="mx-auto w-full max-w-6xl px-6 pt-12">
          <LoadingGrid />
        </div>
      </>
    )
  }

  if (query.isError) {
    return (
      <section className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm text-destructive">Không tải được sản phẩm, vui lòng thử lại.</p>
        <Button variant="outline" onClick={() => void query.refetch()} className="mt-4">
          Thử lại
        </Button>
      </section>
    )
  }

  const products = query.data
  const ceiling = maxPrice === '' ? null : Number(maxPrice)
  const filtered = products.filter((product) => {
    if (category !== ALL && categoryOf(product) !== category) {
      return false
    }
    if (keyword.trim().length > 0) {
      const hit = product.name.toLowerCase().includes(keyword.trim().toLowerCase())
      if (hit === false) {
        return false
      }
    }
    if (ceiling !== null && Number.isNaN(ceiling) === false && product.price > ceiling) {
      return false
    }
    return true
  })
  const visible = applySort(filtered, sort)

  return (
    <>
      <Hero />
      <CategoryTiles products={products} />
      <BestsellerCarousel
        products={products}
        wishedIds={wishedIds}
        onToggleWishlist={toggleWishlist}
      />
      <CollectionBanner />
      <section id="san-pham" aria-label="Tất cả sản phẩm" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 pt-12">
        <h2 className="font-display text-3xl">Tất cả sản phẩm</h2>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm sản phẩm…"
            aria-label="Tìm sản phẩm"
            className="md:max-w-xs"
          />
          <Select value={sort} onValueChange={(value) => setSort(value as SortId)}>
            <SelectTrigger aria-label="Sắp xếp" className="md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="moi-nhat">Mới nhất</SelectItem>
              <SelectItem value="gia-tang">Giá tăng dần</SelectItem>
              <SelectItem value="gia-giam">Giá giảm dần</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="Giá tối đa (VND)…"
            aria-label="Giá tối đa"
            inputMode="numeric"
            className="md:w-48"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant={category === ALL ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(ALL)}
            aria-pressed={category === ALL}
          >
            Tất cả
          </Button>
          {CATEGORIES.map((item) => (
            <Button
              key={item.id}
              variant={category === item.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(item.id)}
              aria-pressed={category === item.id}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{visible.length} sản phẩm</p>
        {visible.length === 0 && (
          <div className="py-12 text-center">
            <p className="font-display text-2xl">Không tìm thấy sản phẩm phù hợp</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Xoá bộ lọc
            </Button>
          </div>
        )}
        {visible.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((product) => (
              <ShopCard
                key={product.id}
                product={product}
                wished={wishedIds.has(product.id)}
                onToggleWishlist={toggleWishlist}
              />
            ))}
          </div>
        )}
      </section>
      <Commitments />
    </>
  )
}
