import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useList1 } from '@generated/endpoints/addresses/addresses'
import { CheckCircle, CreditCard, MapPin, ShoppingBag } from '@phosphor-icons/react'

import { hookErrorMessage, takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'
import { formatFullAddress, formatVnd } from '@/lib/format'

import { useCart } from '../hooks/useCart'

import type { AddressResponse } from '@generated/model/addressResponse'
import type { OrderResponse } from '@generated/model/orderResponse'

type BlockedItem = { variantId?: string; reason?: string }

export default function Checkout() {
  const [params] = useSearchParams()
  const { items, isLoading, checkout } = useCart()
  const addressesQuery = useList1()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [addressText, setAddressText] = useState('')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [placed, setPlaced] = useState<OrderResponse[] | null>(null)

  const wanted = (params.get('variantIds') ?? '').split(',').filter(function (id) {
    return id !== ''
  })
  const selectedItems = items.filter(function (item) {
    if (wanted.length === 0) {
      return true
    }
    return wanted.includes(item.variantId ?? '')
  })

  let subtotal = 0
  for (const item of selectedItems) {
    subtotal += (item.unitPrice ?? 0) * (item.quantity ?? 0)
  }

  let addresses: AddressResponse[] = []
  if (addressesQuery.isSuccess) {
    addresses = takeData(addressesQuery.data)
  }
  let current: AddressResponse | null = null
  for (const address of addresses) {
    if (address.id === pickedId) {
      current = address
    }
  }
  if (current === null) {
    for (const address of addresses) {
      if (address.defaultAddress === true) {
        current = address
      }
    }
  }
  if (current === null && addresses.length > 0) {
    current = addresses[0]
  }
  const hasSavedAddress = addresses.length > 0
  let shippingAddress = ''
  if (hasSavedAddress) {
    shippingAddress = formatFullAddress(current)
  }
  if (hasSavedAddress === false) {
    shippingAddress = addressText.trim()
  }

  let blocked: BlockedItem[] = []
  if (checkout.error instanceof ApiError && checkout.error.status === 409) {
    const payload = checkout.error.body as { items?: BlockedItem[] } | null
    if (payload !== null && payload.items !== undefined) {
      blocked = payload.items
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (name.trim() === '' || phone.trim() === '') {
      setFormError('Vui lòng nhập tên và số điện thoại nhận hàng.')
      return
    }
    if (shippingAddress === '') {
      setFormError('Vui lòng chọn hoặc nhập địa chỉ giao hàng.')
      return
    }
    if (selectedItems.length === 0) {
      setFormError('Chưa chọn sản phẩm nào để thanh toán.')
      return
    }

    checkout.mutate(
      {
        data: {
          shippingName: name.trim(),
          shippingPhone: phone.trim(),
          shippingAddress,
          shippingFee: 0,
          variantIds: wanted,
        },
      },
      {
        onSuccess: function (response) {
          setPlaced(takeData(response))
        },
      },
    )
  }

  if (placed !== null) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-[110px] pb-16">
        <div className="glass rounded-3xl p-6 text-center sm:p-10">
          <CheckCircle size={48} weight="fill" className="mx-auto text-emerald-500" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-tighter">Đặt hàng thành công</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Thanh toán khi nhận hàng. Shop sẽ liên hệ xác nhận.
          </p>

          <ul className="mt-6 space-y-3 text-left">
            {placed.map(function (order) {
              return (
                <li
                  key={order.id ?? order.code ?? ''}
                  className="rounded-2xl bg-white/70 p-4 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">Đơn {order.code}</p>
                    <p className="font-bold">{formatVnd(order.total ?? 0)}</p>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {order.items?.length ?? 0} sản phẩm · {order.status}
                  </p>
                </li>
              )
            })}
          </ul>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to="/account"
              className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Xem đơn mua
            </Link>
            <Link
              to="/search"
              className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/70 dark:border-white/20 dark:hover:bg-white/10"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </main>
    )
  }

  let body = (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2].map(function (index) {
        return (
          <div key={index} className="h-20 animate-pulse rounded-3xl bg-white/60 dark:bg-white/5" />
        )
      })}
    </div>
  )

  if (isLoading === false && selectedItems.length === 0) {
    body = (
      <div className="glass rounded-3xl px-6 py-16 text-center">
        <ShoppingBag size={40} weight="duotone" className="mx-auto text-indigo-500" />
        <p className="mt-3 font-bold">Chưa có sản phẩm để thanh toán</p>
        <Link
          to="/cart"
          className="btn-primary mt-5 inline-block rounded-full px-6 py-2.5 text-sm font-semibold"
        >
          Về giỏ hàng
        </Link>
      </div>
    )
  }

  if (isLoading === false && selectedItems.length > 0) {
    body = (
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="glass rounded-3xl p-5">
            <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <MapPin size={20} weight="bold" className="text-indigo-500" />
              Địa chỉ giao hàng
            </h2>

            {hasSavedAddress && (
              <div className="mt-4 space-y-2">
                {addresses.map(function (address) {
                  const isPicked = current !== null && current.id === address.id
                  return (
                    <label
                      key={address.id ?? ''}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-3 text-sm dark:border-white/15"
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={isPicked}
                        onChange={() => setPickedId(address.id ?? null)}
                        className="mt-1 h-4 w-4 accent-indigo-600"
                      />
                      <span>
                        {formatFullAddress(address)}
                        {address.defaultAddress === true && (
                          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                            Mặc định
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            {hasSavedAddress === false && (
              <label className="mt-4 block text-sm">
                <span className="font-semibold">Địa chỉ</span>
                <textarea
                  value={addressText}
                  onChange={(event) => setAddressText(event.target.value)}
                  rows={2}
                  placeholder="Số nhà, đường, phường, quận, tỉnh/thành"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white/80 px-4 py-2.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-white/5"
                />
                <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                  Chưa có địa chỉ đã lưu nên nhập tay ở đây.
                </span>
              </label>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-semibold">Tên người nhận</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nguyễn Văn An"
                  className="mt-1 w-full rounded-full border border-zinc-200 bg-white/80 px-4 py-2.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-white/5"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Số điện thoại</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  placeholder="0900000000"
                  className="mt-1 w-full rounded-full border border-zinc-200 bg-white/80 px-4 py-2.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-white/5"
                />
              </label>
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <CreditCard size={20} weight="bold" className="text-indigo-500" />
              Thanh toán
            </h2>
            <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
              Thanh toán khi nhận hàng (COD). Phí ship 0đ.
            </p>
          </section>
        </div>

        <aside className="glass h-fit rounded-3xl p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold tracking-tight">Đơn của bạn</h2>
          <ul className="mt-4 space-y-3 border-b border-zinc-200/70 pb-3 text-sm dark:border-white/10">
            {selectedItems.map(function (item) {
              return (
                <li key={item.variantId ?? ''} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.productName}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {item.variantLabel} × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatVnd((item.unitPrice ?? 0) * (item.quantity ?? 0))}
                  </span>
                </li>
              )
            })}
          </ul>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Tạm tính</dt>
              <dd className="font-semibold">{formatVnd(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Phí ship</dt>
              <dd className="font-semibold">0đ</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-bold">Tổng</dt>
              <dd className="font-extrabold">{formatVnd(subtotal)}</dd>
            </div>
          </dl>

          {formError !== '' && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{formError}</p>
          )}
          {checkout.isError && blocked.length === 0 && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {hookErrorMessage('checkout', checkout.error)}
            </p>
          )}
          {blocked.length > 0 && (
            <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="font-bold">Không thể đặt các sản phẩm sau:</p>
              <ul className="mt-1 list-inside list-disc">
                {blocked.map(function (item) {
                  return <li key={item.variantId ?? ''}>{item.reason}</li>
                })}
              </ul>
              <Link to="/cart" className="mt-2 inline-block font-bold underline">
                Về giỏ hàng để gỡ
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={checkout.isPending}
            className="btn-primary mt-5 w-full rounded-full py-3 text-sm font-bold disabled:opacity-60"
          >
            {checkout.isPending ? 'Đang đặt hàng…' : 'Đặt hàng'}
          </button>
        </aside>
      </form>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pt-[110px] pb-16">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
          <ShoppingBag size={22} weight="bold" className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tighter">Thanh toán</h1>
      </div>
      {body}
    </main>
  )
}
