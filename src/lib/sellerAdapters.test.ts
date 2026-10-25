import { describe, expect, it } from 'vitest'

import {
  auditItem,
  chatConversationItem,
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
  stockMovementItem,
  withdrawalItem,
} from './sellerAdapters'

import type { DecorationBlock } from '@/types/seller'
import type { ChatConversationResponse } from '@generated/model/chatConversationResponse'
import type { OrderResponse } from '@generated/model/orderResponse'
import type { ReturnRequestResponse } from '@generated/model/returnRequestResponse'
import type { SellerProductResponse } from '@generated/model/sellerProductResponse'
import type { SellerReviewResponse } from '@generated/model/sellerReviewResponse'
import type { SettlementResponse } from '@generated/model/settlementResponse'
import type { ShopMemberAuditResponse } from '@generated/model/shopMemberAuditResponse'
import type { ShopMemberDetailResponse } from '@generated/model/shopMemberDetailResponse'
import type { ShopResponse } from '@generated/model/shopResponse'
import type { ShopRoleResponse } from '@generated/model/shopRoleResponse'
import type { StockMovementResponse } from '@generated/model/stockMovementResponse'
import type { WithdrawalResponse } from '@generated/model/withdrawalResponse'

describe('productItem', () => {
  it('map day du field tu SellerProductResponse', () => {
    const product: SellerProductResponse = {
      id: 'p1',
      name: 'Áo thun',
      slug: 'ao-thun',
      status: 'ACTIVE',
      totalStock: 20,
      minPrice: 391000,
      defaultImageKey: 'demo/ao.jpg',
      variants: [
        {
          id: 'v1',
          sku: 'AO-M',
          size: 'M',
          color: 'Trắng',
          price: 391000,
          stockQuantity: 12,
        },
      ],
    }
    const item = productItem(product, 'Áo')
    expect(item.id).toBe('p1')
    expect(item.category).toBe('Áo')
    expect(item.price).toBe(391000)
    expect(item.stock).toBe(20)
    expect(item.sold).toBe(0)
    expect(item.status).toBe('ACTIVE')
    expect(item.variants[0]?.sku).toBe('AO-M')
    expect(item.variants[0]?.lowStockThreshold).toBe(5)
    expect(item.image).toContain('demo/ao.jpg')
  })

  it('HIDDEN thanh INACTIVE va mac dinh khi thieu du lieu', () => {
    const item = productItem({ status: 'HIDDEN' }, undefined)
    expect(item.status).toBe('INACTIVE')
    expect(item.name).toBe('')
    expect(item.category).toBe('')
    expect(item.sold).toBe(0)
  })

  it('PENDING giu nguyen PENDING', () => {
    const item = productItem({ status: 'PENDING' }, undefined)
    expect(item.status).toBe('PENDING')
  })

  it('DELETED giu nguyen DELETED', () => {
    const item = productItem({ status: 'DELETED' }, undefined)
    expect(item.status).toBe('DELETED')
  })

  it('BANNED giu nguyen BANNED kem statusReason va violationType', () => {
    const item = productItem(
      { status: 'BANNED', statusReason: 'Sản phẩm cấm bán', violationType: 'COUNTERFEIT' },
      undefined,
    )
    expect(item.status).toBe('BANNED')
    expect(item.statusReason).toBe('Sản phẩm cấm bán')
    expect(item.violationType).toBe('COUNTERFEIT')
  })
})

