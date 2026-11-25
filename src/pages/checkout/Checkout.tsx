import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useList } from '@generated/endpoints/addresses/addresses'
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CaretRight,
  CheckCircle,
  CreditCard,
  House,
  MapPin,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Storefront,
  Truck,
  WarningCircle,
} from '@phosphor-icons/react'

import AddressFormModal from '@/components/account/AddressFormModal'
import Modal from '@/components/Modal'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useCart } from '@/hooks/useCart'
import { useCheckoutPreview } from '@/hooks/useCheckoutPreview'
import { useSessionQuery } from '@/hooks/useSession'
import { fallbackImageOnError, takeData, urlOrPlaceholder } from '@/lib/api/apiAdapters'
import { formatFullAddress, formatVnd } from '@/lib/format'
import { notify } from '@/lib/notifications'
import { groupCartByShop } from '@/lib/shop/cartView'
import { cn, FOCUS_RING_CLASS } from '@/lib/ui/styles'

import type { AddressResponse } from '@generated/model/addressResponse'
import type { CartCheckoutRequest } from '@generated/model/cartCheckoutRequest'
import type { ShopCheckoutPreview } from '@generated/model/shopCheckoutPreview'

function resolveShippingAddress(fullAddress: string): string {
  if (fullAddress !== '') {
    return fullAddress
  }
  return 'Địa chỉ giao hàng mặc định'
}

function stepPillClass(status: 'active' | 'done' | 'upcoming'): string {
  if (status === 'active') {
    return 'btn-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-xs'
  }
  if (status === 'done') {
    return 'inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
  }
  return 'inline-flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400'
}

function radioIndicatorClass(selected: boolean): string {
  if (selected) {
    return 'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 dark:border-sky-400'
  }
  return 'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-zinc-300 dark:border-white/25'
}

interface FeeState {
  loading: boolean
  error: boolean
}

// Hiển thị một số tiền phí ship từ bản xem trước của server: đang tính / lỗi / miễn phí / số tiền.
function ShippingFeeValue(props: { fee: number | undefined; state: FeeState }) {
  if (props.fee === undefined) {
    if (props.state.loading) {
      return <span className="text-zinc-500 dark:text-zinc-400">Đang tính…</span>
    }
    return <span className="text-zinc-500 dark:text-zinc-400">—</span>
  }
  if (props.fee === 0) {
    return <span className="text-emerald-600 dark:text-emerald-300">Miễn phí</span>
  }
  return <span className="tabular-nums">{formatVnd(props.fee)}</span>
}

function ShopShippingRow(props: { quote: ShopCheckoutPreview }) {
  const amountToFreeShip = props.quote.amountToFreeShip ?? 0
  return (
    <div className="mt-2 rounded-2xl border border-zinc-200/80 bg-white/60 px-3.5 py-2.5 text-xs dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
          <Truck size={14} weight="bold" className="shrink-0" />
          Phí vận chuyển đơn này
        </span>
        <span className="font-extrabold text-[#17203a] dark:text-white">
          <ShippingFeeValue
            fee={props.quote.shippingFee}
            state={{ loading: false, error: false }}
          />
        </span>
      </div>
      {amountToFreeShip > 0 && (
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Mua thêm{' '}
          <strong className="font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
            {formatVnd(amountToFreeShip)}
          </strong>{' '}
          từ shop này để được miễn phí vận chuyển
        </p>
      )}
    </div>
  )
}

function CheckoutSteps(props: { hasAddress: boolean }) {
  let step1Status: 'active' | 'done' | 'upcoming' = 'active'
  let step2Status: 'active' | 'done' | 'upcoming' = 'upcoming'
  let step3Status: 'active' | 'done' | 'upcoming' = 'upcoming'
  if (props.hasAddress) {
    step1Status = 'done'
    step2Status = 'done'
    step3Status = 'active'
  }

  return (
    <ol aria-label="Các bước thanh toán" className="mt-4 flex flex-wrap items-center gap-2">
      <li className={stepPillClass(step1Status)}>
        {step1Status === 'done' && <CheckCircle size={14} weight="fill" />}
        <span>1. Địa chỉ</span>
      </li>
      <li aria-hidden="true" className="text-zinc-400 dark:text-zinc-500">
        <CaretRight size={14} weight="bold" />
      </li>
      <li className={stepPillClass(step2Status)}>
        {step2Status === 'done' && <CheckCircle size={14} weight="fill" />}
        <span>2. Thanh toán</span>
      </li>
      <li aria-hidden="true" className="text-zinc-400 dark:text-zinc-500">
        <CaretRight size={14} weight="bold" />
      </li>
      <li className={stepPillClass(step3Status)}>
        <span>3. Xác nhận</span>
      </li>
    </ol>
  )
}

