export interface OrderItem {
  id: string
  code: string
  buyerName: string
  buyerPhone: string
  shippingAddress: string
  shippingCarrier?: string
  trackingCode?: string
  shippedAt?: string
  deliveredAt?: string
  receivedAt?: string
  returnStatus?: string
  paymentMethod?: string
  note?: string
  items: {
    productId: string
    productName: string
    size: string
    color: string
    quantity: number
    price: number
    sku?: string
    lineTotal?: number
  }[]
  totalAmount: number
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED'
  cancelReason?: string
  cancelNote?: string
  cancelledBy?: string
  confirmedAt?: string
  cancelledAt?: string
  createdAt: string
  rawCreatedAt: string
}

export interface ReturnItem {
  id: string
  orderId: string
  orderCode: string
  orderStatus: string
  buyerName: string
  reason: string
  description: string
  evidenceImage: string
  evidenceImages: string[]
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  resolution?: string
  refundAmount?: number
  sellerNote?: string
  createdAt: string
}

export interface SettlementItem {
  id: string
  orderCode: string
  grossAmount: number
  platformFee: number
  netAmount: number
  status: 'HOLDING' | 'RELEASED'
  holdUntil: string
  releasedAt?: string
}

export interface WithdrawalItem {
  id: string
  amount: number
  bankName: string
  bankAccount: string
  bankHolder: string
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'
  createdAt: string
}
