import { useEffect, useRef, useState } from 'react'

import { getListQueryKey, useAdd, useUpdate } from '@generated/endpoints/addresses/addresses'
import { useListProvinces, useListWards } from '@generated/endpoints/locations/locations'
import { ArrowClockwise, CaretDown, Check, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import { takeData } from '@/lib/api/apiAdapters'
import { ApiError } from '@/lib/api/apiFetch'
import { formatAddressLabel, splitFullAddress } from '@/lib/format'
import { notify } from '@/lib/notifications'

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

  const addAddressMutation = useAdd({
    mutation: {
      onSuccess: function (res) {
        void queryClient.invalidateQueries({ queryKey: getListQueryKey() })
        notify.success('Đã thêm địa chỉ nhận hàng mới', undefined, { id: 'address-saved' })
        if (props.onSaved !== undefined) {
          props.onSaved(takeData(res))
        }
        props.onClose()
      },
      onError: function (err) {
        if (err instanceof ApiError && err.status === 400) {
          notify.error(maxAddressErrorMessage(err.message), undefined, {
            id: 'address-save-error',
          })
        } else {
          notify.fromError(err, 'addresses', 'Không thể thêm địa chỉ. Vui lòng thử lại.', {
            id: 'address-save-error',
          })
        }
      },
    },
  })

  const updateAddressMutation = useUpdate({
    mutation: {
      onSuccess: function (res) {
        void queryClient.invalidateQueries({ queryKey: getListQueryKey() })
        notify.success('Đã cập nhật địa chỉ nhận hàng', undefined, { id: 'address-saved' })
        if (props.onSaved !== undefined) {
          props.onSaved(takeData(res))
        }
        props.onClose()
      },
      onError: function (err) {
        notify.fromError(
          err,
          'addresses',
          'Không thể cập nhật địa chỉ. Vui lòng kiểm tra lại thông tin.',
          { id: 'address-save-error' },
        )
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
      notify.warning(
        'Vui lòng điền đầy đủ tên, số điện thoại, tỉnh/thành, phường/xã và địa chỉ chi tiết.',
        undefined,
        { id: 'address-form-validation' },
      )
      return
    }

    const phoneRegex = /^[0-9+() -]{9,15}$/
    if (!phoneRegex.test(cleanPhone)) {
      notify.warning('Số điện thoại không hợp lệ (cần từ 9 đến 15 số).', undefined, {
        id: 'address-form-validation',
      })
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

  return (
    <Modal title={modalTitle(props.mode)} onClose={props.onClose}>
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
                  className="cursor-pointer rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  title="Xóa lựa chọn"
                  aria-label="Xóa tỉnh/thành phố đã chọn"
                >
                  <X size={12} weight="bold" />
                </button>
              )}
              <button
                type="button"
                aria-label="Mở danh sách tỉnh/thành phố"
                onClick={function () {
                  setProvinceDropdownOpen(!provinceDropdownOpen)
                }}
                className="cursor-pointer rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
                  className="cursor-pointer rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  title="Xóa lựa chọn"
                  aria-label="Xóa phường/xã đã chọn"
                >
                  <X size={12} weight="bold" />
                </button>
              )}
              <button
                type="button"
                disabled={provinceCode === ''}
                aria-label="Mở danh sách phường/xã"
                onClick={function () {
                  setWardDropdownOpen(!wardDropdownOpen)
                }}
                className="cursor-pointer rounded-full p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-50 dark:hover:text-zinc-200"
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
              let chipClass =
                'cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition '
              if (label === l) {
                chipClass += 'btn-primary border-transparent shadow-xs'
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
            className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            id="submitAddressBtn"
            type="submit"
            disabled={isMutating}
            className="btn-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold shadow-sm shadow-indigo-900/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMutating && <ArrowClockwise size={14} className="animate-spin" />}
            <span>{submitLabel(props.mode)}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