export default function Checkout() {
  const cart = useCart()
  const { data: session } = useSessionQuery()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Cart chi truyen mon da tick; rong = checkout ca gio.
  const wanted = (params.get('variantIds') ?? '').split(',').filter(function (id) {
    return id !== ''
  })

  const [pickerOpen, setPickerOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)

  const addressesQuery = useList({
    query: {
      enabled: cart.isLoggedIn,
    },
  })

  let addresses: AddressResponse[] = []
  if (addressesQuery.data !== undefined) {
    addresses = takeData(addressesQuery.data)
  }

  // Chọn địa chỉ hiển thị
  let currentAddress: AddressResponse | null = null
  if (addresses.length > 0) {
    if (selectedAddressId !== null) {
      currentAddress =
        addresses.find(function (a) {
          return a.id === selectedAddressId
        }) || null
    }
    if (currentAddress === null) {
      currentAddress =
        addresses.find(function (a) {
          return a.defaultAddress === true
        }) ||
        addresses[0] ||
        null
    }
  }

  const missingPhone =
    currentAddress !== null &&
    (currentAddress.phoneNumber === undefined ||
      currentAddress.phoneNumber === null ||
      currentAddress.phoneNumber.trim() === '')

  // Chi tinh tren mon duoc chon khi co ?variantIds=, khong thi ca gio.
  let orderItems = cart.items
  if (wanted.length > 0) {
    orderItems = cart.items.filter(function (item) {
      return wanted.includes(item.variantId ?? '')
    })
  }

  const shopGroups = groupCartByShop(orderItems)

  let selectedSubtotal = 0
  for (const item of orderItems) {
    selectedSubtotal += (item.unitPrice ?? 0) * (item.quantity ?? 1)
  }

  // Phí ship và tổng tiền do server tính (mỗi shop 1 đơn), FE chỉ hiển thị.
  const checkoutPreview = useCheckoutPreview(wanted, cart.isLoggedIn && orderItems.length > 0)
  const preview = checkoutPreview.preview
  const shopQuotes = new Map<string, ShopCheckoutPreview>()
  if (preview !== null) {
    for (const shopQuote of preview.shops ?? []) {
      shopQuotes.set(shopQuote.shopId ?? '', shopQuote)
    }
  }
  let displaySubtotal = selectedSubtotal
  if (preview !== null) {
    displaySubtotal = preview.subtotal ?? 0
  }
  const feeState: FeeState = {
    loading: checkoutPreview.isLoading,
    error: checkoutPreview.isError,
  }
  let totalLabel = '—'
  if (feeState.loading) {
    totalLabel = 'Đang tính…'
  }
  if (preview !== null) {
    totalLabel = formatVnd(preview.total ?? 0)
  }

  function handlePlaceOrder() {
    if (currentAddress === null) {
      notify.warning('Vui lòng thêm hoặc chọn địa chỉ nhận hàng')
      return
    }

    const fullAddr = formatFullAddress(currentAddress)
    const nameToUse = currentAddress.recipientName || session?.user.email || 'Khách Hàng'
    const rawPhone = (currentAddress.phoneNumber ?? '').trim()
    let phoneToUse = rawPhone
    if (rawPhone === '') {
      notify.warning(
        'Địa chỉ nhận hàng chưa có số điện thoại',
        'Vui lòng cập nhật SĐT trong Sổ địa chỉ để shipper liên lạc thuận tiện hơn.',
      )
      phoneToUse = '0900000000'
    }

    const payload: CartCheckoutRequest = {
      shippingName: nameToUse,
      shippingPhone: phoneToUse,
      shippingAddress: resolveShippingAddress(fullAddr),
    }
    if (wanted.length > 0) {
      payload.variantIds = wanted
    }

    cart.checkout.mutate(
      { data: payload },
      {
        onSuccess: function () {
          notify.success('Đặt hàng thành công', 'Đơn hàng của bạn đã được tiếp nhận.')
          void navigate('/account/orders')
        },
        onError: function (err) {
          notify.fromError(err, 'checkout', 'Không thể hoàn tất đặt hàng. Vui lòng thử lại.')
        },
      },
    )
  }

  if (!cart.isLoggedIn) {
    return (
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16 text-center">
        <div className="glass mx-auto max-w-md rounded-3xl p-8">
          <ShoppingBag size={48} className="mx-auto text-blue-600 dark:text-sky-300" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Thanh toán đơn hàng</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Vui lòng đăng nhập để tiến hành đặt hàng.
          </p>
          <Link
            to="/login"
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold"
          >
            <span>Đăng Nhập Ngay</span>
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </main>
    )
  }

  if (orderItems.length === 0 && (cart.isLoading || cart.isFetching)) {
    return <PageSkeleton />
  }

  if (orderItems.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16 text-center">
        <div className="glass mx-auto max-w-md rounded-3xl p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Không có sản phẩm để thanh toán
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Giỏ hàng của bạn đang trống.
          </p>
          <Link
            to="/cart"
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Về Giỏ Hàng</span>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-24 pb-28 lg:pb-16">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Giỏ hàng', to: '/cart' },
          { label: 'Thanh toán' },
        ]}
        showHomeIcon={true}
        className="mb-4"
      />

      {/* Header trang thanh toán */}
      <div className="border-b border-zinc-200/70 pb-5 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Thanh Toán</h1>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Xác nhận thông tin giao hàng và đặt hàng
            </p>
          </div>
          <Link
            to="/cart"
            className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Quay lại giỏ hàng</span>
          </Link>
        </div>
        <CheckoutSteps hasAddress={currentAddress !== null} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột trái: Địa chỉ & Sản phẩm */}
        <div className="space-y-6 lg:col-span-8">
          {/* Khối Địa chỉ nhận hàng */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] text-white shadow-lg">
                  <MapPin size={16} weight="fill" />
                </span>
                <span className="text-sm font-extrabold text-[#17203a] dark:text-[#e2e8f0]">
                  Địa chỉ nhận hàng
                </span>
              </div>
              <button
                type="button"
                onClick={function () {
                  if (addresses.length > 0) {
                    setPickerOpen(true)
                  } else {
                    setFormOpen(true)
                  }
                }}
                className={cn(
                  'cursor-pointer rounded-full px-2 py-1 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300',
                  FOCUS_RING_CLASS,
                )}
              >
                {addresses.length > 0 && 'Thay Đổi'}
                {addresses.length === 0 && 'Thêm mới'}
              </button>
            </div>

            {currentAddress !== null && (
              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-[#17203a] dark:text-white">
                    {currentAddress.recipientName || session?.user.email}
                  </span>
                  <span className="text-zinc-300 dark:text-white/20">|</span>
                  <span className="text-xs font-semibold text-zinc-700 tabular-nums dark:text-zinc-300">
                    {currentAddress.phoneNumber || 'Chưa có SĐT'}
                  </span>

                  {currentAddress.label === 'HOME' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300">
                      <House size={11} weight="fill" />
                      Nhà riêng
                    </span>
                  )}
                  {currentAddress.label === 'OFFICE' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300">
                      <Buildings size={11} weight="fill" />
                      Công ty
                    </span>
                  )}
                  {currentAddress.label === 'OTHER' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300">
                      <MapPin size={11} weight="fill" />
                      Khác
                    </span>
                  )}

                  {currentAddress.defaultAddress === true && (
                    <span className="shrink-0 rounded-full bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  {formatFullAddress(currentAddress)}
                </p>

                {missingPhone && (
                  <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
                    <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                    <span>
                      Địa chỉ này chưa có số điện thoại liên hệ. Bạn nên cập nhật số điện thoại để
                      shipper dễ dàng liên lạc khi giao hàng.
                    </span>
                  </div>
                )}
              </div>
            )}

            {currentAddress === null && (
              <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/60 p-4 text-center dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Bạn chưa có địa chỉ nhận hàng nào trong sổ địa chỉ.
                </p>
                <button
                  type="button"
                  onClick={function () {
                    setFormOpen(true)
                  }}
                  className="btn-primary mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold"
                >
                  <Plus size={14} weight="bold" />
                  <span>Thêm địa chỉ mới</span>
                </button>
              </div>
            )}
          </div>

          {/* Danh sách sản phẩm đặt mua nhóm theo shop */}
          <div className="glass rounded-3xl p-6">
            <h2 className="text-sm font-extrabold text-[#17203a] dark:text-white">
              Sản Phẩm Đặt Mua ({orderItems.length})
            </h2>

            <div className="mt-4 space-y-5">
              {shopGroups.map(function (group, groupIdx) {
                const shopQuote = shopQuotes.get(group.shopId)
                return (
                  <div key={group.shopId || `shop-group-${groupIdx}`}>
                    {group.shopName !== '' && (
                      <div className="mb-2 flex items-center gap-1.5 border-b border-zinc-200/70 pb-2 text-xs font-extrabold text-[#17203a] dark:border-white/10 dark:text-white">
                        <Storefront
                          size={15}
                          weight="bold"
                          className="shrink-0 text-blue-700 dark:text-sky-300"
                        />
                        <span>{group.shopName}</span>
                      </div>
                    )}

                    <div className="divide-y divide-zinc-200/70 dark:divide-white/10">
                      {group.items.map(function (item) {
                        const lineTotal = (item.unitPrice ?? 0) * (item.quantity ?? 1)
                        return (
                          <div key={item.variantId} className="flex items-center gap-3.5 py-3">
                            <img
                              src={urlOrPlaceholder(item.imageUrl)}
                              alt={item.productName ?? 'Sản phẩm'}
                              loading="lazy"
                              onError={fallbackImageOnError}
                              className="h-14 w-14 shrink-0 rounded-2xl border border-zinc-200/80 bg-zinc-100 object-cover dark:border-white/10 dark:bg-white/5"
                            />
                            <div className="min-w-0 flex-1">
                              {item.productId !== undefined && (
                                <Link
                                  to={`/product/${item.productId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block truncate text-sm font-bold text-[#17203a] transition hover:text-blue-700 hover:underline dark:text-white dark:hover:text-sky-300"
                                  title="Xem chi tiết sản phẩm (mở tab mới)"
                                >
                                  {item.productName}
                                </Link>
                              )}
                              {item.productId === undefined && (
                                <p className="truncate text-sm font-bold text-[#17203a] dark:text-white">
                                  {item.productName}
                                </p>
                              )}
                              <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                                {item.variantLabel} × {item.quantity}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-extrabold text-[#17203a] tabular-nums dark:text-zinc-100">
                              {formatVnd(lineTotal)}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {shopQuote !== undefined && <ShopShippingRow quote={shopQuote} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Phương thức vận chuyển & thanh toán */}
          <div className="glass rounded-3xl p-6">
            <h2 className="text-sm font-extrabold text-[#17203a] dark:text-white">
              Phương thức vận chuyển &amp; thanh toán
            </h2>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-4 text-xs dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] text-white shadow-lg">
                    <Truck size={20} weight="fill" />
                  </span>
                  <div>
                    <p className="font-extrabold text-[#17203a] dark:text-white">
                      Vận chuyển tiêu chuẩn (Toàn quốc)
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      Dự kiến nhận hàng trong 2-3 ngày · mỗi shop giao một kiện riêng
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-extrabold text-[#17203a] dark:text-white">
                  <ShippingFeeValue fee={preview?.shippingFee} state={feeState} />
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-4 text-xs dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] text-white shadow-lg">
                    <CreditCard size={20} weight="fill" />
                  </span>
                  <div>
                    <p className="font-extrabold text-[#17203a] dark:text-white">
                      Thanh toán khi nhận hàng (COD)
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      Kiểm tra hàng trước khi thanh toán cho shipper
                    </p>
                  </div>
                </div>
                <CheckCircle
                  size={18}
                  weight="fill"
                  className="shrink-0 text-blue-700 dark:text-sky-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Bảng tổng kết thanh toán */}
        <div className="lg:col-span-4">
          <div className="glass sticky top-24 rounded-3xl p-6">
            <h2 className="text-base font-extrabold tracking-tight">Chi tiết thanh toán</h2>

            <div className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">Tổng tiền hàng:</span>
                <span className="font-bold text-[#17203a] tabular-nums dark:text-zinc-200">
                  {formatVnd(displaySubtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">Phí vận chuyển:</span>
                <span className="font-bold text-[#17203a] dark:text-zinc-200">
                  <ShippingFeeValue fee={preview?.shippingFee} state={feeState} />
                </span>
              </div>
              <div className="border-t border-zinc-200/70 pt-3 dark:border-white/10">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-extrabold">Tổng thanh toán:</span>
                  <span className="text-xl font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
                    {totalLabel}
                  </span>
                </div>
              </div>
              {feeState.error && (
                <p
                  role="alert"
                  className="flex items-start gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200"
                >
                  <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0" />
                  <span>Không tính được phí vận chuyển. Vui lòng tải lại trang.</span>
                </p>
              )}
            </div>

            <button
              type="button"
              id="btn-confirm-order"
              onClick={handlePlaceOrder}
              disabled={cart.checkout.isPending || currentAddress === null || preview === null}
              className={cn(
                'btn-primary mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
                FOCUS_RING_CLASS,
              )}
            >
              {cart.checkout.isPending && <span>Đang xử lý đặt hàng…</span>}
              {!cart.checkout.isPending && <span>Đặt Hàng (COD)</span>}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Bảo vệ quyền lợi người mua 100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Place Order Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/90 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-md lg:hidden dark:border-white/10 dark:bg-[#11182a]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Thanh toán COD
            </p>
            <p className="truncate text-base font-extrabold text-blue-700 tabular-nums dark:text-sky-300">
              Tổng: {totalLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={cart.checkout.isPending || currentAddress === null || preview === null}
            className={cn(
              'btn-primary shrink-0 cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
              FOCUS_RING_CLASS,
            )}
          >
            {cart.checkout.isPending && <span>Đang xử lý…</span>}
            {!cart.checkout.isPending && <span>Đặt hàng ngay</span>}
          </button>
        </div>
      </div>

      {/* Modal Chọn Địa Chỉ Có Sẵn */}
      {pickerOpen && (
        <Modal
          title="Chọn Địa Chỉ Nhận Hàng"
          onClose={function () {
            setPickerOpen(false)
          }}
        >
          <fieldset className="mt-4 max-h-72 space-y-3 overflow-y-auto">
            <legend className="sr-only">Danh sách địa chỉ nhận hàng</legend>
            {addresses.map(function (a) {
              const isSelected = (selectedAddressId ?? currentAddress?.id) === a.id
              let itemClass =
                'flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-zinc-300 bg-white/80 p-4 text-left text-xs transition hover:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/40 dark:border-white/15 dark:bg-white/5 dark:hover:border-sky-400 dark:focus-within:ring-sky-400/45'
              if (isSelected) {
                itemClass =
                  'flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-blue-600 bg-blue-600/5 p-4 text-left text-xs transition focus-within:ring-2 focus-within:ring-blue-600/40 dark:border-sky-400 dark:bg-white/10 dark:focus-within:ring-sky-400/45'
              }
              return (
                <label key={a.id} className={itemClass}>
                  <input
                    type="radio"
                    name="checkout-shipping-address"
                    checked={isSelected}
                    onChange={function () {
                      if (a.id !== undefined) {
                        setSelectedAddressId(a.id)
                        setPickerOpen(false)
                      }
                    }}
                    onClick={function () {
                      if (isSelected) {
                        setPickerOpen(false)
                      }
                    }}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className={radioIndicatorClass(isSelected)}>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-sky-400" />
                    )}
                  </span>
                  <span className="block min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#17203a] dark:text-white">
                        {a.recipientName || 'Khách hàng'}
                      </span>
                      <span className="text-zinc-500 tabular-nums dark:text-zinc-400">
                        ({a.phoneNumber || 'Chưa có SĐT'})
                      </span>
                      {a.defaultAddress === true && (
                        <span className="rounded-full bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8] px-2 py-0.5 text-[10px] font-bold text-white">
                          Mặc định
                        </span>
                      )}
                    </span>
                    <span className="block text-zinc-600 dark:text-zinc-300">
                      {formatFullAddress(a)}
                    </span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          <div className="mt-5 border-t border-zinc-200/70 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={function () {
                setPickerOpen(false)
                setFormOpen(true)
              }}
              className="btn-primary flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold"
            >
              <Plus size={14} weight="bold" />
              <span>Thêm địa chỉ mới</span>
            </button>
          </div>
        </Modal>
      )}

      {/* Form Thêm Địa Chỉ — dùng chung component với trang Account */}
      {formOpen && (
        <AddressFormModal
          mode="create"
          initial={null}
          onClose={function () {
            setFormOpen(false)
          }}
          onSaved={function (a) {
            if (a.id !== undefined) {
              setSelectedAddressId(a.id)
            }
          }}
        />
      )}
    </main>
  )
}
