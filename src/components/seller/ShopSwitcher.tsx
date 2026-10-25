import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useGetMyShops } from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import {
  CaretDown,
  CaretUp,
  CheckCircle,
  Crown,
  Key,
  SlidersHorizontal,
  Storefront,
} from '@phosphor-icons/react'

import { takeData } from '@/lib/apiAdapters'

import type { SellerShopMembershipResponse } from '@generated/model/sellerShopMembershipResponse'

interface ShopSwitcherProps {
  currentShopId: string
  onSwitchShop: (shopId: string) => void
}

function getSwitcherItemClass(isActive: boolean): string {
  if (isActive) {
    return 'flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs transition bg-indigo-50 font-bold text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200'
  }
  return 'flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs transition text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5'
}

function getRoleLabel(role: string, roleName: string | null | undefined): string {
  if (role === 'OWNER') {
    return 'Chủ gian hàng'
  }
  if (roleName !== null && roleName !== undefined && roleName !== '') {
    return roleName
  }
  return 'Nhân viên'
}

export default function ShopSwitcher({ currentShopId, onSwitchShop }: ShopSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const query = useGetMyShops()
  let shops: SellerShopMembershipResponse[] = []
  if (query.data !== undefined) {
    const raw = takeData(query.data)
    if (Array.isArray(raw)) {
      shops = raw
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  let currentShop: SellerShopMembershipResponse | null = null
  for (const s of shops) {
    if (s.shopId === currentShopId) {
      currentShop = s
      break
    }
  }

  let displayName = 'Gian hàng'
  let roleLabel = 'Thành viên'
  let isOwner = false
  if (currentShop !== null) {
    displayName = currentShop.shopName ?? 'Gian hàng'
    roleLabel = getRoleLabel(currentShop.role ?? '', currentShop.roleName)
    if (currentShop.role === 'OWNER') {
      isOwner = true
    }
  }

  const hasMultipleShops = shops.length > 1

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Switcher trigger button */}
      <button
        type="button"
        id="btn-shop-switcher"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 py-1.5 pr-3 pl-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-indigo-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-indigo-500/30"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 font-extrabold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
          <Storefront size={15} weight="bold" />
        </div>

        <div className="flex flex-col text-left">
          <span className="max-w-[120px] truncate text-xs font-bold text-zinc-900 group-hover:text-indigo-600 sm:max-w-[160px] dark:text-white dark:group-hover:text-indigo-400">
            {displayName}
          </span>
          <div className="flex items-center gap-1 text-[10px]">
            {isOwner && (
              <span className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400">
                <Crown size={10} weight="fill" />
                {roleLabel}
              </span>
            )}
            {!isOwner && (
              <span className="flex items-center gap-0.5 text-zinc-500 dark:text-zinc-400">
                <Key size={10} weight="bold" />
                {roleLabel}
              </span>
            )}
          </div>
        </div>

        {hasMultipleShops && !isOpen && (
          <CaretDown size={14} className="text-zinc-400 transition group-hover:text-zinc-600" />
        )}
        {hasMultipleShops && isOpen && (
          <CaretUp size={14} className="text-zinc-400 transition group-hover:text-zinc-600" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="shop-switcher-dropdown"
          className="glass absolute top-full left-0 z-50 mt-2 w-72 rounded-3xl border border-zinc-200/90 bg-white/95 p-3 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-extrabold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
              Gian hàng của bạn
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
              {shops.length}
            </span>
          </div>

          <div className="mt-1 max-h-60 space-y-1 overflow-y-auto">
            {shops.map(function (s) {
              const isActive = s.shopId === currentShopId
              const itemRole = getRoleLabel(s.role ?? '', s.roleName)
              const isShopOwner = s.role === 'OWNER'

              return (
                <button
                  key={s.shopId}
                  type="button"
                  onClick={function () {
                    onSwitchShop(s.shopId ?? '')
                    setIsOpen(false)
                  }}
                  className={getSwitcherItemClass(isActive)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{s.shopName ?? ''}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                      {isShopOwner && (
                        <span className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400">
                          <Crown size={10} weight="fill" />
                          {itemRole}
                        </span>
                      )}
                      {!isShopOwner && (
                        <span className="flex items-center gap-0.5 text-zinc-500 dark:text-zinc-400">
                          <Key size={10} weight="bold" />
                          {itemRole}
                        </span>
                      )}
                      <span className="text-zinc-300 dark:text-zinc-600">•</span>
                      <span className="text-zinc-400 dark:text-zinc-500">{s.shopSlug}</span>
                    </div>
                  </div>

                  {isActive && (
                    <CheckCircle
                      size={16}
                      weight="fill"
                      className="shrink-0 text-indigo-600 dark:text-indigo-400"
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-white/10">
            <Link
              to="/account?tab=shops"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-2xl p-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              <SlidersHorizontal size={14} />
              <span>Quản lý tất cả gian hàng</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
