import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'
import type { CartLine } from '@/hooks/useCart'
import { formatVnd, resolveImageUrl } from '@/lib/format'

function LineRow({
  line,
  onSetQty,
  onRemove,
}: {
  line: CartLine
  onSetQty: (id: number, qty: number) => void
  onRemove: (id: number) => void
}) {
  const image = resolveImageUrl(line.imageKey)
  return (
    <div className="flex gap-4 border border-border p-4">
      {image !== null && (
        <img
          src={image}
          alt=""
          loading="lazy"
          width={200}
          height={200}
          className="size-20 shrink-0 object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{line.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatVnd(line.price)}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center border border-input">
            <button
              type="button"
              onClick={() => onSetQty(line.id, line.qty - 1)}
              aria-label="Giảm số lượng"
              className="p-1.5 hover:bg-muted"
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </button>
            <span className="w-7 text-center text-sm">{line.qty}</span>
            <button
              type="button"
              onClick={() => onSetQty(line.id, line.qty + 1)}
              aria-label="Tăng số lượng"
              className="p-1.5 hover:bg-muted"
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onRemove(line.id)}
            aria-label={`Xoá ${line.name}`}
            className="p-1.5 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="shrink-0 text-sm font-medium">{formatVnd(line.price * line.qty)}</p>
    </div>
  )
}

export default function CartPage() {
  const cart = useCart()

  function handleCheckout() {
    toast.success('Thanh toán ra mắt ở iteration sau')
  }

  if (cart.lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-display text-3xl">Giỏ hàng trống</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bạn chưa chọn món nào. Đi dạo một vòng nhé.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Tiếp tục mua sắm</Link>
        </Button>
      </section>
    )
  }

  return (
    <section>
      <h1 className="font-display text-3xl">Giỏ hàng</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.lines.map((line) => (
            <LineRow key={line.id} line={line} onSetQty={cart.setQty} onRemove={cart.remove} />
          ))}
        </div>
        <div className="h-fit border border-border p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Tổng cộng</p>
            <p className="text-xl font-semibold">{formatVnd(cart.total)}</p>
          </div>
          <Button size="lg" onClick={handleCheckout} className="mt-4 w-full">
            Đặt hàng
          </Button>
          <Button variant="ghost" onClick={cart.clear} className="mt-2 w-full">
            Xoá giỏ hàng
          </Button>
        </div>
      </div>
    </section>
  )
}
