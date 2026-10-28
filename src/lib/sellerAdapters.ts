import { PLACEHOLDER_IMAGE, imageUrl } from './apiAdapters'
import { formatDateTime } from './format'

import type { DecorationBlock } from '@/types/seller'
import type {
  ChatConversationItem,
  ChatMessageItem,
  OrderItem,
  ProductItem,
  ReturnItem,
  ReviewItem,
  SettlementItem,
  ShopAuditItem,
  ShopMemberItem,
  ShopProfileData,
  ShopRoleItem,
  StockMovementItem,
  WithdrawalItem,
} from '@/types/seller'
import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { ChatMessageResponse } from '@generated/model/chatMessageResponse'
import type { DecorationResponse } from '@generated/model/decorationResponse'
import type { InventoryItemResponse } from '@generated/model/inventoryItemResponse'
import type { OrderResponse } from '@generated/model/orderResponse'
import type { ReturnRequestResponse } from '@generated/model/returnRequestResponse'
import type { SellerProductResponse } from '@generated/model/sellerProductResponse'
import type { SellerReviewResponse } from '@generated/model/sellerReviewResponse'
import type { SettlementResponse } from '@generated/model/settlementResponse'
import type { ShopActivityResponse } from '@generated/model/shopActivityResponse'
import type { ShopMemberDetailResponse } from '@generated/model/shopMemberDetailResponse'
import type { ShopResponse } from '@generated/model/shopResponse'
import type { ShopRoleResponse } from '@generated/model/shopRoleResponse'
import type { StockMovementResponse } from '@generated/model/stockMovementResponse'
import type { VariantResponse } from '@generated/model/variantResponse'
import type { WithdrawalResponse } from '@generated/model/withdrawalResponse'

function safeId(id: string | null | undefined): string {
  if (id === null || id === undefined) {
    return ''
  }
  return id
}

function safeText(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return ''
  }
  return text
}

function imageFromKey(key: string | null | undefined): string {
  if (key === null || key === undefined || key === '') {
    return PLACEHOLDER_IMAGE
  }
  return imageUrl(key)
}

/** "M / Trắng" -> ["M", "Trắng"], tách theo variant label do backend sinh */
function splitVariantLabel(label: string | null | undefined): { size: string; color: string } {
  const parts = safeText(label).split(' / ')
  return { size: parts[0] ?? '', color: parts[1] ?? '' }
}

export function productItem(
  product: SellerProductResponse,
  categoryName: string | undefined,
): ProductItem {
  const variants: ProductItem['variants'] = []
  let maxCompareAt: number | null = null
  for (const v of product.variants ?? []) {
    const variant = variantInput(v)
    variants.push(variant)
    if (v.compareAtPrice !== undefined && v.compareAtPrice !== null) {
      if (maxCompareAt === null || v.compareAtPrice > maxCompareAt) {
        maxCompareAt = v.compareAtPrice
      }
    }
  }

  let status: ProductItem['status'] = 'ACTIVE'
  if (product.status === 'DELETED') {
    status = 'DELETED'
  }
  if (product.status === 'HIDDEN') {
    status = 'INACTIVE'
  }
  if (product.status === 'PENDING') {
    status = 'PENDING'
  }
  if (product.status === 'BANNED') {
    status = 'BANNED'
  }

  return {
    id: safeId(product.id),
    name: safeText(product.name),
    slug: safeText(product.slug),
    sku: variants[0]?.sku ?? '',
    // API chi tra categoryId, ten danh muc resolve o ngoai (categories query)
    category: categoryName ?? '',
    categoryId: product.categoryId,
    price: product.minPrice ?? 0,
    originalPrice: maxCompareAt ?? product.minPrice ?? 0,
    stock: product.totalStock ?? 0,
    sold: product.soldCount ?? 0,
    status,
    violationType: product.violationType,
    statusReason: product.statusReason,
    image: imageFromKey(product.defaultImageKey),
    createdAt: product.createdAt,
    variants,
  }
}

