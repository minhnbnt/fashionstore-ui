import { Suspense, useState } from 'react'

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
import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_RETURNS,
  INITIAL_REVIEWS,
  INITIAL_CONVERSATIONS,
  INITIAL_SETTLEMENTS,
  INITIAL_WITHDRAWALS,
  INITIAL_ROLES,
  INITIAL_MEMBERS,
  INITIAL_AUDIT,
  INITIAL_BLOCKS,
  INITIAL_SHOP_PROFILE,
} from '../components/seller-dashboard-tab/sellerData'
import { SellerLayout } from '../components/seller-dashboard-tab/SellerLayout'

import type {
  ChatConversationItem,
  DecorationBlock,
  OrderItem,
  ProductItem,
  ReturnItem,
  ReviewItem,
  SellerTabId,
  SettlementItem,
  ShopAuditItem,
  ShopMemberItem,
  ShopProfileData,
  ShopRoleItem,
  StockMovementItem,
  WithdrawalItem,
} from '@/types/seller'

function TabLoading() {
  return <p className="py-24 text-center">Đang tải…</p>
}

const INITIAL_STOCK_MOVEMENTS: StockMovementItem[] = [
  {
    id: 'mov-1',
    variantSku: 'TS-WHT-M',
    productName: 'Áo Thun Cotton Oversize Form Rộng',
    changeQty: 50,
    previousStock: 0,
    newStock: 50,
    reason: 'RESTOCK',
    note: 'Nhập lô hàng may xưởng đợt 1',
    createdBy: 'kho.tuan@fashionhub.vn',
    createdAt: '10/10/2026 10:00',
  },
  {
    id: 'mov-2',
    variantSku: 'TS-WHT-M',
    productName: 'Áo Thun Cotton Oversize Form Rộng',
    changeQty: -5,
    previousStock: 50,
    newStock: 45,
    reason: 'ORDER_SHIP',
    note: 'Xuất đóng gói cho các đơn ORD-982104,...',
    createdBy: 'Hệ thống tự động',
    createdAt: '14/10/2026 15:30',
  },
]

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

