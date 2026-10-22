import { ApiError } from './apiFetch'

import type { PriceInfo, SuccessStatus } from '@/types/product'
import type { ProductResponse } from '@generated/model/productResponse'

export const PLACEHOLDER_IMAGE = 'https://picsum.photos/seed/net-noimage/600/750'

export function imageUrl(s3Key: string | null | undefined): string {
  if (s3Key === null || s3Key === undefined || s3Key === '') {
    // backend chưa có ảnh thì dùng placeholder; có ảnh đầy đủ thì bỏ nhánh này
    return PLACEHOLDER_IMAGE
  }
  const base = import.meta.env.VITE_ASSETS_URL as string | undefined
  if (base === undefined || base === '') {
    throw new Error('Thiếu VITE_ASSETS_URL trong .env')
  }
  return `${base}/${s3Key}`
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
