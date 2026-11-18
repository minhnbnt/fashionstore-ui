import { ApiError } from './apiFetch'

import type { PriceInfo, SuccessStatus } from '@/types/product'
import type { ProductResponse } from '@generated/model/productResponse'

const PLACEHOLDER_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750">',
  '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
  '<stop offset="0%" stop-color="#eef2ff"/>',
  '<stop offset="100%" stop-color="#e2e8f0"/>',
  '</linearGradient></defs>',
  '<rect width="600" height="750" fill="url(#bg)"/>',
  '<rect x="36" y="36" width="528" height="678" rx="32" fill="none" stroke="#c7d2fe" stroke-width="2" stroke-dasharray="10 10"/>',
  '<g fill="none" stroke="#64748b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">',
  '<path d="M276 286a24 24 0 1 1 40 18c-9 8-16 14-16 26v12"/>',
  '<path d="M300 342l128 84c14 9 8 30-9 30H181c-17 0-23-21-9-30l128-84z"/>',
  '</g>',
  '<text x="300" y="516" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="24" font-weight="700" letter-spacing="6">DHMQ</text>',
  '</svg>',
].join('')

export const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PLACEHOLDER_SVG)}`

/** URL ảnh từ response; null/undefined/rỗng thì dùng placeholder ảnh mặc định. */
export function urlOrPlaceholder(url: string | null | undefined): string {
  if (url === null || url === undefined || url === '') {
    return PLACEHOLDER_IMAGE
  }
  return url
}

export function priceInfo(product: ProductResponse): PriceInfo {
  const variants = product.variants ?? []
  let minPrice: number | null = null
  let maxCompareAt: number | null = null
  const sizes: string[] = []
  const colors: string[] = []
  let totalStock = 0
  for (const v of variants) {
    if (v.price !== undefined && (minPrice === null || v.price < minPrice)) {
      minPrice = v.price
    }
    if (v.compareAtPrice !== undefined && v.compareAtPrice !== null) {
      if (maxCompareAt === null || v.compareAtPrice > maxCompareAt) {
        maxCompareAt = v.compareAtPrice
      }
    }
    if (v.size !== undefined && sizes.includes(v.size) === false) {
      sizes.push(v.size)
    }
    if (v.color !== undefined && colors.includes(v.color) === false) {
      colors.push(v.color)
    }
    totalStock += v.stockQuantity ?? 0
  }
  return { minPrice, maxCompareAt, sizes, colors, totalStock }
}

export function takeData<U extends { data: unknown; status: number }>(
  response: U,
): Extract<U, { status: SuccessStatus }>['data'] {
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Unexpected response status ${response.status}`)
  }
  return (response as Extract<U, { status: SuccessStatus }>)['data']
}

