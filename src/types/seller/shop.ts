export interface ShopAuditItem {
  id: string
  actorEmail?: string
  actorName?: string
  action: string
  detail: string
  targetType: string
  createdAt: string
}

export interface BannerSlideItem {
  id: string
  /** Id upload của ảnh — lưu vào draft để truy vết, không dùng để gọi API */
  uploadId?: string
  /** URL public của ảnh slide — lưu thẳng vào draft JSON (từ PresignResponse.publicUrl) */
  imageUrl: string
  title?: string
  linkUrl?: string
}

export type DecorationBlockType =
  | 'BANNER_SLIDER'
  | 'PRODUCT_COLLECTION'
  | 'CATEGORY_GRID'
  | 'VOUCHER_CAROUSEL'
  | 'BANNER'
  | 'COLLECTION'
  | 'VIDEO'

export interface DecorationBlock {
  id: string
  type: DecorationBlockType
  title: string
  enabled: boolean
  banners?: BannerSlideItem[]
  collectionType?: 'NEW_ARRIVALS' | 'BEST_SELLER' | 'SALE_OFF' | 'CUSTOM'
  itemLimit?: number
  displayStyle?: 'GRID' | 'SLIDER'
  /** Id upload của video — lưu vào draft để truy vết, không dùng để gọi API */
  videoUploadId?: string
  /** URL public của video (upload qua presign video/*) — block VIDEO dùng. */
  videoUrl?: string
}

export interface ShopProfileData {
  shopName: string
  slug: string
  bio: string
  logoUrl: string
  bannerUrl: string
  phone: string
  pickupAddress: string
  city: string
  daysToShip: number
  businessType: 'INDIVIDUAL' | 'BUSINESS'
  isVerified: boolean
  bankName: string
  bankAccount: string
  bankHolder: string
  workingHours: string
  returnPolicy?: string
}

export type Step = 1 | 2 | 3 | 4
