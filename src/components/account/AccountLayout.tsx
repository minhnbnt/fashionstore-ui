import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

import { ChatCircleDots, Heart, MapPin, Package, UserCircle } from '@phosphor-icons/react'

import Breadcrumb, { type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { cn, FOCUS_RING_CLASS, PANEL_CLASS, sidebarItemClass } from '@/lib/ui/styles'

interface AccountNavItem {
  to: string
  label: string
  end?: boolean
  icon: typeof UserCircle
}

const ACCOUNT_NAV_ITEMS: readonly AccountNavItem[] = [
  { to: '/account', label: 'Hồ sơ & Gian hàng', end: true, icon: UserCircle },
  { to: '/account/orders', label: 'Đơn hàng của tôi', icon: Package },
  { to: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { to: '/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
  { to: '/messages', label: 'Tin nhắn', icon: ChatCircleDots },
]

function mobilePillClass(isActive: boolean): string {
  if (isActive) {
    return cn(
      'btn-primary inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap shadow-xs',
      FOCUS_RING_CLASS,
    )
  }
  return cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/90 px-4 py-2 text-xs font-semibold whitespace-nowrap text-zinc-700 transition hover:border-blue-300 hover:text-[#17203a] dark:border-white/10 dark:bg-[#11182a] dark:text-zinc-200 dark:hover:border-white/25 dark:hover:text-white',
    FOCUS_RING_CLASS,
  )
}

function desktopNavLinkClass({ isActive }: { isActive: boolean }): string {
  return sidebarItemClass(isActive)
}

function mobileNavLinkClass({ isActive }: { isActive: boolean }): string {
  return mobilePillClass(isActive)
}

export interface AccountLayoutProps {
  breadcrumbs: BreadcrumbItem[]
  topBanner?: ReactNode
  children: ReactNode
}

export default function AccountLayout(props: AccountLayoutProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-24 pb-16">
      <Breadcrumb items={props.breadcrumbs} showHomeIcon={true} className="mb-5" />

      {props.topBanner}

      {/* Mobile horizontal scrollable pill navigation */}
      <nav
        aria-label="Điều hướng tài khoản"
        className="mb-5 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 lg:hidden"
      >
        {ACCOUNT_NAV_ITEMS.map(function (item) {
          const Icon = item.icon
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={mobileNavLinkClass}>
              <Icon size={15} weight="bold" className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Desktop left navigation rail */}
        <aside className="hidden w-64 shrink-0 lg:sticky lg:top-24 lg:block">
          <div className={cn(PANEL_CLASS, 'p-3.5')}>
            <p className="px-3 pb-2 text-[11px] font-extrabold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
              Tài khoản của tôi
            </p>
            <nav aria-label="Menu tài khoản" className="space-y-1">
              {ACCOUNT_NAV_ITEMS.map(function (item) {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={desktopNavLinkClass}
                  >
                    <Icon size={17} weight="bold" className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main account content */}
        <div className="min-w-0 flex-1">{props.children}</div>
      </div>
    </main>
  )
}
