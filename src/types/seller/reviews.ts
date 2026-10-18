export interface ReviewItem {
  id: string
  buyerName: string
  productName: string
  rating: number
  comment: string
  images: string[]
  sellerReply?: string
  isReported: boolean
  createdAt: string
}
