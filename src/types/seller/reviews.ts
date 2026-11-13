export interface ReviewItem {
  id: string
  productId: string
  buyerName: string
  productName: string
  variantLabel?: string
  rating: number
  comment: string
  images: string[]
  videoUrl?: string
  tags: string[]
  helpfulCount: number
  anonymous: boolean
  sellerReply?: string
  repliedAt?: string
  isReported: boolean
  createdAt: string
}

export interface ReviewProductOption {
  id: string
  name: string
  reviewCount: number
}

export interface ReviewReplyTemplateItem {
  id: string
  title: string
  content: string
  updatedAt: string
}

export interface ReviewTrendPoint {
  label: string
  reviewCount: number
  averageRating: number
}

export type ReviewTrendPeriod = 'day' | 'week' | 'month'
