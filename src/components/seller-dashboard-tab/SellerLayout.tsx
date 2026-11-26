import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  Archive,
  ArrowSquareOut,
  ArrowUUpLeft,
  ChartBar,
  ChartLineUp,
  ChatCircleDots,
  House,
  IdentificationBadge,
  Package,
  PaintBrushBroad,
  PlusCircle,
  Question,
  ShieldCheck,
  ShoppingCart,
  SignOut,
  Star,
  Storefront,
  Ticket,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react'

import NotificationBell from '@/components/NotificationBell'
import ShopSwitcher from '@/components/seller/ShopSwitcher'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { WorkspaceShell } from '@/components/ui/WorkspaceShell'
import UserAvatar from '@/components/UserAvatar'
import { useSignOut } from '@/hooks/useAuthMutations'
import { notify } from '@/lib/notifications'
import { canSeeTab } from '@/lib/seller/sellerPermissions'
import { cn, FOCUS_RING_CLASS, secondaryButtonClass } from '@/lib/ui/styles'

import { SellerSidebarNav } from './SellerSidebarNav'

import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
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
  unansweredQnaCount?: number
  permissions?: string[]
  isOwner?: boolean
  shopId?: string
  onSwitchShop?: (shopId: string) => void
}

interface PageMeta {
  title: string
  description: string
}

function getPageMeta(activeTab: SellerTabId): PageMeta {
  if (activeTab === 'OVERVIEW') {
    return {
      title: 'Tổng quan gian hàng',
      description:
        'Theo dõi việc cần làm, doanh thu trong ngày và cảnh báo vận hành theo thời gian thực.',
    }
  }
  if (activeTab === 'PRODUCTS') {
    return {
      title: 'Tất cả sản phẩm',
      description: 'Quản lý danh mục sản phẩm, lọc đa tiêu chí, cập nhật giá và tồn kho hàng loạt.',
    }
  }
  if (activeTab === 'ADD_PRODUCT') {
    return {
      title: 'Thêm sản phẩm mới',
      description: 'Thiết lập thông tin cơ bản, hình ảnh, phân loại màu/size và thông số đóng gói.',
    }
  }
  if (activeTab === 'EDIT_PRODUCT') {
    return {
      title: 'Chỉnh sửa sản phẩm',
      description: 'Cập nhật chi tiết sản phẩm, thư viện media, biến thể và trạng thái hiển thị.',
    }
  }
  if (activeTab === 'INVENTORY') {
    return {
      title: 'Quản lý tồn kho & SKU',
      description: 'Theo dõi số lượng tồn kho theo từng phân loại và nhật ký biến động xuất nhập.',
    }
  }
  if (activeTab === 'VOUCHERS') {
    return {
      title: 'Mã giảm giá của Shop',
      description:
        'Tạo và quản lý các chương trình mã giảm giá theo số tiền hoặc phần trăm cho gian hàng.',
    }
  }
  if (activeTab === 'ORDERS') {
    return {
      title: 'Quản lý đơn hàng',
      description:
        'Xác nhận đơn trong 24h, bàn giao đơn vị vận chuyển, cập nhật hành trình và xử lý đổi trả.',
    }
  }
  if (activeTab === 'RETURNS') {
    return {
      title: 'Trả hàng & Hoàn tiền',
      description:
        'Tiếp nhận khiếu nại, kiểm tra bằng chứng đổi trả và phê duyệt phương án hoàn tiền.',
    }
  }
  if (activeTab === 'REVENUE') {
    return {
      title: 'Doanh thu & Ví Shop',
      description:
        'Theo dõi số dư khả dụng, tiền tạm giữ đối soát và tạo lệnh rút tiền về ngân hàng.',
    }
  }
  if (activeTab === 'REVIEWS') {
    return {
      title: 'Đánh giá từ người mua',
      description: 'Phản hồi đánh giá, quản lý mẫu trả lời nhanh và theo dõi xu hướng điểm sao.',
    }
  }
  if (activeTab === 'QNA') {
    return {
      title: 'Hỏi đáp sản phẩm (Q&A)',
      description: 'Quản lý, lọc và giải đáp câu hỏi của khách hàng về sản phẩm của gian hàng.',
    }
  }
  if (activeTab === 'CHAT') {
    return {
      title: 'Tin nhắn CSKH',
      description:
        'Trao đổi trực tiếp với khách hàng, gửi thẻ sản phẩm và cấu hình phản hồi tự động.',
    }
  }
  if (activeTab === 'DECORATION') {
    return {
      title: 'Trang trí gian hàng',
      description: 'Kéo thả sắp xếp bố cục trang chủ shop với banner slider, bộ sưu tập và video.',
    }
  }
  if (activeTab === 'STAFF') {
    return {
      title: 'Nhân viên & Phân quyền',
      description:
        'Mời thành viên, tạo vai trò tùy chỉnh theo quyền hạn và tra cứu nhật ký hoạt động.',
    }
  }
  if (activeTab === 'PROFILE') {
    return {
      title: 'Hồ sơ Shop & KYC',
      description:
        'Cập nhật thương hiệu gian hàng, địa chỉ kho lấy hàng, chính sách đổi trả và tài khoản ngân hàng.',
    }
  }
  if (activeTab === 'STATS_REVENUE') {
    return {
      title: 'Thống kê doanh thu',
      description:
        'Phân tích dòng tiền theo chu kỳ, danh mục, phương thức thanh toán và xuất báo cáo Excel.',
    }
  }
  if (activeTab === 'STATS_PRODUCTS') {
    return {
      title: 'Phân tích sản phẩm',
      description:
        'Đánh giá sản phẩm bán chạy, chuyển đổi thấp, tồn kho lâu ngày và cảnh báo hết hàng.',
    }
  }
  return {
    title: 'Phân tích khách hàng',
    description:
      'Theo dõi khách hàng mới, tỷ lệ giữ chân, người theo dõi và nhóm khách hàng thân thiết.',
  }
}

