import { useEffect, useRef, useState } from 'react'

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
  CaretDown,
  Check,
  CheckCircle,
  MagnifyingGlass,
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

import type { AddressResponse } from '@generated/model/addressResponse'
import type { ProvinceResponse } from '@generated/model/provinceResponse'
import type { WardResponse } from '@generated/model/wardResponse'

const MAX_ADDRESSES = 10

function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

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
  const [provinceSearch, setProvinceSearch] = useState('')
  const [provinceDropdownOpen, setProvinceDropdownOpen] = useState(false)
  const provinceContainerRef = useRef<HTMLDivElement>(null)

  const [ward, setWard] = useState('')
  const [wardSearch, setWardSearch] = useState('')
  const [wardDropdownOpen, setWardDropdownOpen] = useState(false)
  const wardContainerRef = useRef<HTMLDivElement>(null)

  const [detailAddress, setDetailAddress] = useState('')
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

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        provinceContainerRef.current &&
        !provinceContainerRef.current.contains(event.target as Node)
      ) {
        setProvinceDropdownOpen(false)
      }
      if (wardContainerRef.current && !wardContainerRef.current.contains(event.target as Node)) {
        setWardDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filtered provinces
  const provinceQuery = removeVietnameseAccents(provinceSearch.trim())
  const filteredProvinces = provinces.filter((p) =>
    removeVietnameseAccents(p.name ?? '').includes(provinceQuery),
  )

  // Filtered wards
  const wardQuery = removeVietnameseAccents(wardSearch.trim())
  const filteredWards = wards.filter((w) =>
    removeVietnameseAccents(w.name ?? '').includes(wardQuery),
  )

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
    setProvinceSearch('')
    setProvinceDropdownOpen(false)
    setWard('')
    setWardSearch('')
    setWardDropdownOpen(false)
    setDetailAddress('')
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
    const c = addr.city ?? ''
    setCity(c)
    setProvinceSearch(c)
    const w = addr.ward ?? ''
    setWard(w)
    setWardSearch(w)
    setDetailAddress(addr.detailAddress ?? `${addr.houseNumber ?? ''} ${addr.street ?? ''}`.trim())
    setIsDefault(addr.defaultAddress === true)

    // Match province code
    const matchedProv = provinces.find((p) => p.name === c)
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
      ward: cleanWard,
      detailAddress: cleanDetail,
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
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Địa chỉ của tôi
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Quản lý danh sách địa chỉ nhận hàng để thanh toán nhanh hơn
          </p>
        </div>

        <div>
          <button
            id="openAddAddressModalBtn"
            type="button"
            onClick={openCreateModal}
            disabled={isMaxReached}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-sm transition ${
              isMaxReached
                ? 'cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'
                : 'bg-orange-600 text-white shadow-orange-600/20 hover:bg-orange-700'
            }`}
            title={isMaxReached ? 'Bạn đã đạt giới hạn 10 địa chỉ' : 'Thêm địa chỉ mới'}
          >
            <Plus size={16} weight="bold" />
            <span>Thêm địa chỉ mới</span>
          </button>
        </div>
      </div>

      {/* Limit Alert when 10/10 reached */}
      {isMaxReached && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <WarningCircle size={18} weight="fill" className="shrink-0 text-amber-600" />
          <span>
            Bạn đã sử dụng tối đa {MAX_ADDRESSES} địa chỉ nhận hàng. Vui lòng xóa bớt địa chỉ cũ nếu
            cần thêm địa chỉ mới.
          </span>
        </div>
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {toastError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-600" />
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
                  {/* Row 1: Recipient Name, Phone, Default Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                      {addr.recipientName || 'Khách hàng'}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {addr.phoneNumber || 'Chưa có SĐT'}
                    </span>

                    {isDef && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                        <ShieldCheck size={12} weight="fill" />
                        Mặc định
                      </span>
                    )}
                  </div>

                  {/* Row 2: Detail Address & Province/Ward */}
                  <div className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {addr.detailAddress ||
                        `${addr.houseNumber ?? ''} ${addr.street ?? ''}`.trim()}
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
                    <span>Sửa</span>
                  </button>

                  {isDef === false && (
                    <>
                      <button
                        type="button"
                        onClick={function () {
                          handleSetDefault(addr.id)
                        }}
                        disabled={isMutating}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-orange-500 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <span>Đặt làm mặc định</span>
                      </button>

                      <button
                        type="button"
                        onClick={function () {
                          handleDeleteAddress(addr.id)
                        }}
                        disabled={isMutating}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 dark:border-zinc-800 dark:bg-zinc-800 dark:hover:bg-rose-950/30"
                        title="Xóa địa chỉ"
                      >
                        <Trash size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl transition dark:border-zinc-800 dark:bg-zinc-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                {modalMode === 'create' ? 'Thêm địa chỉ nhận hàng' : 'Cập nhật địa chỉ nhận hàng'}
              </h3>
              <button
                type="button"
                onClick={function () {
                  setModalOpen(false)
                }}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAddress} className="space-y-4 p-6">
              {/* Row 1: Recipient Name & Phone */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="recipientNameInput"
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Họ và tên *
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

              {/* Row 2: Optimized Searchable Province / City */}
              <div ref={provinceContainerRef} className="relative">
                <label
                  htmlFor="citySearchInput"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                >
                  Tỉnh / Thành phố *
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <MagnifyingGlass size={14} />
                  </div>
                  <input
                    id="citySearchInput"
                    type="text"
                    required
                    autoComplete="off"
                    value={provinceSearch}
                    onFocus={function () {
                      setProvinceDropdownOpen(true)
                    }}
                    onChange={function (e) {
                      setProvinceSearch(e.target.value)
                      setProvinceDropdownOpen(true)
                    }}
                    placeholder="Gõ để tìm nhanh (VD: Hà Nội, Hồ Chí Minh, Đà Nẵng...)"
                    className="w-full rounded-2xl border border-zinc-200 py-2.5 pr-14 pl-9 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2.5">
                    {city !== '' && (
                      <button
                        type="button"
                        onClick={function () {
                          setCity('')
                          setProvinceSearch('')
                          setSelectedProvinceCode('')
                          setWard('')
                          setWardSearch('')
                        }}
                        className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        title="Xóa lựa chọn"
                      >
                        <X size={12} weight="bold" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={function () {
                        setProvinceDropdownOpen(!provinceDropdownOpen)
                      }}
                      className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <CaretDown size={12} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Dropdown list for Province */}
                {provinceDropdownOpen && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
                    {filteredProvinces.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-400">
                        Không tìm thấy tỉnh/thành phố nào
                      </div>
                    ) : (
                      filteredProvinces.map(function (p) {
                        const isSelected = city === p.name
                        return (
                          <button
                            key={p.code}
                            type="button"
                            onClick={function () {
                              setCity(p.name ?? '')
                              setProvinceSearch(p.name ?? '')
                              setSelectedProvinceCode(p.code ?? '')
                              setWard('')
                              setWardSearch('')
                              setProvinceDropdownOpen(false)
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                              isSelected
                                ? 'bg-orange-50 font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700/60'
                            }`}
                          >
                            <span>{p.name}</span>
                            {isSelected && <Check size={14} weight="bold" />}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Row 3: Optimized Searchable Ward */}
              <div ref={wardContainerRef} className="relative">
                <label
                  htmlFor="wardSearchInput"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                >
                  Phường / Xã *
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <MagnifyingGlass size={14} />
                  </div>
                  <input
                    id="wardSearchInput"
                    type="text"
                    required
                    autoComplete="off"
                    disabled={selectedProvinceCode === ''}
                    value={wardSearch}
                    onFocus={function () {
                      if (selectedProvinceCode !== '') {
                        setWardDropdownOpen(true)
                      }
                    }}
                    onChange={function (e) {
                      setWardSearch(e.target.value)
                      if (selectedProvinceCode !== '') {
                        setWardDropdownOpen(true)
                      }
                    }}
                    placeholder={
                      selectedProvinceCode === ''
                        ? 'Vui lòng chọn Tỉnh/Thành phố trước'
                        : 'Gõ để tìm nhanh (VD: Dịch Vọng, Bến Nghé, Phường 1...)'
                    }
                    className="w-full rounded-2xl border border-zinc-200 py-2.5 pr-14 pl-9 text-xs font-medium text-zinc-900 focus:border-orange-500 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:disabled:bg-zinc-900/60"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2.5">
                    {wardsQuery.isLoading && (
                      <ArrowClockwise size={13} className="animate-spin text-orange-500" />
                    )}
                    {ward !== '' && (
                      <button
                        type="button"
                        onClick={function () {
                          setWard('')
                          setWardSearch('')
                        }}
                        className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        title="Xóa lựa chọn"
                      >
                        <X size={12} weight="bold" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={selectedProvinceCode === ''}
                      onClick={function () {
                        setWardDropdownOpen(!wardDropdownOpen)
                      }}
                      className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-50 dark:hover:text-zinc-200"
                    >
                      <CaretDown size={12} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Dropdown list for Ward */}
                {wardDropdownOpen && selectedProvinceCode !== '' && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
                    {filteredWards.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-400">
                        {wards.length === 0
                          ? 'Đang tải danh sách phường/xã...'
                          : 'Không tìm thấy phường/xã phù hợp'}
                      </div>
                    ) : (
                      filteredWards.slice(0, 40).map(function (w) {
                        const isSelected = ward === w.name
                        return (
                          <button
                            key={w.code}
                            type="button"
                            onClick={function () {
                              setWard(w.name ?? '')
                              setWardSearch(w.name ?? '')
                              setWardDropdownOpen(false)
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                              isSelected
                                ? 'bg-orange-50 font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700/60'
                            }`}
                          >
                            <span>{w.name}</span>
                            {isSelected && <Check size={14} weight="bold" />}
                          </button>
                        )
                      })
                    )}
                    {filteredWards.length > 40 && (
                      <div className="p-2 text-center text-[11px] text-zinc-400">
                        Còn {filteredWards.length - 40} phường/xã khác, gõ thêm để thu hẹp kết
                        quả...
                      </div>
                    )}
                  </div>
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

              {/* Row 5: Set default checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="defaultAddressCheckbox"
                  type="checkbox"
                  checked={isDefault}
                  onChange={function (e) {
                    setIsDefault(e.target.checked)
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <label
                  htmlFor="defaultAddressCheckbox"
                  className="cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Đặt làm địa chỉ mặc định
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={function () {
                    setModalOpen(false)
                  }}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Hủy
                </button>
                <button
                  id="submitAddressBtn"
                  type="submit"
                  disabled={isMutating}
                  className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-600/20 hover:bg-orange-700 disabled:opacity-50"
                >
                  {isMutating && <ArrowClockwise size={14} className="animate-spin" />}
                  <span>{modalMode === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
