import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { ApiError } from '@/lib/api/apiFetch'

const toastMocks = vi.hoisted(function () {
  return {
    success: vi.fn().mockReturnValue('toast-success-1'),
    error: vi.fn().mockReturnValue('toast-error-1'),
    warning: vi.fn().mockReturnValue('toast-warning-1'),
    info: vi.fn().mockReturnValue('toast-info-1'),
    loading: vi.fn().mockReturnValue('toast-loading-1'),
    promise: vi.fn(),
    dismiss: vi.fn(),
  }
})

vi.mock('sonner', function () {
  return {
    toast: toastMocks,
  }
})

import { TOAST_DURATIONS, classifyError, notify, safeErrorMessage } from './index'

describe('notify facade', () => {
  beforeEach(function () {
    vi.clearAllMocks()
  })

  it('gọi toast.success với thời lượng 3000ms và description/action/id', function () {
    const onClick = vi.fn()
    const id = notify.success('Đã thêm vào giỏ hàng', 'Áo sơ mi trắng (M)', {
      id: 'cart-add',
      action: { label: 'Xem giỏ', onClick },
    })

    expect(id).toBe('toast-success-1')
    expect(toastMocks.success).toHaveBeenCalledWith('Đã thêm vào giỏ hàng', {
      duration: TOAST_DURATIONS.success,
      description: 'Áo sơ mi trắng (M)',
      id: 'cart-add',
      action: { label: 'Xem giỏ', onClick },
    })
    expect(TOAST_DURATIONS.success).toBe(3000)
  })

  it('gọi toast.info với thời lượng 3500ms', function () {
    const id = notify.info('Cập nhật mới', 'Đơn hàng đã được xác nhận')

    expect(id).toBe('toast-info-1')
    expect(toastMocks.info).toHaveBeenCalledWith('Cập nhật mới', {
      duration: 3500,
      description: 'Đơn hàng đã được xác nhận',
    })
  })

  it('gọi toast.warning với thời lượng 4500ms', function () {
    const id = notify.warning('Sắp hết hàng', undefined, { id: 'stock-warn' })

    expect(id).toBe('toast-warning-1')
    expect(toastMocks.warning).toHaveBeenCalledWith('Sắp hết hàng', {
      duration: 4500,
      id: 'stock-warn',
    })
  })

  it('gọi toast.error với thời lượng 5000ms và cho phép ghi đè duration', function () {
    const id = notify.error('Thanh toán thất bại', 'Thử lại sau ít phút', { duration: 7000 })

    expect(id).toBe('toast-error-1')
    expect(toastMocks.error).toHaveBeenCalledWith('Thanh toán thất bại', {
      duration: 7000,
      description: 'Thử lại sau ít phút',
    })
  })

  it('gọi toast.loading với thời lượng Infinity', function () {
    const id = notify.loading('Đang xử lý đơn hàng...', undefined, { id: 'checkout-op' })

    expect(id).toBe('toast-loading-1')
    expect(toastMocks.loading).toHaveBeenCalledWith('Đang xử lý đơn hàng...', {
      duration: Infinity,
      id: 'checkout-op',
    })
  })

  it('hỗ trợ dedupe id cho cùng một thao tác', function () {
    notify.loading('Đang lưu...', undefined, { id: 'save-profile' })
    notify.success('Đã lưu hồ sơ', undefined, { id: 'save-profile' })

    expect(toastMocks.loading).toHaveBeenCalledWith('Đang lưu...', {
      duration: Infinity,
      id: 'save-profile',
    })
    expect(toastMocks.success).toHaveBeenCalledWith('Đã lưu hồ sơ', {
      duration: 3000,
      id: 'save-profile',
    })
  })

  it('gọi toast.dismiss với id cụ thể hoặc không truyền id', function () {
    notify.dismiss('toast-1')
    notify.dismiss()

    expect(toastMocks.dismiss).toHaveBeenNthCalledWith(1, 'toast-1')
    expect(toastMocks.dismiss).toHaveBeenNthCalledWith(2, undefined)
  })

  it('notify.promise dùng toast.promise chuyển trạng thái tại chỗ và trả về giá trị resolve', async function () {
    const targetPromise = Promise.resolve({ orderId: 'DH-100' })
    toastMocks.promise.mockReturnValue({
      unwrap: function () {
        return targetPromise
      },
    })

    const result = await notify.promise(
      targetPromise,
      {
        loading: 'Đang đặt hàng...',
        success: function (data) {
          return `Đã tạo đơn ${data.orderId}`
        },
        error: 'Không thể tạo đơn',
      },
      { id: 'order-create' },
    )

    expect(result).toEqual({ orderId: 'DH-100' })
    expect(toastMocks.promise).toHaveBeenCalledTimes(1)

    const [passedPromise, config] = toastMocks.promise.mock.calls[0] as [
      Promise<{ orderId: string }>,
      {
        id?: string | number
        duration?: number
        loading: string
        success: (data: { orderId: string }) => { message: string; duration: number }
        error: (err: unknown) => { message: string; duration: number }
      },
    ]
    expect(passedPromise).toBe(targetPromise)
    expect(config.id).toBe('order-create')
    expect(config.duration).toBe(Infinity)
    expect(config.loading).toBe('Đang đặt hàng...')
    expect(config.success({ orderId: 'DH-100' })).toEqual({
      message: 'Đã tạo đơn DH-100',
      duration: 3000,
    })
    expect(config.error(new Error('fail'))).toEqual({
      message: 'Không thể tạo đơn',
      duration: 5000,
    })
  })

  it('notify.promise chấp nhận factory function và truyền tiếp lỗi reject', async function () {
    const boom = new ApiError(409, 'Sản phẩm đã hết hàng')
    toastMocks.promise.mockImplementation(function (p: Promise<unknown>) {
      return {
        unwrap: function () {
          return p
        },
      }
    })

    await expect(
      notify.promise(
        function () {
          return Promise.reject(boom)
        },
        {
          loading: 'Đang cập nhật...',
          success: 'Thành công',
          error: function (err) {
            return safeErrorMessage(err)
          },
        },
      ),
    ).rejects.toBe(boom)

    const [, config] = toastMocks.promise.mock.calls[0] as [
      Promise<unknown>,
      {
        error: (err: unknown) => { message: string; duration: number }
      },
    ]
    expect(config.error(boom)).toEqual({
      message: 'Sản phẩm đã hết hàng',
      duration: 5000,
    })
  })

  it('fromError hiển thị toast lỗi đã lọc an toàn', function () {
    const id = notify.fromError(
      new ApiError(500, 'PSQLException: syntax error at or near SELECT * FROM users'),
      undefined,
      'Không thể tải danh sách',
      { id: 'load-list-err' },
    )

    expect(id).toBe('toast-error-1')
    expect(toastMocks.error).toHaveBeenCalledWith('Không thể tải danh sách', {
      duration: 5000,
      id: 'load-list-err',
    })
  })
})

