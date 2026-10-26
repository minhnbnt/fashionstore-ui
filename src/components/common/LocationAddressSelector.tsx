import { useEffect, useRef, useState } from 'react'

import { useListProvinces, useListWards } from '@generated/endpoints/locations/locations'
import { CaretDown, Check, MagnifyingGlass, X } from '@phosphor-icons/react'

import { takeData } from '@/lib/apiAdapters'
import { removeVietnameseAccents } from '@/lib/bankSearch'
import { splitFullAddress } from '@/lib/format'

import type { ProvinceResponse } from '@generated/model/provinceResponse'
import type { WardResponse } from '@generated/model/wardResponse'

const INPUT_CLASS =
  'mt-1 w-full rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500'

const SEARCH_INPUT_CLASS =
  'w-full rounded-full border border-zinc-300 bg-white/80 py-2.5 pr-10 pl-9 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500'

function optionItemClass(isSelected: boolean): string {
  if (isSelected) {
    return 'bg-sky-100 font-bold text-blue-700 dark:bg-white/10 dark:text-sky-300'
  }
  return 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10'
}

export interface LocationAddressSelectorProps {
  value: string
  onChange: (fullAddress: string) => void
  required?: boolean
  disabled?: boolean
  idPrefix?: string
  error?: string
}

export default function LocationAddressSelector({
  value,
  onChange,
  required = false,
  disabled = false,
  idPrefix = 'loc',
  error,
}: LocationAddressSelectorProps) {
  const parsed = splitFullAddress(value)

  const [province, setProvince] = useState(parsed.province)
  const [provinceSearch, setProvinceSearch] = useState(parsed.province)
  const [provinceDropdownOpen, setProvinceDropdownOpen] = useState(false)
  const provinceContainerRef = useRef<HTMLDivElement>(null)

  const [ward, setWard] = useState(parsed.ward)
  const [wardSearch, setWardSearch] = useState(parsed.ward)
  const [wardDropdownOpen, setWardDropdownOpen] = useState(false)
  const wardContainerRef = useRef<HTMLDivElement>(null)

  const [detail, setDetail] = useState(parsed.detail)
  const [prevPropValue, setPrevPropValue] = useState(value)

  if (value !== prevPropValue) {
    setPrevPropValue(value)
    const next = splitFullAddress(value)
    setProvince(next.province)
    setProvinceSearch(next.province)
    setWard(next.ward)
    setWardSearch(next.ward)
    setDetail(next.detail)
  }

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

  const matchedProvince = provinces.find((p) => p.name === province)
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

  // Click outside to close dropdowns
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

  function emitChange(newDetail: string, newWard: string, newProvince: string) {
    const parts = [newDetail.trim(), newWard.trim(), newProvince.trim()].filter(Boolean)
    onChange(parts.join(', '))
  }

  function handleSelectProvince(p: ProvinceResponse) {
    const pName = p.name ?? ''
    setProvince(pName)
    setProvinceSearch(pName)
    setProvinceDropdownOpen(false)
    // Clear ward when province changes
    setWard('')
    setWardSearch('')
    emitChange(detail, '', pName)
  }

  function handleSelectWard(w: WardResponse) {
    const wName = w.name ?? ''
    setWard(wName)
    setWardSearch(wName)
    setWardDropdownOpen(false)
    emitChange(detail, wName, province)
  }

  function handleDetailChange(newDetail: string) {
    setDetail(newDetail)
    emitChange(newDetail, ward, province)
  }

  const pQuery = removeVietnameseAccents(provinceSearch.trim())
  const filteredProvinces = provinces.filter((p) =>
    removeVietnameseAccents(p.name ?? '').includes(pQuery),
  )

  const wQuery = removeVietnameseAccents(wardSearch.trim())
  const filteredWards = wards.filter((w) => removeVietnameseAccents(w.name ?? '').includes(wQuery))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Province / City */}
        <div ref={provinceContainerRef} className="relative">
          <label
            htmlFor={`${idPrefix}-province`}
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
          >
            Tỉnh / Thành phố {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative mt-1">
            <input
              id={`${idPrefix}-province`}
              type="text"
              disabled={disabled}
              value={provinceSearch}
              onChange={(e) => {
                setProvinceSearch(e.target.value)
                setProvinceDropdownOpen(true)
              }}
              onFocus={() => setProvinceDropdownOpen(true)}
              placeholder="Chọn hoặc gõ tìm Tỉnh/TP..."
              className={SEARCH_INPUT_CLASS}
            />
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute top-3 left-3 text-zinc-400"
            />
            {provinceSearch.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setProvince('')
                  setProvinceSearch('')
                  setWard('')
                  setWardSearch('')
                  emitChange(detail, '', '')
                }}
                className="absolute top-2.5 right-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            )}
            <CaretDown
              size={14}
              className="pointer-events-none absolute top-3.5 right-3 text-zinc-400"
            />
          </div>

          {provinceDropdownOpen && (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-zinc-900">
              {filteredProvinces.length === 0 && (
                <div className="px-3.5 py-2.5 text-xs text-zinc-400">
                  Không tìm thấy Tỉnh/Thành phố
                </div>
              )}
              {filteredProvinces.map((p) => {
                const isSelected = p.name === province
                return (
                  <button
                    key={p.code ?? p.name}
                    type="button"
                    onClick={() => handleSelectProvince(p)}
                    className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs ${optionItemClass(
                      isSelected,
                    )}`}
                  >
                    <span>{p.name}</span>
                    {isSelected && <Check size={14} weight="bold" className="text-blue-600" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Ward */}
        <div ref={wardContainerRef} className="relative">
          <label
            htmlFor={`${idPrefix}-ward`}
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
          >
            Phường / Xã {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative mt-1">
            <input
              id={`${idPrefix}-ward`}
              type="text"
              disabled={disabled || provinceCode === ''}
              value={wardSearch}
              onChange={(e) => {
                setWardSearch(e.target.value)
                setWardDropdownOpen(true)
              }}
              onFocus={() => {
                if (provinceCode !== '') {
                  setWardDropdownOpen(true)
                }
              }}
              placeholder={
                provinceCode === ''
                  ? 'Vui lòng chọn Tỉnh/TP trước'
                  : 'Chọn hoặc gõ tìm Phường/Xã...'
              }
              className={`${SEARCH_INPUT_CLASS} ${
                provinceCode === '' ? 'cursor-not-allowed opacity-60' : ''
              }`}
            />
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute top-3 left-3 text-zinc-400"
            />
            {wardSearch.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWard('')
                  setWardSearch('')
                  emitChange(detail, '', province)
                }}
                className="absolute top-2.5 right-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            )}
            <CaretDown
              size={14}
              className="pointer-events-none absolute top-3.5 right-3 text-zinc-400"
            />
          </div>

          {wardDropdownOpen && provinceCode !== '' && (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-zinc-900">
              {wardsQuery.isPending && (
                <div className="px-3.5 py-2.5 text-xs text-zinc-400">Đang tải danh sách...</div>
              )}
              {!wardsQuery.isPending && filteredWards.length === 0 && (
                <div className="px-3.5 py-2.5 text-xs text-zinc-400">Không tìm thấy Phường/Xã</div>
              )}
              {filteredWards.map((w) => {
                const isSelected = w.name === ward
                return (
                  <button
                    key={w.code ?? w.name}
                    type="button"
                    onClick={() => handleSelectWard(w)}
                    className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs ${optionItemClass(
                      isSelected,
                    )}`}
                  >
                    <span>{w.name}</span>
                    {isSelected && <Check size={14} weight="bold" className="text-blue-600" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Street & Detail address */}
      <div>
        <label
          htmlFor={`${idPrefix}-detail`}
          className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
        >
          Số nhà, tên đường, ngõ ngách {required && <span className="text-red-500">*</span>}
        </label>
        <input
          id={`${idPrefix}-detail`}
          type="text"
          disabled={disabled}
          value={detail}
          onChange={(e) => handleDetailChange(e.target.value)}
          placeholder="VD: 123 Phố Huế, ngõ 45..."
          className={INPUT_CLASS}
        />
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