describe('orderItem', () => {
  it('tach variant label thanh size va mau', () => {
    const order: OrderResponse = {
      id: 'o1',
      code: 'ORD-1',
      shippingName: 'Linh, Hà Nội',
      shippingPhone: '0901',
      shippingAddress: 'Hà Nội',
      status: 'SHIPPING',
      subtotal: 391000,
      total: 391000,
      items: [
        {
          productId: 'p1',
          productName: 'Áo thun',
          variantLabel: 'M / Trắng',
          unitPrice: 391000,
          quantity: 1,
        },
      ],
      createdAt: '2026-10-18T09:30:00Z',
    }
    const item = orderItem(order)
    expect(item.code).toBe('ORD-1')
    expect(item.buyerName).toBe('Linh, Hà Nội')
    expect(item.items[0]?.size).toBe('M')
    expect(item.items[0]?.color).toBe('Trắng')
    expect(item.status).toBe('SHIPPING')
    expect(item.createdAt).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('status la khong thi ve PENDING', () => {
    const item = orderItem({ status: undefined })
    expect(item.status).toBe('PENDING')
  })
})

describe('returnItem', () => {
  it('resolve order code va buyer tu danh muc order', () => {
    const orders = new Map([['o1', { code: 'ORD-9', shippingName: 'An' } as OrderResponse]])
    const request: ReturnRequestResponse = {
      id: 'r1',
      orderId: 'o1',
      reason: 'DAMAGED',
      description: 'Rách may',
      evidenceKeys: ['demo/e1.jpg'],
      status: 'REQUESTED',
    }
    const item = returnItem(request, orders)
    expect(item.orderCode).toBe('ORD-9')
    expect(item.buyerName).toBe('An')
    expect(item.evidenceImage).toContain('demo/e1.jpg')
  })

  it('khong co order thi de rong', () => {
    const item = returnItem({ orderId: 'missing' }, new Map())
    expect(item.orderCode).toBe('')
    expect(item.buyerName).toBe('')
  })
})

describe('reviewItem va settlementItem', () => {
  it('map review seller', () => {
    const review: SellerReviewResponse = {
      id: 'rv1',
      buyerDisplayName: 'Linh, Hà Nội',
      stars: 1,
      comment: 'Màu khác ảnh',
      sellerReply: 'Cảm ơn bạn',
      isReported: true,
    }
    const item = reviewItem(review, 'Quần jeans')
    expect(item.productName).toBe('Quần jeans')
    expect(item.isReported).toBe(true)
    expect(item.images).toEqual([])
  })

  it('map settlement kem order code', () => {
    const orders = new Map([['o1', { code: 'ORD-1' } as OrderResponse]])
    const settlement: SettlementResponse = {
      id: 's1',
      orderId: 'o1',
      grossAmount: 391000,
      platformFee: 0,
      netAmount: 391000,
      status: 'RELEASED',
    }
    const item = settlementItem(settlement, orders)
    expect(item.orderCode).toBe('ORD-1')
    expect(item.status).toBe('RELEASED')
  })

  it('settlement khong co status thi HOLDING', () => {
    const item = settlementItem({}, new Map())
    expect(item.status).toBe('HOLDING')
  })
})

describe('withdrawalItem', () => {
  it('giu nguyen status hop le', () => {
    const withdrawal: WithdrawalResponse = {
      id: 'w1',
      amount: 100000,
      status: 'COMPLETED',
      bankName: 'Vietcombank',
    }
    expect(withdrawalItem(withdrawal).status).toBe('COMPLETED')
    expect(withdrawalItem({}).status).toBe('REQUESTED')
  })
})

describe('stockMovementItem', () => {
  it('chuan hoa reason ve union UI', () => {
    const movement: StockMovementResponse = {
      id: 'm1',
      variantId: 'v1',
      delta: -2,
      reason: 'ORDER_CANCEL',
    }
    const item = stockMovementItem(
      movement,
      new Map([['v1', 'AO-M']]),
      new Map([['v1', 'Áo thun']]),
    )
    expect(item.reason).toBe('SELLER_CANCEL')
    expect(item.variantSku).toBe('AO-M')
    expect(item.previousStock).toBeNull()
    expect(item.newStock).toBeNull()
  })

  it('reason la gi khac thi MANUAL', () => {
    const item = stockMovementItem({ reason: 'WHATEVER' }, new Map(), new Map())
    expect(item.reason).toBe('MANUAL')
  })
})

describe('roleItem va memberItem', () => {
  it('dem member theo roleId', () => {
    const role: ShopRoleResponse = {
      id: 'r2',
      name: 'CSKH',
      permissions: ['CHAT_ACCESS'],
      isSystem: false,
    }
    const members: ShopMemberDetailResponse[] = [
      { userId: 'u1', roleId: 'r2', role: 'STAFF' },
      { userId: 'u2', roleId: 'r2', role: 'STAFF' },
      { userId: 'u3', role: 'OWNER' },
    ]
    const item = roleItem(role, members)
    expect(item.memberCount).toBe(2)
  })

  it('member khong co roleName thi lay role', () => {
    const item = memberItem({ userId: 'u9', role: 'STAFF', status: 'PENDING' })
    expect(item.roleName).toBe('STAFF')
    expect(item.status).toBe('INVITED')
  })
})

describe('auditItem', () => {
  it('map cac truong co ban', () => {
    const audit: ShopMemberAuditResponse = {
      id: 'a1',
      action: 'INVITE_STAFF',
      targetType: 'INVITATION',
      detail: 'Mời hanh@demo.local',
      createdAt: '2026-10-18T09:30:00Z',
    }
    const item = auditItem(audit)
    expect(item.id).toBe('a1')
    expect(item.action).toBe('INVITE_STAFF')
    expect(item.detail).toBe('Mời hanh@demo.local')
    expect(item.targetType).toBe('INVITATION')
    expect(item.createdAt).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
  })
})

describe('chatConversationItem', () => {
  it('resolve ten buyer tu map, khong co thi mac dinh', () => {
    const names = new Map([['b1', 'Trâm, Sài Gòn']])
    const conversation: ChatConversationResponse = {
      id: 'c1',
      buyerId: 'b1',
      lastMessageText: 'Hello',
      unreadCount: 2,
    }
    const item = chatConversationItem(conversation, names)
    expect(item.buyerName).toBe('Trâm, Sài Gòn')
    expect(item.unreadCount).toBe(2)
    expect(item.messages).toEqual([])
    expect(chatConversationItem({ buyerId: 'ghost' }, names).buyerName).toBe('Khách hàng')
  })
})

describe('decoration adapter', () => {
  const blocks: DecorationBlock[] = [
    { id: 'b-1', type: 'BANNER', title: 'Banner', enabled: true },
    { id: 'b-2', type: 'VIDEO', title: 'Video', enabled: false },
  ]

  it('vong tron stringify -> parse', () => {
    const parsed = decorationBlocks({ draft: decorationDraftJson(blocks) })
    expect(parsed).toEqual(blocks)
  })

  it('JSON loi thi tra mang rong', () => {
    expect(decorationBlocks({ draft: '{khong phai json' })).toEqual([])
    expect(decorationBlocks(undefined)).toEqual([])
    expect(decorationBlocks({ draft: '{"type":"BANNER"}' })).toEqual([])
  })
})

describe('shopProfile', () => {
  it('map day du ho so shop', () => {
    const shop: ShopResponse = {
      id: 's1',
      name: 'nét lab',
      slug: 'net-lab',
      description: 'Bio',
      status: 'APPROVED',
      phone: '0901',
      address: 'Hà Nội',
      processingDays: 2,
      sellerType: 'BUSINESS',
      taxCode: '0123',
      bankName: 'Vietcombank',
      bankAccount: '0011',
      bankHolder: 'DEMO OWNER',
      autoReplyText: 'Chào bạn',
      workingHours: '08:00-21:00',
      legalName: 'Nguyễn Văn Demo',
    }
    const profile = shopProfile(shop)
    expect(profile.shopName).toBe('nét lab')
    expect(profile.contactName).toBe('Nguyễn Văn Demo')
    expect(profile.businessType).toBe('BUSINESS')
    expect(profile.taxOrIdNumber).toBe('0123')
    expect(profile.isVerified).toBe(true)
    expect(profile.city).toBe('')
  })
})
