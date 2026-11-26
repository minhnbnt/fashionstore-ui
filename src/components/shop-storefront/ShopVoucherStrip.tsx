import { useState } from 'react'

import { useListPublicShopVouchers } from '@generated/endpoints/shop-vouchers/shop-vouchers'
import { Check, Copy, Ticket } from '@phosphor-icons/react'

import { formatDateTime, formatVnd } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { PublicShopVoucherResponse } from '@generated/model/publicShopVoucherResponse'

export interface ShopVoucherStripProps {
  shopId: string
  productId?: string
}

function extractVouchers(data: unknown): PublicShopVoucherResponse[] {
  if (data === null || data === undefined) {
    return []
  }
  if (Array.isArray(data)) {
    return data as PublicShopVoucherResponse[]
  }
  if (typeof data === 'object' && 'data' in data) {
    const inner = (data as { data?: unknown }).data
    if (Array.isArray(inner)) {
      return inner as PublicShopVoucherResponse[]
    }
  }
  return []
}

function buildDiscountLabel(voucher: PublicShopVoucherResponse): string {
  const value = voucher.discountValue ?? 0
  if (voucher.discountType === 'PERCENTAGE') {
    const maxDiscount = voucher.maxDiscountAmount ?? 0
    if (maxDiscount > 0) {
      return `Giảm ${value}% tối đa ${formatVnd(maxDiscount)}`
    }
    return `Giảm ${value}%`
  }
  return `Giảm ${formatVnd(value)}`
}

export default function ShopVoucherStrip(props: ShopVoucherStripProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const vouchersQuery = useListPublicShopVouchers(props.shopId, {
    query: {
      enabled: Boolean(props.shopId),
    },
  })

  const allVouchers = extractVouchers(vouchersQuery?.data)
  const vouchers = allVouchers.filter(function (v) {
    if (props.productId !== undefined && props.productId !== '') {
      if (v.productScope === 'SPECIFIC_PRODUCTS') {
        const applicableIds = v.applicableProductIds ?? []
        return applicableIds.includes(props.productId)
      }
    }
    return true
  })

  if (vouchers.length === 0) {
    return null
  }

  function handleCopyCode(code: string) {
    if (code === '') {
      return
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
      void navigator.clipboard.writeText(code)
    }
    setCopiedCode(code)
    notify.success(`Đã sao chép mã ${code}`, 'Bạn có thể áp dụng mã này tại trang Thanh toán.')
  }

  return (
    <section
      aria-label="Mã giảm giá của Shop"
      className="mt-6 rounded-3xl border border-zinc-200/90 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-[#11182a]"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] text-white shadow-sm">
          <Ticket size={17} weight="fill" />
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-[#17203a] dark:text-white">
            Mã Giảm Giá Của Shop
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Sao chép mã hoặc chọn trực tiếp tại bước thanh toán
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3.5 overflow-x-auto pb-1">
        {vouchers.map(function (voucher, index) {
          const code = voucher.code ?? ''
          const isCopied = copiedCode !== null && copiedCode === code
          const remaining = Math.max(0, (voucher.usageLimit ?? 0) - (voucher.usedCount ?? 0))
          const isUpcoming = voucher.status === 'UPCOMING'
          const isExhausted = voucher.exhaustedByBuyer === true

          return (
            <div
              key={voucher.id ?? `${code}-${index}`}
              className="flex min-w-[260px] shrink-0 items-stretch justify-between gap-3 rounded-2xl border border-dashed border-sky-300 bg-sky-50/60 p-3.5 dark:border-sky-500/30 dark:bg-sky-500/10"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-blue-700 px-2 py-0.5 font-mono text-xs font-extrabold text-white dark:bg-sky-500 dark:text-zinc-950">
                    {code}
                  </span>
                  {voucher.productScope === 'SPECIFIC_PRODUCTS' && (
                    <span className="rounded-full border border-sky-200 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:border-sky-400/30 dark:bg-white/10 dark:text-sky-200">
                      Sản phẩm chỉ định
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                      Sắp diễn ra
                    </span>
                  )}
                </div>

                <p className="text-xs font-extrabold text-[#17203a] dark:text-white">
                  {buildDiscountLabel(voucher)}
                </p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                  Đơn tối thiểu {formatVnd(voucher.minOrderSubtotal ?? 0)}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Còn {remaining}/{voucher.usageLimit ?? 0} lượt
                  {Boolean(voucher.endsAt) && ` · HSD: ${formatDateTime(voucher.endsAt)}`}
                </p>
                {isExhausted && (
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-300">
                    Đã hết lượt dùng của bạn
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col justify-center border-l border-dashed border-sky-200 pl-3 dark:border-sky-500/25">
                <button
                  type="button"
                  onClick={function () {
                    handleCopyCode(code)
                  }}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition',
                    isCopied &&
                      'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
                    !isCopied && 'btn-primary text-white',
                    FOCUS_RING_CLASS,
                  )}
                >
                  {isCopied && (
                    <>
                      <Check size={13} weight="bold" />
                      <span>Đã lưu mã</span>
                    </>
                  )}
                  {!isCopied && (
                    <>
                      <Copy size={13} weight="bold" />
                      <span>Sao chép mã</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
