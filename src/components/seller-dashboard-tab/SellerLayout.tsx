import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import {
  House,
  Package,
  PlusCircle,
  Archive,
  ShoppingCart,
  ArrowUUpLeft,
  Wallet,
  Star,
  ChatCircleDots,
  PaintBrushBroad,
  UsersThree,
  Storefront,
  ArrowSquareOut,
  List,
  X,
  CaretRight,
  ShieldCheck,
  ChartLineUp,
  ChartBar,
} from '@phosphor-icons/react'

import NotificationBell from '@/components/NotificationBell'
import ShopSwitcher from '@/components/seller/ShopSwitcher'
import ThemeToggle from '@/components/ui/ThemeToggle'
import UserAvatar from '@/components/UserAvatar'
import { canSeeTab } from '@/lib/sellerPermissions'

import type { MenuGroup, SellerTabId } from '@/types/seller'

interface SellerLayoutProps {
  activeTab: SellerTabId
  onSelectTab: (tab: SellerTabId) => void
  children: ReactNode
  shopName: string
  pendingOrdersCount: number
  returnRequestsCount: number
  lowStockCount: number
  unreadChatCount: number
  permissions?: string[]
  isOwner?: boolean
  shopId?: string
  onSwitchShop?: (shopId: string) => void
}

export function SellerLayout({
  activeTab,
  onSelectTab,
  children,
  shopName,
  pendingOrdersCount,
  returnRequestsCount,
  lowStockCount,
  unreadChatCount,
  permissions = [],
  isOwner = false,
  shopId,
  onSwitchShop,
}: SellerLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuGroups: MenuGroup[] = [
    {
      groupTitle: 'TỔNG QUAN',
      items: [
        {
          id: 'OVERVIEW',
          label: 'Tổng quan shop',
          icon: House,
        },
      ],
    },
    {
      groupTitle: 'QUẢN LÝ ĐƠN HÀNG',
      items: [
        {
          id: 'ORDERS',
          label: 'Quản lý đơn hàng',
          icon: ShoppingCart,
          badgeCount: pendingOrdersCount,
          badgeColor: 'bg-indigo-700',
        },
        {
          id: 'RETURNS',
          label: 'Trả hàng / Hoàn tiền',
          icon: ArrowUUpLeft,
          badgeCount: returnRequestsCount,
          badgeColor: 'bg-amber-500',
        },
      ],
    },
    {
      groupTitle: 'QUẢN LÝ SẢN PHẨM',
      items: [
        {
          id: 'PRODUCTS',
          label: 'Tất cả sản phẩm',
          icon: Package,
        },
        {
          id: 'ADD_PRODUCT',
          label: 'Thêm sản phẩm mới',
          icon: PlusCircle,
        },
        {
          id: 'INVENTORY',
          label: 'Quản lý tồn kho & SKU',
          icon: Archive,
          badgeCount: lowStockCount,
          badgeColor: 'bg-amber-600',
        },
      ],
    },
    {
      groupTitle: 'TÀI CHÍNH & VÍ SHOP',
      items: [
        {
          id: 'REVENUE',
          label: 'Doanh thu & Ví Shop',
          icon: Wallet,
        },
      ],
    },
    {
      groupTitle: 'THỐNG KÊ & BÁO CÁO',
      items: [
        {
          id: 'STATS_REVENUE',
          label: 'Thống kê doanh thu',
          icon: ChartLineUp,
        },
        {
          id: 'STATS_PRODUCTS',
          label: 'Phân tích sản phẩm',
          icon: ChartBar,
        },
        {
          id: 'STATS_CUSTOMERS',
          label: 'Phân tích khách hàng',
          icon: UsersThree,
        },
      ],
    },
    {
      groupTitle: 'CHĂM SÓC KHÁCH HÀNG',
      items: [
        {
          id: 'REVIEWS',
          label: 'Đánh giá từ người mua',
          icon: Star,
        },
        {
          id: 'CHAT',
          label: 'Tin nhắn CSKH',
          icon: ChatCircleDots,
          badgeCount: unreadChatCount,
          badgeColor: 'bg-indigo-700',
        },
      ],
    },
    {
      groupTitle: 'THIẾT KẾ & VẬN HÀNH',
      items: [
        {
          id: 'DECORATION',
          label: 'Trang trí gian hàng',
          icon: PaintBrushBroad,
        },
        {
          id: 'STAFF',
          label: 'Nhân viên & Phân quyền',
          icon: UsersThree,
        },
        {
          id: 'PROFILE',
          label: 'Hồ sơ Shop & KYC',
          icon: Storefront,
        },
      ],
    },
  ]

  const filteredGroups: MenuGroup[] = menuGroups
    .map((group) => {
      const items = group.items.filter((item) => canSeeTab(item.id, permissions, isOwner))
      return { ...group, items }
    })
    .filter((group) => group.items.length > 0)

  const canAccessChat = isOwner || permissions.includes('CHAT_ACCESS')

  const handleSelectTab = (tab: SellerTabId) => {
    onSelectTab(tab)
    setIsMobileMenuOpen(false)
  }

  return (
    // Không đặt nền ở đây: body (index.css) đã có #f6f9ff / dark #0a0f1e,
    // nền đặc ở đây sẽ che AmbientBackground (fixed -z-10, gắn ở App.tsx).
    <div className="flex min-h-screen flex-col font-sans">
      {/* Seller Topbar — floating glass pill dãn hết bề ngang container như Header storefront */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-[1600px] px-4">
          <div className="glass mt-3 flex h-16 items-center justify-between gap-3 rounded-full px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-full p-2 text-zinc-600 transition hover:bg-indigo-100 lg:hidden dark:text-zinc-300 dark:hover:bg-white/10"
              >
                <List size={22} />
              </button>

              {/* Seller Branding — wordmark nét giống storefront */}
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-2xl font-extrabold tracking-tighter">
                  nét
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-900 to-sky-400" />
                </span>
                <span className="hidden rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-indigo-700 uppercase sm:inline dark:bg-indigo-900/40 dark:text-indigo-300">
                  Seller Center
                </span>
              </div>

              {shopId !== undefined && shopId !== '' && onSwitchShop !== undefined && (
                <div className="ml-1 sm:ml-2">
                  <ShopSwitcher currentShopId={shopId} onSwitchShop={onSwitchShop} />
                </div>
              )}
            </div>

            {/* Right Header Navigation */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Quick Chat Shortcut with Badge */}
              {canAccessChat && (
                <button
                  type="button"
                  onClick={() => handleSelectTab('CHAT')}
                  className="relative rounded-full p-2 text-zinc-600 transition hover:bg-indigo-100 dark:text-zinc-300 dark:hover:bg-white/10"
                  title="Tin nhắn CSKH"
                >
                  <ChatCircleDots size={20} />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-700 text-[10px] font-bold text-white">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              )}

              {/* Notification Bell */}
              <NotificationBell />

              {/* Theme Toggle — component dùng chung với Header storefront */}
              <ThemeToggle className="relative rounded-full p-2 text-zinc-600 transition hover:bg-indigo-100 dark:text-zinc-300 dark:hover:bg-white/10" />

              {/* Back to Marketplace Link */}
              <Link
                to="/"
                className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-all hover:border-blue-600 hover:text-indigo-600 sm:flex dark:border-white/15 dark:bg-white/10 dark:text-zinc-300 dark:hover:text-indigo-400"
              >
                <span>Xem trang mua sắm</span>
                <ArrowSquareOut size={14} />
              </Link>

              {/* Seller Shop Profile Badge */}
              <button
                type="button"
                onClick={() => handleSelectTab('PROFILE')}
                className="group flex cursor-pointer items-center gap-2 text-left"
              >
                <UserAvatar name={shopName} size={32} />
                <div className="hidden flex-col text-left md:flex">
                  <div className="flex items-center gap-1">
                    <span className="max-w-[140px] truncate text-xs font-bold text-zinc-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
                      {shopName}
                    </span>
                    <ShieldCheck size={14} className="text-blue-500" weight="fill" />
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    nét Mall • 4.9 ⭐
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 px-2 py-4 sm:px-4">
        {/* Left Sidebar for Desktop */}
        <aside className="sticky top-20 hidden max-h-[calc(100vh-96px)] w-64 shrink-0 flex-col overflow-y-auto rounded-3xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm lg:flex dark:border-white/10 dark:bg-[#11182a]">
          <nav className="space-y-4">
            {filteredGroups.map((group) => (
              <div key={group.groupTitle} className="space-y-1">
                <span className="mb-1 block px-3 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                  {group.groupTitle}
                </span>
                {group.items.map((item) => {
                  const Icon = item.icon
                  let isActive = activeTab === item.id
                  if (item.id === 'PRODUCTS' && activeTab === 'EDIT_PRODUCT') {
                    isActive = true
                  }
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-full px-3 py-2 text-xs font-medium transition-all ${
                        isActive &&
                        'bg-indigo-900 font-bold text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
                      } ${!isActive && 'text-zinc-600 hover:bg-sky-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-zinc-100'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={16}
                          className={`${isActive && 'text-white dark:text-indigo-950'} ${!isActive && 'text-zinc-500 dark:text-zinc-400'}`}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.badgeCount && item.badgeCount > 0 && (
                        <span
                          className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold text-white ${item.badgeColor}`}
                        >
                          {item.badgeCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              aria-label="Đóng thanh điều hướng"
              className="fixed inset-0 cursor-default border-0 bg-zinc-950/55 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex h-full w-72 flex-col overflow-y-auto bg-white p-4 shadow-2xl dark:bg-[#11182a]">
              <div className="mb-3 flex items-center justify-between border-b pb-3">
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  Menu Kênh Người Bán
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="space-y-4">
                {filteredGroups.map((group) => (
                  <div key={group.groupTitle} className="space-y-1">
                    <span className="mb-1 block px-2 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                      {group.groupTitle}
                    </span>
                    {group.items.map((item) => {
                      const Icon = item.icon
                      let isActive = activeTab === item.id
                      if (item.id === 'PRODUCTS' && activeTab === 'EDIT_PRODUCT') {
                        isActive = true
                      }
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`flex w-full items-center justify-between rounded-full px-3 py-2 text-xs font-medium transition-all ${
                            isActive &&
                            'bg-indigo-900 font-bold text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
                          } ${!isActive && 'text-zinc-600 hover:bg-sky-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-zinc-100'}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              size={16}
                              className={`${isActive && 'text-white dark:text-indigo-950'} ${!isActive && 'text-zinc-500 dark:text-zinc-400'}`}
                            />
                            <span>{item.label}</span>
                          </div>

                          {item.badgeCount && item.badgeCount > 0 && (
                            <span
                              className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold text-white ${item.badgeColor}`}
                            >
                              {item.badgeCount}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Center Main Content Area */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* Breadcrumb Bar */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/80 px-4 py-2.5 text-xs text-zinc-500 shadow-xs dark:border-white/10 dark:bg-[#11182a] dark:text-zinc-400">
            <Link
              to="/shop"
              className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <House size={14} />
              <span>Kênh Người Bán</span>
            </Link>
            <CaretRight size={12} className="text-zinc-400 dark:text-zinc-500" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">
              {activeTab === 'OVERVIEW' && 'Tổng quan gian hàng'}
              {activeTab === 'PRODUCTS' && 'Tất cả sản phẩm'}
              {activeTab === 'ADD_PRODUCT' && 'Thêm sản phẩm mới'}
              {activeTab === 'INVENTORY' && 'Quản lý tồn kho & Biến thể'}
              {activeTab === 'ORDERS' && 'Quản lý đơn hàng'}
              {activeTab === 'RETURNS' && 'Yêu cầu trả hàng & Hoàn tiền'}
              {activeTab === 'REVENUE' && 'Doanh thu & Tài chính'}
              {activeTab === 'REVIEWS' && 'Đánh giá từ khách hàng'}
              {activeTab === 'CHAT' && 'Tin nhắn khách hàng (nét Chat)'}
              {activeTab === 'DECORATION' && 'Trang trí gian hàng'}
              {activeTab === 'STAFF' && 'Phân quyền & Quản lý nhân viên'}
              {activeTab === 'PROFILE' && 'Hồ sơ Shop & KYC'}
              {activeTab === 'STATS_REVENUE' && 'Thống kê & Báo cáo doanh thu'}
              {activeTab === 'STATS_PRODUCTS' && 'Phân tích hiệu suất sản phẩm'}
              {activeTab === 'STATS_CUSTOMERS' && 'Phân tích khách hàng & Theo dõi'}
            </span>
          </div>

          {/* Tab Content Body */}
          {children}
        </main>
      </div>
    </div>
  )
}
