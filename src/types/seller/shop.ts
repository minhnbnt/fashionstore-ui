export interface ShopAuditItem {
  id: string
  action: string
  detail: string
  targetType: string
  createdAt: string
}

export interface DecorationBlock {
  id: string
  type: 'BANNER' | 'COLLECTION' | 'FLASH_SALE' | 'VIDEO'
  title: string
  enabled: boolean
}

export interface ShopProfileData {
  shopName: string
  slug: string
  bio: string
  logoUrl: string
  bannerUrl: string
  contactName: string
  phone: string
  pickupAddress: string
  city: string
  daysToShip: number
  businessType: 'INDIVIDUAL' | 'BUSINESS'
  taxOrIdNumber: string
  isVerified: boolean
  bankName: string
  bankAccount: string
  bankHolder: string
  workingHours: string
  vacationMode: boolean
}

export type Step = 1 | 2 | 3 | 4
