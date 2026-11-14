export interface ReviewItem {
  id: string
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
