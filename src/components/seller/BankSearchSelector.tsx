import { useEffect, useRef, useState } from 'react'

import { Bank, CaretDown, Check, MagnifyingGlass, X } from '@phosphor-icons/react'

import { filterBanks } from '@/lib/bankSearch'

import type { BankResponse } from '@/types/bank'

export interface BankSearchSelectorProps {
  banks: BankResponse[]
  selectedBankBin: string
  onSelectBank: (bank: BankResponse) => void
  disabled?: boolean
  error?: string
  idPrefix?: string
}

function optionItemClass(isSelected: boolean): string {
  if (isSelected) {
    return 'bg-blue-50/80 font-bold text-blue-700 dark:bg-white/10 dark:text-sky-300'
  }
  return 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10'
}

export default function BankSearchSelector({
  banks,
  selectedBankBin,
  onSelectBank,
  disabled = false,
  error,
  idPrefix = 'bank',
}: BankSearchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedBank = banks.find((b) => b.bin === selectedBankBin)

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      window.setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const filteredBanks = filterBanks(banks, search)

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={`${idPrefix}-select-trigger`}
        className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
      >
        Ngân hàng thụ hưởng <span className="text-red-500">*</span>
      </label>

      {/* Trigger Button */}
      <button
        id={`${idPrefix}-select-trigger`}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="mt-1 flex w-full items-center justify-between rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none transition hover:border-blue-500 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {selectedBank && selectedBank.logo && (
            <img
              src={selectedBank.logo}
              alt={selectedBank.shortName}
              className="h-6 w-6 shrink-0 rounded object-contain bg-white p-0.5 shadow-xs"
            />
          )}
          {selectedBank && !selectedBank.logo && (
            <Bank size={18} className="shrink-0 text-blue-600 dark:text-sky-400" />
          )}
          {!selectedBank && <Bank size={18} className="shrink-0 text-zinc-400" />}

          {selectedBank && (
            <div className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="font-bold text-zinc-900 dark:text-white">
                {selectedBank.shortName}
              </span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                {selectedBank.code}
              </span>
              <span className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                ({selectedBank.name})
              </span>
            </div>
          )}

          {!selectedBank && (
            <span className="text-zinc-400 dark:text-zinc-500">
              Chọn ngân hàng (hơn 50+ ngân hàng Napas)...
            </span>
          )}
        </div>

        <CaretDown size={14} className="shrink-0 text-zinc-400" />
      </button>

      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}

      {/* Dropdown Menu with Search */}
      {isOpen && (
        <div className="absolute z-40 mt-1 max-h-72 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-white/15 dark:bg-zinc-900">
          {/* Search Box */}
          <div className="border-b border-zinc-100 p-2 dark:border-white/10">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên (VCB, MB...), tên đầy đủ hoặc mã BIN..."
                className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2 pr-8 pl-8 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500"
              />
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute top-2.5 left-2.5 text-zinc-400"
              />
              {search.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute top-2 right-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Banks List */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredBanks.length === 0 && (
              <div className="px-4 py-3 text-center text-xs text-zinc-400">
                Không tìm thấy ngân hàng phù hợp với từ khóa
              </div>
            )}

            {filteredBanks.map((b) => {
              const isSelected = b.bin === selectedBankBin
              return (
                <button
                  key={b.bin}
                  type="button"
                  onClick={() => {
                    onSelectBank(b)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition ${optionItemClass(
                    isSelected,
                  )}`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {b.logo && (
                      <img
                        src={b.logo}
                        alt={b.shortName}
                        className="h-6 w-6 shrink-0 rounded object-contain bg-white p-0.5 shadow-2xs"
                      />
                    )}
                    {!b.logo && <Bank size={16} className="shrink-0 text-zinc-400" />}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {b.shortName}
                        </span>
                        <span className="rounded bg-zinc-100 px-1 py-0.2 text-[9px] font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
                          {b.code}
                        </span>
                        <span className="text-[10px] text-zinc-400">BIN: {b.bin}</span>
                      </div>
                      <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        {b.name}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={16} weight="bold" className="shrink-0 text-blue-600" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
