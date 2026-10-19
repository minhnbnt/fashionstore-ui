import { useState } from 'react'

import { useListCategories } from '@generated/endpoints/categories/categories'
import {
  getMessagesQueryKey,
  getSellerConversationsQueryKey,
  useMarkRead,
  useMessages,
  useSendMessage,
  useSellerConversations,
} from '@generated/endpoints/chat/chat'
import {
  getGetDecorationQueryKey,
  useDiscardDraft,
  useGetDecoration,
  usePublish,
  useSaveDraft,
} from '@generated/endpoints/seller-decoration/seller-decoration'
import {
  getList5QueryKey,
  useCancel,
  useConfirm,
  useDeliver,
  useList5,
  useShip,
} from '@generated/endpoints/seller-orders/seller-orders'
import {
  getInventoryQueryKey,
  getListProductsQueryKey,
  getMovementsQueryKey,
  useAdjustStock,
  useBulkImport,
  useInventory,
  useListProducts,
} from '@generated/endpoints/seller-products-inventory/seller-products-inventory'
import {
  getList4QueryKey,
  useApprove,
  useComplete,
  useList4,
  useReject,
} from '@generated/endpoints/seller-returns/seller-returns'
import {
  getListWithdrawalsQueryKey,
  getSummaryQueryKey,
  useByDay,
  useListWithdrawals,
  useRequestWithdrawal,
  useSettlements,
  useSummary,
  useTopProducts,
} from '@generated/endpoints/seller-revenue-finance/seller-revenue-finance'
import {
  getList3QueryKey,
  useList3,
  useReply,
  useReport,
} from '@generated/endpoints/seller-reviews/seller-reviews'
import {
  getListAuditLogsQueryKey,
  getListMembersQueryKey,
  getListRolesQueryKey,
  useChangeMemberRole,
  useCreateRole,
  useInviteStaff,
  useListAuditLogs,
  useListMembers,
  useListRoles,
  useRemoveMember,
} from '@generated/endpoints/seller-staff-roles/seller-staff-roles'
import {
  useCreate1,
  useDeleteProduct,
  useUpdate1,
} from '@generated/endpoints/shop-products/shop-products'
import { getMineQueryKey, useMine, useUpdateProfile } from '@generated/endpoints/shops/shops'
import { useQueryClient } from '@tanstack/react-query'

import { apiErrorMessage, takeData } from '@/lib/apiAdapters'
import { formatDateTime } from '@/lib/format'
import {
  auditItem,
  chatConversationItem,
  chatMessageItem,
  decorationBlocks,
  decorationDraftJson,
  memberItem,
  orderItem,
  productItem,
  returnItem,
  reviewItem,
  roleItem,
  settlementItem,
  shopProfile,
  withdrawalItem,
} from '@/lib/sellerAdapters'