export function variantInput(v: VariantResponse): ProductItem['variants'][number] {
  return {
    id: safeId(v.id),
    size: safeText(v.size),
    color: safeText(v.color),
    sku: safeText(v.sku),
    price: v.price ?? 0,
    stock: v.stockQuantity ?? 0,
    // SellerProductResponse khong tra nguong ton; nguong that nam o inventory API,
    // dung mac dinh 5 cua backend de cong thuc canh bao van hoat dong
    lowStockThreshold: 5,
  }
}

export function orderItem(order: OrderResponse): OrderItem {
  const items: OrderItem['items'] = []
  for (const item of order.items ?? []) {
    const label = splitVariantLabel(item.variantLabel)
    let sku: string | undefined
    if (item.sku) {
      sku = item.sku
    }
    let lineTotal: number | undefined
    if (item.lineTotal !== undefined && item.lineTotal !== null) {
      lineTotal = item.lineTotal
    }
    items.push({
      productId: safeId(item.productId),
      productName: safeText(item.productName),
      size: label.size,
      color: label.color,
      quantity: item.quantity ?? 0,
      price: item.unitPrice ?? 0,
      sku,
      lineTotal,
    })
  }

  let status: OrderItem['status'] = 'PENDING'
  if (
    order.status === 'CONFIRMED' ||
    order.status === 'SHIPPING' ||
    order.status === 'DELIVERED' ||
    order.status === 'CANCELLED'
  ) {
    status = order.status
  }

  let paymentMethod: string | undefined
  if (order.paymentMethod) {
    paymentMethod = order.paymentMethod
  }

  let note: string | undefined
  if (order.note) {
    note = order.note
  }

  let cancelReason: string | undefined
  if (order.cancelReason) {
    cancelReason = order.cancelReason
  }

  let cancelNote: string | undefined
  if (order.cancelNote) {
    cancelNote = order.cancelNote
  }

  let cancelledBy: string | undefined
  if (order.cancelledBy) {
    cancelledBy = order.cancelledBy
  }

  let confirmedAt: string | undefined
  if (order.confirmedAt) {
    confirmedAt = formatDateTime(order.confirmedAt)
  }

  let cancelledAt: string | undefined
  if (order.cancelledAt) {
    cancelledAt = formatDateTime(order.cancelledAt)
  }

  return {
    id: safeId(order.id),
    code: safeText(order.code),
    buyerName: safeText(order.shippingName),
    buyerPhone: safeText(order.shippingPhone),
    shippingAddress: safeText(order.shippingAddress),
    paymentMethod,
    note,
    items,
    totalAmount: order.total ?? order.subtotal ?? 0,
    status,
    cancelReason,
    cancelNote,
    cancelledBy,
    confirmedAt,
    cancelledAt,
    createdAt: formatDateTime(order.createdAt),
    rawCreatedAt: safeText(order.createdAt),
  }
}

/**
 * Return API khong mang order code / ten buyer, dashboard truyen danh muc
 * order da load de resolve. evidenceImage lay anh dau tien neu co.
 */
export function returnItem(
  request: ReturnRequestResponse,
  orderById: Map<string, OrderResponse>,
): ReturnItem {
  let order: OrderResponse | undefined
  if (request.orderId !== undefined) {
    order = orderById.get(request.orderId)
  }
  const evidenceKeys = request.evidenceKeys ?? []
  const firstKey = evidenceKeys[0]

  let status: ReturnItem['status'] = 'REQUESTED'
  if (
    request.status === 'APPROVED' ||
    request.status === 'REJECTED' ||
    request.status === 'COMPLETED'
  ) {
    status = request.status
  }

  let orderCode = ''
  let buyerName = ''
  if (order !== undefined) {
    orderCode = safeText(order.code)
    buyerName = safeText(order.shippingName)
  }

  let evidenceImage = ''
  if (firstKey !== undefined) {
    evidenceImage = imageFromKey(firstKey)
  }

  return {
    id: safeId(request.id),
    orderCode,
    buyerName,
    reason: safeText(request.reason),
    description: safeText(request.description),
    evidenceImage,
    status,
    resolution: safeText(request.resolution),
    refundAmount: request.refundAmount,
    sellerNote: safeText(request.sellerNote),
    createdAt: formatDateTime(request.createdAt),
  }
}

