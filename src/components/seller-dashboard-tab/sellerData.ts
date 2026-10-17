export interface ProductItem {
  id: string
  name: string
  slug: string
  sku: string
  category: string
  price: number
  originalPrice: number
  stock: number
  sold: number
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED'
  image: string
  variants: {
    id: string
    size: string
    color: string
    sku: string
    price: number
    stock: number
    lowStockThreshold: number
  }[]
}

export interface StockMovementItem {
  id: string
  variantSku: string
  productName: string
  changeQty: number
  previousStock: number
  newStock: number
  reason: 'RESTOCK' | 'DAMAGE' | 'RETURN' | 'AUDIT' | 'MANUAL' | 'ORDER_SHIP' | 'SELLER_CANCEL'
  note: string
  createdBy: string
  createdAt: string
}

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

export interface ChatMessageItem {
  id: string
  senderType: 'BUYER' | 'SELLER'
  content: string
  sentAt: string
}

export interface ChatConversationItem {
  id: string
  buyerName: string
  buyerAvatar: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  messages: ChatMessageItem[]
}

export interface ShopRoleItem {
  id: string
  name: string
  permissions: string[]
  isSystem: boolean
  memberCount: number
}

export interface ShopMemberItem {
  id: string
  email: string
  roleId: string
  roleName: string
  status: 'ACTIVE' | 'INVITED'
  joinedAt: string
}

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

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'Áo Thun Cotton Oversize Form Rộng Unisex',
    slug: 'ao-thun-cotton-oversize',
    sku: 'TSHIRT-01',
    category: 'Áo Nam & Nữ',
    price: 189000,
    originalPrice: 250000,
    stock: 145,
    sold: 1240,
    status: 'ACTIVE',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80',
    variants: [
      {
        id: 'v-1',
        size: 'M',
        color: 'Trắng',
        sku: 'TS-WHT-M',
        price: 189000,
        stock: 45,
        lowStockThreshold: 10,
      },
      {
        id: 'v-2',
        size: 'L',
        color: 'Trắng',
        sku: 'TS-WHT-L',
        price: 189000,
        stock: 50,
        lowStockThreshold: 10,
      },
      {
        id: 'v-3',
        size: 'XL',
        color: 'Đen',
        sku: 'TS-BLK-XL',
        price: 189000,
        stock: 50,
        lowStockThreshold: 10,
      },
    ],
  },
  {
    id: 'prod-2',
    name: 'Quần Jean Ống Suông Baggy Phong Cách Hàn Quốc',
    slug: 'quan-jean-ong-suong-baggy',
    sku: 'JEAN-02',
    category: 'Quần Dài',
    price: 349000,
    originalPrice: 420000,
    stock: 82,
    sold: 680,
    status: 'ACTIVE',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&q=80',
    variants: [
      {
        id: 'v-4',
        size: '29',
        color: 'Xanh nhạt',
        sku: 'JN-LBL-29',
        price: 349000,
        stock: 30,
        lowStockThreshold: 15,
      },
      {
        id: 'v-5',
        size: '30',
        color: 'Xanh đậm',
        sku: 'JN-DBL-30',
        price: 349000,
        stock: 52,
        lowStockThreshold: 15,
      },
    ],
  },
  {
    id: 'prod-3',
    name: 'Áo Khoác Bomber Kaki 2 Lớp Chống Gió Cao Cấp',
    slug: 'ao-khoac-bomber-kaki-2-lop',
    sku: 'JACKET-03',
    category: 'Áo Khoác',
    price: 450000,
    originalPrice: 580000,
    stock: 12,
    sold: 310,
    status: 'ACTIVE',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300&q=80',
    variants: [
      {
        id: 'v-6',
        size: 'L',
        color: 'Rêu',
        sku: 'JK-GRN-L',
        price: 450000,
        stock: 4,
        lowStockThreshold: 10,
      },
      {
        id: 'v-7',
        size: 'XL',
        color: 'Đen',
        sku: 'JK-BLK-XL',
        price: 450000,
        stock: 8,
        lowStockThreshold: 10,
      },
    ],
  },
  {
    id: 'prod-4',
    name: 'Váy Đầm Hoa Nhí Dáng Dài Vintage Cổ Vuông',
    slug: 'vay-dam-hoa-nhi-vintage',
    sku: 'DRESS-04',
    category: 'Váy & Đầm',
    price: 299000,
    originalPrice: 380000,
    stock: 0,
    sold: 450,
    status: 'INACTIVE',
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300&q=80',
    variants: [
      {
        id: 'v-8',
        size: 'S',
        color: 'Vàng kem',
        sku: 'DR-YEL-S',
        price: 299000,
        stock: 0,
        lowStockThreshold: 10,
      },
    ],
  },
]

