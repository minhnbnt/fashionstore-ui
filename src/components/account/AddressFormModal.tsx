import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { getList1QueryKey, useAdd, useUpdate } from '@generated/endpoints/addresses/addresses'
import { useListProvinces, useListWards } from '@generated/endpoints/locations/locations'
import {
  ArrowClockwise,
  CaretDown,
  Check,
  MagnifyingGlass,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/apiAdapters'
import { ApiError } from '@/lib/apiFetch'
import { formatAddressLabel, splitFullAddress } from '@/lib/format'

import Modal from '../Modal'

import type { AddressRequestLabel } from '@generated/model/addressRequestLabel'
import type { AddressResponse } from '@generated/model/addressResponse'
import type { ProvinceResponse } from '@generated/model/provinceResponse'
import type { WardResponse } from '@generated/model/wardResponse'

const MAX_ADDRESSES = 10

const ADDRESS_LABELS: AddressRequestLabel[] = ['HOME', 'OFFICE', 'OTHER']

// Recipe input theo search bar topbar (Header.tsx): pill bo tròn, nền trắng trong mờ.
// Dark dùng viền + nền trắng mờ để hòa với panel navy (#11182a); light giữ viền
// zinc-300 đậm hơn zinc-200 để border không bị chìm trên panel trắng.
const INPUT_CLASS =
  'mt-1 w-full rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500'

const SEARCH_INPUT_CLASS =
  'w-full rounded-full border border-zinc-300 bg-white/80 py-2.5 pr-14 pl-9 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500'

function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function maxAddressErrorMessage(message: string | undefined): string {
  if (message !== undefined && message.includes('Maximum of 10')) {
    return `Bạn chỉ có thể lưu tối đa ${MAX_ADDRESSES} địa chỉ nhận hàng.`
  }
  return 'Thông tin địa chỉ không hợp lệ. Vui lòng kiểm tra lại.'
}

function modalTitle(mode: 'create' | 'edit'): string {
  if (mode === 'create') {
    return 'Thêm địa chỉ nhận hàng'
  }
  return 'Cập nhật địa chỉ nhận hàng'
}

function submitLabel(mode: 'create' | 'edit'): string {
  if (mode === 'create') {
    return 'Thêm mới'
  }
  return 'Lưu thay đổi'
}

function optionItemClass(isSelected: boolean): string {
  if (isSelected) {
    return 'bg-sky-100 font-bold text-blue-700 dark:bg-white/10 dark:text-sky-300'
  }
  return 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10'
}

function wardInputPlaceholder(selectedProvinceCode: string): string {
  if (selectedProvinceCode === '') {
    return 'Vui lòng chọn Tỉnh/Thành phố trước'
  }
  return 'Gõ để tìm nhanh (VD: Dịch Vọng, Bến Nghé, Phường 1...)'
}

function wardEmptyText(totalWards: number): string {
  if (totalWards === 0) {
    return 'Đang tải danh sách phường/xã...'
  }
  return 'Không tìm thấy phường/xã phù hợp'
}

function initialAddressValues(addr: AddressResponse | null): {
  recipientName: string
  phoneNumber: string
  city: string
  ward: string
  detailAddress: string
  label: AddressRequestLabel
  isDefault: boolean
} {
  if (addr === null) {
    return {
      recipientName: '',
      phoneNumber: '',
      city: '',
      ward: '',
      detailAddress: '',
      label: 'HOME',
      isDefault: false,
    }
  }
  const parts = splitFullAddress(addr.fullAddress ?? '')
  return {
    recipientName: addr.recipientName ?? '',
    phoneNumber: addr.phoneNumber ?? '',
    city: parts.province,
    ward: parts.ward,
    detailAddress: parts.detail,
    label: addr.label ?? 'HOME',
    isDefault: addr.defaultAddress === true,
  }
}

// Form thêm/sửa địa chỉ dùng chung (Account + Checkout): tìm tỉnh/thành, phường/xã
// qua /api/public/locations, tự chứa mutation. Báo địa chỉ đã lưu về cha qua onSaved.
export default function AddressFormModal(props: {
  mode: 'create' | 'edit'
  initial: AddressResponse | null
  onClose: () => void
  onSaved?: (addr: AddressResponse) => void
}) {
  const queryClient = useQueryClient()

  const [toastError, setToastError] = useState<string | null>(null)

  // Form states — khởi tạo một lần lúc mount từ địa chỉ gốc (component mount lại mỗi lần mở)
  const initial = initialAddressValues(props.initial)
  const [recipientName, setRecipientName] = useState(initial.recipientName)
  const [phoneNumber, setPhoneNumber] = useState(initial.phoneNumber)
  const [city, setCity] = useState(initial.city)
  const [provinceSearch, setProvinceSearch] = useState(initial.city)
  const [provinceDropdownOpen, setProvinceDropdownOpen] = useState(false)
  const provinceContainerRef = useRef<HTMLDivElement>(null)

  const [ward, setWard] = useState(initial.ward)
  const [wardSearch, setWardSearch] = useState(initial.ward)
  const [wardDropdownOpen, setWardDropdownOpen] = useState(false)
  const wardContainerRef = useRef<HTMLDivElement>(null)

  const [detailAddress, setDetailAddress] = useState(initial.detailAddress)
  const [label, setLabel] = useState<AddressRequestLabel>(initial.label)
  const [isDefault, setIsDefault] = useState(initial.isDefault)

  // Queries
  const provincesQuery = useListProvinces()

  let provinces: ProvinceResponse[] = []
  if (provincesQuery.data !== undefined) {
    try {
      provinces = takeData(provincesQuery.data)
    } catch {
      provinces = []
    }
  }

  // Mã tỉnh/thành suy ra từ tên đã chọn — khi danh sách tải xong sẽ tự khớp (dùng cho edit)
  const matchedProvince = provinces.find(function (p) {
    return p.name === city
  })
  const provinceCode = matchedProvince?.code ?? ''

  const wardsQuery = useListWards(provinceCode, {
    query: {
      enabled: provinceCode !== '',
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

  function showToastError(msg: string) {
    setToastError(msg)
    window.setTimeout(function () {
      setToastError(null)
    }, 4000)
  }

  const addAddressMutation = useAdd({
    mutation: {
      onSuccess: function (res) {
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
        if (props.onSaved !== undefined) {
          props.onSaved(takeData(res))
        }
        props.onClose()
      },
      onError: function (err) {
        if (err instanceof ApiError && err.status === 400) {
          showToastError(maxAddressErrorMessage(err.message))
        } else {
          showToastError('Không thể thêm địa chỉ. Vui lòng thử lại.')
        }
      },
    },
  })

  const updateAddressMutation = useUpdate({
    mutation: {
      onSuccess: function (res) {
        void queryClient.invalidateQueries({ queryKey: getList1QueryKey() })
        if (props.onSaved !== undefined) {
          props.onSaved(takeData(res))
        }
        props.onClose()
      },
      onError: function () {
        showToastError('Không thể cập nhật địa chỉ. Vui lòng kiểm tra lại thông tin.')
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

    if (
      cleanName === '' ||
      cleanPhone === '' ||
      cleanCity === '' ||
      cleanWard === '' ||
      cleanDetail === ''
    ) {
      showToastError(
        'Vui lòng điền đầy đủ tên, số điện thoại, tỉnh/thành, phường/xã và địa chỉ chi tiết.',
      )
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
      fullAddress: [cleanDetail, cleanWard, cleanCity].join(', '),
      label: label,
      defaultAddress: isDefault,
    }

    if (props.mode === 'create') {
      addAddressMutation.mutate({ data: payload })
    } else if (props.initial?.id !== undefined && props.initial.id !== '') {
      updateAddressMutation.mutate({ id: props.initial.id, data: payload })
    }
  }

  const isMutating = addAddressMutation.isPending || updateAddressMutation.isPending

  return createPortal(
    <Modal title={modalTitle(props.mode)} onClose={props.onClose}>
      {/* Error Toast */}
      {toastError !== null && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-600" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Modal Form */}
      <form onSubmit={handleSubmitAddress} className="mt-4 space-y-4">
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
              className={INPUT_CLASS}
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
              className={INPUT_CLASS}
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
              className={SEARCH_INPUT_CLASS}
            />
            <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2.5">
              {city !== '' && (
                <button
                  type="button"
                  onClick={function () {
                    setCity('')
                    setProvinceSearch('')
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
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#0a0f1e]">
              {filteredProvinces.length === 0 && (
                <div className="p-3 text-center text-xs text-zinc-400">
                  Không tìm thấy tỉnh/thành phố nào
                </div>
              )}
              {filteredProvinces.length > 0 &&
                filteredProvinces.map(function (p) {
                  const isSelected = city === p.name
                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={function () {
                        setCity(p.name ?? '')
                        setProvinceSearch(p.name ?? '')
                        setWard('')
                        setWardSearch('')
                        setProvinceDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${optionItemClass(isSelected)}`}
                    >
                      <span>{p.name}</span>
                      {isSelected && <Check size={14} weight="bold" />}
                    </button>
                  )
                })}
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
              disabled={provinceCode === ''}
              value={wardSearch}
              onFocus={function () {
                if (provinceCode !== '') {
                  setWardDropdownOpen(true)
                }
              }}
              onChange={function (e) {
                setWardSearch(e.target.value)
                if (provinceCode !== '') {
                  setWardDropdownOpen(true)
                }
              }}
              placeholder={wardInputPlaceholder(provinceCode)}
              className={`${SEARCH_INPUT_CLASS} disabled:bg-zinc-50 disabled:text-zinc-400 dark:disabled:bg-white/5 dark:disabled:text-zinc-500`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2.5">
              {wardsQuery.isLoading && (
                <ArrowClockwise size={13} className="animate-spin text-blue-600" />
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
                disabled={provinceCode === ''}
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
          {wardDropdownOpen && provinceCode !== '' && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#0a0f1e]">
              {filteredWards.length === 0 && (
                <div className="p-3 text-center text-xs text-zinc-400">
                  {wardEmptyText(wards.length)}
                </div>
              )}
              {filteredWards.length > 0 &&
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
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${optionItemClass(isSelected)}`}
                    >
                      <span>{w.name}</span>
                      {isSelected && <Check size={14} weight="bold" />}
                    </button>
                  )
                })}
              {filteredWards.length > 40 && (
                <div className="p-2 text-center text-[11px] text-zinc-400">
                  Còn {filteredWards.length - 40} phường/xã khác, gõ thêm để thu hẹp kết quả...
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
            className={INPUT_CLASS}
          />
        </div>

        {/* Row 5: Address label picker (required by the API contract) */}
        <div>
          <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
            Nhãn địa chỉ
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {ADDRESS_LABELS.map(function (l) {
              let chipClass = 'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition '
              if (label === l) {
                chipClass +=
                  'border-blue-600 bg-sky-100 text-blue-700 dark:border-skytint-500/60 dark:bg-white/15 dark:text-sky-300'
              } else {
                chipClass +=
                  'border-zinc-300 bg-white text-zinc-600 hover:border-blue-500 dark:border-white/15 dark:bg-white/10 dark:text-zinc-300'
              }
              return (
                <button
                  key={l}
                  type="button"
                  onClick={function () {
                    setLabel(l)
                  }}
                  className={chipClass}
                >
                  {formatAddressLabel(l)}
                </button>
              )
            })}
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
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 dark:border-white/15 dark:bg-white/10"
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
            onClick={props.onClose}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            id="submitAddressBtn"
            type="submit"
            disabled={isMutating}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-900 via-blue-700 to-sky-400 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-900/20 hover:opacity-90 disabled:opacity-50"
          >
            {isMutating && <ArrowClockwise size={14} className="animate-spin" />}
            <span>{submitLabel(props.mode)}</span>
          </button>
        </div>
      </form>
    </Modal>,
    document.body,
  )
}
