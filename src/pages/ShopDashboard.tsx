import { useSearchParams } from 'react-router'

import { useSellerConversations } from '@generated/endpoints/chat/chat'
import { useList5 } from '@generated/endpoints/seller-orders/seller-orders'
import { useInventory } from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import { useList4 } from '@generated/endpoints/seller-returns/seller-returns'
import { useMine } from '@generated/endpoints/shops/shops'

import { apiErrorMessage, takeData } from '@/lib/apiAdapters'
import { shopProfile } from '@/lib/sellerAdapters'
import { parseSellerTab, sellerTabParam } from '@/lib/sellerNavigation'

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
} from '../components/seller-dashboard-tab'
import { SellerLayout } from '../components/seller-dashboard-tab/SellerLayout'

import type { SellerTabId, ShopProfileData } from '@/types/seller'
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

  const mineQuery = useMine()

  let shopId = ''
  let shopName = ''
  let autoReplyText = FALLBACK_AUTO_REPLY
  let shopReady = false
  let currentShop: ShopResponse | null = null
  if (mineQuery.data !== undefined) {
    currentShop = takeData(mineQuery.data)[0] ?? null
    if (currentShop !== null) {
      shopId = currentShop.id ?? ''
      shopName = currentShop.name ?? ''
      if (
        currentShop.autoReplyText !== null &&
        currentShop.autoReplyText !== undefined &&
        currentShop.autoReplyText !== ''
      ) {
        autoReplyText = currentShop.autoReplyText
      }
      shopReady = true
    }
  }

  // Sidebar badge cần 4 bộ đếm này ở mọi tab nên fetch ngay tại page.
  // Dữ liệu riêng của từng tab (sản phẩm, doanh thu, chat…) do tab component tự tải.
  const ordersQuery = useList5({ shopId }, { query: { enabled: shopReady } })
  const returnsQuery = useList4({ shopId }, { query: { enabled: shopReady } })
  const inventoryQuery = useInventory(shopId, undefined, { query: { enabled: shopReady } })
  const conversationsQuery = useSellerConversations({ shopId }, { query: { enabled: shopReady } })

  // Tab đang mở nằm trên URL (/shop?tab=orders) để F5/gửi link giữ nguyên tab.
  // Thiếu hoặc sai param thì về OVERVIEW; OVERVIEW không cần param cho URL gọn.
  const activeTab = parseSellerTab(searchParams.get('tab'))
  const editProductId = searchParams.get('productId') ?? ''

  function handleSelectTab(tab: SellerTabId) {
    const param = sellerTabParam(tab)
    if (param === null) {
      setSearchParams({})
      return
    }
    setSearchParams({ tab: param })
  }

  // Card Tổng quan điều hướng bằng tabId kiểu 'orders' — chuẩn hoá về SellerTabId
  function handleOverviewNavigate(tabId: string) {
    handleSelectTab(parseSellerTab(tabId))
  }

  if (mineQuery.isPending) {
    return <TabLoading />
  }

  if (mineQuery.isError) {
    return <ShopError status={errorStatus(mineQuery.error)} />
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
    >
      {activeTab === 'OVERVIEW' && (
        <SellerOverviewTab
          onNavigateTab={handleOverviewNavigate}
          pendingOrdersCount={pendingOrdersCount}
          confirmedOrdersCount={confirmedOrdersCount}
          pendingReturnsCount={pendingReturnsCount}
          lowStockCount={lowStockCount}
        />
      )}

      {activeTab === 'PRODUCTS' && (
        <SellerProductsTab
          shopId={shopId}
          onNavigateAddProduct={function () {
            handleSelectTab('ADD_PRODUCT')
          }}
          onNavigateEditProduct={function (id: string) {
            setSearchParams({ tab: 'edit_product', productId: id })
          }}
        />
      )}

      {activeTab === 'ADD_PRODUCT' && (
        <SellerAddProductTab
          shopId={shopId}
          onBack={function () {
            handleSelectTab('PRODUCTS')
          }}
        />
      )}

      {activeTab === 'EDIT_PRODUCT' && (
        <SellerEditProductTab
          shopId={shopId}
          productId={editProductId}
          onBack={function () {
            handleSelectTab('PRODUCTS')
          }}
        />
      )}

      {activeTab === 'INVENTORY' && <SellerInventoryTab shopId={shopId} />}

      {activeTab === 'ORDERS' && <SellerOrdersTab shopId={shopId} />}

      {activeTab === 'RETURNS' && <SellerReturnsTab shopId={shopId} />}

      {activeTab === 'REVENUE' && (
        <SellerRevenueTab
          shopId={shopId}
          bankName={profile.bankName}
          bankAccount={profile.bankAccount}
          bankHolder={profile.bankHolder}
        />
      )}

      {activeTab === 'REVIEWS' && <SellerReviewsTab shopId={shopId} />}

      {activeTab === 'CHAT' && <SellerChatTab shopId={shopId} autoReplyText={autoReplyText} />}

      {activeTab === 'DECORATION' && <SellerDecorationTab shopId={shopId} />}

      {activeTab === 'STAFF' && <SellerStaffTab shopId={shopId} />}

      {activeTab === 'PROFILE' && (
        <SellerProfileTab key={shopId} shopId={shopId} profile={profile} />
      )}
    </SellerLayout>
  )
}
