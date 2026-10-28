import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useSellerConversations } from '@generated/endpoints/chat/chat'
import { useList5 } from '@generated/endpoints/seller-orders/seller-orders'
import { useInventory } from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import { useList4 } from '@generated/endpoints/seller-returns/seller-returns'
import { useGetMyShops } from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import { useMine } from '@generated/endpoints/shops/shops'
import { Storefront, WarningCircle } from '@phosphor-icons/react'

import { apiErrorMessage, takeData } from '@/lib/apiAdapters'
import { shopProfile } from '@/lib/sellerAdapters'
import { getFirstAllowedTab, parseSellerTab, sellerTabParam } from '@/lib/sellerNavigation'
import { canSeeTab } from '@/lib/sellerPermissions'

import {
  SellerAddProductTab,
  SellerChatTab,
  SellerDecorationTab,
  SellerEditProductTab,
  SellerInventoryTab,
  SellerOrdersTab,
  SellerOverviewTab,
  SellerProductsTab,
  SellerProfileTab,
  SellerReturnsTab,
  SellerRevenueTab,
  SellerReviewsTab,
  SellerStaffTab,
  SellerStatsCustomersTab,
  SellerStatsProductsTab,
  SellerStatsRevenueTab,
} from '../components/seller-dashboard-tab'
import { SellerLayout } from '../components/seller-dashboard-tab/SellerLayout'

import type { SellerTabId, ShopProfileData } from '@/types/seller'
import type { SellerShopMembershipResponse } from '@generated/model/sellerShopMembershipResponse'
import type { ShopResponse } from '@generated/model/shopResponse'

const FALLBACK_AUTO_REPLY =
  'Chào bạn! Shop đã nhận được tin nhắn và sẽ phản hồi trong giây lát. Chúc bạn một ngày mua sắm vui vẻ!'

function emptyProfile(shopName: string): ShopProfileData {
  return {
    shopName,
    slug: '',
    bio: '',
    logoUrl: '',
    bannerUrl: '',
    contactName: '',
    phone: '',
    pickupAddress: '',
    city: '',
    daysToShip: 2,
    businessType: 'INDIVIDUAL',
    taxOrIdNumber: '',
    isVerified: false,
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    workingHours: '',
  }
}

function TabLoading() {
  return (
    <main className="py-24 text-center">
      <p className="text-sm text-zinc-500">Đang tải gian hàng…</p>
    </main>
  )
}

function ShopError(props: { status: number }) {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-24 text-center">
      <p className="text-sm text-red-600">{apiErrorMessage('shops', props.status)}</p>
    </main>
  )
}

function errorStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status
    if (typeof status === 'number') {
      return status
    }
  }
  return 0
}

