import { useState } from 'react'

import {
  getList1QueryKey,
  useAdd,
  useChangeDefault,
  useDelete,
  useList1,
} from '@generated/endpoints/addresses/addresses'
import {
  ArrowClockwise,
  CheckCircle,
  MapPin,
  Plus,
  ShieldCheck,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'
import { formatFullAddress } from '@/lib/format'

import type { AddressResponse } from '@generated/model/addressResponse'

export default function AddressBookTab() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)

  // Form states
  const [houseNumber, setHouseNumber] = useState('')
  const [street, setStreet] = useState('')
  const [ward, setWard] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  const addressesQuery = useList1()

  let addresses: AddressResponse[] = []
  if (addressesQuery.data !== undefined) {
    const raw = takeData(addressesQuery.data)
    if (Array.isArray(raw)) {
      addresses = raw
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(function () {
      setToast(null)
    }, 3000)
  }

  function showToastError(msg: string) {
    setToastError(msg)
    window.setTimeout(function () {
      setToastError(null)
    }, 4000)
  }

  const addAddressMutation = useAdd({
    mutation: {
      onSuccess: function (res) {
        showToast('Đã thêm địa chỉ nhận hàng mới thành công!')
        setModalOpen(false)
        setHouseNumber('')
        setStreet('')
        setWard('')
        setDistrict('')
        setCity('')
        try {
          const newAddr = takeData(res)
          if (isDefault && newAddr.id !== undefined) {
            changeDefaultMutation.mutate({ id: newAddr.id })
          }
        } catch {
          // Ignore takeData error if response unexpected
        }
        setIsDefault(false)
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
      },
      onError: function () {
        showToastError('Không thể thêm địa chỉ. Vui lòng kiểm tra lại thông tin.')
      },
    },
  })

  const deleteAddressMutation = useDelete({
    mutation: {
      onSuccess: function () {
        showToast('Đã xóa địa chỉ thành công.')
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
      },
      onError: function () {
        showToastError('Không thể xóa địa chỉ. Vui lòng thử lại.')
      },
    },
  })

  const changeDefaultMutation = useChangeDefault({
    mutation: {
      onSuccess: function () {
        showToast('Đã đặt làm địa chỉ mặc định.')
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
      },
      onError: function () {
        showToastError('Không thể thay đổi địa chỉ mặc định.')
      },
    },
  })

  function handleCreateAddress(e: React.FormEvent) {
    e.preventDefault()
    if (
      houseNumber.trim() === '' ||
      street.trim() === '' ||
      ward.trim() === '' ||
      district.trim() === '' ||
      city.trim() === ''
    ) {
      showToastError('Vui lòng điền đầy đủ các thông tin địa chỉ.')
      return
    }

    addAddressMutation.mutate({
      data: {
        houseNumber: houseNumber.trim(),
        street: street.trim(),
        ward: ward.trim(),
        district: district.trim(),
        city: city.trim(),
      },
    })
  }

  function handleDeleteAddress(id: string | undefined) {
    if (id === undefined || id === '') {
      return
    }
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')
    if (confirmed === false) {
      return
    }
    deleteAddressMutation.mutate({ id })
  }

  function handleSetDefault(id: string | undefined) {
    if (id === undefined || id === '') {
      return
    }
    changeDefaultMutation.mutate({ id })
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Địa chỉ của tôi
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Quản lý địa chỉ nhận hàng để thanh toán nhanh hơn
          </p>
        </div>
        <button
          type="button"
          id="btn-add-new-address"
          onClick={function () {
            setModalOpen(true)
          }}
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700"
        >
          <Plus size={15} weight="bold" />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {/* Notifications */}
      {toast !== null && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle size={16} weight="fill" className="shrink-0" />
          <span>{toast}</span>
        </div>
      )}
      {toastError !== null && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          <WarningCircle size={16} weight="fill" className="shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Loading State */}
      {addressesQuery.isLoading && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900">
          <ArrowClockwise size={28} className="animate-spin text-orange-600" />
          <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Đang tải sổ địa chỉ từ CSDL…
          </p>
        </div>
      )}

      {/* Empty State */}
      {addressesQuery.isLoading === false && addresses.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
            <MapPin size={32} weight="duotone" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-white">
            Chưa có địa chỉ nhận hàng
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Thêm địa chỉ giao hàng để chúng tôi giao sản phẩm tới tận tay bạn một cách chính xác
            nhất.
          </p>
          <button
            type="button"
            onClick={function () {
              setModalOpen(true)
            }}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700"
          >
            <Plus size={15} weight="bold" />
            <span>Thêm địa chỉ ngay</span>
          </button>
        </div>
      )}

      {/* Address List */}
      {addressesQuery.isLoading === false && addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map(function (addr) {
            const isDef = addr.defaultAddress === true
            let containerClass =
              'rounded-3xl border p-5 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
            if (isDef) {
              containerClass +=
                ' border-orange-300 bg-orange-50/40 dark:border-orange-500/30 dark:bg-orange-500/5'
            }
            if (isDef === false) {
              containerClass +=
                ' border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
            }

            return (
              <div key={addr.id} className={containerClass}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} weight="fill" className="text-orange-600" />
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                      {addr.houseNumber} {addr.street}
                    </span>
                    {isDef && (
                      <span className="flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                        <ShieldCheck size={12} weight="fill" />
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {formatFullAddress(addr)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:self-center">
                  {isDef === false && (
                    <button
                      type="button"
                      onClick={function () {
                        handleSetDefault(addr.id)
                      }}
                      disabled={changeDefaultMutation.isPending}
                      className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:border-orange-500 hover:text-orange-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      Thiết lập mặc định
                    </button>
                  )}
                  {isDef === false && (
                    <button
                      type="button"
                      onClick={function () {
                        handleDeleteAddress(addr.id)
                      }}
                      disabled={deleteAddressMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                    >
                      <Trash size={14} />
                      <span>Xóa</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Add New Address */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                Thêm địa chỉ nhận hàng mới
              </h3>
              <button
                type="button"
                onClick={function () {
                  setModalOpen(false)
                }}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAddress} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="cityInput"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Tỉnh / Thành phố *
                  </label>
                  <input
                    id="cityInput"
                    type="text"
                    required
                    value={city}
                    onChange={function (e) {
                      setCity(e.target.value)
                    }}
                    placeholder="VD: Hà Nội, TP.HCM"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="districtInput"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Quận / Huyện *
                  </label>
                  <input
                    id="districtInput"
                    type="text"
                    required
                    value={district}
                    onChange={function (e) {
                      setDistrict(e.target.value)
                    }}
                    placeholder="VD: Cầu Giấy, Quận 1"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="wardInput"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                >
                  Phường / Xã *
                </label>
                <input
                  id="wardInput"
                  type="text"
                  required
                  value={ward}
                  onChange={function (e) {
                    setWard(e.target.value)
                  }}
                  placeholder="VD: Phường Dịch Vọng Hậu"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="houseNumberInput"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Số nhà / Tòa nhà *
                  </label>
                  <input
                    id="houseNumberInput"
                    type="text"
                    required
                    value={houseNumber}
                    onChange={function (e) {
                      setHouseNumber(e.target.value)
                    }}
                    placeholder="VD: Số 18, Tòa Landmark"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="streetInput"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Tên đường / Phố *
                  </label>
                  <input
                    id="streetInput"
                    type="text"
                    required
                    value={street}
                    onChange={function (e) {
                      setStreet(e.target.value)
                    }}
                    placeholder="VD: Đường Duy Tân"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="defaultAddressCheckbox"
                  type="checkbox"
                  checked={isDefault}
                  onChange={function (e) {
                    setIsDefault(e.target.checked)
                  }}
                  className="h-4 w-4 rounded-md border-zinc-300 text-orange-600 focus:ring-orange-500"
                />
                <label
                  htmlFor="defaultAddressCheckbox"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Đặt làm địa chỉ nhận hàng mặc định
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={function () {
                    setModalOpen(false)
                  }}
                  className="rounded-full border border-zinc-200 px-5 py-2.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addAddressMutation.isPending}
                  className="rounded-full bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 disabled:opacity-50"
                >
                  {addAddressMutation.isPending && <span>Đang lưu…</span>}
                  {addAddressMutation.isPending === false && <span>Lưu địa chỉ</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
