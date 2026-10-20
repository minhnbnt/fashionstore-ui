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
  Bell,
  ArrowSquareOut,
  List,
  X,
  CaretRight,
  ShieldCheck,
} from '@phosphor-icons/react'

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
          badgeColor: 'bg-blue-600',
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
          badgeColor: 'bg-blue-600',
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

  const handleSelectTab = (tab: SellerTabId) => {
    onSelectTab(tab)
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f6] font-sans">
      {/* Shopee-style Topbar */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-black lg:hidden"
            >
              <List size={22} />
            </button>

            {/* Seller Branding */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-lg font-black text-white shadow-sm">
                n
              </div>
              <div className="flex flex-col">
                <span className="text-sm leading-tight font-bold tracking-tight text-gray-900">
                  Kênh Người Bán
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-blue-600 uppercase">
                  nét Seller Hub
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Quick Chat Shortcut with Badge */}
            <button
              type="button"
              onClick={() => handleSelectTab('CHAT')}
              className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
              title="Tin nhắn CSKH"
            >
              <ChatCircleDots size={20} />
              {unreadChatCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title="Thông báo"
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600" />
            </button>

            {/* Back to Marketplace Link */}
            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:border-blue-600 hover:text-blue-600 sm:flex"
            >
              <span>Xem trang mua sắm</span>
              <ArrowSquareOut size={14} />
            </Link>

            {/* Seller Shop Profile Badge */}
            <button
              type="button"
              onClick={() => handleSelectTab('PROFILE')}
              className="group flex cursor-pointer items-center gap-2 border-l border-gray-200 pl-2 text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                {shopName ? shopName.slice(0, 2).toUpperCase() : 'NS'}
              </div>
              <div className="hidden flex-col text-left md:flex">
                <div className="flex items-center gap-1">
                  <span className="max-w-[140px] truncate text-xs font-bold text-gray-800 transition-colors group-hover:text-blue-600">
                    {shopName || 'Gian Hàng nét'}
                  </span>
                  <ShieldCheck size={14} className="text-blue-500" weight="fill" />
                </div>
                <span className="text-[10px] text-gray-400">nét Mall • 5.0 ⭐</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 px-2 py-4 sm:px-4">
        {/* Left Sidebar for Desktop */}
        <aside className="sticky top-18 hidden max-h-[calc(100vh-80px)] w-64 shrink-0 flex-col overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-sm lg:flex">
          <nav className="space-y-4">
            {menuGroups.map((group) => (
              <div key={group.groupTitle} className="space-y-1">
                <span className="mb-1 block px-3 text-[10px] font-bold tracking-wider text-gray-400">
                  {group.groupTitle}
                </span>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        isActive &&
                        'bg-blue-50 font-bold text-blue-600 shadow-xs dark:bg-blue-950/40 dark:text-sky-400'
                      } ${!isActive && 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={16}
                          className={`${isActive && 'text-blue-600 dark:text-sky-400'} ${!isActive && 'text-gray-500'}`}
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
              className="fixed inset-0 cursor-default border-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex h-full w-72 flex-col overflow-y-auto bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between border-b pb-3">
                <span className="text-sm font-bold text-gray-800">Menu Kênh Người Bán</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="space-y-4">
                {menuGroups.map((group) => (
                  <div key={group.groupTitle} className="space-y-1">
                    <span className="mb-1 block px-2 text-[10px] font-bold tracking-wider text-gray-400">
                      {group.groupTitle}
                    </span>
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = activeTab === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                            isActive &&
                            'bg-blue-50 font-bold text-blue-600 dark:bg-blue-950/40 dark:text-sky-400'
                          } ${!isActive && 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              size={16}
                              className={`${isActive && 'text-blue-600 dark:text-sky-400'} ${!isActive && 'text-gray-500'}`}
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
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-500 shadow-xs">
            <Link to="/shop" className="flex items-center gap-1 hover:text-blue-600">
              <House size={14} />
              <span>Kênh Người Bán</span>
            </Link>
            <CaretRight size={12} className="text-gray-400" />
            <span className="font-semibold text-gray-800">
              {activeTab === 'OVERVIEW' && 'Tổng quan gian hàng'}
              {activeTab === 'PRODUCTS' && 'Tất cả sản phẩm'}
              {activeTab === 'ADD_PRODUCT' && 'Thêm sản phẩm mới'}
              {activeTab === 'INVENTORY' && 'Quản lý tồn kho & Biến thể'}
              {activeTab === 'ORDERS' && 'Quản lý đơn hàng'}
              {activeTab === 'RETURNS' && 'Yêu cầu trả hàng & Hoàn tiền'}
              {activeTab === 'REVENUE' && 'Doanh thu & Ví Shop'}
              {activeTab === 'REVIEWS' && 'Đánh giá từ khách hàng'}
              {activeTab === 'CHAT' && 'Tin nhắn khách hàng (nét Chat)'}
              {activeTab === 'DECORATION' && 'Trang trí gian hàng'}
              {activeTab === 'STAFF' && 'Phân quyền & Quản lý nhân viên'}
              {activeTab === 'PROFILE' && 'Hồ sơ Shop & KYC'}
            </span>
          </div>

          {/* Tab Content Body */}
          {children}
        </main>
      </div>
    </div>
  )
}