export const INITIAL_ORDERS: OrderItem[] = [
  {
    id: 'ord-1',
    code: 'ORD-984210',
    buyerName: 'Nguyễn Văn Tuấn',
    buyerPhone: '0912345678',
    shippingAddress: 'Số 12 ngõ 45 phố Kim Mã, Ba Đình, Hà Nội',
    items: [
      {
        productId: 'prod-1',
        productName: 'Áo Thun Cotton Oversize Form Rộng',
        size: 'L',
        color: 'Trắng',
        quantity: 2,
        price: 189000,
      },
    ],
    totalAmount: 378000,
    status: 'PENDING',
    createdAt: 'Hôm nay, 10:15',
  },
  {
    id: 'ord-2',
    code: 'ORD-984192',
    buyerName: 'Trần Thị Mai',
    buyerPhone: '0988776655',
    shippingAddress: '48 Lê Duẩn, Quận Hải Châu, Đà Nẵng',
    items: [
      {
        productId: 'prod-2',
        productName: 'Quần Jean Ống Suông Baggy Phong Cách',
        size: '30',
        color: 'Xanh đậm',
        quantity: 1,
        price: 349000,
      },
    ],
    totalAmount: 349000,
    status: 'CONFIRMED',
    createdAt: 'Hôm nay, 08:30',
  },
  {
    id: 'ord-3',
    code: 'ORD-983870',
    buyerName: 'Lê Hoàng Minh',
    buyerPhone: '0903123456',
    shippingAddress: '72 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    items: [
      {
        productId: 'prod-3',
        productName: 'Áo Khoác Bomber Kaki 2 Lớp Chống Gió',
        size: 'L',
        color: 'Rêu',
        quantity: 1,
        price: 450000,
      },
    ],
    totalAmount: 450000,
    status: 'SHIPPING',
    createdAt: 'Hôm qua, 15:40',
  },
  {
    id: 'ord-4',
    code: 'ORD-982104',
    buyerName: 'Phạm Thuỳ Dương',
    buyerPhone: '0977654321',
    shippingAddress: 'Tòa nhà Landmark 81, Vinhomes Central Park, Bình Thạnh, TP.HCM',
    items: [
      {
        productId: 'prod-1',
        productName: 'Áo Thun Cotton Oversize Form Rộng',
        size: 'M',
        color: 'Trắng',
        quantity: 1,
        price: 189000,
      },
      {
        productId: 'prod-2',
        productName: 'Quần Jean Ống Suông Baggy Phong Cách',
        size: '29',
        color: 'Xanh nhạt',
        quantity: 1,
        price: 349000,
      },
    ],
    totalAmount: 538000,
    status: 'DELIVERED',
    createdAt: '14/10/2026',
  },
  {
    id: 'ord-5',
    code: 'ORD-981005',
    buyerName: 'Vũ Quốc Anh',
    buyerPhone: '0933221100',
    shippingAddress: '15 Trần Phú, TP. Nha Trang, Khánh Hòa',
    items: [
      {
        productId: 'prod-1',
        productName: 'Áo Thun Cotton Oversize Form Rộng',
        size: 'XL',
        color: 'Đen',
        quantity: 1,
        price: 189000,
      },
    ],
    totalAmount: 189000,
    status: 'CANCELLED',
    cancelReason: 'Khách đổi ý muốn đặt size khác',
    createdAt: '12/10/2026',
  },
]

