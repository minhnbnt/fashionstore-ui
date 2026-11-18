import { cn, sidebarItemClass } from '@/lib/ui/styles'

import type { MenuGroup, SellerTabId } from '@/types/seller'

export interface SellerSidebarNavProps {
  groups: MenuGroup[]
  activeTab: SellerTabId
  onSelectTab: (tab: SellerTabId) => void
}

function isNavItemActive(itemId: SellerTabId, activeTab: SellerTabId): boolean {
  if (itemId === activeTab) {
    return true
  }
  if (itemId === 'PRODUCTS' && activeTab === 'EDIT_PRODUCT') {
    return true
  }
  return false
}

function getNavIconClass(isActive: boolean): string {
  if (isActive) {
    return 'shrink-0 text-white'
  }
  return 'shrink-0 text-zinc-500 dark:text-zinc-400'
}

function getNavBadgeClass(isActive: boolean, badgeColor?: string): string {
  if (isActive) {
    return 'shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white ring-1 ring-white/30'
  }
  if (badgeColor !== undefined && badgeColor !== '') {
    return cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white', badgeColor)
  }
  return 'shrink-0 rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-sky-500/25 dark:text-sky-200'
}

export function SellerSidebarNav({ groups, activeTab, onSelectTab }: SellerSidebarNavProps) {
  return (
    <nav aria-label="Điều hướng Kênh Người Bán" className="space-y-4">
      {groups.map(function (group) {
        return (
          <div key={group.groupTitle} className="space-y-1">
            <span className="mb-1 block px-3 text-[10px] font-extrabold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
              {group.groupTitle}
            </span>
            {group.items.map(function (item) {
              const Icon = item.icon
              const isActive = isNavItemActive(item.id, activeTab)
              const hasBadge = item.badgeCount !== undefined && item.badgeCount > 0

              let ariaCurrent: 'page' | undefined
              if (isActive) {
                ariaCurrent = 'page'
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={ariaCurrent}
                  onClick={function () {
                    onSelectTab(item.id)
                  }}
                  className={cn(
                    sidebarItemClass(isActive),
                    'cursor-pointer justify-between px-3 py-2 text-xs focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none dark:focus-visible:ring-sky-400/40',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon size={16} className={getNavIconClass(isActive)} />
                    <span className="truncate">{item.label}</span>
                  </span>

                  {hasBadge && (
                    <span className={getNavBadgeClass(isActive, item.badgeColor)}>
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

export default SellerSidebarNav
