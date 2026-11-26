import { useState } from 'react'

import {
  getGetSellerVoucherQueryKey,
  getListSellerVouchersQueryKey,
  useCreateSellerVoucher,
  useGetSellerVoucher,
  useUpdateSellerVoucher,
} from '@generated/endpoints/seller-vouchers/seller-vouchers'
import { Info, MagnifyingGlass, Shuffle, SpinnerGap } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import Modal from '@/components/Modal'
import { useAllShopProducts } from '@/hooks/useAllShopProducts'
import { takeData } from '@/lib/api/apiAdapters'
import {
  formatMoneyInput,
  formatNumberWithDots,
  formatVnd,
  parseNumberFromDots,
} from '@/lib/format'
import { notify } from '@/lib/notifications'
import {
  cn,
  INPUT_CLASS,
  LABEL_CLASS,
  primaryButtonClass,
  secondaryButtonClass,
  TEXTAREA_CLASS,
} from '@/lib/ui/styles'

import type {
  CreateShopVoucherRequestDiscountType,
  CreateShopVoucherRequestProductScope,
  CreateShopVoucherRequestVisibility,
  SellerVoucherDetailResponse,
} from '@generated/model'

export interface VoucherFormModalProps {
  open: boolean
  shopId: string
  editingVoucherId: string | null
  onClose: () => void
  onSaved: () => void
}

const RANDOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRandomVoucherCode(): string {
  let result = ''
  for (let i = 0; i < 8; i += 1) {
    const idx = Math.floor(Math.random() * RANDOM_CHARS.length)
    result += RANDOM_CHARS.charAt(idx)
  }
  return result
}

function formatDateToLocalInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function isoToLocalInput(iso: string | undefined): string {
  if (iso === undefined || iso === '') {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return formatDateToLocalInput(date)
}

function localInputToIso(localValue: string): string {
  const trimmed = localValue.trim()
  if (trimmed === '') {
    return ''
  }
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toISOString()
}

function defaultStartsAtInput(): string {
  return formatDateToLocalInput(new Date())
}

function defaultEndsAtInput(): string {
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return formatDateToLocalInput(nextWeek)
}

export default function VoucherFormModal(props: VoucherFormModalProps) {
  const { open, shopId, editingVoucherId, onClose, onSaved } = props
  const queryClient = useQueryClient()

  const isEditing = editingVoucherId !== null && editingVoucherId !== ''
  let targetVoucherId = ''
  if (editingVoucherId !== null) {
    targetVoucherId = editingVoucherId
  }

  const detailQuery = useGetSellerVoucher(shopId, targetVoucherId, {
    query: {
      enabled: open && shopId !== '' && isEditing,
    },
  })

  let detailData: SellerVoucherDetailResponse | null = null
  if (isEditing && detailQuery.data !== undefined) {
    const extracted = takeData(detailQuery.data)
    if (extracted) {
      detailData = extracted
    }
  }

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] =
    useState<CreateShopVoucherRequestDiscountType>('FIXED_AMOUNT')
  const [discountValue, setDiscountValue] = useState('')
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('')
  const [minOrderSubtotal, setMinOrderSubtotal] = useState('0')
  const [productScope, setProductScope] =
    useState<CreateShopVoucherRequestProductScope>('ALL_PRODUCTS')
  const [visibility, setVisibility] = useState<CreateShopVoucherRequestVisibility>('PUBLIC')
  const [usageLimit, setUsageLimit] = useState('100')
  const [perBuyerLimit, setPerBuyerLimit] = useState('1')
  const [startsAt, setStartsAt] = useState(defaultStartsAtInput)
  const [endsAt, setEndsAt] = useState(defaultEndsAtInput)
  const [active, setActive] = useState(true)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  let syncKey = 'CLOSED'
  if (open) {
    if (isEditing === false) {
      syncKey = 'CREATE'
    } else if (detailData !== null) {
      syncKey = `EDIT:${targetVoucherId}:${detailData.id ?? ''}:${detailData.updatedAt ?? ''}`
    } else {
      syncKey = `EDIT_LOADING:${targetVoucherId}`
    }
  }

  const [prevSyncKey, setPrevSyncKey] = useState('')
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey)
    if (open) {
      setFormError(null)
      setProductSearch('')
      if (isEditing === false) {
        setCode('')
        setName('')
        setDescription('')
        setDiscountType('FIXED_AMOUNT')
        setDiscountValue('')
        setMaxDiscountAmount('')
        setMinOrderSubtotal('0')
        setProductScope('ALL_PRODUCTS')
        setVisibility('PUBLIC')
        setUsageLimit('100')
        setPerBuyerLimit('1')
        setStartsAt(defaultStartsAtInput())
        setEndsAt(defaultEndsAtInput())
        setActive(true)
        setSelectedProductIds([])
      } else if (detailData !== null) {
        setCode(detailData.code ?? '')
        setName(detailData.name ?? '')
        setDescription(detailData.description ?? '')
        if (detailData.discountType === 'PERCENTAGE') {
          setDiscountType('PERCENTAGE')
          if (detailData.discountValue !== undefined) {
            setDiscountValue(String(detailData.discountValue))
          } else {
            setDiscountValue('')
          }
        } else {
          setDiscountType('FIXED_AMOUNT')
          if (detailData.discountValue !== undefined) {
            setDiscountValue(formatNumberWithDots(detailData.discountValue))
          } else {
            setDiscountValue('')
          }
        }
        if (
          detailData.maxDiscountAmount !== null &&
          detailData.maxDiscountAmount !== undefined &&
          detailData.maxDiscountAmount > 0
        ) {
          setMaxDiscountAmount(formatNumberWithDots(detailData.maxDiscountAmount))
        } else {
          setMaxDiscountAmount('')
        }
        setMinOrderSubtotal(formatNumberWithDots(detailData.minOrderSubtotal ?? 0))
        if (detailData.productScope === 'SPECIFIC_PRODUCTS') {
          setProductScope('SPECIFIC_PRODUCTS')
        } else {
          setProductScope('ALL_PRODUCTS')
        }
        if (detailData.visibility === 'PRIVATE') {
          setVisibility('PRIVATE')
        } else {
          setVisibility('PUBLIC')
        }
        setUsageLimit(String(detailData.usageLimit ?? 100))
        setPerBuyerLimit(String(detailData.perBuyerLimit ?? 1))
        const startLocal = isoToLocalInput(detailData.startsAt)
        if (startLocal !== '') {
          setStartsAt(startLocal)
        }
        const endLocal = isoToLocalInput(detailData.endsAt)
        if (endLocal !== '') {
          setEndsAt(endLocal)
        }
        setActive(detailData.active ?? true)
        setSelectedProductIds(detailData.productIds ?? [])
      }
    }
  }

  const shouldLoadProducts = open && shopId !== '' && productScope === 'SPECIFIC_PRODUCTS'
  const productsQuery = useAllShopProducts(shopId, shouldLoadProducts)
  const shopProducts = productsQuery.data ?? []

  const createMutation = useCreateSellerVoucher({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListSellerVouchersQueryKey(shopId) })
        notify.success('Đã tạo mã giảm giá thành công')
        onSaved()
        onClose()
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không thể tạo mã giảm giá. Vui lòng kiểm tra lại.')
      },
    },
  })

  const updateMutation = useUpdateSellerVoucher({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListSellerVouchersQueryKey(shopId) })
        if (targetVoucherId !== '') {
          void queryClient.invalidateQueries({
            queryKey: getGetSellerVoucherQueryKey(shopId, targetVoucherId),
          })
        }
        notify.success('Đã cập nhật mã giảm giá thành công')
        onSaved()
        onClose()
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không thể cập nhật mã giảm giá. Vui lòng kiểm tra lại.')
      },
    },
  })

  if (open === false) {
    return null
  }

  let usedCount = 0
  if (isEditing && detailData !== null && typeof detailData.usedCount === 'number') {
    usedCount = detailData.usedCount
  }
  const isCoreLocked = isEditing && usedCount > 0
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  let modalTitle = 'Tạo mã giảm giá mới'
  if (isEditing) {
    modalTitle = 'Chỉnh sửa mã giảm giá'
  }

  let submitLabel = 'Lưu mã giảm giá'
  if (isEditing) {
    submitLabel = 'Cập nhật mã giảm giá'
  }

  let discountValueLabel = 'Mức giảm (₫)'
  let discountInputType: 'text' | 'number' = 'text'
  let discountPlaceholder = 'VD: 50.000'
  if (discountType === 'PERCENTAGE') {
    discountValueLabel = 'Mức giảm (%)'
    discountInputType = 'number'
    discountPlaceholder = 'Nhập phần trăm (1 - 99)'
  }

  const filteredProducts = shopProducts.filter(function (item) {
    const term = productSearch.trim().toLowerCase()
    if (term === '') {
      return true
    }
    const itemName = (item.name ?? '').toLowerCase()
    return itemName.includes(term)
  })

  function handleGenerateRandomCode() {
    if (isCoreLocked) {
      return
    }
    setCode(generateRandomVoucherCode())
  }

  function handleToggleProduct(productId: string) {
    if (isCoreLocked) {
      return
    }
    setSelectedProductIds(function (prev) {
      if (prev.includes(productId)) {
        return prev.filter(function (id) {
          return id !== productId
        })
      }
      return [...prev, productId]
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const normalizedCode = code.trim().toUpperCase()
    if (!/^[A-Z0-9]{4,20}$/.test(normalizedCode)) {
      setFormError('Mã giảm giá phải gồm từ 4 đến 20 ký tự chữ cái hoặc chữ số (A-Z, 0-9).')
      return
    }

    const trimmedName = name.trim()
    if (trimmedName === '') {
      setFormError('Vui lòng nhập tên chương trình mã giảm giá.')
      return
    }

    let parsedDiscountValue = Number.NaN
    if (discountType === 'FIXED_AMOUNT') {
      const fromDots = parseNumberFromDots(discountValue)
      if (fromDots !== null) {
        parsedDiscountValue = fromDots
      }
    } else {
      parsedDiscountValue = Number(discountValue)
    }
    if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
      setFormError('Vui lòng nhập mức giảm hợp lệ lớn hơn 0.')
      return
    }

    if (discountType === 'PERCENTAGE' && (parsedDiscountValue < 1 || parsedDiscountValue > 99)) {
      setFormError('Mức giảm theo phần trăm phải nằm trong khoảng từ 1% đến 99%.')
      return
    }

    let parsedMaxDiscount: number | null = null
    if (discountType === 'PERCENTAGE' && maxDiscountAmount.trim() !== '') {
      const candidateMax = parseNumberFromDots(maxDiscountAmount)
      if (candidateMax === null || candidateMax <= 0) {
        setFormError('Mức giảm tối đa phải là số dương.')
        return
      }
      parsedMaxDiscount = Math.round(candidateMax)
    }

    let parsedMinOrder = Number.NaN
    if (minOrderSubtotal.trim() === '') {
      parsedMinOrder = 0
    } else {
      const candidateMin = parseNumberFromDots(minOrderSubtotal)
      if (candidateMin !== null) {
        parsedMinOrder = candidateMin
      }
    }
    if (Number.isNaN(parsedMinOrder) || parsedMinOrder < 0) {
      setFormError('Giá trị đơn hàng tối thiểu không được nhỏ hơn 0.')
      return
    }

    const parsedUsageLimit = Number(usageLimit)
    if (Number.isNaN(parsedUsageLimit) || parsedUsageLimit < 1) {
      setFormError('Tổng lượt sử dụng tối đa phải từ 1 trở lên.')
      return
    }

    if (isCoreLocked && parsedUsageLimit < usedCount) {
      setFormError(`Tổng lượt sử dụng không được nhỏ hơn số lượt đã dùng (${usedCount}).`)
      return
    }

    const parsedPerBuyerLimit = Number(perBuyerLimit)
    if (Number.isNaN(parsedPerBuyerLimit) || parsedPerBuyerLimit < 1) {
      setFormError('Giới hạn lượt dùng mỗi khách phải từ 1 trở lên.')
      return
    }

    const startsAtIso = localInputToIso(startsAt)
    const endsAtIso = localInputToIso(endsAt)
    if (startsAtIso === '' || endsAtIso === '') {
      setFormError('Vui lòng chọn thời gian bắt đầu và kết thúc hợp lệ.')
      return
    }
    if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.')
      return
    }

    let productIdsPayload: string[] | null = null
    if (productScope === 'SPECIFIC_PRODUCTS') {
      if (selectedProductIds.length === 0) {
        setFormError('Vui lòng chọn ít nhất 1 sản phẩm áp dụng cho mã giảm giá.')
        return
      }
      productIdsPayload = selectedProductIds
    }

    const payload = {
      code: normalizedCode,
      name: trimmedName,
      description: description.trim(),
      discountType,
      discountValue: Math.round(parsedDiscountValue),
      maxDiscountAmount: parsedMaxDiscount,
      minOrderSubtotal: Math.round(parsedMinOrder),
      productScope,
      visibility,
      usageLimit: Math.round(parsedUsageLimit),
      perBuyerLimit: Math.round(parsedPerBuyerLimit),
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      active,
      productIds: productIdsPayload,
    }

    if (isEditing && targetVoucherId !== '') {
      updateMutation.mutate({
        shopId,
        voucherId: targetVoucherId,
        data: payload,
      })
      return
    }

    createMutation.mutate({
      shopId,
      data: payload,
    })
  }

  return (
    <Modal title={modalTitle} onClose={onClose} widthClass="max-w-2xl">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {isCoreLocked && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
            <Info size={18} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold">Mã giảm giá này đã có lượt sử dụng ({usedCount} lượt).</p>
              <p className="mt-0.5">
                Để đảm bảo tính toàn vẹn đối soát đơn hàng, các điều khoản giảm giá cốt lõi (Mã
                code, Loại giảm, Mức giảm, Trần giảm, Đơn tối thiểu, Phạm vi sản phẩm) đã được khóa.
                Bạn vẫn có thể cập nhật Tên, Mô tả, Chế độ hiển thị, Tổng lượt dùng, Thời gian kết
                thúc hoặc Trạng thái kích hoạt.
              </p>
            </div>
          </div>
        )}

        {formError !== null && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Code */}
          <div className="flex flex-col justify-end">
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="voucher-code"
                className="text-sm font-bold text-[#17203a] dark:text-[#e2e8f0]"
              >
                Mã giảm giá
              </label>
              <button
                type="button"
                disabled={isCoreLocked}
                onClick={handleGenerateRandomCode}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-400"
              >
                <Shuffle size={13} weight="bold" />
                <span>Tạo mã ngẫu nhiên</span>
              </button>
            </div>
            <input
              id="voucher-code"
              type="text"
              value={code}
              disabled={isCoreLocked}
              onChange={function (e) {
                setCode(e.target.value.toUpperCase())
              }}
              placeholder="VD: SUMMER50K"
              maxLength={20}
              className={cn(INPUT_CLASS, 'font-mono uppercase disabled:opacity-60')}
            />
          </div>

          {/* Name */}
          <div className="flex flex-col justify-end">
            <label htmlFor="voucher-name" className={LABEL_CLASS}>
              Tên chương trình
            </label>
            <input
              id="voucher-name"
              type="text"
              value={name}
              onChange={function (e) {
                setName(e.target.value)
              }}
              placeholder="VD: Ưu đãi chào hè"
              maxLength={200}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="voucher-description" className={LABEL_CLASS}>
            Mô tả chương trình
          </label>
          <textarea
            id="voucher-description"
            rows={2}
            value={description}
            onChange={function (e) {
              setDescription(e.target.value)
            }}
            placeholder="Ghi chú hoặc điều kiện chi tiết của chương trình..."
            maxLength={1000}
            className={TEXTAREA_CLASS}
          />
        </div>

        {/* Discount Type, Value & Max Discount */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col justify-end">
            <label
              htmlFor="voucher-discount-type"
              className={cn(LABEL_CLASS, 'sm:text-[13px] sm:whitespace-nowrap')}
            >
              Loại giảm giá
            </label>
            <select
              id="voucher-discount-type"
              value={discountType}
              disabled={isCoreLocked}
              onChange={function (e) {
                const nextType = e.target.value as CreateShopVoucherRequestDiscountType
                setDiscountType(nextType)
                if (nextType === 'FIXED_AMOUNT') {
                  setDiscountValue(formatMoneyInput(discountValue))
                } else {
                  const parsed = parseNumberFromDots(discountValue)
                  if (parsed !== null) {
                    setDiscountValue(String(parsed))
                  } else {
                    setDiscountValue('')
                  }
                }
              }}
              className={cn(INPUT_CLASS, 'disabled:opacity-60')}
            >
              <option value="FIXED_AMOUNT">Giảm theo số tiền (₫)</option>
              <option value="PERCENTAGE">Giảm theo phần trăm (%)</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label
              htmlFor="voucher-discount-value"
              className={cn(LABEL_CLASS, 'sm:text-[13px] sm:whitespace-nowrap')}
            >
              {discountValueLabel}
            </label>
            <input
              id="voucher-discount-value"
              type={discountInputType}
              inputMode="numeric"
              min={1}
              value={discountValue}
              disabled={isCoreLocked}
              onChange={function (e) {
                if (discountType === 'FIXED_AMOUNT') {
                  setDiscountValue(formatMoneyInput(e.target.value))
                } else {
                  setDiscountValue(e.target.value)
                }
              }}
              placeholder={discountPlaceholder}
              className={cn(INPUT_CLASS, 'tabular-nums disabled:opacity-60')}
            />
          </div>

          {discountType === 'PERCENTAGE' && (
            <div className="flex flex-col justify-end">
              <label
                htmlFor="voucher-max-discount"
                className={cn(LABEL_CLASS, 'sm:text-[13px] sm:whitespace-nowrap')}
              >
                Giảm tối đa (₫)
              </label>
              <input
                id="voucher-max-discount"
                type="text"
                inputMode="numeric"
                value={maxDiscountAmount}
                disabled={isCoreLocked}
                onChange={function (e) {
                  setMaxDiscountAmount(formatMoneyInput(e.target.value))
                }}
                placeholder="Không giới hạn nếu bỏ trống"
                className={cn(INPUT_CLASS, 'tabular-nums disabled:opacity-60')}
              />
            </div>
          )}
        </div>

        {/* Min Order Subtotal, Usage Limit, Per Buyer Limit */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col justify-end">
            <label
              htmlFor="voucher-min-order"
              className={cn(LABEL_CLASS, 'sm:text-[13px] sm:whitespace-nowrap')}
            >
              Đơn hàng tối thiểu (₫)
            </label>
            <input
              id="voucher-min-order"
              type="text"
              inputMode="numeric"
              value={minOrderSubtotal}
              disabled={isCoreLocked}
              onChange={function (e) {
                setMinOrderSubtotal(formatMoneyInput(e.target.value))
              }}
              placeholder="0"
              className={cn(INPUT_CLASS, 'tabular-nums disabled:opacity-60')}
            />
          </div>

          <div className="flex flex-col justify-end">
            <label
              htmlFor="voucher-usage-limit"
              className={cn(LABEL_CLASS, 'sm:text-[13px] sm:whitespace-nowrap')}
            >
              Tổng lượt sử dụng tối đa
            </label>
            <input
              id="voucher-usage-limit"
              type="number"
              min={1}
              value={usageLimit}
              onChange={function (e) {
                setUsageLimit(e.target.value)
              }}
              className={INPUT_CLASS}
            />
          </div>

          <div className="flex flex-col justify-end">
            <label
              htmlFor="voucher-per-buyer-limit"
              className={cn(LABEL_CLASS, 'sm:text-[13px] sm:whitespace-nowrap')}
            >
              Giới hạn lượt dùng mỗi khách
            </label>
            <input
              id="voucher-per-buyer-limit"
              type="number"
              min={1}
              value={perBuyerLimit}
              onChange={function (e) {
                setPerBuyerLimit(e.target.value)
              }}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Product Scope & Visibility */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-end">
            <label htmlFor="voucher-product-scope" className={LABEL_CLASS}>
              Phạm vi sản phẩm
            </label>
            <select
              id="voucher-product-scope"
              value={productScope}
              disabled={isCoreLocked}
              onChange={function (e) {
                setProductScope(e.target.value as CreateShopVoucherRequestProductScope)
              }}
              className={cn(INPUT_CLASS, 'disabled:opacity-60')}
            >
              <option value="ALL_PRODUCTS">Toàn bộ sản phẩm của shop</option>
              <option value="SPECIFIC_PRODUCTS">Chọn sản phẩm áp dụng</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label htmlFor="voucher-visibility" className={LABEL_CLASS}>
              Chế độ hiển thị
            </label>
            <select
              id="voucher-visibility"
              value={visibility}
              onChange={function (e) {
                setVisibility(e.target.value as CreateShopVoucherRequestVisibility)
              }}
              className={INPUT_CLASS}
            >
              <option value="PUBLIC">Hiển thị công khai trên Shop & Trang sản phẩm</option>
              <option value="PRIVATE">Mã ẩn — chỉ khách nhập mã mới dùng được</option>
            </select>
          </div>
        </div>

        {/* Specific Products Picker */}
        {productScope === 'SPECIFIC_PRODUCTS' && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-white/10 dark:bg-white/5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                Chọn sản phẩm áp dụng ({selectedProductIds.length} đã chọn)
              </span>
            </div>

            <div className="relative mb-2.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <MagnifyingGlass size={15} />
              </div>
              <input
                type="text"
                aria-label="Tìm sản phẩm áp dụng"
                value={productSearch}
                onChange={function (e) {
                  setProductSearch(e.target.value)
                }}
                placeholder="Tìm theo tên sản phẩm..."
                className={cn(INPUT_CLASS, 'py-1.5 pl-9 text-xs')}
              />
            </div>

            <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {filteredProducts.length === 0 && (
                <p className="py-3 text-center text-xs text-zinc-500">
                  Không tìm thấy sản phẩm phù hợp.
                </p>
              )}
              {filteredProducts.map(function (product) {
                const pid = product.id ?? ''
                const isChecked = selectedProductIds.includes(pid)
                return (
                  <label
                    key={pid}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-xs transition hover:border-sky-300 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isCoreLocked}
                        onChange={function () {
                          handleToggleProduct(pid)
                        }}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600"
                      />
                      <span className="truncate font-semibold text-zinc-800 dark:text-zinc-200">
                        {product.name ?? 'Sản phẩm'}
                      </span>
                    </div>
                    {product.minPrice !== null && product.minPrice !== undefined && (
                      <span className="shrink-0 font-medium text-zinc-500">
                        {formatVnd(product.minPrice)}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* StartsAt & EndsAt */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-end">
            <label htmlFor="voucher-starts-at" className={LABEL_CLASS}>
              Thời gian bắt đầu
            </label>
            <input
              id="voucher-starts-at"
              type="datetime-local"
              value={startsAt}
              disabled={isCoreLocked}
              onChange={function (e) {
                setStartsAt(e.target.value)
              }}
              className={cn(INPUT_CLASS, 'disabled:opacity-60')}
            />
          </div>

          <div className="flex flex-col justify-end">
            <label htmlFor="voucher-ends-at" className={LABEL_CLASS}>
              Thời gian kết thúc
            </label>
            <input
              id="voucher-ends-at"
              type="datetime-local"
              value={endsAt}
              onChange={function (e) {
                setEndsAt(e.target.value)
              }}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Active Checkbox */}
        <div className="flex items-center gap-2.5 pt-1">
          <input
            id="voucher-active"
            type="checkbox"
            checked={active}
            onChange={function (e) {
              setActive(e.target.checked)
            }}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600"
          />
          <label
            htmlFor="voucher-active"
            className="cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-200"
          >
            Kích hoạt mã giảm giá ngay
          </label>
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-zinc-200/80 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={secondaryButtonClass()}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              primaryButtonClass(),
              'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isSubmitting && (
              <SpinnerGap size={16} weight="bold" className="motion-safe:animate-spin" />
            )}
            <span>{submitLabel}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