export const INITIAL_RETURNS: ReturnItem[] = [
  {
    id: 'ret-1',
    orderCode: 'ORD-982104',
    buyerName: 'Phạm Thuỳ Dương',
    reason: 'Hàng bị rách chỉ ở đường may viền cổ áo',
    description: 'Sản phẩm khi bóc hộp đã bị rách chỉ ở phần cổ áo, mong shop hỗ trợ đổi áo mới.',
    evidenceImage: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80',
    status: 'REQUESTED',
    createdAt: 'Hôm nay, 11:20',
  },
]

export const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    buyerName: 'nguyen_anh_99',
    productName: 'Áo Thun Cotton Oversize Form Rộng',
    rating: 5,
    comment:
      'Áo chất cotton dày dặn, thấm hút mồ hôi tốt. Đường may tỉ mỉ, form rộng đúng chuẩn oversize. Giao hàng cực nhanh!',
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80'],
    sellerReply: 'Dạ shop cảm ơn bạn nhiều ạ! Chúc bạn mặc áo thật đẹp và luôn ủng hộ shop nhé!',
    isReported: false,
    createdAt: '15/10/2026',
  },
  {
    id: 'rev-2',
    buyerName: 'minhtran.vn',
    productName: 'Quần Jean Ống Suông Baggy Phong Cách',
    rating: 5,
    comment:
      'Quần form đẹp, màu xanh đậm mặc tôn dáng. Giá này quá rẻ so với chất lượng trong mall.',
    images: [],
    isReported: false,
    createdAt: '14/10/2026',
  },
  {
    id: 'rev-3',
    buyerName: 'competitor_bot',
    productName: 'Áo Khoác Bomber Kaki 2 Lớp',
    rating: 1,
    comment: 'Hàng dỏm, đừng ai mua phí tiền.',
    images: [],
    isReported: true,
    createdAt: '13/10/2026',
  },
]

export const INITIAL_CONVERSATIONS: ChatConversationItem[] = [
  {
    id: 'conv-1',
    buyerName: 'Trần Thị Mai',
    buyerAvatar: 'mai',
    lastMessage: 'Shop ơi quần size 30 bụng 82cm vừa không ạ?',
    lastMessageAt: '10:45',
    unreadCount: 1,
    messages: [
      { id: 'm-1', senderType: 'BUYER', content: 'Chào shop!', sentAt: '10:40' },
      {
        id: 'm-2',
        senderType: 'SELLER',
        content: 'Dạ chào bạn, shop có thể hỗ trợ gì cho bạn ạ?',
        sentAt: '10:41',
      },
      {
        id: 'm-3',
        senderType: 'BUYER',
        content: 'Shop ơi quần size 30 bụng 82cm vừa không ạ?',
        sentAt: '10:45',
      },
    ],
  },
  {
    id: 'conv-2',
    buyerName: 'Lê Hoàng Minh',
    buyerAvatar: 'minh',
    lastMessage: 'Áo khoác bomber mình nhận được rồi, đẹp lắm nhé!',
    lastMessageAt: 'Hôm qua',
    unreadCount: 0,
    messages: [
      {
        id: 'm-4',
        senderType: 'BUYER',
        content: 'Áo khoác bomber mình nhận được rồi, đẹp lắm nhé!',
        sentAt: 'Hôm qua 16:30',
      },
      {
        id: 'm-5',
        senderType: 'SELLER',
        content: 'Cảm ơn anh Minh đã ủng hộ shop ạ ❤️',
        sentAt: 'Hôm qua 16:32',
      },
    ],
  },
]

export const INITIAL_SETTLEMENTS: SettlementItem[] = [
  {
    id: 'set-1',
    orderCode: 'ORD-982104',
    grossAmount: 538000,
    platformFee: 26900,
    netAmount: 511100,
    status: 'HOLDING',
    holdUntil: '17/10/2026',
  },
  {
    id: 'set-2',
    orderCode: 'ORD-979980',
    grossAmount: 890000,
    platformFee: 44500,
    netAmount: 845500,
    status: 'RELEASED',
    holdUntil: '10/10/2026',
    releasedAt: '10/10/2026 14:00',
  },
]

export const INITIAL_WITHDRAWALS: WithdrawalItem[] = [
  {
    id: 'w-1',
    amount: 1500000,
    bankName: 'Vietcombank',
    bankAccount: '0981000123456',
    bankHolder: 'NGUYEN VAN CHU SHOP',
    status: 'COMPLETED',
    createdAt: '11/10/2026 09:30',
  },
]