export default function ShopDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()

  const membershipsQuery = useGetMyShops()
  const mineQuery = useMine()

  let memberships: SellerShopMembershipResponse[] = []
  if (membershipsQuery.data !== undefined) {
    const raw = takeData(membershipsQuery.data)
    if (Array.isArray(raw)) {
      memberships = raw
    }
  }

  const paramShopId = searchParams.get('shopId')
  let currentMembership: SellerShopMembershipResponse | null = null

  if (paramShopId !== null && paramShopId !== '') {
    for (const m of memberships) {
      if (m.shopId === paramShopId) {
        currentMembership = m
        break
      }
    }
  }

  if (currentMembership === null && memberships.length > 0) {
    currentMembership = memberships[0]
  }

  let shopId = ''
  let shopName = ''
  let autoReplyText = FALLBACK_AUTO_REPLY
  let shopReady = false
  let isOwner = false
  let permissions: string[] = []

  if (currentMembership !== null) {
    shopId = currentMembership.shopId ?? ''
    shopName = currentMembership.shopName ?? ''
    shopReady = true
    if (currentMembership.role === 'OWNER') {
      isOwner = true
    }
    if (currentMembership.permissions) {
      permissions = currentMembership.permissions
    }
  }

  let currentShop: ShopResponse | null = null
  if (mineQuery.data !== undefined) {
    const rawMine = takeData(mineQuery.data)
    if (Array.isArray(rawMine)) {
      for (const s of rawMine) {
        if (s.id === shopId) {
          currentShop = s
          if (s.autoReplyText !== null && s.autoReplyText !== undefined && s.autoReplyText !== '') {
            autoReplyText = s.autoReplyText
          }
          break
        }
      }
    }
  }

  // Sidebar badge cần 4 bộ đếm này ở mọi tab nên fetch ngay tại page.
  const ordersQuery = useList5({ shopId }, { query: { enabled: shopReady } })
  const returnsQuery = useList4({ shopId }, { query: { enabled: shopReady } })
  const inventoryQuery = useInventory(shopId, undefined, { query: { enabled: shopReady } })
  const conversationsQuery = useSellerConversations({ shopId }, { query: { enabled: shopReady } })

  const activeTab = parseSellerTab(searchParams.get('tab'))
  const editProductId = searchParams.get('productId') ?? ''

  function handleSelectTab(tab: SellerTabId, extraParams?: Record<string, string>) {
    const param = sellerTabParam(tab)
    const next: Record<string, string> = { ...extraParams }
    if (shopId !== '') {
      next.shopId = shopId
    }
    if (param !== null) {
      next.tab = param
    }
    setSearchParams(next)
  }

  function handleOverviewNavigate(tabId: string, extraParams?: Record<string, string>) {
    handleSelectTab(parseSellerTab(tabId), extraParams)
  }

  function handleSwitchShop(newShopId: string) {
    setSearchParams({ shopId: newShopId })
  }

  const isTabAllowed = canSeeTab(activeTab, permissions, isOwner)
  const permissionsKey = permissions.join(',')

  // Smart Auto-Navigation: If user cannot access the current tab, find the first allowed tab
  useEffect(() => {
    if (!shopReady) {
      return
    }
    if (!isTabAllowed) {
      let activePerms: string[] = []
      if (permissionsKey !== '') {
        activePerms = permissionsKey.split(',')
      }
      const firstAllowed = getFirstAllowedTab(activePerms, isOwner)
      if (firstAllowed !== null && firstAllowed !== activeTab) {
        const param = sellerTabParam(firstAllowed)
        const next: Record<string, string> = { shopId }
        if (param !== null) {
          next.tab = param
        }
        setSearchParams(next, { replace: true })
      }
    }
  }, [shopReady, isTabAllowed, permissionsKey, isOwner, activeTab, shopId, setSearchParams])

  if (membershipsQuery.isPending) {
    return <TabLoading />
  }

  if (membershipsQuery.isError) {
    return <ShopError status={errorStatus(membershipsQuery.error)} />
  }

  if (memberships.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center p-8 text-center">
        <Storefront size={56} className="text-orange-500" />
        <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Bạn chưa tham gia gian hàng nào
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Hãy đăng ký mở gian hàng mới trên sàn nét hoặc liên hệ chủ shop để nhận thư mời làm nhân
          viên.
        </p>
        <Link
          to="/account?tab=shops"
          className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold"
        >
          <span>Đến trang Hồ sơ & Mở Shop</span>
        </Link>
      </main>
    )
  }

  let pendingOrdersCount = 0
  let confirmedOrdersCount = 0
  if (ordersQuery.data !== undefined) {
    for (const o of takeData(ordersQuery.data)) {
      if (o.status === 'PENDING') {
        pendingOrdersCount += 1
      }
      if (o.status === 'CONFIRMED') {
        confirmedOrdersCount += 1
      }
    }
  }

  let pendingReturnsCount = 0
  if (returnsQuery.data !== undefined) {
    for (const r of takeData(returnsQuery.data)) {
      if (r.status === 'REQUESTED') {
        pendingReturnsCount += 1
      }
    }
  }

  let lowStockCount = 0
  if (inventoryQuery.data !== undefined) {
    for (const i of takeData(inventoryQuery.data)) {
      if (i.isLowStock === true) {
        lowStockCount += 1
      }
    }
  }

  let unreadChatCount = 0
  if (conversationsQuery.data !== undefined) {
    for (const c of takeData(conversationsQuery.data)) {
      unreadChatCount += c.unreadCount ?? 0
    }
  }

  const profile: ShopProfileData = emptyProfile(shopName)
  if (currentShop !== null) {
    Object.assign(profile, shopProfile(currentShop))
  }

  return (
    <SellerLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      shopName={profile.shopName}
      pendingOrdersCount={pendingOrdersCount}
      returnRequestsCount={pendingReturnsCount}
      lowStockCount={lowStockCount}
      unreadChatCount={unreadChatCount}
      permissions={permissions}
      isOwner={isOwner}
      shopId={shopId}
      onSwitchShop={handleSwitchShop}
    >
      {!isTabAllowed && (
        <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center p-8 text-center">
          <WarningCircle size={48} className="text-amber-500" />
          <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Bạn không có quyền truy cập mục này
          </h2>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Tài khoản của bạn chưa được cấp quyền để xem hoặc thao tác tính năng này tại gian hàng{' '}
            {shopName}.
          </p>
          <Link
            to="/account?tab=shops"
            className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold"
          >
            Quay về Hồ sơ của tôi
          </Link>
        </div>
      )}

      {isTabAllowed && activeTab === 'OVERVIEW' && (
        <SellerOverviewTab
          shopId={shopId}
          onNavigateTab={handleOverviewNavigate}
          shopName={shopName}
          pendingOrdersCount={pendingOrdersCount}
          confirmedOrdersCount={confirmedOrdersCount}
          pendingReturnsCount={pendingReturnsCount}
          lowStockCount={lowStockCount}
          unreadChatCount={unreadChatCount}
        />
      )}

      {isTabAllowed && activeTab === 'PRODUCTS' && (
        <SellerProductsTab
          shopId={shopId}
          onNavigateAddProduct={function () {
            handleSelectTab('ADD_PRODUCT')
          }}
          onNavigateEditProduct={function (id: string) {
            handleSelectTab('EDIT_PRODUCT', { productId: id })
          }}
        />
      )}

      {isTabAllowed && activeTab === 'ADD_PRODUCT' && (
        <SellerAddProductTab
          shopId={shopId}
          onBack={function () {
            handleSelectTab('PRODUCTS')
          }}
        />
      )}

      {isTabAllowed && activeTab === 'EDIT_PRODUCT' && editProductId !== '' && (
        <SellerEditProductTab
          shopId={shopId}
          productId={editProductId}
          onBack={function () {
            handleSelectTab('PRODUCTS')
          }}
        />
      )}

      {isTabAllowed && activeTab === 'INVENTORY' && <SellerInventoryTab shopId={shopId} />}

      {isTabAllowed && activeTab === 'ORDERS' && <SellerOrdersTab shopId={shopId} />}

      {isTabAllowed && activeTab === 'RETURNS' && <SellerReturnsTab shopId={shopId} />}

      {isTabAllowed && activeTab === 'REVENUE' && (
        <SellerRevenueTab
          shopId={shopId}
          bankName={profile.bankName}
          bankAccount={profile.bankAccount}
          bankHolder={profile.bankHolder}
        />
      )}

      {isTabAllowed && activeTab === 'REVIEWS' && <SellerReviewsTab shopId={shopId} />}

      {isTabAllowed && activeTab === 'CHAT' && (
        <SellerChatTab shopId={shopId} autoReplyText={autoReplyText} />
      )}

      {isTabAllowed && activeTab === 'DECORATION' && (
        <SellerDecorationTab shopId={shopId} shopName={shopName} />
      )}

      {isTabAllowed && activeTab === 'STAFF' && <SellerStaffTab shopId={shopId} />}

      {isTabAllowed && activeTab === 'PROFILE' && (
        <SellerProfileTab key={shopId} shopId={shopId} profile={profile} />
      )}

      {isTabAllowed && activeTab === 'STATS_REVENUE' && <SellerStatsRevenueTab shopId={shopId} />}

      {isTabAllowed && activeTab === 'STATS_PRODUCTS' && <SellerStatsProductsTab shopId={shopId} />}

      {isTabAllowed && activeTab === 'STATS_CUSTOMERS' && (
        <SellerStatsCustomersTab shopId={shopId} />
      )}
    </SellerLayout>
  )
}