export function reviewItem(
  review: SellerReviewResponse,
  productName: string | undefined,
): ReviewItem {
  return {
    id: safeId(review.id),
    buyerName: safeText(review.buyerDisplayName),
    productName: safeText(productName),
    rating: review.stars ?? 0,
    comment: safeText(review.comment),
    // API chua co anh dinh kem review
    images: [],
    sellerReply: safeText(review.sellerReply),
    isReported: review.isReported === true,
    createdAt: formatDateTime(review.createdAt),
  }
}

export function settlementItem(
  settlement: SettlementResponse,
  orderById: Map<string, OrderResponse>,
): SettlementItem {
  let order: OrderResponse | undefined
  if (settlement.orderId !== undefined) {
    order = orderById.get(settlement.orderId)
  }
  let status: SettlementItem['status'] = 'HOLDING'
  if (settlement.status === 'RELEASED') {
    status = 'RELEASED'
  }
  let orderCode = ''
  if (order !== undefined) {
    orderCode = safeText(order.code)
  }
  let releasedAt: string | undefined
  if (settlement.releasedAt !== null && settlement.releasedAt !== undefined) {
    releasedAt = formatDateTime(settlement.releasedAt)
  }

  return {
    id: safeId(settlement.id),
    orderCode,
    grossAmount: settlement.grossAmount ?? 0,
    platformFee: settlement.platformFee ?? 0,
    netAmount: settlement.netAmount ?? 0,
    status,
    holdUntil: formatDateTime(settlement.holdUntil),
    releasedAt,
  }
}

export function withdrawalItem(withdrawal: WithdrawalResponse): WithdrawalItem {
  let status: WithdrawalItem['status'] = 'REQUESTED'
  if (
    withdrawal.status === 'PROCESSING' ||
    withdrawal.status === 'COMPLETED' ||
    withdrawal.status === 'REJECTED'
  ) {
    status = withdrawal.status
  }
  return {
    id: safeId(withdrawal.id),
    amount: withdrawal.amount ?? 0,
    bankName: safeText(withdrawal.bankName),
    bankAccount: safeText(withdrawal.bankAccount),
    bankHolder: safeText(withdrawal.bankHolder),
    status,
    createdAt: formatDateTime(withdrawal.createdAt),
  }
}

export function stockMovementItem(
  movement: StockMovementResponse,
  skuByVariantId: Map<string, string>,
  productNameByVariantId: Map<string, string>,
): StockMovementItem {
  const variantId = safeId(movement.variantId)
  const reason = safeText(movement.reason)
  let normalized: StockMovementItem['reason'] = 'MANUAL'
  if (
    reason === 'RESTOCK' ||
    reason === 'DAMAGE' ||
    reason === 'RETURN' ||
    reason === 'AUDIT' ||
    reason === 'ORDER_SHIP' ||
    reason === 'SELLER_CANCEL'
  ) {
    normalized = reason
  }
  if (reason === 'ORDER_CANCEL') {
    normalized = 'SELLER_CANCEL'
  }
  if (reason === 'MANUAL_ADJUST') {
    normalized = 'MANUAL'
  }

  return {
    id: safeId(movement.id),
    variantSku: skuByVariantId.get(variantId) ?? variantId,
    productName: productNameByVariantId.get(variantId) ?? '',
    changeQty: movement.delta ?? 0,
    // API khong luu stock truoc/sau tung lan bien dong
    previousStock: null,
    newStock: null,
    reason: normalized,
    note: safeText(movement.referenceId),
    createdBy: 'Hệ thống',
    createdAt: formatDateTime(movement.createdAt),
  }
}