export default function ShopDashboard() {
  const [activeTab, setActiveTab] = useState<SellerTabId>('OVERVIEW')

  // Global Interactive States
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS)
  const [stockMovements, setStockMovements] = useState<StockMovementItem[]>(INITIAL_STOCK_MOVEMENTS)
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS)
  const [returns, setReturns] = useState<ReturnItem[]>(INITIAL_RETURNS)
  const [settlements] = useState<SettlementItem[]>(INITIAL_SETTLEMENTS)
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>(INITIAL_WITHDRAWALS)
  const [reviews, setReviews] = useState<ReviewItem[]>(INITIAL_REVIEWS)
  const [conversations, setConversations] = useState<ChatConversationItem[]>(INITIAL_CONVERSATIONS)
  const [autoReplyText, setAutoReplyText] = useState(
    'Chào bạn! Shop đã nhận được tin nhắn và sẽ phản hồi trong giây lát. Chúc bạn một ngày mua sắm vui vẻ!',
  )
  const [roles, setRoles] = useState<ShopRoleItem[]>(INITIAL_ROLES)
  const [members, setMembers] = useState<ShopMemberItem[]>(INITIAL_MEMBERS)
  const [auditLogs, setAuditLogs] = useState<ShopAuditItem[]>(INITIAL_AUDIT)
  const [blocks, setBlocks] = useState<DecorationBlock[]>(INITIAL_BLOCKS)
  const [profile, setProfile] = useState<ShopProfileData>(INITIAL_SHOP_PROFILE)

  // Computed Badge Counts
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length
  const confirmedOrdersCount = orders.filter((o) => o.status === 'CONFIRMED').length
  const pendingReturnsCount = returns.filter((r) => r.status === 'REQUESTED').length
  const unreadChatCount = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0)

  // Low stock variants count across all active products
  const lowStockCount = products.reduce((acc, p) => {
    const lowVariants = p.variants.filter((v) => v.stock <= v.lowStockThreshold)
    return acc + lowVariants.length
  }, 0)

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

  // --- Product Management Handlers ---
  function handleToggleProductStatus(productId: string) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        let nextStatus: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'
        if (p.status === 'ACTIVE') {
          nextStatus = 'INACTIVE'
        }
        return { ...p, status: nextStatus }
      }),
    )
  }

  function handleDeleteProduct(productId: string) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        return { ...p, status: 'DELETED' }
      }),
    )
  }

  function handleAddProduct(newProduct: ProductItem) {
    setProducts((prev) => [newProduct, ...prev])
    const newAudit: ShopAuditItem = {
      id: `aud-${Date.now()}`,
      action: 'ADD_PRODUCT',
      targetType: 'PRODUCT',
      detail: `Thêm sản phẩm mới "${newProduct.name}" (Mã SKU: ${newProduct.sku})`,
      createdAt: 'Vừa xong',
    }
    setAuditLogs((prev) => [newAudit, ...prev])
    setActiveTab('PRODUCTS')
  }

  function handleBulkImport(csvContent: string) {
    const lines = csvContent.split('\n').filter((l) => l.trim() !== '')
    const newItems: ProductItem[] = []

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i]
      if (line) {
        const parts = line.split(',')
        if (parts.length >= 5) {
          const name = parts[0]?.trim() || `Sản phẩm ${Date.now()}`
          const sku = parts[1]?.trim() || `SKU-${Date.now()}`
          const category = parts[2]?.trim() || 'Thời trang'
          const price = Number(parts[3]) || 150000
          const stock = Number(parts[4]) || 50

          newItems.push({
            id: `prod-${Date.now()}-${i}`,
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            sku,
            category,
            price,
            originalPrice: Math.round(price * 1.2),
            stock,
            sold: 0,
            status: 'ACTIVE',
            image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80',
            variants: [
              {
                id: `v-bulk-${i}-1`,
                size: 'Freesize',
                color: 'Tiêu chuẩn',
                sku: `${sku}-STD`,
                price,
                stock,
                lowStockThreshold: 10,
              },
            ],
          })
        }
      }
    }

    if (newItems.length > 0) {
      setProducts((prev) => [...newItems, ...prev])
      const newAudit: ShopAuditItem = {
        id: `aud-${Date.now()}`,
        action: 'BULK_IMPORT',
        targetType: 'PRODUCT',
        detail: `Nhập nhanh ${newItems.length} sản phẩm từ tập tin CSV`,
        createdAt: 'Vừa xong',
      }
      setAuditLogs((prev) => [newAudit, ...prev])
    }
  }

  // --- Inventory & Stock Adjustment Handlers ---
  function handleAdjustStock(
    variantSku: string,
    changeQty: number,
    reason: 'RESTOCK' | 'DAMAGE' | 'RETURN' | 'AUDIT' | 'MANUAL',
    note: string,
  ) {
    let affectedProductName = ''
    let prevStockVal = 0
    let newStockVal = 0

    setProducts((prev) =>
      prev.map((p) => {
        const hasVariant = p.variants.some((v) => v.sku === variantSku)
        if (!hasVariant) return p

        affectedProductName = p.name
        const updatedVariants = p.variants.map((v) => {
          if (v.sku !== variantSku) return v
          prevStockVal = v.stock
          const nextStock = Math.max(0, v.stock + changeQty)
          newStockVal = nextStock
          return { ...v, stock: nextStock }
        })

        const totalStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0)
        return { ...p, stock: totalStock, variants: updatedVariants }
      }),
    )

    const movement: StockMovementItem = {
      id: `mov-${Date.now()}`,
      variantSku,
      productName: affectedProductName,
      changeQty,
      previousStock: prevStockVal,
      newStock: newStockVal,
      reason,
      note,
      createdBy: 'Chủ shop',
      createdAt: 'Vừa xong',
    }

    setStockMovements((prev) => [movement, ...prev])
  }

  // --- Order Workflow Handlers ---
  function handleConfirmOrder(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        return { ...o, status: 'CONFIRMED' }
      }),
    )
  }

  function handleShipOrder(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        return { ...o, status: 'SHIPPING' }
      }),
    )
  }

  function handleDeliverOrder(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        return { ...o, status: 'DELIVERED' }
      }),
    )
  }

  function handleCancelOrder(orderId: string, reason: string) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        return { ...o, status: 'CANCELLED', cancelReason: reason }
      }),
    )
  }

  // --- Returns & Refunds Handlers ---
  function handleApproveReturn(
    returnId: string,
    resolution: string,
    refundAmount: number,
    returnAddress: string,
  ) {
    setReturns((prev) =>
      prev.map((r) => {
        if (r.id !== returnId) return r
        return {
          ...r,
          status: 'APPROVED',
          resolution,
          refundAmount,
          sellerNote: `Địa chỉ nhận lại: ${returnAddress}`,
        }
      }),
    )
  }

  function handleRejectReturn(returnId: string, sellerNote: string) {
    setReturns((prev) =>
      prev.map((r) => {
        if (r.id !== returnId) return r
        return { ...r, status: 'REJECTED', sellerNote }
      }),
    )
  }

  function handleCompleteReturn(returnId: string) {
    setReturns((prev) =>
      prev.map((r) => {
        if (r.id !== returnId) return r
        return { ...r, status: 'COMPLETED' }
      }),
    )
  }

  // --- Revenue & Wallet Handlers ---
  function handleCreateWithdrawal(amount: number) {
    const newWithdrawal: WithdrawalItem = {
      id: `w-${Date.now()}`,
      amount,
      bankName: profile.bankName,
      bankAccount: profile.bankAccount,
      bankHolder: profile.bankHolder,
      status: 'PROCESSING',
      createdAt: 'Vừa xong',
    }
    setWithdrawals((prev) => [newWithdrawal, ...prev])
  }

  // --- Reviews Handlers ---
  function handleReplyReview(reviewId: string, replyText: string) {
    setReviews((prev) =>
      prev.map((rev) => {
        if (rev.id !== reviewId) return rev
        return { ...rev, sellerReply: replyText }
      }),
    )
  }

  function handleReportReview(reviewId: string, reason: string) {
    setReviews((prev) =>
      prev.map((rev) => {
        if (rev.id !== reviewId) return rev
        return { ...rev, isReported: true }
      }),
    )
    const audit: ShopAuditItem = {
      id: `aud-${Date.now()}`,
      action: 'REPORT_REVIEW',
      targetType: 'REVIEW',
      detail: `Báo cáo đánh giá ID: ${reviewId}. Lý do: ${reason}`,
      createdAt: 'Vừa xong',
    }
    setAuditLogs((prev) => [audit, ...prev])
  }

  // --- Chat Handlers ---
  function handleSendMessage(conversationId: string, content: string) {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c
        const newMsg = {
          id: `m-${Date.now()}`,
          senderType: 'SELLER' as const,
          content,
          sentAt: 'Vừa xong',
        }
        return {
          ...c,
          lastMessage: content,
          lastMessageAt: 'Vừa xong',
          messages: [...c.messages, newMsg],
        }
      }),
    )
  }

  function handleMarkRead(conversationId: string) {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c
        return { ...c, unreadCount: 0 }
      }),
    )
  }

  // --- Staff & Permissions Handlers ---
  function handleAddMember(newMember: ShopMemberItem) {
    setMembers((prev) => [...prev, newMember])
  }

  function handleRemoveMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  function handleAddRole(newRole: ShopRoleItem) {
    setRoles((prev) => [...prev, newRole])
  }

  function handleAddAuditLog(log: ShopAuditItem) {
    setAuditLogs((prev) => [log, ...prev])
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
      <Suspense fallback={<TabLoading />}>
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <SellerOverviewTab
            onNavigateTab={handleOverviewNavigate}
            pendingOrdersCount={pendingOrdersCount}
            confirmedOrdersCount={confirmedOrdersCount}
            pendingReturnsCount={pendingReturnsCount}
            lowStockCount={lowStockCount}
          />
        )}

        {/* 2. PRODUCTS TAB */}
        {activeTab === 'PRODUCTS' && (
          <SellerProductsTab
            products={products}
            onToggleStatus={handleToggleProductStatus}
            onDeleteProduct={handleDeleteProduct}
            onBulkImport={handleBulkImport}
            onNavigateAddProduct={() => setActiveTab('ADD_PRODUCT')}
          />
        )}

        {/* 3. ADD PRODUCT TAB */}
        {activeTab === 'ADD_PRODUCT' && (
          <SellerAddProductTab
            onBack={() => setActiveTab('PRODUCTS')}
            onAddProduct={handleAddProduct}
          />
        )}

        {/* 4. INVENTORY TAB */}
        {activeTab === 'INVENTORY' && (
          <SellerInventoryTab
            products={products}
            movements={stockMovements}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {/* 5. ORDERS TAB */}
        {activeTab === 'ORDERS' && (
          <SellerOrdersTab
            orders={orders}
            onConfirmOrder={handleConfirmOrder}
            onShipOrder={handleShipOrder}
            onDeliverOrder={handleDeliverOrder}
            onCancelOrder={handleCancelOrder}
          />
        )}

        {/* 6. RETURNS TAB */}
        {activeTab === 'RETURNS' && (
          <SellerReturnsTab
            returns={returns}
            onApproveReturn={handleApproveReturn}
            onRejectReturn={handleRejectReturn}
            onCompleteReturn={handleCompleteReturn}
          />
        )}

        {/* 7. REVENUE TAB */}
        {activeTab === 'REVENUE' && (
          <SellerRevenueTab
            settlements={settlements}
            withdrawals={withdrawals}
            onCreateWithdrawal={handleCreateWithdrawal}
          />
        )}

        {/* 8. REVIEWS TAB */}
        {activeTab === 'REVIEWS' && (
          <SellerReviewsTab
            reviews={reviews}
            onReplyReview={handleReplyReview}
            onReportReview={handleReportReview}
          />
        )}

        {/* 9. CHAT TAB */}
        {activeTab === 'CHAT' && (
          <SellerChatTab
            conversations={conversations}
            onSendMessage={handleSendMessage}
            onMarkRead={handleMarkRead}
            autoReplyText={autoReplyText}
            onSaveAutoReply={setAutoReplyText}
          />
        )}

        {/* 10. DECORATION TAB */}
        {activeTab === 'DECORATION' && (
          <SellerDecorationTab blocks={blocks} onUpdateBlocks={setBlocks} />
        )}

        {/* 11. STAFF & RBAC TAB */}
        {activeTab === 'STAFF' && (
          <SellerStaffTab
            roles={roles}
            members={members}
            auditLogs={auditLogs}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onAddRole={handleAddRole}
            onAddAuditLog={handleAddAuditLog}
          />
        )}

        {/* 12. PROFILE & KYC TAB */}
        {activeTab === 'PROFILE' && (
          <SellerProfileTab profile={profile} onSaveProfile={setProfile} />
        )}
      </Suspense>
    </SellerLayout>
  )
}