export const INITIAL_ROLES: ShopRoleItem[] = [
  {
    id: 'r-1',
    name: 'Quản lý (Manager)',
    permissions: ['ALL_PERMISSIONS'],
    isSystem: true,
    memberCount: 1,
  },
  {
    id: 'r-2',
    name: 'Chăm sóc khách hàng (CSKH)',
    permissions: ['ORDER_READ', 'REVIEW_READ', 'REVIEW_REPLY', 'CHAT_ACCESS'],
    isSystem: true,
    memberCount: 2,
  },
  {
    id: 'r-3',
    name: 'Kho vận (Warehouse)',
    permissions: ['ORDER_READ', 'ORDER_PROCESS', 'INVENTORY_WRITE'],
    isSystem: true,
    memberCount: 1,
  },
  {
    id: 'r-4',
    name: 'Marketing',
    permissions: ['PRODUCT_READ', 'DECORATION_WRITE', 'REVENUE_READ'],
    isSystem: true,
    memberCount: 1,
  },
]

export const INITIAL_MEMBERS: ShopMemberItem[] = [
  {
    id: 'mem-1',
    email: 'owner@fashionhub.vn',
    roleId: 'r-1',
    roleName: 'Chủ gian hàng (Owner)',
    status: 'ACTIVE',
    joinedAt: '01/01/2026',
  },
  {
    id: 'mem-2',
    email: 'cskh.hang@fashionhub.vn',
    roleId: 'r-2',
    roleName: 'Chăm sóc khách hàng (CSKH)',
    status: 'ACTIVE',
    joinedAt: '15/02/2026',
  },
  {
    id: 'mem-3',
    email: 'kho.tuan@fashionhub.vn',
    roleId: 'r-3',
    roleName: 'Kho vận (Warehouse)',
    status: 'ACTIVE',
    joinedAt: '20/03/2026',
  },
]

export const INITIAL_AUDIT: ShopAuditItem[] = [
  {
    id: 'aud-1',
    action: 'INVITE_STAFF',
    targetType: 'INVITATION',
    detail: 'Mời cskh.hang@fashionhub.vn vào vai trò CSKH',
    createdAt: '15/02/2026 14:20',
  },
  {
    id: 'aud-2',
    action: 'CHANGE_ROLE',
    targetType: 'MEMBER',
    detail: 'Cập nhật quyền kho vận cho kho.tuan@fashionhub.vn',
    createdAt: '20/03/2026 09:10',
  },
]

export const INITIAL_BLOCKS: DecorationBlock[] = [
  { id: 'b-1', type: 'BANNER', title: 'Banner Khuyến Mãi Đầu Mùa', enabled: true },
  { id: 'b-2', type: 'FLASH_SALE', title: 'Đồng Hồ Flash Sale Đếm Ngược', enabled: true },
  { id: 'b-3', type: 'COLLECTION', title: 'Bộ Sưu Tập Mới Nhất 2026', enabled: true },
  { id: 'b-4', type: 'VIDEO', title: 'Video Trải Nghiệm Sản Phẩm', enabled: false },
]

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

export const INITIAL_SHOP_PROFILE: ShopProfileData = {
  shopName: 'FashionHub Boutique Official',
  slug: 'fashionhub-boutique',
  bio: 'Chuyên thời trang Unisex & Streetwear cao cấp. Cam kết 100% chất lượng cotton chuẩn xuất khẩu. Đổi trả miễn phí trong 15 ngày.',
  logoUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150&q=80',
  bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  contactName: 'Nguyễn Văn Chủ Shop',
  phone: '0912345678',
  pickupAddress: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22',
  city: 'TP. Hồ Chí Minh',
  daysToShip: 1,
  businessType: 'INDIVIDUAL',
  taxOrIdNumber: '079095012345',
  isVerified: true,
  bankName: 'Vietcombank',
  bankAccount: '0981000123456',
  bankHolder: 'NGUYEN VAN CHU SHOP',
  workingHours: '08:00 - 22:00 (Thứ 2 - Chủ Nhật)',
  vacationMode: false,
}