import {
  SellerAddProductTab,
  SellerChatTab,
  SellerDecorationTab,
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

import type { AddProductPayload } from '../components/seller-dashboard-tab/SellerAddProductTab'
import type {
  ChatConversationItem,
  ChatMessageItem,
  DecorationBlock,
  OrderItem,
  ProductItem,
  ReturnItem,
  ReviewItem,
  SellerTabId,
  SettlementItem,
  ShopAuditItem,
  ShopProfileData,
  ShopRoleItem,
  WithdrawalItem,
} from '@/types/seller'
import type { CategoryResponse } from '@generated/model/categoryResponse'
import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { InventoryItemResponse } from '@generated/model/inventoryItemResponse'
import type { OrderResponse } from '@generated/model/orderResponse'
import type { RevenueSummaryResponse } from '@generated/model/revenueSummaryResponse'
import type { ShopMemberDetailResponse } from '@generated/model/shopMemberDetailResponse'
import type { ShopResponse } from '@generated/model/shopResponse'

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

// Valid navigation targets triggered by Overview cards
const NAVIGABLE_TABS: readonly SellerTabId[] = [
  'ORDERS',
  'RETURNS',
  'INVENTORY',
  'ADD_PRODUCT',
  'CHAT',
  'DECORATION',
  'REVENUE',
  'PRODUCTS',
  'STAFF',
  'PROFILE',
]

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

export default function ShopDashboard() {
  const [activeTab, setActiveTab] = useState<SellerTabId>('OVERVIEW')
  const [selectedConvId, setSelectedConvId] = useState('')
  const [draftBlocks, setDraftBlocks] = useState<DecorationBlock[] | null>(null)
  const queryClient = useQueryClient()

  const mineQuery = useMine()
  const categoriesQuery = useListCategories()

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

  const productsQuery = useListProducts(shopId, undefined, { query: { enabled: shopReady } })
  const inventoryQuery = useInventory(shopId, undefined, { query: { enabled: shopReady } })
  const ordersQuery = useList5({ shopId }, { query: { enabled: shopReady } })
  const returnsQuery = useList4({ shopId }, { query: { enabled: shopReady } })
  const settlementsQuery = useSettlements({ shopId }, { query: { enabled: shopReady } })
  const withdrawalsQuery = useListWithdrawals({ shopId }, { query: { enabled: shopReady } })
  const summaryQuery = useSummary({ shopId }, { query: { enabled: shopReady } })
  const byDayQuery = useByDay({ shopId }, { query: { enabled: shopReady } })
  const topProductsQuery = useTopProducts({ shopId, limit: 3 }, { query: { enabled: shopReady } })
  const reviewsQuery = useList3({ shopId }, { query: { enabled: shopReady } })
  const conversationsQuery = useSellerConversations({ shopId }, { query: { enabled: shopReady } })

  // Hội thoại đang chọn: mặc định là hội thoại đầu tiên khi data vừa load
  let rawConversations: ChatConversationResponse[] = []
  if (conversationsQuery.data !== undefined) {
    rawConversations = takeData(conversationsQuery.data)
  }
  let activeConvId = selectedConvId
  if (activeConvId === '' && rawConversations.length > 0) {
    activeConvId = rawConversations[0]?.id ?? ''
  }
  const messagesQuery = useMessages(activeConvId, {
    query: { enabled: activeConvId !== '' },
  })

  const decorationQuery = useGetDecoration(shopId, { query: { enabled: shopReady } })
  const rolesQuery = useListRoles(shopId, { query: { enabled: shopReady } })
  const membersQuery = useListMembers(shopId, { query: { enabled: shopReady } })
  const auditQuery = useListAuditLogs(shopId, { query: { enabled: shopReady } })

  let categories: CategoryResponse[] = []
  if (categoriesQuery.data !== undefined) {
    categories = takeData(categoriesQuery.data)
  }
  const categoryNameById = new Map<string, string>()
  for (const c of categories) {
    categoryNameById.set(c.id ?? '', c.name ?? '')
  }

  let rawOrders: OrderResponse[] = []
  if (ordersQuery.data !== undefined) {
    rawOrders = takeData(ordersQuery.data)
  }
  const orderById = new Map<string, OrderResponse>()
  const buyerNameByBuyerId = new Map<string, string>()
  for (const o of rawOrders) {
    orderById.set(o.id ?? '', o)
    if (o.buyerId !== undefined && o.buyerId !== null && o.buyerId !== '') {
      buyerNameByBuyerId.set(o.buyerId, o.shippingName ?? '')
    }
  }

  let rawInventory: InventoryItemResponse[] = []
  if (inventoryQuery.data !== undefined) {
    rawInventory = takeData(inventoryQuery.data)
  }
  const skuByVariantId = new Map<string, string>()
  const productNameByVariantId = new Map<string, string>()
  for (const inv of rawInventory) {
    const variantId = inv.variantId ?? ''
    skuByVariantId.set(variantId, inv.sku ?? '')
    productNameByVariantId.set(variantId, inv.productName ?? '')
  }

  const orders: OrderItem[] = rawOrders.map(orderItem)

  let returns: ReturnItem[] = []
  if (returnsQuery.data !== undefined) {
    returns = takeData(returnsQuery.data).map(function (r) {
      return returnItem(r, orderById)
    })
  }

  let products: ProductItem[] = []
  if (productsQuery.data !== undefined) {
    products = takeData(productsQuery.data).map(function (p) {
      return productItem(p, categoryNameById.get(p.categoryId ?? ''))
    })
  }
  const productNameById = new Map<string, string>()
  for (const p of products) {
    productNameById.set(p.id, p.name)
  }

  let settlements: SettlementItem[] = []
  if (settlementsQuery.data !== undefined) {
    settlements = takeData(settlementsQuery.data).map(function (s) {
      return settlementItem(s, orderById)
    })
  }

  let withdrawals: WithdrawalItem[] = []
  if (withdrawalsQuery.data !== undefined) {
    withdrawals = takeData(withdrawalsQuery.data).map(withdrawalItem)
  }

  let reviews: ReviewItem[] = []
  if (reviewsQuery.data !== undefined) {
    reviews = takeData(reviewsQuery.data).map(function (r) {
      return reviewItem(r, productNameById.get(r.productId ?? ''))
    })
  }

  const conversations: ChatConversationItem[] = rawConversations.map(function (c) {
    return chatConversationItem(c, buyerNameByBuyerId)
  })

  let messages: ChatMessageItem[] = []
  if (messagesQuery.data !== undefined) {
    messages = takeData(messagesQuery.data).map(chatMessageItem)
  }

  let rawMembers: ShopMemberDetailResponse[] = []
  if (membersQuery.data !== undefined) {
    rawMembers = takeData(membersQuery.data)
  }
  let roles: ShopRoleItem[] = []
  if (rolesQuery.data !== undefined) {
    roles = takeData(rolesQuery.data).map(function (r) {
      return roleItem(r, rawMembers)
    })
  }
  const members = rawMembers.map(memberItem)

  let auditLogs: ShopAuditItem[] = []
  if (auditQuery.data !== undefined) {
    auditLogs = takeData(auditQuery.data).map(auditItem)
  }

  let serverBlocks: DecorationBlock[] = []
  if (decorationQuery.data !== undefined) {
    serverBlocks = decorationBlocks(takeData(decorationQuery.data))
  }
  let blocks: DecorationBlock[] = serverBlocks
  if (draftBlocks !== null) {
    blocks = draftBlocks
  }

  const profile: ShopProfileData = emptyProfile(shopName)
  if (currentShop !== null) {
    Object.assign(profile, shopProfile(currentShop))
  }

  // Computed Badge Counts
  const pendingOrdersCount = rawOrders.filter(function (o) {
    return o.status === 'PENDING'
  }).length
  const confirmedOrdersCount = rawOrders.filter(function (o) {
    return o.status === 'CONFIRMED'
  }).length
  const pendingReturnsCount = returns.filter(function (r) {
    return r.status === 'REQUESTED'
  }).length
  const unreadChatCount = conversations.reduce(function (acc, conv) {
    return acc + conv.unreadCount
  }, 0)
  const lowStockCount = rawInventory.filter(function (i) {
    return i.isLowStock === true
  }).length

  // --- Mutations ---
  const confirmMutation = useConfirm({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
      },
    },
  })
  const shipMutation = useShip({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
      },
    },
  })
  const deliverMutation = useDeliver({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
      },
    },
  })
  const cancelMutation = useCancel({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList5QueryKey() })
        void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
      },
    },
  })
  const approveMutation = useApprove({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList4QueryKey() })
      },
    },
  })
  const rejectMutation = useReject({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList4QueryKey() })
      },
    },
  })
  const completeMutation = useComplete({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList4QueryKey() })
      },
    },
  })
  const requestWithdrawalMutation = useRequestWithdrawal({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListWithdrawalsQueryKey({ shopId }) })
        void queryClient.invalidateQueries({ queryKey: getSummaryQueryKey({ shopId }) })
      },
    },
  })
  const replyMutation = useReply({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList3QueryKey() })
      },
    },
  })
  const reportMutation = useReport({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getList3QueryKey() })
      },
    },
  })
  const sendMessageMutation = useSendMessage({
    mutation: {
      onSuccess: function (_data, variables) {
        void queryClient.invalidateQueries({ queryKey: getMessagesQueryKey(variables.id) })
        void queryClient.invalidateQueries({ queryKey: getSellerConversationsQueryKey({ shopId }) })
      },
    },
  })
  const markReadMutation = useMarkRead({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getSellerConversationsQueryKey({ shopId }) })
      },
    },
  })
  const saveDraftMutation = useSaveDraft({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getGetDecorationQueryKey(shopId) })
        setDraftBlocks(null)
      },
    },
  })
  const publishMutation = usePublish({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getGetDecorationQueryKey(shopId) })
        setDraftBlocks(null)
      },
    },
  })
  const discardDraftMutation = useDiscardDraft({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getGetDecorationQueryKey(shopId) })
        setDraftBlocks(null)
      },
    },
  })
  const createRoleMutation = useCreateRole({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListRolesQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListAuditLogsQueryKey(shopId) })
      },
    },
  })
  const inviteStaffMutation = useInviteStaff({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListAuditLogsQueryKey(shopId) })
      },
    },
  })
  const removeMemberMutation = useRemoveMember({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListRolesQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListAuditLogsQueryKey(shopId) })
      },
    },
  })
  const changeMemberRoleMutation = useChangeMemberRole({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getListAuditLogsQueryKey(shopId) })
      },
    },
  })
  const updateProductMutation = useUpdate1({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
      },
    },
  })
  const deleteProductMutation = useDeleteProduct({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
      },
    },
  })
  const createProductMutation = useCreate1({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
      },
    },
  })
  const bulkImportMutation = useBulkImport({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) })
        void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
      },
    },
  })
  const adjustStockMutation = useAdjustStock({
    mutation: {
      onSuccess: function (_data, variables) {
        void queryClient.invalidateQueries({ queryKey: getInventoryQueryKey(shopId) })
        void queryClient.invalidateQueries({
          queryKey: getMovementsQueryKey(shopId, variables.variantId),
        })
      },
    },
  })
  const updateProfileMutation = useUpdateProfile({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getMineQueryKey() })
      },
    },
  })

  // Tab Navigation Bridge from Overview cards
  function handleOverviewNavigate(tabId: string) {
    const key = tabId.toUpperCase()
    for (const tab of NAVIGABLE_TABS) {
      if (key === tab) {
        setActiveTab(tab)
        return
      }
    }
    setActiveTab('OVERVIEW')
  }

  // --- Handlers (giữ signature cũ của tab, bên dưới gọi mutation thật) ---
  function handleToggleProductStatus(productId: string) {
    const current = products.find(function (p) {
      return p.id === productId
    })
    if (current === undefined) {
      return
    }
    let nextStatus = 'ACTIVE'
    if (current.status === 'ACTIVE') {
      nextStatus = 'HIDDEN'
    }
    updateProductMutation.mutate({ shopId, id: productId, data: { status: nextStatus } })
  }

  function handleDeleteProduct(productId: string) {
    deleteProductMutation.mutate({ shopId, id: productId })
  }

  function handleAddProduct(payload: AddProductPayload) {
    createProductMutation.mutate(
      {
        shopId,
        data: {
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          categoryId: payload.categoryId,
          variants: payload.variants,
        },
      },
      {
        onSuccess: function () {
          setActiveTab('PRODUCTS')
        },
      },
    )
  }

  function handleBulkImport(csvContent: string) {
    const file = new File([csvContent], 'products.csv', { type: 'text/csv' })
    bulkImportMutation.mutate({ shopId, data: { file } })
  }

  function handleAdjustStock(variantId: string, changeQty: number, reason: string) {
    const current = rawInventory.find(function (i) {
      return i.variantId === variantId
    })
    if (current === undefined) {
      return
    }
    const stock = current.stockQuantity ?? 0
    const newStock = Math.max(0, stock + changeQty)
    adjustStockMutation.mutate({ shopId, variantId, data: { newStock, reason } })
  }

  function handleConfirmOrder(orderId: string) {
    confirmMutation.mutate({ id: orderId })
  }

  function handleShipOrder(orderId: string) {
    shipMutation.mutate({ id: orderId })
  }

  function handleDeliverOrder(orderId: string) {
    deliverMutation.mutate({ id: orderId })
  }

  function handleCancelOrder(orderId: string, reason: string) {
    cancelMutation.mutate({ id: orderId, data: { reason } })
  }

  function handleApproveReturn(
    returnId: string,
    resolution: string,
    refundAmount: number,
    returnAddress: string,
  ) {
    approveMutation.mutate({
      id: returnId,
      data: { resolution, refundAmount, sellerNote: 'Địa chỉ nhận lại: ' + returnAddress },
    })
  }

  function handleRejectReturn(returnId: string, sellerNote: string) {
    rejectMutation.mutate({ id: returnId, data: { sellerNote } })
  }

  function handleCompleteReturn(returnId: string) {
    completeMutation.mutate({ id: returnId })
  }

  function handleCreateWithdrawal(amount: number) {
    requestWithdrawalMutation.mutate({
      data: {
        shopId,
        amount,
        bankName: profile.bankName,
        bankAccount: profile.bankAccount,
        bankHolder: profile.bankHolder,
      },
    })
  }

  function handleReplyReview(reviewId: string, replyText: string) {
    replyMutation.mutate({ id: reviewId, data: { reply: replyText } })
  }

  function handleReportReview(reviewId: string, reason: string) {
    reportMutation.mutate({ id: reviewId, data: { reason } })
  }

  function handleSelectConversation(id: string) {
    setSelectedConvId(id)
    markReadMutation.mutate({ id })
  }

  function handleSendMessage(conversationId: string, content: string) {
    sendMessageMutation.mutate({ id: conversationId, data: { content } })
  }

  function handleSaveAutoReply(text: string) {
    updateProfileMutation.mutate({ id: shopId, data: { autoReplyText: text } })
  }

  function handleSaveDecorationDraft() {
    saveDraftMutation.mutate({ shopId, data: { layoutJson: decorationDraftJson(blocks) } })
  }

  function handlePublishDecoration() {
    publishMutation.mutate({ shopId })
  }

  function handleDiscardDecoration() {
    discardDraftMutation.mutate({ shopId })
  }

  function handleInviteStaff(email: string, roleId: string) {
    inviteStaffMutation.mutate({ shopId, data: { email, roleId } })
  }

  function handleCreateRole(name: string, permissions: string[]) {
    createRoleMutation.mutate({ shopId, data: { name, permissions } })
  }

  function handleRemoveMember(id: string) {
    removeMemberMutation.mutate({ shopId, memberId: id })
  }

  function handleChangeMemberRole(memberId: string, roleId: string) {
    changeMemberRoleMutation.mutate({ shopId, memberId, data: { roleId } })
  }

  function handleSaveProfile(next: ShopProfileData) {
    updateProfileMutation.mutate({
      id: shopId,
      data: {
        phone: next.phone,
        address: next.pickupAddress,
        processingDays: next.daysToShip,
        bankName: next.bankName,
        bankAccount: next.bankAccount,
        bankHolder: next.bankHolder,
        workingHours: next.workingHours,
      },
    })
  }

  if (mineQuery.isPending) {
    return <TabLoading />
  }

  if (mineQuery.isError) {
    return <ShopError status={errorStatus(mineQuery.error)} />
  }

  let summary: RevenueSummaryResponse | undefined = undefined
  if (summaryQuery.data !== undefined) {
    summary = takeData(summaryQuery.data)
  }

  const chart: { day: string; revenue: number }[] = []
  if (byDayQuery.data !== undefined) {
    for (const d of takeData(byDayQuery.data)) {
      chart.push({ day: formatDateTime(d.date), revenue: d.revenue ?? 0 })
    }
  }

  const topProducts: { name: string; sold: number; revenue: number }[] = []
  if (topProductsQuery.data !== undefined) {
    for (const t of takeData(topProductsQuery.data)) {
      topProducts.push({
        name: t.productName ?? '',
        sold: t.soldQuantity ?? 0,
        revenue: t.totalRevenue ?? 0,
      })
    }
  }

  return (
    <SellerLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
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
          products={products}
          onToggleStatus={handleToggleProductStatus}
          onDeleteProduct={handleDeleteProduct}
          onBulkImport={handleBulkImport}
          onNavigateAddProduct={function () {
            setActiveTab('ADD_PRODUCT')
          }}
        />
      )}

      {activeTab === 'ADD_PRODUCT' && (
        <SellerAddProductTab
          categories={categories.map(function (c) {
            return { id: c.id ?? '', name: c.name ?? '' }
          })}
          onBack={function () {
            setActiveTab('PRODUCTS')
          }}
          onAddProduct={handleAddProduct}
        />
      )}

      {activeTab === 'INVENTORY' && (
        <SellerInventoryTab
          shopId={shopId}
          products={products}
          inventory={rawInventory}
          onAdjustStock={handleAdjustStock}
        />
      )}

      {activeTab === 'ORDERS' && (
        <SellerOrdersTab
          orders={orders}
          onConfirmOrder={handleConfirmOrder}
          onShipOrder={handleShipOrder}
          onDeliverOrder={handleDeliverOrder}
          onCancelOrder={handleCancelOrder}
        />
      )}

      {activeTab === 'RETURNS' && (
        <SellerReturnsTab
          returns={returns}
          onApproveReturn={handleApproveReturn}
          onRejectReturn={handleRejectReturn}
          onCompleteReturn={handleCompleteReturn}
        />
      )}

      {activeTab === 'REVENUE' && (
        <SellerRevenueTab
          settlements={settlements}
          withdrawals={withdrawals}
          summary={summary}
          chart={chart}
          topProducts={topProducts}
          bankName={profile.bankName}
          bankAccount={profile.bankAccount}
          bankHolder={profile.bankHolder}
          onCreateWithdrawal={handleCreateWithdrawal}
        />
      )}

      {activeTab === 'REVIEWS' && (
        <SellerReviewsTab
          reviews={reviews}
          onReplyReview={handleReplyReview}
          onReportReview={handleReportReview}
        />
      )}

      {activeTab === 'CHAT' && (
        <SellerChatTab
          conversations={conversations}
          messages={messages}
          selectedConvId={activeConvId}
          onSelectConversation={handleSelectConversation}
          onSendMessage={handleSendMessage}
          autoReplyText={autoReplyText}
          onSaveAutoReply={handleSaveAutoReply}
        />
      )}

      {activeTab === 'DECORATION' && (
        <SellerDecorationTab
          blocks={blocks}
          hasLocalChanges={draftBlocks !== null}
          onUpdateBlocks={setDraftBlocks}
          onSaveDraft={handleSaveDecorationDraft}
          onPublish={handlePublishDecoration}
          onDiscard={handleDiscardDecoration}
        />
      )}

      {activeTab === 'STAFF' && (
        <SellerStaffTab
          roles={roles}
          members={members}
          auditLogs={auditLogs}
          onInvite={handleInviteStaff}
          onCreateRole={handleCreateRole}
          onRemoveMember={handleRemoveMember}
          onChangeRole={handleChangeMemberRole}
        />
      )}

      {activeTab === 'PROFILE' && (
        <SellerProfileTab key={shopId} profile={profile} onSaveProfile={handleSaveProfile} />
      )}
    </SellerLayout>
  )
}
