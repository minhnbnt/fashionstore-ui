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

import { takeData } from '@/lib/api/apiAdapters'

import type { SellerShopMembershipResponse } from '@generated/model/sellerShopMembershipResponse'

interface ShopSwitcherProps {
  currentShopId: string
  onSwitchShop: (shopId: string) => void
}

function getSwitcherItemClass(isActive: boolean): string {
  if (isActive) {
    return 'btn-primary flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl p-2.5 text-left text-xs font-bold shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none dark:focus-visible:ring-sky-400/40'
  }
  return 'flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl p-2.5 text-left text-xs text-[#17203a] transition hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none dark:text-[#e2e8f0] dark:hover:bg-white/10 dark:focus-visible:ring-sky-400/40'
}

function getOwnerRoleClass(isActive: boolean): string {
  if (isActive) {
    return 'flex items-center gap-0.5 font-bold text-amber-200'
  }
  return 'flex items-center gap-0.5 font-bold text-amber-700 dark:text-amber-400'
}

function getStaffRoleClass(isActive: boolean): string {
  if (isActive) {
    return 'flex items-center gap-0.5 font-semibold text-white/85'
  }
  return 'flex items-center gap-0.5 text-zinc-600 dark:text-zinc-300'
}

function getSlugClass(isActive: boolean): string {
  if (isActive) {
    return 'truncate text-white/75'
  }
  return 'truncate text-zinc-500 dark:text-zinc-400'
}

function getDividerDotClass(isActive: boolean): string {
  if (isActive) {
    return 'text-white/50'
  }
  return 'text-zinc-300 dark:text-zinc-600'
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

  // Close on outside click or Escape key
  useEffect(function () {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current !== null && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return function () {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
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
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={function () {
          setIsOpen(!isOpen)
        }}
        className="group flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 bg-white/80 py-1.5 pr-3 pl-2 text-xs font-semibold text-[#17203a] shadow-xs transition hover:border-blue-600/50 hover:bg-white focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none dark:border-white/15 dark:bg-white/10 dark:text-[#e2e8f0] dark:hover:border-sky-400/50 dark:hover:bg-white/15 dark:focus-visible:ring-sky-400/40"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-sky-100 font-extrabold text-blue-700 dark:from-white/15 dark:to-white/5 dark:text-sky-300">
          <Storefront size={15} weight="bold" />
        </div>

        <div className="flex min-w-0 flex-col text-left">
          <span className="max-w-[120px] truncate text-xs font-bold text-[#17203a] transition-colors group-hover:text-blue-700 sm:max-w-[160px] dark:text-[#e2e8f0] dark:group-hover:text-sky-300">
            {displayName}
          </span>
          <div className="flex items-center gap-1 text-[10px]">
            {isOwner && (
              <span className="flex items-center gap-0.5 font-bold text-amber-700 dark:text-amber-400">
                <Crown size={10} weight="fill" />
                {roleLabel}
              </span>
            )}
            {!isOwner && (
              <span className="flex items-center gap-0.5 text-zinc-600 dark:text-zinc-300">
                <Key size={10} weight="bold" />
                {roleLabel}
              </span>
            )}
          </div>
        </div>

        {hasMultipleShops && !isOpen && (
          <CaretDown
            size={14}
            className="shrink-0 text-zinc-500 transition group-hover:text-[#17203a] dark:text-zinc-400 dark:group-hover:text-white"
          />
        )}
        {hasMultipleShops && isOpen && (
          <CaretUp
            size={14}
            className="shrink-0 text-zinc-500 transition group-hover:text-[#17203a] dark:text-zinc-400 dark:group-hover:text-white"
          />
        )}
      </button>

      {/* Dropdown Menu — lớp nổi trên panel tối dùng dark:bg-[#0a0f1e] dark:border-white/15 shadow-xl */}
      {isOpen && (
        <div
          id="shop-switcher-dropdown"
          role="menu"
          className="absolute top-full left-0 z-50 mt-2 w-72 rounded-3xl border border-zinc-300/90 bg-white/95 p-3 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-[#0a0f1e]"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-extrabold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
              Gian hàng của bạn
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-sky-500/20 dark:text-sky-300">
              {shops.length}
            </span>
          </div>

          <div className="mt-1 max-h-60 space-y-1 overflow-y-auto">
            {shops.map(function (s) {
              const isActive = s.shopId === currentShopId
              const itemRole = getRoleLabel(s.role ?? '', s.roleName)
              const isShopOwner = s.role === 'OWNER'
              const hasSlug = s.shopSlug !== undefined && s.shopSlug !== ''

              return (
                <button
                  key={s.shopId}
                  type="button"
                  role="menuitem"
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
                        <span className={getOwnerRoleClass(isActive)}>
                          <Crown size={10} weight="fill" />
                          {itemRole}
                        </span>
                      )}
                      {!isShopOwner && (
                        <span className={getStaffRoleClass(isActive)}>
                          <Key size={10} weight="bold" />
                          {itemRole}
                        </span>
                      )}
                      {hasSlug && (
                        <>
                          <span className={getDividerDotClass(isActive)}>•</span>
                          <span className={getSlugClass(isActive)}>{s.shopSlug}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <CheckCircle size={16} weight="fill" className="shrink-0 text-white" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-2 border-t border-zinc-200/80 pt-2 dark:border-white/10">
            <Link
              to="/account?tab=shops"
              onClick={function () {
                setIsOpen(false)
              }}
              className="flex cursor-pointer items-center gap-2 rounded-2xl p-2 text-xs font-semibold text-zinc-600 transition hover:bg-sky-50 hover:text-[#17203a] focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-sky-400/40"
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
