import { useState } from 'react'

import {
  getList1QueryKey,
  useAdd,
  useChangeDefault,
  useDelete,
  useList1,
  useUpdate,
} from '@generated/endpoints/addresses/addresses'
import { useListProvinces, useListWards } from '@generated/endpoints/locations/locations'
import {
  ArrowClockwise,
  Buildings,
  CheckCircle,
  House,
  MapPin,
  PencilSimple,
  Plus,
  ShieldCheck,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'

import type { AddressRequestLabel } from '@generated/model/addressRequestLabel'
import type { AddressResponse } from '@generated/model/addressResponse'
import type { ProvinceResponse } from '@generated/model/provinceResponse'
import type { WardResponse } from '@generated/model/wardResponse'

const MAX_ADDRESSES = 10

export default function AddressBookTab() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)

  // Form states
  const [recipientName, setRecipientName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [ward, setWard] = useState('')
  const [detailAddress, setDetailAddress] = useState('')
  const [label, setLabel] = useState<AddressRequestLabel>('HOME')
  const [isDefault, setIsDefault] = useState(false)

  // Selected province code for fetching wards
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('')

  // Queries
  const addressesQuery = useList1()
  const provincesQuery = useListProvinces()

  let provinces: ProvinceResponse[] = []
  if (provincesQuery.data !== undefined) {
    try {
      provinces = takeData(provincesQuery.data)
    } catch {
      provinces = []
    }
  }

  const wardsQuery = useListWards(selectedProvinceCode, {
    query: {
      enabled: selectedProvinceCode !== '',
    },
  })

  let wards: WardResponse[] = []
  if (wardsQuery.data !== undefined) {
    try {
      wards = takeData(wardsQuery.data)
    } catch {
      wards = []
    }
  }

  let addresses: AddressResponse[] = []
  if (addressesQuery.data !== undefined) {
    try {
      const raw = takeData(addressesQuery.data)
      if (Array.isArray(raw)) {
        addresses = raw
      }
    } catch {
      addresses = []
    }
  }

  const isMaxReached = addresses.length >= MAX_ADDRESSES

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

  function resetForm() {
    setRecipientName('')
    setPhoneNumber('')
    setCity('')
    setDistrict('')
    setWard('')
    setDetailAddress('')
    setLabel('HOME')
    setIsDefault(false)
    setSelectedProvinceCode('')
    setEditingId(null)
  }

  function openCreateModal() {
    if (isMaxReached) {
      showToastError(`Bạn chỉ có thể lưu tối đa ${MAX_ADDRESSES} địa chỉ nhận hàng.`)
      return
    }
    resetForm()
    setModalMode('create')
    setModalOpen(true)
  }

  function openEditModal(addr: AddressResponse) {
    setModalMode('edit')
    setEditingId(addr.id ?? null)
    setRecipientName(addr.recipientName ?? '')
    setPhoneNumber(addr.phoneNumber ?? '')
    setCity(addr.city ?? '')
    setDistrict(addr.district ?? '')
    setWard(addr.ward ?? '')
    setDetailAddress(addr.detailAddress ?? `${addr.houseNumber ?? ''} ${addr.street ?? ''}`.trim())
    setLabel(addr.label ?? 'HOME')
    setIsDefault(addr.defaultAddress === true)

    // Match province code if present
    const matchedProv = provinces.find((p) => p.name === addr.city)
    if (matchedProv?.code) {
      setSelectedProvinceCode(matchedProv.code)
    } else {
      setSelectedProvinceCode('')
    }

    setModalOpen(true)
  }

  const addAddressMutation = useAdd({
    mutation: {
      onSuccess: function (res) {
        showToast('Đã thêm địa chỉ nhận hàng mới thành công!')
        setModalOpen(false)
        resetForm()
        try {
          const newAddr = takeData(res)
          if (isDefault && newAddr.id !== undefined) {
            changeDefaultMutation.mutate({ id: newAddr.id })
          }
        } catch {
          // Ignore takeData error if response unexpected
        }
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
      },
      onError: function (err) {
        if (err instanceof ApiError && err.status === 400) {
          showToastError(
            err.message?.includes('Maximum of 10')
              ? `Bạn chỉ có thể lưu tối đa ${MAX_ADDRESSES} địa chỉ nhận hàng.`
              : 'Thông tin địa chỉ không hợp lệ. Vui lòng kiểm tra lại.',
          )
        } else {
          showToastError('Không thể thêm địa chỉ. Vui lòng thử lại.')
        }
      },
    },
  })

  const updateAddressMutation = useUpdate({
    mutation: {
      onSuccess: function () {
        showToast('Đã cập nhật thông tin địa chỉ thành công!')
        setModalOpen(false)
        resetForm()
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
      },
      onError: function () {
        showToastError('Không thể cập nhật địa chỉ. Vui lòng kiểm tra lại thông tin.')
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

  function handleSubmitAddress(e: React.FormEvent) {
    e.preventDefault()

    const cleanName = recipientName.trim()
    const cleanPhone = phoneNumber.trim()
    const cleanCity = city.trim()
    const cleanDistrict = district.trim()
    const cleanWard = ward.trim()
    const cleanDetail = detailAddress.trim()

    if (cleanName === '' || cleanPhone === '' || cleanCity === '' || cleanDetail === '') {
      showToastError('Vui lòng điền đầy đủ tên, số điện thoại, tỉnh/thành và địa chỉ chi tiết.')
      return
    }

    const phoneRegex = /^[0-9+() -]{9,15}$/
    if (!phoneRegex.test(cleanPhone)) {
      showToastError('Số điện thoại không hợp lệ (cần từ 9 đến 15 số).')
      return
    }

    const payload = {
      recipientName: cleanName,
      phoneNumber: cleanPhone,
      city: cleanCity,
      district: cleanDistrict,
      ward: cleanWard,
      detailAddress: cleanDetail,
      label,
      defaultAddress: isDefault,
    }

    if (modalMode === 'create') {
      addAddressMutation.mutate({ data: payload })
    } else if (modalMode === 'edit' && editingId !== null) {
      updateAddressMutation.mutate({ id: editingId, data: payload })
    }
  }

  function handleDeleteAddress(id: string | undefined) {
    if (id === undefined || id === '') {
      return
    }
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa địa chỉ nhận hàng này?')
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

  const isMutating =
    addAddressMutation.isPending ||
    updateAddressMutation.isPending ||
    deleteAddressMutation.isPending ||
    changeDefaultMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header with Title, Counter and Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Địa chỉ của tôi
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isMaxReached
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {addresses.length}/{MAX_ADDRESSES} địa chỉ
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Quản lý địa chỉ nhận hàng (tối đa {MAX_ADDRESSES} địa chỉ) để thuận tiện và tự động điền
            khi đặt hàng
          </p>
        </div>

        <button
          type="button"
          id="btn-add-new-address"
          onClick={openCreateModal}
          disabled={isMaxReached}
          className={`inline-flex items-center gap-1.5 self-start rounded-full px-4 py-2.5 text-xs font-bold transition shadow-md ${
            isMaxReached
              ? 'cursor-not-allowed bg-zinc-300 text-zinc-500 shadow-none dark:bg-zinc-800 dark:text-zinc-500'
              : 'bg-orange-600 text-white shadow-orange-600/20 hover:bg-orange-700'
          }`}
          title={isMaxReached ? `Đã đạt giới hạn tối đa ${MAX_ADDRESSES} địa chỉ` : undefined}
        >
          <Plus size={15} weight="bold" />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {/* Max addresses warning alert */}
      {isMaxReached && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          <WarningCircle size={17} weight="fill" className="shrink-0" />
          <span>
            Bạn đã sử dụng đủ tối đa <strong>{MAX_ADDRESSES}/10 địa chỉ</strong>. Vui lòng xóa bớt
            địa chỉ không còn sử dụng trước khi thêm mới.
          </span>
        </div>
      )}

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
            Đang tải sổ địa chỉ…
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
            Thêm địa chỉ nhận hàng để thuận tiện khi mua sắm và tự động điền nhanh lúc đặt hàng.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700"
          >
            <Plus size={15} weight="bold" />
            <span>Thêm địa chỉ ngay</span>
          </button>
        </div>
      )}

      {/* Address List */}
      {addressesQuery.isLoading === false && addresses.length > 0 && (
        <div className="space-y-3.5">
          {addresses.map(function (addr) {
            const isDef = addr.defaultAddress === true
            const addrLabel = addr.label ?? 'HOME'

            let containerClass =
              'rounded-3xl border p-5 transition flex flex-col md:flex-row md:items-start md:justify-between gap-4'
            if (isDef) {
              containerClass +=
                ' border-orange-300 bg-orange-50/40 dark:border-orange-500/30 dark:bg-orange-500/5'
            } else {
              containerClass +=
                ' border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
            }

            return (
              <div key={addr.id} className={containerClass}>
                <div className="space-y-2">
                  {/* Row 1: Recipient Name, Phone, Label Pill, Default Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                      {addr.recipientName || 'Khách hàng'}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {addr.phoneNumber || 'Chưa có SĐT'}
                    </span>

                    {/* Classification Label Badge */}
                    {addrLabel === 'HOME' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                        <House size={12} weight="fill" />
                        Nhà riêng
                      </span>
                    )}
                    {addrLabel === 'OFFICE' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                        <Buildings size={12} weight="fill" />
                        Công ty
                      </span>
                    )}
                    {addrLabel === 'OTHER' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300">
                        <MapPin size={12} weight="fill" />
                        Khác
                      </span>
                    )}

                    {isDef && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                        <ShieldCheck size={12} weight="fill" />
                        Mặc định
                      </span>
                    )}
                  </div>

                  {/* Row 2: Detail Address & Full Address */}
                  <div className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {addr.detailAddress || `${addr.houseNumber ?? ''} ${addr.street ?? ''}`.trim()}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      {[addr.ward, addr.district, addr.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                  <button
                    type="button"
                    onClick={function () {
                      openEditModal(addr)
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-orange-500 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <PencilSimple size={13} />
                    <span>Cập nhật</span>
                  </button>

                  {isDef === false && (
                    <button
                      type="button"
                      onClick={function () {
                        handleSetDefault(addr.id)
                      }}
                      disabled={isMutating}
                      className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-orange-500 hover:text-orange-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
                      disabled={isMutating}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                    >
                      <Trash size={13} />
                      <span>Xóa</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Add or Edit Address */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                {modalMode === 'create' ? 'Thêm địa chỉ nhận hàng mới' : 'Cập nhật địa chỉ nhận hàng'}
              </h3>
              <button
                type="button"
                onClick={function () {
                  setModalOpen(false)
                }}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAddress} className="mt-5 space-y-4">
              {/* Row 1: Recipient Name & Phone */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="recipientNameInput"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Họ và tên người nhận *
                  </label>
                  <input
                    id="recipientNameInput"
                    type="text"
                    required
                    value={recipientName}
                    onChange={function (e) {
                      setRecipientName(e.target.value)
                    }}
                    placeholder="VD: Nguyễn Văn A"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phoneNumberInput"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Số điện thoại *
                  </label>
                  <input
                    id="phoneNumberInput"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={function (e) {
                      setPhoneNumber(e.target.value)
                    }}
                    placeholder="VD: 0987654321"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 2: Province/City & District */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="cityInput"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Tỉnh / Thành phố *
                  </label>
                  {provinces.length > 0 ? (
                    <select
                      id="cityInput"
                      required
                      value={city}
                      onChange={function (e) {
                        const val = e.target.value
                        setCity(val)
                        const matched = provinces.find((p) => p.name === val)
                        if (matched?.code) {
                          setSelectedProvinceCode(matched.code)
                        } else {
                          setSelectedProvinceCode('')
                        }
                      }}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    >
                      <option value="">-- Chọn Tỉnh / Thành phố --</option>
                      {provinces.map((p) => (
                        <option key={p.code} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
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
                  )}
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

              {/* Row 3: Ward */}
              <div>
                <label
                  htmlFor="wardInput"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                >
                  Phường / Xã *
                </label>
                {wards.length > 0 ? (
                  <select
                    id="wardInput"
                    required
                    value={ward}
                    onChange={function (e) {
                      setWard(e.target.value)
                    }}
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="">-- Chọn Phường / Xã --</option>
                    {wards.map((w) => (
                      <option key={w.code} value={w.name}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                ) : (
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
                )}
              </div>

              {/* Row 4: Detail Address */}
              <div>
                <label
                  htmlFor="detailAddressInput"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                >
                  Địa chỉ chi tiết (Tòa nhà, số nhà, ngõ/tên đường) *
                </label>
                <input
                  id="detailAddressInput"
                  type="text"
                  required
                  value={detailAddress}
                  onChange={function (e) {
                    setDetailAddress(e.target.value)
                  }}
                  placeholder="VD: Số 18 ngõ 12 Duy Tân, Tòa Landmark"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 px-3.5 py-2.5 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              {/* Row 5: Classification Label Pills */}
              <div>
                <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Loại địa chỉ (Gán nhãn)
                </span>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={function () {
                      setLabel('HOME')
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition border ${
                      label === 'HOME'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    <House size={14} weight="fill" />
                    <span>Nhà riêng</span>
                  </button>

                  <button
                    type="button"
                    onClick={function () {
                      setLabel('OFFICE')
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition border ${
                      label === 'OFFICE'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    <Buildings size={14} weight="fill" />
                    <span>Công ty</span>
                  </button>

                  <button
                    type="button"
                    onClick={function () {
                      setLabel('OTHER')
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition border ${
                      label === 'OTHER'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    <MapPin size={14} weight="fill" />
                    <span>Khác</span>
                  </button>
                </div>
              </div>

              {/* Row 6: Set default checkbox */}
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
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
                  disabled={isMutating}
                  className="rounded-full bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 disabled:opacity-50"
                >
                  {isMutating && <span>Đang lưu…</span>}
                  {!isMutating && (
                    <span>{modalMode === 'create' ? 'Thêm địa chỉ' : 'Lưu thay đổi'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
