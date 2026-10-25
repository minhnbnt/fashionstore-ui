import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useList1 } from '@generated/endpoints/addresses/addresses'
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CheckCircle,
  CreditCard,
  House,
  MapPin,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from '@phosphor-icons/react'

import { takeData } from '@/lib/apiAdapters'
import { formatFullAddress, formatVnd } from '@/lib/format'

import AddressFormModal from '../components/account/AddressFormModal'
import Modal from '../components/Modal'
import { useCart } from '../hooks/useCart'
import { useSessionQuery } from '../hooks/useSession'

import type { AddressResponse } from '@generated/model/addressResponse'
import type { CartCheckoutRequest } from '@generated/model/cartCheckoutRequest'

function resolveShippingAddress(fullAddress: string): string {
  if (fullAddress !== '') {
    return fullAddress
  }
  return 'Địa chỉ giao hàng mặc định'
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
  const [buyerNote, setBuyerNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(function () {
      setToast(null)
    }, 3000)
  }

  const addressesQuery = useList1({
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

  // Chi tinh tren mon duoc chon khi co ?variantIds=, khong thi ca gio.
  let orderItems = cart.items
  if (wanted.length > 0) {
    orderItems = cart.items.filter(function (item) {
      return wanted.includes(item.variantId ?? '')
    })
  }

  let selectedSubtotal = 0
  for (const item of orderItems) {
    selectedSubtotal += (item.unitPrice ?? 0) * (item.quantity ?? 1)
  }

  // Phí vận chuyển
  let shippingFee = 30000
  if (selectedSubtotal >= 500000) {
    shippingFee = 0
  }
  const finalTotal = selectedSubtotal + shippingFee

  function handlePlaceOrder() {
    if (currentAddress === null) {
      showToast('Vui lòng thêm hoặc chọn địa chỉ nhận hàng')
      return
    }

    const fullAddr = formatFullAddress(currentAddress)
    const nameToUse = currentAddress.recipientName || session?.user.email || 'Khách Hàng'
    const phoneToUse = currentAddress.phoneNumber || '0900000000'

    const payload: CartCheckoutRequest = {
      shippingName: nameToUse,
      shippingPhone: phoneToUse,
      shippingAddress: resolveShippingAddress(fullAddr),
      shippingFee: shippingFee,
    }
    if (wanted.length > 0) {
      payload.variantIds = wanted
    }

    cart.checkout.mutate(
      { data: payload },
      {
        onSuccess: function () {
          void navigate('/account#orders')
        },
        onError: function () {
          showToast('Không thể hoàn tất đặt hàng. Vui lòng thử lại.')
        },
      },
    )
  }

  if (!cart.isLoggedIn) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-32 pb-24 text-center md:pt-36">
        <div className="glass mx-auto max-w-md rounded-3xl p-8">
          <ShoppingBag size={48} className="mx-auto text-blue-600 dark:text-sky-300" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Thanh Toán Đơn Hàng</h1>
          <p className="mt-2 text-sm text-zinc-500">Vui lòng đăng nhập để tiến hành đặt hàng.</p>
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

  if (orderItems.length === 0) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-32 pb-24 text-center md:pt-36">
        <div className="glass mx-auto max-w-md rounded-3xl p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Không có sản phẩm để thanh toán
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Giỏ hàng của bạn đang trống.</p>
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
    <main className="mx-auto max-w-[1200px] px-4 pt-32 pb-24 md:pt-36">
      {toast !== null && (
        <div className="glass fixed bottom-12 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-bold shadow-2xl">
          {toast}
        </div>
      )}

      {/* Header trang thanh toán */}
      <div className="flex items-center justify-between border-b border-zinc-200/70 pb-4 dark:border-white/10">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Thanh Toán</h1>
          <p className="mt-1 text-xs text-zinc-500">Xác nhận thông tin giao hàng và đặt hàng</p>
        </div>
        <Link
          to="/cart"
          className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline dark:text-sky-300"
        >
          <ArrowLeft size={14} weight="bold" />
          <span>Quay lại giỏ hàng</span>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột trái: Địa chỉ & Sản phẩm */}
        <div className="space-y-6 lg:col-span-8">
          {/* Khối Địa Chỉ Nhận Hàng */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] text-white shadow-lg">
                  <MapPin size={16} weight="fill" />
                </span>
                <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  Địa Chỉ Nhận Hàng
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
                className="text-xs font-bold text-blue-700 hover:underline dark:text-sky-300"
              >
                {addresses.length > 0 && 'Thay Đổi'}
                {addresses.length === 0 && 'Thêm Mới'}
              </button>
            </div>

            {currentAddress !== null && (
              <div className="mt-4 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-zinc-900 dark:text-white">
                    {currentAddress.recipientName || session?.user.email}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {currentAddress.phoneNumber || 'Chưa có SĐT'}
                  </span>

                  {currentAddress.label === 'HOME' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300">
                      <House size={11} weight="fill" />
                      Nhà riêng
                    </span>
                  )}
                  {currentAddress.label === 'OFFICE' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300">
                      <Buildings size={11} weight="fill" />
                      Công ty
                    </span>
                  )}
                  {currentAddress.label === 'OTHER' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300">
                      <MapPin size={11} weight="fill" />
                      Khác
                    </span>
                  )}

                  {currentAddress.defaultAddress === true && (
                    <span className="shrink-0 rounded-full bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8] px-2 py-0.5 text-[10px] font-extrabold text-white">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  {formatFullAddress(currentAddress)}
                </p>
              </div>
            )}

            {currentAddress === null && (
              <div className="mt-4 rounded-2xl bg-zinc-100/70 p-4 text-center dark:bg-white/5">
                <p className="text-xs text-zinc-500">
                  Bạn chưa có địa chỉ nhận hàng nào trong sổ địa chỉ.
                </p>
                <button
                  type="button"
                  onClick={function () {
                    setFormOpen(true)
                  }}
                  className="btn-primary mt-3 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold"
                >
                  <Plus size={14} weight="bold" />
                  <span>Thêm Địa Chỉ Mới</span>
                </button>
              </div>
            )}
          </div>

          {/* Danh Sách Sản Phẩm Đặt Mua */}
          <div className="glass rounded-3xl p-6">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Sản Phẩm Đặt Mua ({orderItems.length})
            </h2>

            <div className="mt-4 divide-y divide-zinc-200/70 dark:divide-white/10">
              {orderItems.map(function (item) {
                const lineTotal = (item.unitPrice ?? 0) * (item.quantity ?? 1)
                return (
                  <div key={item.variantId} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                        {item.productName}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {item.variantLabel} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                      {formatVnd(lineTotal)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Lời nhắn cho người bán */}
            <div className="mt-4 border-t border-zinc-200/70 pt-4 dark:border-white/10">
              <label htmlFor="buyer-note" className="block text-xs font-bold text-zinc-500">
                Lời nhắn cho người bán (tùy chọn)
              </label>
              <input
                id="buyer-note"
                value={buyerNote}
                onChange={function (e) {
                  setBuyerNote(e.target.value)
                }}
                placeholder="Lưu ý giao hàng, khung giờ nhận..."
                className="mt-2 w-full rounded-full border border-zinc-200 bg-white/80 px-4 py-2.5 text-xs outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-zinc-500"
              />
            </div>
          </div>

          {/* Phương Thức Vận Chuyển & Thanh Toán */}
          <div className="glass rounded-3xl p-6">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Phương Thức Vận Chuyển &amp; Thanh Toán
            </h2>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/60 p-4 text-xs dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] text-white shadow-lg">
                    <Truck size={20} weight="fill" />
                  </span>
                  <div>
                    <p className="font-extrabold text-zinc-900 dark:text-white">
                      Vận chuyển Tiêu chuẩn (Toàn quốc)
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      Dự kiến nhận hàng trong 2-3 ngày
                    </p>
                  </div>
                </div>
                {shippingFee === 0 && (
                  <span className="shrink-0 font-extrabold text-emerald-600 dark:text-emerald-300">
                    Miễn phí
                  </span>
                )}
                {shippingFee > 0 && (
                  <span className="shrink-0 font-extrabold text-zinc-900 dark:text-white">
                    {formatVnd(shippingFee)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/60 p-4 text-xs dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] text-white shadow-lg">
                    <CreditCard size={20} weight="fill" />
                  </span>
                  <div>
                    <p className="font-extrabold text-zinc-900 dark:text-white">
                      Thanh toán khi nhận hàng (COD)
                    </p>
                    <p className="text-zinc-500">Kiểm tra hàng trước khi thanh toán cho shipper</p>
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

        {/* Cột phải: Bảng Tổng Kết Thanh Toán */}
        <div className="lg:col-span-4">
          <div className="glass sticky top-24 rounded-3xl p-6">
            <h2 className="text-base font-extrabold tracking-tight">Chi Tiết Thanh Toán</h2>

            <div className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Tổng tiền hàng:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {formatVnd(selectedSubtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Phí vận chuyển:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {shippingFee === 0 && <span className="text-emerald-600">Miễn phí</span>}
                  {shippingFee > 0 && formatVnd(shippingFee)}
                </span>
              </div>
              <div className="border-t border-zinc-200/70 pt-3 dark:border-white/10">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-extrabold">Tổng thanh toán:</span>
                  <span className="text-xl font-extrabold text-blue-700 dark:text-sky-300">
                    {formatVnd(finalTotal)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="btn-confirm-order"
              onClick={handlePlaceOrder}
              disabled={cart.checkout.isPending || currentAddress === null}
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-bold disabled:opacity-50"
            >
              {cart.checkout.isPending && <span>Đang xử lý đặt hàng…</span>}
              {!cart.checkout.isPending && <span>Đặt Hàng (COD)</span>}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Bảo vệ quyền lợi người mua 100%</span>
            </div>
          </div>
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
          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
            {addresses.map(function (a) {
              const isSelected = (selectedAddressId ?? currentAddress?.id) === a.id
              let itemClass =
                'flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-4 text-left text-xs transition hover:border-zinc-400 dark:border-white/15'
              if (isSelected) {
                itemClass =
                  'flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-blue-700 bg-blue-700/5 p-4 text-left text-xs transition dark:border-skytint-500/60 dark:bg-white/5'
              }
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={function () {
                    if (a.id !== undefined) {
                      setSelectedAddressId(a.id)
                      setPickerOpen(false)
                    }
                  }}
                  className={itemClass}
                >
                  <input
                    type="radio"
                    checked={isSelected}
                    readOnly
                    aria-label="Chọn địa chỉ giao hàng này"
                    className="dark:accent-skytint-500 mt-0.5 cursor-pointer accent-blue-700"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {a.recipientName || 'Khách hàng'}
                      </span>
                      <span className="text-zinc-400">({a.phoneNumber || 'Chưa có SĐT'})</span>
                      {a.defaultAddress === true && (
                        <span className="rounded-full bg-gradient-to-r from-[#312e81] via-[#1d4ed8] to-[#38bdf8] px-2 py-0.5 text-[10px] font-bold text-white">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300">{formatFullAddress(a)}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-5 border-t border-zinc-200/70 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={function () {
                setPickerOpen(false)
                setFormOpen(true)
              }}
              className="btn-primary flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold"
            >
              <Plus size={14} weight="bold" />
              <span>Thêm Địa Chỉ Mới</span>
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
            showToast('Đã thêm địa chỉ giao hàng mới')
          }}
        />
      )}
    </main>
  )
}