function buildBreadcrumbs(
  activeTab: SellerTabId,
  shopHomeUrl: string,
  permissions: string[],
  isOwner: boolean,
  onSelectTab: (tab: SellerTabId) => void,
): BreadcrumbItem[] {
  const root: BreadcrumbItem = { label: 'Kênh Người Bán', to: shopHomeUrl }
  const canProducts = canSeeTab('PRODUCTS', permissions, isOwner)
  const canOrders = canSeeTab('ORDERS', permissions, isOwner)

  if (activeTab === 'OVERVIEW') {
    return [root, { label: 'Tổng quan gian hàng' }]
  }
  if (activeTab === 'PRODUCTS') {
    return [root, { label: 'Quản lý sản phẩm' }, { label: 'Tất cả sản phẩm' }]
  }
  if (activeTab === 'ADD_PRODUCT') {
    const parent: BreadcrumbItem = { label: 'Tất cả sản phẩm' }
    if (canProducts) {
      parent.onClick = function () {
        onSelectTab('PRODUCTS')
      }
    }
    return [root, parent, { label: 'Thêm sản phẩm mới' }]
  }
  if (activeTab === 'EDIT_PRODUCT') {
    const parent: BreadcrumbItem = { label: 'Tất cả sản phẩm' }
    if (canProducts) {
      parent.onClick = function () {
        onSelectTab('PRODUCTS')
      }
    }
    return [root, parent, { label: 'Chỉnh sửa sản phẩm' }]
  }
  if (activeTab === 'INVENTORY') {
    const parent: BreadcrumbItem = { label: 'Quản lý sản phẩm' }
    if (canProducts) {
      parent.onClick = function () {
        onSelectTab('PRODUCTS')
      }
    }
    return [root, parent, { label: 'Quản lý tồn kho & SKU' }]
  }
  if (activeTab === 'VOUCHERS') {
    return [root, { label: 'Kênh Marketing & Khuyến mãi' }, { label: 'Mã giảm giá của Shop' }]
  }
  if (activeTab === 'ORDERS') {
    return [root, { label: 'Quản lý đơn hàng' }, { label: 'Danh sách đơn hàng' }]
  }
  if (activeTab === 'RETURNS') {
    const parent: BreadcrumbItem = { label: 'Quản lý đơn hàng' }
    if (canOrders) {
      parent.onClick = function () {
        onSelectTab('ORDERS')
      }
    }
    return [root, parent, { label: 'Trả hàng & Hoàn tiền' }]
  }
  if (activeTab === 'REVENUE') {
    return [root, { label: 'Tài chính & Ví Shop' }, { label: 'Doanh thu & Ví Shop' }]
  }
  if (activeTab === 'STATS_REVENUE') {
    return [root, { label: 'Thống kê & Báo cáo' }, { label: 'Thống kê doanh thu' }]
  }
  if (activeTab === 'STATS_PRODUCTS') {
    return [root, { label: 'Thống kê & Báo cáo' }, { label: 'Phân tích sản phẩm' }]
  }
  if (activeTab === 'STATS_CUSTOMERS') {
    return [root, { label: 'Thống kê & Báo cáo' }, { label: 'Phân tích khách hàng' }]
  }
  if (activeTab === 'REVIEWS') {
    return [root, { label: 'Chăm sóc khách hàng' }, { label: 'Đánh giá từ người mua' }]
  }
  if (activeTab === 'QNA') {
    return [root, { label: 'Chăm sóc khách hàng' }, { label: 'Hỏi đáp sản phẩm' }]
  }
  if (activeTab === 'CHAT') {
    return [root, { label: 'Chăm sóc khách hàng' }, { label: 'Tin nhắn CSKH' }]
  }
  if (activeTab === 'DECORATION') {
    return [root, { label: 'Thiết kế & Vận hành' }, { label: 'Trang trí gian hàng' }]
  }
  if (activeTab === 'STAFF') {
    return [root, { label: 'Thiết kế & Vận hành' }, { label: 'Nhân viên & Phân quyền' }]
  }
  return [root, { label: 'Thiết kế & Vận hành' }, { label: 'Hồ sơ Shop & KYC' }]
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
  unansweredQnaCount = 0,
  permissions = [],
  isOwner = false,
  shopId,
  onSwitchShop,
}: SellerLayoutProps) {
  const navigate = useNavigate()
  const signOutMutation = useSignOut()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  let shopHomeUrl = '/shop'
  if (shopId !== undefined && shopId !== '') {
    shopHomeUrl = `/shop?shopId=${encodeURIComponent(shopId)}`
  }

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
        {
          id: 'VOUCHERS',
          label: 'Mã giảm giá',
          icon: Ticket,
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
          id: 'QNA',
          label: 'Hỏi đáp sản phẩm',
          icon: Question,
          badgeCount: unansweredQnaCount,
          badgeColor: 'bg-blue-700',
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
          icon: IdentificationBadge,
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

  const canAccessChat = canSeeTab('CHAT', permissions, isOwner)
  const canAccessProfile = canSeeTab('PROFILE', permissions, isOwner)

  function handleSelectTab(tab: SellerTabId) {
    onSelectTab(tab)
    setIsMobileMenuOpen(false)
  }

  function handleConfirmSignOut() {
    signOutMutation.mutate(undefined, {
      onSuccess: function () {
        setShowSignOutConfirm(false)
        setIsMobileMenuOpen(false)
        notify.success('Đã đăng xuất khỏi tài khoản.')
        void navigate('/')
      },
      onError: function (err: unknown) {
        notify.fromError(err, undefined, 'Không thể đăng xuất. Vui lòng thử lại.')
      },
    })
  }

  const pageMeta = getPageMeta(activeTab)
  const breadcrumbs = buildBreadcrumbs(
    activeTab,
    shopHomeUrl,
    permissions,
    isOwner,
    handleSelectTab,
  )

  const brandSlot = (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to={shopHomeUrl}
          className={cn(
            'flex items-center gap-1 rounded-full text-xl font-extrabold tracking-tighter text-[#17203a] transition hover:opacity-90 sm:text-2xl dark:text-[#e2e8f0]',
            FOCUS_RING_CLASS,
          )}
        >
          <span>DHMQ</span>
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8]" />
        </Link>
        <span className="hidden rounded-full bg-indigo-100/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-indigo-800 uppercase sm:inline dark:bg-sky-500/15 dark:text-sky-300">
          Kênh Người Bán
        </span>
      </div>

      {shopId !== undefined && shopId !== '' && onSwitchShop !== undefined && (
        <div className="ml-0.5 sm:ml-2">
          <ShopSwitcher currentShopId={shopId} onSwitchShop={onSwitchShop} />
        </div>
      )}
    </>
  )

  const profileBadgeContent = (
    <>
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
          {isOwner && 'Chủ gian hàng'}
          {!isOwner && 'Nhân viên gian hàng'}
        </span>
      </div>
    </>
  )

  const topbarActions = (
    <>
      {canAccessChat && (
        <button
          type="button"
          onClick={function () {
            handleSelectTab('CHAT')
          }}
          aria-label="Tin nhắn CSKH"
          title="Tin nhắn CSKH"
          className={cn(
            'relative cursor-pointer rounded-full p-2 text-zinc-600 transition hover:bg-sky-100 hover:text-[#17203a] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white',
            FOCUS_RING_CLASS,
          )}
        >
          <ChatCircleDots size={20} />
          {unreadChatCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-bold text-white shadow-xs dark:bg-sky-400 dark:text-[#0a0f1e]">
              {unreadChatCount}
            </span>
          )}
        </button>
      )}

      <NotificationBell categories={['SELLING']} />

      <ThemeToggle
        className={cn(
          'relative cursor-pointer rounded-full p-2 text-zinc-600 transition hover:bg-sky-100 hover:text-[#17203a] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white',
          FOCUS_RING_CLASS,
        )}
      />

      <Link
        to="/"
        className={cn(
          'hidden items-center gap-1.5 rounded-full border border-zinc-300 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-blue-600 hover:text-blue-700 sm:inline-flex dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:border-sky-400/50 dark:hover:text-sky-300',
          FOCUS_RING_CLASS,
        )}
      >
        <span>Xem trang mua sắm</span>
        <ArrowSquareOut size={14} />
      </Link>

      <button
        type="button"
        onClick={function () {
          setShowSignOutConfirm(true)
        }}
        aria-label="Đăng xuất"
        title="Đăng xuất"
        className={cn(
          'hidden cursor-pointer items-center gap-1.5 rounded-full border border-zinc-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-rose-400 hover:text-rose-600 sm:inline-flex dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 dark:hover:border-rose-400/60 dark:hover:text-rose-300',
          FOCUS_RING_CLASS,
        )}
      >
        <SignOut size={15} weight="bold" />
        <span className="hidden xl:inline">Đăng xuất</span>
      </button>

      {canAccessProfile && (
        <button
          type="button"
          onClick={function () {
            handleSelectTab('PROFILE')
          }}
          aria-label="Mở hồ sơ gian hàng"
          className={cn(
            'group flex cursor-pointer items-center gap-2 rounded-full px-1.5 py-1 text-left transition hover:bg-sky-100/70 dark:hover:bg-white/10',
            FOCUS_RING_CLASS,
          )}
        >
          {profileBadgeContent}
        </button>
      )}

      {!canAccessProfile && (
        <div className="flex items-center gap-2 rounded-full px-1.5 py-1 text-left">
          {profileBadgeContent}
        </div>
      )}
    </>
  )

  const sidebarContent = (
    <SellerSidebarNav groups={filteredGroups} activeTab={activeTab} onSelectTab={handleSelectTab} />
  )

  const mobileDrawerContent = (
    <div className="flex flex-col gap-5">
      <SellerSidebarNav
        groups={filteredGroups}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      <div className="space-y-2 border-t border-zinc-200/80 pt-4 dark:border-white/10">
        <Link
          to="/"
          onClick={function () {
            setIsMobileMenuOpen(false)
          }}
          className={cn(secondaryButtonClass(), 'w-full justify-center text-xs')}
        >
          <span>Xem trang mua sắm</span>
          <ArrowSquareOut size={15} />
        </Link>

        <button
          type="button"
          onClick={function () {
            setIsMobileMenuOpen(false)
            setShowSignOutConfirm(true)
          }}
          className={cn(
            'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25',
            FOCUS_RING_CLASS,
          )}
        >
          <SignOut size={15} weight="bold" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <WorkspaceShell
        brandSlot={brandSlot}
        topbarActions={topbarActions}
        sidebarContent={sidebarContent}
        mobileDrawerTitle="Kênh Người Bán"
        mobileDrawerContent={mobileDrawerContent}
        mobileMenuOpen={isMobileMenuOpen}
        onOpenMobileMenu={function () {
          setIsMobileMenuOpen(true)
        }}
        onCloseMobileMenu={function () {
          setIsMobileMenuOpen(false)
        }}
        mobileMenuAriaLabel="Mở menu Kênh Người Bán"
        breadcrumbs={breadcrumbs}
        pageTitle={pageMeta.title}
        pageDescription={pageMeta.description}
      >
        {children}
      </WorkspaceShell>

      <ConfirmDialog
        open={showSignOutConfirm}
        title="Đăng xuất khỏi Kênh Người Bán?"
        description="Bạn sẽ được chuyển về trang mua sắm và cần đăng nhập lại để tiếp tục quản lý gian hàng."
        confirmLabel="Đăng xuất"
        cancelLabel="Ở lại"
        variant="danger"
        isPending={signOutMutation.isPending}
        onConfirm={handleConfirmSignOut}
        onCancel={function () {
          setShowSignOutConfirm(false)
        }}
      />
    </>
  )
}