const ERROR_MESSAGES: Record<string, Record<number, string>> = {
  productDetail: {
    404: 'Sản phẩm không tồn tại hoặc đã gỡ.',
    401: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
  },
  search: {
    400: 'Bộ lọc tìm kiếm chưa hợp lệ.',
  },
  adminStats: {
    403: 'Bạn không có quyền xem số liệu quản trị.',
  },
  adminShops: {
    403: 'Bạn không có quyền xem danh sách shop.',
  },
  adminProducts: {
    400: 'Bộ lọc sản phẩm chưa hợp lệ.',
    403: 'Bạn không có quyền kiểm duyệt sản phẩm.',
  },
  adminProductDetail: {
    403: 'Bạn không có quyền kiểm duyệt sản phẩm.',
    404: 'Sản phẩm không tồn tại.',
  },
  adminProductBan: {
    400: 'Thiếu loại vi phạm hoặc lý do chưa hợp lệ (5–500 ký tự).',
    403: 'Bạn không có quyền gỡ sản phẩm.',
    404: 'Sản phẩm không tồn tại.',
    409: 'Sản phẩm đã bị gỡ hoặc shop đã xóa. Tải lại danh sách để xem trạng thái mới.',
  },
  adminContent: {
    400: 'Dữ liệu chưa hợp lệ: kiểm tra trường bắt buộc, link và giờ kết thúc phải sau giờ bắt đầu.',
    403: 'Bạn không có quyền quản lý nội dung.',
    404: 'Nội dung không còn tồn tại. Tải lại danh sách.',
  },
  adminPageSave: {
    400: 'Dữ liệu chưa hợp lệ: kiểm tra slug (chữ thường không dấu, nối bằng -) và độ dài các trường.',
    403: 'Bạn không có quyền quản lý nội dung.',
    404: 'Trang không còn tồn tại. Tải lại danh sách.',
    409: 'Slug đã có trang khác dùng, hãy đổi slug.',
  },
  adminPageStatus: {
    403: 'Bạn không có quyền quản lý nội dung.',
    404: 'Trang không còn tồn tại. Tải lại danh sách.',
    409: 'Trạng thái trang đã thay đổi. Tải lại để xem mới nhất; trang đang xuất bản phải gỡ trước khi xóa.',
  },
  sitePage: {
    404: 'Trang không tồn tại hoặc chưa xuất bản.',
  },
  faqs: {},
  productReport: {
    400: 'Vui lòng chọn lý do báo cáo (mô tả tối đa 1000 ký tự).',
    404: 'Sản phẩm không còn hiển thị trên sàn.',
    409: 'Bạn đã báo cáo sản phẩm này và đang chờ xử lý, hoặc đây là sản phẩm của shop bạn.',
  },
  adminProductDismiss: {
    403: 'Bạn không có quyền xử lý báo cáo.',
    404: 'Sản phẩm không tồn tại.',
    409: 'Sản phẩm không còn báo cáo nào chờ xử lý.',
  },
  adminKeywords: {
    400: 'Từ khóa cần 2–100 ký tự và phải chọn loại vi phạm.',
    403: 'Bạn không có quyền quản lý từ khóa cấm.',
    404: 'Từ khóa không tồn tại hoặc đã bị xóa.',
    409: 'Từ khóa này đã có trong danh sách.',
  },
  adminProductRestore: {
    403: 'Bạn không có quyền khôi phục sản phẩm.',
    404: 'Sản phẩm không tồn tại.',
    409: 'Sản phẩm không còn ở trạng thái bị gỡ. Tải lại danh sách để xem trạng thái mới.',
  },
  adminOrders: {
    400: 'Bộ lọc đơn hàng chưa hợp lệ.',
    403: 'Bạn không có quyền giám sát đơn hàng.',
  },
  adminOrderDetail: {
    403: 'Bạn không có quyền giám sát đơn hàng.',
    404: 'Đơn hàng không tồn tại.',
  },
  adminOrderCancel: {
    400: 'Thiếu lý do hoặc ghi chú chưa hợp lệ (5–500 ký tự).',
    403: 'Bạn không có quyền hủy đơn hàng.',
    404: 'Đơn hàng không tồn tại.',
    409: 'Đơn đã bàn giao vận chuyển, đã giao hoặc đã hủy. Tải lại danh sách để xem trạng thái mới.',
  },
  orderDetail: {
    404: 'Đơn hàng không tồn tại hoặc không phải của bạn.',
  },
  orderCancel: {
    404: 'Đơn hàng không tồn tại hoặc không phải của bạn.',
    409: 'Đơn đã được shop xác nhận nên không hủy được nữa. Tải lại để xem trạng thái mới.',
  },
  adminHolidays: {
    400: 'Năm không hợp lệ.',
    403: 'Bạn không có quyền quản lý lịch nghỉ lễ.',
  },
  adminHolidaySave: {
    400: 'Thiếu ngày, tên hoặc loại ngày nghỉ.',
    403: 'Bạn không có quyền quản lý lịch nghỉ lễ.',
    404: 'Ngày này chưa có trong lịch.',
  },
  adminHolidaySync: {
    403: 'Bạn không có quyền đồng bộ lịch nghỉ lễ.',
    502: 'Calendarific đang lỗi hoặc đã hết lượt gọi trong tháng. Thử lại sau.',
    503: 'Server chưa cấu hình CALENDARIFIC_API_KEY.',
  },
  review: {
    400: 'Nội dung đánh giá chưa hợp lệ (nhận xét tối thiểu 10 ký tự, tối đa 5 ảnh và 1 video ≤ 30 giây).',
    403: 'Chỉ đơn hàng đã giao và xác nhận nhận hàng mới được đánh giá.',
    404: 'Không tìm thấy đơn hàng hoặc sản phẩm để đánh giá.',
    409: 'Bạn đã đánh giá sản phẩm này cho đơn hàng này, hoặc đánh giá đã hết lượt chỉnh sửa.',
  },
  reviewHelpful: {
    404: 'Đánh giá hoặc sản phẩm không còn hiển thị.',
    409: 'Bạn không thể tự nhấn hữu ích cho đánh giá của chính mình.',
  },
  sellerReviewList: {
    400: 'Bộ lọc đánh giá chưa hợp lệ.',
    403: 'Bạn không có quyền xem đánh giá của shop.',
  },
  sellerReviewReply: {
    400: 'Nội dung phản hồi chưa hợp lệ (tối đa 2000 ký tự).',
    403: 'Bạn không có quyền phản hồi đánh giá này.',
    404: 'Không tìm thấy đánh giá để phản hồi.',
    409: 'Đánh giá này đã được phản hồi trước đó.',
  },
  sellerReplyTemplate: {
    400: 'Tiêu đề hoặc nội dung mẫu phản hồi chưa hợp lệ.',
    403: 'Bạn không có quyền quản lý mẫu phản hồi nhanh.',
    404: 'Mẫu phản hồi nhanh không còn tồn tại.',
    409: 'Tiêu đề mẫu đã tồn tại hoặc shop đã đạt tối đa 50 mẫu.',
  },
  sellerReviewTrend: {
    400: 'Khoảng thời gian thống kê chưa hợp lệ.',
    403: 'Bạn không có quyền xem thống kê đánh giá.',
  },
}

export function apiErrorMessage(endpoint: string, status: number): string {
  if (status === 401) {
    return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
  }
  const byEndpoint = ERROR_MESSAGES[endpoint]
  const message = byEndpoint?.[status]
  if (message !== undefined) {
    return message
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
}

export function hookErrorMessage(endpoint: string, error: unknown): string {
  if (error instanceof ApiError) {
    return apiErrorMessage(endpoint, error.status)
  }
  return apiErrorMessage(endpoint, 0)
}

/** Message lỗi thân thiện từ BE (apiFetch đã map detail/message vào ApiError.message), lỗi lạ thì fallback */
export function apiErrorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.message.trim() !== '') {
    return err.message
  }
  return fallback
}

/** Fallback ảnh mặc định khi URL ảnh sản phẩm / bằng chứng bị lỗi tải */
export function fallbackImageOnError(event: { currentTarget: HTMLImageElement }): void {
  if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
    event.currentTarget.src = PLACEHOLDER_IMAGE
  }
}
