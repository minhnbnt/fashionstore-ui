import { useEffect, useState } from 'react'
import { ImageOff, Minus, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ShopCard from '@/components/storefront/ShopCard'
import { useCart } from '@/hooks/useCart'
import { useProduct } from '@/hooks/useProduct'
import { useProducts } from '@/hooks/useProducts'
import { useWishlist } from '@/hooks/useWishlist'
import { ApiError } from '@/lib/api'
import type { Product } from '@/lib/api'
import { categoryLabel, categoryOf } from '@/lib/catalog'
import { formatVnd, resolveImageUrl } from '@/lib/format'
import NotFound from '@/pages/NotFound'

function DetailImage({ product }: { product: Product }) {
  const url = resolveImageUrl(product.imageKey)
  if (url === null) {
    return (
      <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
        <ImageOff className="size-10" aria-hidden="true" />
        <span className="sr-only">Không có ảnh</span>
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={product.name}
      loading="lazy"
      width={800}
      height={800}
      className="aspect-square w-full object-cover"
    />
  )
}

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null
  }
  const id = Number(raw)
  if (Number.isInteger(id) === false || id <= 0) {
    return null
  }
  return id
}

export default function ProductDetail() {
  const productId = parseId(useParams().id)
  const detail = useProduct(productId)
  const list = useProducts()
  const cart = useCart()
  const { ids: wishedIds, toggle: toggleWishlist } = useWishlist()
  const [qty, setQty] = useState(1)

  useEffect(() => {
    setQty(1)
  }, [productId])

  if (productId === null) {
    return <NotFound />
  }
  if (detail.isPending) {
    return (
      <div className="grid gap-8 md:grid-cols-2" role="status" aria-label="Đang tải sản phẩm">
        <Skeleton className="aspect-square" />
        <div className="space-y-3">
          <Skeleton className="h-8" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20" />
        </div>
      </div>
    )
  }
  if (detail.isError) {
    if (detail.error instanceof ApiError && detail.error.status === 404) {
      return <NotFound />
    }
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <p className="text-sm text-destructive">Không tải được sản phẩm, vui lòng thử lại.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="outline" onClick={() => void detail.refetch()}>
            Thử lại
          </Button>
          <Button asChild variant="ghost">
            <Link to="/">Về trang chủ</Link>
          </Button>
        </div>
      </section>
    )
  }

  const product = detail.data

  function decrease() {
    if (qty > 1) {
      setQty(qty - 1)
    }
  }

  function handleAdd() {
    cart.add(product, qty)
    toast.success('Đã thêm vào giỏ')
  }

  let related: Product[] = []
  if (list.data !== undefined) {
    related = list.data
      .filter((item) => item.id !== product.id && categoryOf(item) === categoryOf(product))
      .slice(0, 4)
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{categoryLabel(categoryOf(product))}</span>
        <span aria-hidden="true"> / </span>
        <span aria-current="page" className="text-foreground">
          {product.name}
        </span>
      </nav>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <DetailImage product={product} />
        <div>
          <p className="text-sm text-muted-foreground">{categoryLabel(categoryOf(product))}</p>
          <h1 className="mt-1 font-display text-4xl leading-tight">{product.name}</h1>
          <p className="mt-3 text-xl font-medium">{formatVnd(product.price)}</p>
          {product.description !== null && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border border-input">
              <button
                type="button"
                onClick={decrease}
                aria-label="Giảm số lượng"
                className="p-2.5 hover:bg-muted"
              >
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <span aria-live="polite" aria-label="Số lượng" className="w-8 text-center text-sm">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                aria-label="Tăng số lượng"
                className="p-2.5 hover:bg-muted"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
            <Button size="lg" onClick={handleAdd} className="flex-1">
              Thêm vào giỏ
            </Button>
          </div>
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="detail">
              <AccordionTrigger>Chi tiết sản phẩm</AccordionTrigger>
              <AccordionContent>
                {product.description ?? 'Chưa có mô tả chi tiết cho sản phẩm này.'}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger>Giao hàng & đổi trả</AccordionTrigger>
              <AccordionContent>
                Miễn phí vận chuyển cho đơn từ 500K. Đổi size, đổi mẫu thoải mái trong 30 ngày.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      {related.length > 0 && (
        <section aria-label="Có thể bạn thích" className="pt-12">
          <h2 className="font-display text-3xl">Có thể bạn thích</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((item) => (
              <ShopCard
                key={item.id}
                product={item}
                wished={wishedIds.has(item.id)}
                onToggleWishlist={toggleWishlist}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