export function roleItem(
  role: ShopRoleResponse,
  members: ShopMemberDetailResponse[],
): ShopRoleItem {
  const roleId = safeId(role.id)
  let memberCount = 0
  for (const member of members) {
    if (member.roleId === roleId) {
      memberCount += 1
    }
  }
  return {
    id: roleId,
    name: safeText(role.name),
    permissions: role.permissions ?? [],
    isSystem: role.isSystem === true,
    memberCount,
  }
}

export function memberItem(member: ShopMemberDetailResponse): ShopMemberItem {
  let status: ShopMemberItem['status'] = 'ACTIVE'
  if (member.status === 'DEACTIVATED') {
    status = 'DEACTIVATED'
  }
  let email = safeId(member.userId)
  if (member.email !== null && member.email !== undefined && member.email.trim() !== '') {
    email = member.email
  }
  let displayName = email
  if (
    member.displayName !== null &&
    member.displayName !== undefined &&
    member.displayName.trim() !== ''
  ) {
    displayName = member.displayName
  }
  let roleName = safeText(member.roleName)
  if (roleName === '') {
    roleName = safeText(member.role)
  }
  return {
    id: safeId(member.userId),
    email,
    displayName,
    roleId: safeId(member.roleId),
    roleName,
    status,
    joinedAt: formatDateTime(member.joinedAt),
  }
}

export function auditItem(audit: ShopActivityResponse): ShopAuditItem {
  return {
    id: safeId(audit.id),
    actorEmail: safeText(audit.actorEmail),
    actorName: safeText(audit.actorName),
    action: safeText(audit.action),
    detail: safeText(audit.detail),
    targetType: safeText(audit.targetType),
    createdAt: formatDateTime(audit.createdAt),
  }
}

export function chatConversationItem(
  conversation: ChatConversationResponse,
  buyerNameByBuyerId: Map<string, string>,
): ChatConversationItem {
  const buyerId = safeId(conversation.buyerId)
  const known = buyerNameByBuyerId.get(buyerId)
  return {
    id: safeId(conversation.id),
    buyerName: known ?? 'Khách hàng',
    buyerAvatar: '',
    lastMessage: safeText(conversation.lastMessageText),
    lastMessageAt: formatDateTime(conversation.lastMessageAt),
    unreadCount: conversation.unreadCount ?? 0,
    messages: [],
  }
}

export function chatMessageItem(message: ChatMessageResponse): ChatMessageItem {
  let senderType: ChatMessageItem['senderType'] = 'SELLER'
  if (message.senderType === 'BUYER') {
    senderType = 'BUYER'
  }
  return {
    id: safeId(message.id),
    senderType,
    content: safeText(message.content),
    sentAt: formatDateTime(message.sentAt),
  }
}