describe('classifyError', () => {
  it('phân loại chính xác các nhóm lỗi HTTP, mạng và không xác định', function () {
    expect(classifyError(new ApiError(400, 'Bad request'))).toBe('validation')
    expect(classifyError(new ApiError(422, 'Unprocessable'))).toBe('validation')
    expect(classifyError(new ApiError(401, 'Unauthorized'))).toBe('auth')
    expect(classifyError(new ApiError(403, 'Forbidden'))).toBe('permission')
    expect(classifyError(new ApiError(404, 'Not found'))).toBe('business')
    expect(classifyError(new ApiError(409, 'Conflict'))).toBe('business')
    expect(classifyError(new ApiError(500, 'Server error'))).toBe('server')
    expect(classifyError(new ApiError(503, 'Unavailable'))).toBe('server')
    expect(classifyError(new TypeError('Failed to fetch'))).toBe('network')
    expect(classifyError(new Error('NetworkError when attempting to fetch resource'))).toBe(
      'network',
    )
    expect(classifyError('something weird')).toBe('unknown')
  })
})

describe('safeErrorMessage', () => {
  it('map lỗi mạng TypeError sang thông điệp thân thiện', function () {
    expect(safeErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
    )
  })

  it('map 401 và 403 sang thông điệp bảo mật rõ ràng', function () {
    expect(safeErrorMessage(new ApiError(401, 'JWT expired'))).toBe(
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    )
    expect(safeErrorMessage(new ApiError(403, 'Access Denied'))).toBe(
      'Bạn không có quyền thực hiện thao tác này.',
    )
    expect(safeErrorMessage(new ApiError(403, 'Access Denied'), 'adminShops')).toBe(
      'Bạn không có quyền xem danh sách shop.',
    )
  })

  it('ẩn hoàn toàn lỗi 5xx nội bộ, SQL và stack trace', function () {
    expect(
      safeErrorMessage(
        new ApiError(500, 'org.springframework.dao.DataIntegrityViolationException: duplicate key'),
      ),
    ).toBe('Hệ thống đang gặp sự cố. Vui lòng thử lại sau.')

    expect(
      safeErrorMessage(
        new ApiError(
          400,
          'ERROR: syntax error at or near "SELECT * FROM orders" violates foreign key constraint',
        ),
      ),
    ).toBe('Đã xảy ra lỗi. Vui lòng thử lại sau.')

    expect(
      safeErrorMessage(
        new Error(
          'NullPointerException\n    at com.dhmq.OrderService.create(OrderService.java:42)',
        ),
      ),
    ).toBe('Đã xảy ra lỗi. Vui lòng thử lại sau.')

    expect(safeErrorMessage(new ApiError(400, 'Request failed with status 400'))).toBe(
      'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    )
  })

  it('giữ thông điệp nghiệp vụ thân thiện từ BE hoặc map theo endpoint', function () {
    expect(safeErrorMessage(new ApiError(409, 'Mã giảm giá đã hết lượt sử dụng.'))).toBe(
      'Mã giảm giá đã hết lượt sử dụng.',
    )
    expect(safeErrorMessage(new ApiError(404, 'Not found'), 'productDetail')).toBe(
      'Sản phẩm không tồn tại hoặc đã gỡ.',
    )
  })
})
