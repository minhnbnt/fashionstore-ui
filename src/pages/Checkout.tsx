import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { getList1QueryKey, useAdd, useList1 } from '@generated/endpoints/addresses/addresses'
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
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'
import { formatFullAddress, formatVnd } from '@/lib/format'

import { useCart } from '../hooks/useCart'
import { useSessionQuery } from '../hooks/useSession'

import type { AddressRequestLabel } from '@generated/model/addressRequestLabel'
import type { AddressResponse } from '@generated/model/addressResponse'

export default function Checkout() {
  const cart = useCart()
  const { data: session } = useSessionQuery()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [newAddressModalOpen, setNewAddressModalOpen] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [buyerNote, setBuyerNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  // New Address form states
  const [recipientName, setRecipientName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [detailAddress, setDetailAddress] = useState('')
  const [ward, setWard] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [label, setLabel] = useState<AddressRequestLabel>('HOME')

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

  const addAddressMutation = useAdd({
    mutation: {
      onSuccess: function (res) {
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
        setNewAddressModalOpen(false)
        const newAddr = takeData(res)
        if (newAddr.id !== undefined) {
          setSelectedAddressId(newAddr.id)
        }
        showToast('Đã thêm địa chỉ giao hàng mới')
      },
      onError: function () {
        showToast('Không thể thêm địa chỉ. Vui lòng kiểm tra lại thông tin.')
      },
    },
  })

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

  // Phí vận chuyển
  let shippingFee = 30000
  if (cart.subtotal >= 500000) {
    shippingFee = 0
  }
  const finalTotal = cart.subtotal + shippingFee

  function handleCreateAddress(e: React.FormEvent) {
    e.preventDefault()
    if (addresses.length >= 10) {
      showToast('Bạn đã đạt tối đa 10 địa chỉ nhận hàng')
      return
    }
    if (recipientName.trim() === '' || phoneNumber.trim() === '' || city.trim() === '' || detailAddress.trim() === '') {
      showToast('Vui lòng điền đầy đủ tên người nhận, SĐT, tỉnh/thành và địa chỉ chi tiết')
      return
    }
    addAddressMutation.mutate({
      data: {
        recipientName: recipientName.trim(),
        phoneNumber: phoneNumber.trim(),
        detailAddress: detailAddress.trim(),
        ward: ward.trim(),
        district: district.trim(),
        city: city.trim(),
        label: label,
      },
    })
  }

  function handlePlaceOrder() {
    if (currentAddress === null) {
      showToast('Vui lòng thêm hoặc chọn địa chỉ nhận hàng')
      return
    }

    const fullAddr = formatFullAddress(currentAddress)
    const nameToUse = currentAddress.recipientName || session?.user.email || 'Khách Hàng'
    const phoneToUse = currentAddress.phoneNumber || '0900000000'

    cart.checkout.mutate(
      {
        data: {
          shippingName: nameToUse,
          shippingPhone: phoneToUse,
          shippingAddress: fullAddr !== '' ? fullAddr : 'Địa chỉ giao hàng mặc định',
          shippingFee: shippingFee,
        },
      },
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
        <div className="mx-auto max-w-md rounded-3xl border border-sky-100 bg-white/80 p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
          <ShoppingBag size={48} className="mx-auto text-blue-600 dark:text-sky-300" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Thanh Toán Đơn Hàng</h1>
          <p className="mt-2 text-sm text-zinc-500">Vui lòng đăng nhập để tiến hành đặt hàng.</p>
          <Link
            to="/login"
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold shadow-lg shadow-blue-500/20"
          >
            <span>Đăng Nhập Ngay</span>
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </main>
    )
  }

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 pt-32 pb-24 text-center md:pt-36">
        <div className="mx-auto max-w-md rounded-3xl border border-sky-100 bg-white/80 p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Không có sản phẩm để thanh toán
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Giỏ hàng của bạn đang trống.</p>
          <Link
            to="/cart"
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold shadow-lg shadow-blue-500/20"
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
      <div className="flex items-center justify-between border-b border-sky-100 pb-4 dark:border-white/10">
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
          {/* Khối Địa Chỉ Nhận Hàng (Shopee Style) */}
          <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            {/* Thanh sọc trang trí Shopee */}
            <div className="-mx-6 -mt-6 mb-5 h-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-extrabold text-blue-700 dark:text-sky-300">
                <MapPin size={18} weight="fill" />
                <span>Địa Chỉ Nhận Hàng</span>
              </div>
              <button
                type="button"
                onClick={function () {
                  setAddressModalOpen(true)
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                      <House size={11} weight="fill" />
                      Nhà riêng
                    </span>
                  )}
                  {currentAddress.label === 'OFFICE' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                      <Buildings size={11} weight="fill" />
                      Công ty
                    </span>
                  )}
                  {currentAddress.label === 'OTHER' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300">
                      <MapPin size={11} weight="fill" />
                      Khác
                    </span>
                  )}

                  {currentAddress.defaultAddress === true && (
                    <span className="shrink-0 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
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
              <div className="mt-4 rounded-2xl bg-sky-50/50 p-4 text-center dark:bg-white/5">
                <p className="text-xs text-zinc-500">
                  Bạn chưa có địa chỉ nhận hàng nào trong sổ địa chỉ.
                </p>
                <button
                  type="button"
                  onClick={function () {
                    setNewAddressModalOpen(true)
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
          <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Sản Phẩm Đặt Mua ({cart.items.length})
            </h2>

            <div className="mt-4 divide-y divide-sky-100 dark:divide-white/10">
              {cart.items.map(function (item) {
                const lineTotal = (item.unitPrice ?? 0) * (item.quantity ?? 1)
                return (
                  <div key={item.variantId} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      {item.productId ? (
                        <Link
                          to={`/products/${item.productId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate block text-sm font-bold text-zinc-900 transition hover:text-blue-600 hover:underline dark:text-white dark:hover:text-sky-400"
                          title="Xem chi tiết sản phẩm (mở tab mới)"
                        >
                          {item.productName}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                          {item.productName}
                        </p>
                      )}
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
            <div className="mt-4 border-t border-sky-100 pt-4 dark:border-white/10">
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
                className="mt-2 w-full rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-2.5 text-xs outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white dark:placeholder-zinc-500"
              />
            </div>
          </div>

          {/* Phương Thức Vận Chuyển & Thanh Toán */}
          <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Phương Thức Vận Chuyển &amp; Thanh Toán
            </h2>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs dark:border-emerald-500/20 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <Truck size={20} className="text-emerald-600" />
                  <div>
                    <p className="font-extrabold text-emerald-900 dark:text-emerald-200">
                      Vận chuyển Tiêu chuẩn (Toàn quốc)
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      Dự kiến nhận hàng trong 2-3 ngày
                    </p>
                  </div>
                </div>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                  {shippingFee === 0 && 'Miễn phí'}
                  {shippingFee > 0 && formatVnd(shippingFee)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50/60 p-4 text-xs dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-blue-600 dark:text-sky-300" />
                  <div>
                    <p className="font-extrabold text-zinc-900 dark:text-white">
                      Thanh toán khi nhận hàng (COD)
                    </p>
                    <p className="text-zinc-500">Kiểm tra hàng trước khi thanh toán cho shipper</p>
                  </div>
                </div>
                <CheckCircle size={18} weight="fill" className="text-blue-600 dark:text-sky-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Bảng Tổng Kết Thanh Toán */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900/90">
            <h2 className="text-base font-extrabold tracking-tight">Chi Tiết Thanh Toán</h2>

            <div className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Tổng tiền hàng:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {formatVnd(cart.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Phí vận chuyển:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {shippingFee === 0 && <span className="text-emerald-600">Miễn phí</span>}
                  {shippingFee > 0 && formatVnd(shippingFee)}
                </span>
              </div>
              <div className="border-t border-sky-100 pt-3 dark:border-white/10">
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
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-bold shadow-xl shadow-blue-500/25 disabled:opacity-50"
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
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-white/10">
              <h3 className="text-base font-extrabold">Chọn Địa Chỉ Nhận Hàng</h3>
              <button
                type="button"
                onClick={function () {
                  setAddressModalOpen(false)
                }}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {addresses.map(function (a) {
                const isSelected = (selectedAddressId ?? currentAddress?.id) === a.id
                let itemClass =
                  'flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left text-xs transition border-zinc-200 hover:border-zinc-400 dark:border-white/10'
                if (isSelected) {
                  itemClass =
                    'flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left text-xs transition border-blue-600 bg-blue-50/50 dark:border-sky-400 dark:bg-sky-500/10'
                }
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={function () {
                      if (a.id !== undefined) {
                        setSelectedAddressId(a.id)
                        setAddressModalOpen(false)
                      }
                    }}
                    className={itemClass}
                  >
                    <input
                      type="radio"
                      checked={isSelected}
                      readOnly
                      className="mt-0.5 cursor-pointer accent-blue-600"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {a.recipientName || 'Khách hàng'}
                        </span>
                        <span className="text-zinc-400">({a.phoneNumber || 'Chưa có SĐT'})</span>
                        {a.defaultAddress === true && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300">
                        {formatFullAddress(a)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-white/10">
              <button
                type="button"
                onClick={function () {
                  setAddressModalOpen(false)
                  setNewAddressModalOpen(true)
                }}
                className="btn-primary flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold"
              >
                <Plus size={14} weight="bold" />
                <span>Thêm Địa Chỉ Mới</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Địa Chỉ Mới */}
      {newAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-white/10">
              <h3 className="text-base font-extrabold">Thêm Địa Chỉ Giao Hàng</h3>
              <button
                type="button"
                onClick={function () {
                  setNewAddressModalOpen(false)
                }}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAddress} className="mt-4 space-y-3 text-xs">
              <div>
                <label
                  htmlFor="address-recipient-name"
                  className="font-bold text-zinc-500 dark:text-zinc-400"
                >
                  Họ và tên người nhận *
                </label>
                <input
                  id="address-recipient-name"
                  required
                  value={recipientName}
                  onChange={function (e) {
                    setRecipientName(e.target.value)
                  }}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-400"
                />
              </div>

              <div>
                <label
                  htmlFor="address-phone-number"
                  className="font-bold text-zinc-500 dark:text-zinc-400"
                >
                  Số điện thoại *
                </label>
                <input
                  id="address-phone-number"
                  required
                  type="tel"
                  value={phoneNumber}
                  onChange={function (e) {
                    setPhoneNumber(e.target.value)
                  }}
                  placeholder="Ví dụ: 0987654321"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-400"
                />
              </div>

              <div>
                <label
                  htmlFor="address-detail"
                  className="font-bold text-zinc-500 dark:text-zinc-400"
                >
                  Địa chỉ chi tiết (Tòa nhà, số nhà, ngõ/tên đường) *
                </label>
                <input
                  id="address-detail"
                  required
                  value={detailAddress}
                  onChange={function (e) {
                    setDetailAddress(e.target.value)
                  }}
                  placeholder="Ví dụ: Số 18 ngõ 12 Duy Tân"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="address-ward"
                    className="font-bold text-zinc-500 dark:text-zinc-400"
                  >
                    Phường / Xã
                  </label>
                  <input
                    id="address-ward"
                    value={ward}
                    onChange={function (e) {
                      setWard(e.target.value)
                    }}
                    placeholder="Bến Thành"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="address-district"
                    className="font-bold text-zinc-500 dark:text-zinc-400"
                  >
                    Quận / Huyện
                  </label>
                  <input
                    id="address-district"
                    value={district}
                    onChange={function (e) {
                      setDistrict(e.target.value)
                    }}
                    placeholder="Quận 1"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="address-city"
                  className="font-bold text-zinc-500 dark:text-zinc-400"
                >
                  Tỉnh / Thành phố *
                </label>
                <input
                  id="address-city"
                  required
                  value={city}
                  onChange={function (e) {
                    setCity(e.target.value)
                  }}
                  placeholder="TP. Hồ Chí Minh"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 outline-none focus:border-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-400"
                />
              </div>

              <div>
                <span className="font-bold text-zinc-500 dark:text-zinc-400">
                  Loại địa chỉ
                </span>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={function () {
                      setLabel('HOME')
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition border ${
                      label === 'HOME'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500'
                        : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    Nhà riêng
                  </button>
                  <button
                    type="button"
                    onClick={function () {
                      setLabel('OFFICE')
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition border ${
                      label === 'OFFICE'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500'
                        : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    Công ty
                  </button>
                  <button
                    type="button"
                    onClick={function () {
                      setLabel('OTHER')
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition border ${
                      label === 'OTHER'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500'
                        : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    Khác
                  </button>
                </div>
              </div>

              <div className="mt-5 pt-2">
                <button
                  type="submit"
                  disabled={addAddressMutation.isPending}
                  className="btn-primary w-full rounded-full py-3 text-xs font-bold"
                >
                  {addAddressMutation.isPending && <span>Đang lưu địa chỉ…</span>}
                  {!addAddressMutation.isPending && <span>Lưu Địa Chỉ</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
