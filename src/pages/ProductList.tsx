import type { ReactNode } from 'react'
import { useState } from 'react'
import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeleteProduct } from '@/hooks/useDeleteProduct'
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

function confirmLabel(pending: boolean) {
  if (pending) {
    return 'Đang xoá…'
  }
  return 'Xoá sản phẩm'
}

function ProductCard({
  product,
  onDelete,
}: {
  product: Product
  onDelete: (product: Product) => void
}) {
  return (
    <Card size="sm">
      <ProductImage product={product} />
      <CardContent className="flex-row items-start justify-between">
        <div className="min-w-0">
          <h2 title={product.name} className="line-clamp-2 font-display text-lg leading-snug">{product.name}</h2>
          <p className="mt-1 whitespace-nowrap text-sm font-medium">{formatVnd(product.price)}</p>
        </div>
        <div className="flex shrink-0">
          <Link
            to={`/products/${product.id}/edit`}
            aria-label={`Sửa ${product.name}`}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(product)}
            aria-label={`Xoá ${product.name}`}
            className="p-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </CardContent>
    </Card>
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
  const deleteMutation = useDeleteProduct()
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)

  function handleRetry() {
    void query.refetch()
  }

  function handleConfirmDelete() {
    if (pendingDelete === null) {
      return
    }
    const target = pendingDelete
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        setPendingDelete(null)
        toast.success(`Đã xoá “${target.name}”`)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  function closeDialog() {
    setPendingDelete(null)
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
          <ProductCard key={product.id} product={product} onDelete={setPendingDelete} />
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
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá sản phẩm này?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete !== null && `“${pendingDelete.name}” sẽ bị xoá vĩnh viễn và không thể khôi phục.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {confirmLabel(deleteMutation.isPending)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
