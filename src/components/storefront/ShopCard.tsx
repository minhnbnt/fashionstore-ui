import { Heart, ImageOff } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import type { Product } from '@/lib/api'
import { isBestseller, isNew } from '@/lib/catalog'
import { formatVnd, resolveImageUrl } from '@/lib/format'

function CardImage({ product }: { product: Product }) {
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

export default function ShopCard({
  product,
  wished,
  onToggleWishlist,
}: {
  product: Product
  wished: boolean
  onToggleWishlist: (id: number) => void
}) {
  return (
    <div className="relative border border-border bg-card">
      <Link to={`/products/${product.id}`} aria-label={product.name} className="block">
        <CardImage product={product} />
        <div className="space-y-1 p-4">
          <div className="flex gap-2">
            {isNew(product) && <Badge variant="secondary">Mới</Badge>}
            {isBestseller(product) && <Badge>Bán chạy</Badge>}
          </div>
          <p className="line-clamp-2 font-display text-lg leading-snug">{product.name}</p>
          <p className="text-sm font-medium">{formatVnd(product.price)}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onToggleWishlist(product.id)}
        aria-label={`Yêu thích ${product.name}`}
        aria-pressed={wished}
        className="absolute top-2 right-2 bg-background/80 p-1.5 hover:text-destructive"
      >
        <Heart
          className="size-4"
          aria-hidden="true"
          fill={wished ? 'currentColor' : 'none'}
        />
      </button>
    </div>
  )
}
