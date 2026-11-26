import { useState } from 'react'

import { useListPublicShopVouchers } from '@generated/endpoints/shop-vouchers/shop-vouchers'
import { CheckCircle, Ticket, WarningCircle, X } from '@phosphor-icons/react'

import Modal from '@/components/Modal'
import { formatDateTime, formatVnd } from '@/lib/format'
import { cn, FOCUS_RING_CLASS, INPUT_CLASS, secondaryButtonClass } from '@/lib/ui/styles'

import type { CartItemResponse } from '@generated/model/cartItemResponse'
import type { PublicShopVoucherResponse } from '@generated/model/publicShopVoucherResponse'

export interface ShopVoucherModalProps {
  open: boolean
  shopId: string
  shopName: string
  shopItems: CartItemResponse[]
  currentCode: string | null
  onApply: (code: string | null) => void
  onClose: () => void
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

function computeEligibleSubtotal(
  voucher: PublicShopVoucherResponse,
  items: CartItemResponse[],
): number {
  let sum = 0
  const isSpecific = voucher.productScope === 'SPECIFIC_PRODUCTS'
  const allowedIds = voucher.applicableProductIds ?? []
  for (const item of items) {
    const lineTotal = (item.unitPrice ?? 0) * (item.quantity ?? 1)
    if (isSpecific) {
      if (item.productId !== undefined && allowedIds.includes(item.productId)) {
        sum += lineTotal
      }
    } else {
      sum += lineTotal
    }
  }
  return sum
}

function buildDiscountTitle(voucher: PublicShopVoucherResponse): string {
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

export default function ShopVoucherModal(props: ShopVoucherModalProps) {
  const [manualCode, setManualCode] = useState(props.currentCode ?? '')

  const vouchersQuery = useListPublicShopVouchers(props.shopId, {
    query: {
      enabled: props.open && Boolean(props.shopId),
    },
  })

  if (!props.open) {
    return null
  }

  const vouchers = extractVouchers(vouchersQuery?.data)
  let modalTitle = 'Chọn Voucher của Shop'
  if (props.shopName.trim() !== '') {
    modalTitle = `Voucher của ${props.shopName}`
  }

  function handleApplyManual(event: React.FormEvent) {
    event.preventDefault()
    const normalized = manualCode.trim().toUpperCase()
    if (normalized === '') {
      return
    }
    props.onApply(normalized)
    props.onClose()
  }

  return (
    <Modal title={modalTitle} onClose={props.onClose} widthClass="max-w-lg">
      <div className="mt-4 space-y-4 text-xs">
        <form onSubmit={handleApplyManual} className="flex items-center gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={function (event) {
              setManualCode(event.target.value)
            }}
            placeholder="Nhập mã giảm giá của Shop"
            className={cn(INPUT_CLASS, 'flex-1 py-2 text-xs uppercase')}
          />
          <button
            type="submit"
            disabled={manualCode.trim() === ''}
            className={cn(
              'btn-primary shrink-0 cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50',
              FOCUS_RING_CLASS,
            )}
          >
            Áp dụng
          </button>
        </form>

        <div className="space-y-2.5">
          <p className="font-bold text-zinc-700 dark:text-zinc-300">
            Mã giảm giá công khai của Shop
          </p>

          {vouchersQuery?.isLoading === true && (
            <p className="py-6 text-center text-zinc-500 dark:text-zinc-400">
              Đang tải danh sách mã giảm giá…
            </p>
          )}

          {vouchersQuery?.isLoading !== true && vouchers.length === 0 && (
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-6 text-center text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              <Ticket size={28} className="mx-auto mb-1.5 text-zinc-400" />
              <p>Gian hàng hiện chưa có mã giảm giá công khai nào.</p>
            </div>
          )}

          {vouchers.length > 0 && (
            <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
              {vouchers.map(function (voucher, index) {
                const code = voucher.code ?? ''
                const eligibleSubtotal = computeEligibleSubtotal(voucher, props.shopItems)
                const minSubtotal = voucher.minOrderSubtotal ?? 0
                const missingSubtotal = Math.max(0, minSubtotal - eligibleSubtotal)
                const isUpcoming = voucher.status === 'UPCOMING'
                const isExhausted = voucher.exhaustedByBuyer === true
                const noMatchingItems =
                  voucher.productScope === 'SPECIFIC_PRODUCTS' && eligibleSubtotal === 0
                const isEligible =
                  !isUpcoming && !isExhausted && !noMatchingItems && missingSubtotal === 0
                const isCurrent = props.currentCode !== null && props.currentCode === code
                const remaining = Math.max(0, (voucher.usageLimit ?? 0) - (voucher.usedCount ?? 0))

                return (
                  <div
                    key={voucher.id ?? `${code}-${index}`}
                    className={cn(
                      'rounded-2xl border p-3.5 transition',
                      isCurrent &&
                        'border-emerald-500 bg-emerald-50/50 dark:border-emerald-400/50 dark:bg-emerald-500/10',
                      !isCurrent &&
                        isEligible &&
                        'border-zinc-200/90 bg-white/80 dark:border-white/10 dark:bg-white/5',
                      !isCurrent &&
                        !isEligible &&
                        'border-zinc-200/60 bg-zinc-50/60 opacity-75 dark:border-white/10 dark:bg-white/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-blue-700 px-2 py-0.5 font-mono text-xs font-extrabold text-white dark:bg-sky-500 dark:text-zinc-950">
                            {code}
                          </span>
                          {Boolean(voucher.name) && (
                            <span className="font-bold text-[#17203a] dark:text-white">
                              {voucher.name}
                            </span>
                          )}
                          {voucher.productScope === 'SPECIFIC_PRODUCTS' && (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
                              Sản phẩm chỉ định
                            </span>
                          )}
                        </div>

                        <p className="font-extrabold text-[#17203a] dark:text-white">
                          {buildDiscountTitle(voucher)}
                        </p>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                          Đơn tối thiểu {formatVnd(minSubtotal)} · Còn {remaining}/
                          {voucher.usageLimit ?? 0} lượt
                        </p>
                        {Boolean(voucher.endsAt) && (
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            HSD: {formatDateTime(voucher.endsAt)}
                          </p>
                        )}

                        {isExhausted && (
                          <p className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-300">
                            <WarningCircle size={13} weight="fill" />
                            <span>Đã hết lượt dùng của bạn</span>
                          </p>
                        )}

                        {!isExhausted && isUpcoming && (
                          <p className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            <WarningCircle size={13} weight="fill" />
                            <span>Sắp diễn ra</span>
                          </p>
                        )}

                        {!isExhausted && !isUpcoming && noMatchingItems && (
                          <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            <WarningCircle size={13} weight="fill" />
                            <span>Chưa có sản phẩm thuộc danh sách áp dụng của mã này</span>
                          </p>
                        )}

                        {!isExhausted && !isUpcoming && !noMatchingItems && missingSubtotal > 0 && (
                          <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            <WarningCircle size={13} weight="fill" />
                            <span>Mua thêm {formatVnd(missingSubtotal)} để dùng mã này</span>
                          </p>
                        )}

                        {isEligible && (
                          <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle size={13} weight="fill" />
                            <span>Đủ điều kiện áp dụng</span>
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isCurrent && (
                          <button
                            type="button"
                            onClick={function () {
                              props.onApply(null)
                              props.onClose()
                            }}
                            className={cn(
                              'inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300',
                              FOCUS_RING_CLASS,
                            )}
                          >
                            <X size={12} weight="bold" />
                            <span>Bỏ chọn</span>
                          </button>
                        )}

                        {!isCurrent && (
                          <button
                            type="button"
                            aria-label={`Dùng mã ${code}`}
                            disabled={!isEligible}
                            onClick={function () {
                              props.onApply(code)
                              props.onClose()
                            }}
                            className={cn(
                              'btn-primary cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45',
                              FOCUS_RING_CLASS,
                            )}
                          >
                            Dùng mã {code}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200/70 pt-3 dark:border-white/10">
          <div>
            {props.currentCode !== null && props.currentCode !== '' && (
              <button
                type="button"
                onClick={function () {
                  props.onApply(null)
                  props.onClose()
                }}
                className="cursor-pointer text-xs font-bold text-rose-600 hover:underline dark:text-rose-300"
              >
                Gỡ mã {props.currentCode}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className={cn(secondaryButtonClass(), 'px-4 py-1.5 text-xs')}
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  )
}