/** Parse draft hoặc layout JSON thanh block list, JSON loi thi tra ve mang rong */
export function decorationBlocks(decoration: DecorationResponse | undefined): DecorationBlock[] {
  let jsonStr = decoration?.layout
  if (decoration?.draft !== null && decoration?.draft !== undefined && decoration?.draft !== '') {
    jsonStr = decoration.draft
  }
  if (jsonStr === null || jsonStr === undefined || jsonStr === '') {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(jsonStr)
    if (Array.isArray(parsed) === false) {
      return []
    }
    const blocks: DecorationBlock[] = []
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) {
        continue
      }
      const record = item as Record<string, unknown>
      const rawType = record['type']
      const allowedTypes = [
        'BANNER_SLIDER',
        'PRODUCT_COLLECTION',
        'CATEGORY_GRID',
        'VOUCHER_CAROUSEL',
        'BANNER',
        'COLLECTION',
        'VIDEO',
      ]
      if (typeof rawType !== 'string' || !allowedTypes.includes(rawType)) {
        continue
      }
      const type = rawType as DecorationBlock['type']

      let banners: DecorationBlock['banners']
      if (Array.isArray(record['banners'])) {
        banners = []
        for (const b of record['banners']) {
          if (typeof b === 'object' && b !== null) {
            const bRec = b as Record<string, unknown>
            let bannerId = `slide-${banners.length + 1}`
            if (typeof bRec['id'] === 'string') {
              bannerId = bRec['id']
            }
            let imageKey = ''
            if (typeof bRec['imageKey'] === 'string') {
              imageKey = bRec['imageKey']
            }
            let title: string | undefined
            if (typeof bRec['title'] === 'string') {
              title = bRec['title']
            }
            let linkUrl: string | undefined
            if (typeof bRec['linkUrl'] === 'string') {
              linkUrl = bRec['linkUrl']
            }
            banners.push({
              id: bannerId,
              imageKey,
              title,
              linkUrl,
            })
          }
        }
      }

      let collectionType: DecorationBlock['collectionType']
      if (typeof record['collectionType'] === 'string') {
        const ct = record['collectionType']
        if (ct === 'NEW_ARRIVALS' || ct === 'BEST_SELLER' || ct === 'SALE_OFF' || ct === 'CUSTOM') {
          collectionType = ct
        }
      }

      let itemLimit: number | undefined
      if (typeof record['itemLimit'] === 'number') {
        itemLimit = record['itemLimit']
      }

      let displayStyle: DecorationBlock['displayStyle']
      if (record['displayStyle'] === 'GRID' || record['displayStyle'] === 'SLIDER') {
        displayStyle = record['displayStyle']
      }

      let videoKey: string | undefined
      if (typeof record['videoKey'] === 'string') {
        videoKey = record['videoKey']
      }

      let blockId = `block-${blocks.length + 1}`
      if (typeof record['id'] === 'string') {
        blockId = record['id']
      }
      let blockTitle = ''
      if (typeof record['title'] === 'string') {
        blockTitle = record['title']
      }

      const block: DecorationBlock = {
        id: blockId,
        type,
        title: blockTitle,
        enabled: record['enabled'] === true,
      }
      if (banners !== undefined) {
        block.banners = banners
      }
      if (collectionType !== undefined) {
        block.collectionType = collectionType
      }
      if (itemLimit !== undefined) {
        block.itemLimit = itemLimit
      }
      if (displayStyle !== undefined) {
        block.displayStyle = displayStyle
      }
      if (videoKey !== undefined) {
        block.videoKey = videoKey
      }
      blocks.push(block)
    }
    return blocks
  } catch {
    return []
  }
}

export function decorationDraftJson(blocks: DecorationBlock[]): string {
  return JSON.stringify(blocks)
}

export function shopProfile(shop: ShopResponse): ShopProfileData {
  let businessType: ShopProfileData['businessType'] = 'INDIVIDUAL'
  if (shop.sellerType === 'BUSINESS') {
    businessType = 'BUSINESS'
  }
  let taxOrIdNumber = safeText(shop.taxCode)
  if (taxOrIdNumber === '') {
    taxOrIdNumber = safeText(shop.idNumber)
  }
  return {
    shopName: safeText(shop.name),
    slug: safeText(shop.slug),
    bio: safeText(shop.description),
    logoUrl: imageFromKey(shop.logoKey),
    bannerUrl: imageFromKey(shop.bannerKey),
    contactName: safeText(shop.legalName),
    phone: safeText(shop.phone),
    pickupAddress: safeText(shop.address),
    // API khong co truong rieng cho thanh pho
    city: '',
    daysToShip: shop.processingDays ?? 2,
    businessType,
    taxOrIdNumber,
    isVerified: shop.status === 'APPROVED',
    bankName: safeText(shop.bankName),
    bankAccount: safeText(shop.bankAccount),
    bankHolder: safeText(shop.bankHolder),
    workingHours: safeText(shop.workingHours),
    returnPolicy: safeText(shop.returnPolicy),
  }
}

export function inventoryItemName(inventory: InventoryItemResponse): string {
  return safeText(inventory.productName)
}
