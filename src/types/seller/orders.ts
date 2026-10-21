export interface OrderItem {
  id: string
  code: string
  buyerName: string
  buyerPhone: string
  shippingAddress: string
  items: {
    productId: string
    productName: string
    size: string
    color: string
    quantity: number
    price: number
  }[]
  totalAmount: number
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED'
  cancelReason?: string
  createdAt: string
}

export interface ReturnItem {
  id: string
  orderCode: string
  buyerName: string
  reason: string
  description: string
  evidenceImage: string
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
