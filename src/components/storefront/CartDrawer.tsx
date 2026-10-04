import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCart } from '@/hooks/useCart'
import { formatVnd, resolveImageUrl } from '@/lib/format'

export default function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const cart = useCart()

  function close() {
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Giỏ hàng ({cart.count})</SheetTitle>
        </SheetHeader>
        {cart.lines.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Bạn chưa chọn món nào.
          </p>
        )}
        {cart.lines.length > 0 && (
          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            {cart.lines.map((line) => {
              const image = resolveImageUrl(line.imageKey)
              return (
                <div key={line.id} className="flex items-center gap-3">
                  {image !== null && (
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      width={200}
                      height={200}
                      className="size-14 shrink-0 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.qty} × {formatVnd(line.price)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">
                    {formatVnd(line.price * line.qty)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
        <SheetFooter>
          <div className="w-full space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Tổng cộng</p>
              <p className="text-lg font-semibold">{formatVnd(cart.total)}</p>
            </div>
            <Button asChild className="w-full" onClick={close}>
              <Link to="/cart">Xem giỏ hàng</Link>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
