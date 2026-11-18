import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import {
  Archive,
  ArrowSquareOut,
  ArrowUUpLeft,
  CaretRight,
  ChartBar,
  ChartLineUp,
  ChatCircleDots,
  House,
  List,
  Package,
  PaintBrushBroad,
  PlusCircle,
  ShieldCheck,
  ShoppingCart,
  Star,
  Storefront,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react'

import NotificationBell from '@/components/NotificationBell'
import ShopSwitcher from '@/components/seller/ShopSwitcher'
import { Drawer } from '@/components/ui/Drawer'
import ThemeToggle from '@/components/ui/ThemeToggle'
import UserAvatar from '@/components/UserAvatar'
import { canSeeTab } from '@/lib/seller/sellerPermissions'

import { SellerSidebarNav } from './SellerSidebarNav'

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

function getBreadcrumbLabel(activeTab: SellerTabId): string {
  if (activeTab === 'OVERVIEW') {
    return 'Tổng quan gian hàng'
  }
  if (activeTab === 'PRODUCTS') {
    return 'Tất cả sản phẩm'
  }
  if (activeTab === 'ADD_PRODUCT') {
    return 'Thêm sản phẩm mới'
  }
  if (activeTab === 'EDIT_PRODUCT') {
    return 'Chỉnh sửa sản phẩm'
  }
  if (activeTab === 'INVENTORY') {
    return 'Quản lý tồn kho & Biến thể'
  }
  if (activeTab === 'ORDERS') {
    return 'Quản lý đơn hàng'
  }
  if (activeTab === 'RETURNS') {
    return 'Yêu cầu trả hàng & Hoàn tiền'
  }
  if (activeTab === 'REVENUE') {
    return 'Doanh thu & Tài chính'
  }
  if (activeTab === 'REVIEWS') {
    return 'Đánh giá từ khách hàng'
  }
  if (activeTab === 'CHAT') {
    return 'Tin nhắn khách hàng (DHMQ Chat)'
  }
  if (activeTab === 'DECORATION') {
    return 'Trang trí gian hàng'
  }
  if (activeTab === 'STAFF') {
    return 'Phân quyền & Quản lý nhân viên'
  }
  if (activeTab === 'PROFILE') {
    return 'Hồ sơ Shop & KYC'
  }
  if (activeTab === 'STATS_REVENUE') {
    return 'Thống kê & Báo cáo doanh thu'
  }
  if (activeTab === 'STATS_PRODUCTS') {
    return 'Phân tích hiệu suất sản phẩm'
  }
  return 'Phân tích khách hàng & Theo dõi'
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
          badgeColor: 'bg-blue-700',
        },
        {
          id: 'RETURNS',
          label: 'Trả hàng / Hoàn tiền',
          icon: ArrowUUpLeft,
          badgeCount: returnRequestsCount,
          badgeColor: 'bg-amber-600',
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
          badgeColor: 'bg-blue-700',
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
    .map(function (group) {
      const items = group.items.filter(function (item) {
        return canSeeTab(item.id, permissions, isOwner)
      })
      return { ...group, items }
    })
    .filter(function (group) {
      return group.items.length > 0
    })

  const canAccessChat = isOwner || permissions.includes('CHAT_ACCESS')

  const handleSelectTab = function (tab: SellerTabId) {
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
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                aria-label="Mở menu Kênh Người Bán"
                onClick={function () {
                  setIsMobileMenuOpen(true)
                }}
                className="cursor-pointer rounded-full p-2 text-zinc-600 transition hover:bg-sky-100 hover:text-[#17203a] focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none lg:hidden dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-sky-400/40"
              >
                <List size={22} />
              </button>

              {/* Seller Branding — wordmark DHMQ chuẩn hệ thiết kế */}
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to="/shop"
                  className="flex items-center gap-1 rounded-full text-xl font-extrabold tracking-tighter text-[#17203a] transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none sm:text-2xl dark:text-[#e2e8f0] dark:focus-visible:ring-sky-400/40"
                >
                  <span>DHMQ</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8]" />
                </Link>
                <span className="hidden rounded-full bg-indigo-100/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-indigo-800 uppercase sm:inline dark:bg-sky-500/15 dark:text-sky-300">
                  Seller Center
                </span>
              </div>

              {shopId !== undefined && shopId !== '' && onSwitchShop !== undefined && (
                <div className="ml-0.5 sm:ml-2">
                  <ShopSwitcher currentShopId={shopId} onSwitchShop={onSwitchShop} />
                </div>
              )}
            </div>

            {/* Right Header Navigation */}
            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              {/* Quick Chat Shortcut with Badge */}
              {canAccessChat && (
                <button
                  type="button"
                  onClick={function () {
                    handleSelectTab('CHAT')
                  }}
                  aria-label="Tin nhắn CSKH"
                  title="Tin nhắn CSKH"
                  className="relative cursor-pointer rounded-full p-2 text-zinc-600 transition hover:bg-sky-100 hover:text-[#17203a] focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-sky-400/40"
                >
                  <ChatCircleDots size={20} />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-bold text-white shadow-xs dark:bg-sky-400 dark:text-[#0a0f1e]">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              )}

              {/* Notification Bell */}
              <NotificationBell categories={['SELLING']} />

              {/* Theme Toggle — component dùng chung với Header storefront */}
              <ThemeToggle className="relative cursor-pointer rounded-full p-2 text-zinc-600 transition hover:bg-sky-100 hover:text-[#17203a] focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-sky-400/40" />

              {/* Back to Marketplace Link */}
              <Link
                to="/"
                className="hidden items-center gap-1.5 rounded-full border border-zinc-300 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-blue-600 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none sm:flex dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:border-sky-400/50 dark:hover:text-sky-300 dark:focus-visible:ring-sky-400/40"
              >
                <span>Xem trang mua sắm</span>
                <ArrowSquareOut size={14} />
              </Link>

              {/* Seller Shop Profile Badge */}
              <button
                type="button"
                onClick={function () {
                  handleSelectTab('PROFILE')
                }}
                className="group flex cursor-pointer items-center gap-2 rounded-full px-1.5 py-1 text-left transition hover:bg-sky-100/70 focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none dark:hover:bg-white/10 dark:focus-visible:ring-sky-400/40"
              >
                <UserAvatar name={shopName} size={32} />
                <div className="hidden flex-col text-left md:flex">
                  <div className="flex items-center gap-1">
                    <span className="max-w-[140px] truncate text-xs font-bold text-[#17203a] transition-colors group-hover:text-blue-700 dark:text-[#e2e8f0] dark:group-hover:text-sky-300">
                      {shopName}
                    </span>
                    <ShieldCheck
                      size={14}
                      className="shrink-0 text-blue-600 dark:text-sky-400"
                      weight="fill"
                    />
                  </div>
                  <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    DHMQ Seller • Gian hàng hoạt động
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
          <SellerSidebarNav
            groups={filteredGroups}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
          />
        </aside>

        {/* Mobile Sidebar Drawer — dùng chung Drawer + SellerSidebarNav */}
        <Drawer
          open={isMobileMenuOpen}
          side="left"
          title="Menu Kênh Người Bán"
          widthClass="max-w-xs"
          onClose={function () {
            setIsMobileMenuOpen(false)
          }}
        >
          <SellerSidebarNav
            groups={filteredGroups}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
          />
        </Drawer>

        {/* Center Main Content Area */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* Breadcrumb Bar */}
          <nav
            aria-label="Đường dẫn điều hướng"
            className="flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-2.5 text-xs text-zinc-600 shadow-xs dark:border-white/10 dark:bg-[#11182a] dark:text-zinc-300"
          >
            <Link
              to="/shop"
              className="flex items-center gap-1 rounded-full transition hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:outline-none dark:hover:text-sky-300 dark:focus-visible:ring-sky-400/40"
            >
              <House size={14} />
              <span>Kênh Người Bán</span>
            </Link>
            <CaretRight size={12} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span className="truncate font-semibold text-[#17203a] dark:text-[#e2e8f0]">
              {getBreadcrumbLabel(activeTab)}
            </span>
          </nav>

          {/* Tab Content Body */}
          {children}
        </main>
      </div>
    </div>
  )
}
