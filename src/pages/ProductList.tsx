import type { ReactNode } from 'react'
import { ImageOff, Pencil, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/useProducts'
import type { Product } from '@/lib/api'
import { formatVnd, resolveImageUrl } from '@/lib/format'

const SKELETON_COUNT = 6

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }
  return 'Không tải được danh sách sản phẩm.'
}

function ProductImage({ product }: { product: Product }) {
  const url = resolveImageUrl(product.imageKey)
  if (url === null) {
    return (
      <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
        <ImageOff className="size-8" aria-hidden="true" />
        <span className="sr-only">Không có ảnh</span>
      </div>
    )
  }
  return (
    <div className="aspect-square overflow-hidden bg-muted">
      <img
        src={url}
        alt={product.name}
        loading="lazy"
        width={800}
        height={800}
        className="size-full object-cover"
      />
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group border border-border bg-card">
      <ProductImage product={product} />
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg leading-snug">{product.name}</h2>
          <p className="mt-1 text-sm font-medium">{formatVnd(product.price)}</p>
        </div>
        <Link
          to={`/products/${product.id}/edit`}
          aria-label={`Sửa ${product.name}`}
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

function LoadingGrid() {
  return (
    <div
      role="status"
      aria-label="Đang tải sản phẩm"
      aria-busy="true"
      className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div key={index} aria-hidden="true" className="border border-border">
          <div className="aspect-square animate-pulse bg-muted" />
          <div className="space-y-2 p-4">
            <div className="h-5 animate-pulse bg-muted" />
            <div className="h-4 w-1/2 animate-pulse bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-md border border-destructive/40 bg-destructive/5 px-4 py-8 text-center"
    >
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry} className="mt-4">
        Thử lại
      </Button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-2xl">Chưa có sản phẩm nào</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Thêm sản phẩm đầu tiên để bắt đầu bán hàng.
      </p>
      <Button asChild className="mt-6">
        <Link to="/products/new">Thêm sản phẩm đầu tiên</Link>
      </Button>
    </div>
  )
}

export default function ProductList() {
  const query = useProducts()

  function handleRetry() {
    void query.refetch()
  }

  let content: ReactNode = null
  if (query.isPending) {
    content = <LoadingGrid />
  } else if (query.isError) {
    content = <ErrorState message={errorMessage(query.error)} onRetry={handleRetry} />
  } else if (query.data.length === 0) {
    content = <EmptyState />
  } else {
    content = (
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {query.data.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    )
  }

  return (
    <section>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl">Sản phẩm</h1>
        <Button asChild>
          <Link to="/products/new">
            <Plus className="size-4" aria-hidden="true" />
            Thêm sản phẩm
          </Link>
        </Button>
      </div>
      {content}
    </section>
  )
}
