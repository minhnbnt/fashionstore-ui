// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { ApiError } from '@/lib/api/apiFetch'

import SellerReviewsTab from './SellerReviewsTab'

const {
  canMock,
  useList3Mock,
  useProductsMock,
  useTrendMock,
  useListTemplatesMock,
  replyMutateMock,
  createTemplateMutateMock,
  updateTemplateMutateMock,
  deleteTemplateMutateMock,
  reportMutateMock,
} = vi.hoisted(() => ({
  canMock: vi.fn<(permission: string) => boolean>(() => true),
  useList3Mock: vi.fn(),
  useProductsMock: vi.fn(),
  useTrendMock: vi.fn(),
  useListTemplatesMock: vi.fn(),
  replyMutateMock: vi.fn(),
  createTemplateMutateMock: vi.fn(),
  updateTemplateMutateMock: vi.fn(),
  deleteTemplateMutateMock: vi.fn(),
  reportMutateMock: vi.fn(),
}))

let latestReplyOptions: { onSuccess?: () => void; onError?: (err: unknown) => void } | undefined
let latestCreateTemplateOptions:
  | { onSuccess?: () => void; onError?: (err: unknown) => void }
  | undefined

vi.mock('@/lib/seller/sellerPermissions', () => ({
  useSellerPermissions: () => ({ can: (perm: string) => canMock(perm) }),
}))

vi.mock('@generated/endpoints/seller-reviews/seller-reviews', () => ({
  getList3QueryKey: () => ['/api/seller/reviews'],
  getSummaryQueryKey: () => ['/api/seller/reviews/summary'],
  getListTemplatesQueryKey: () => ['/api/seller/reviews/templates'],
  useList3: (params: unknown, options: unknown) => useList3Mock(params, options),
  useProducts: (params: unknown) => useProductsMock(params),
  useTrend: (params: unknown, options: unknown) => useTrendMock(params, options),
  useListTemplates: (params: unknown) => useListTemplatesMock(params),
  useSummary: () => ({
    data: {
      status: 200,
      data: {
        reviewCount: 12,
        averageRating: 4.36,
        fiveStarCount: 6,
        fourStarCount: 3,
        threeStarCount: 2,
        twoStarCount: 1,
        oneStarCount: 0,
        withMediaCount: 5,
      },
    },
  }),
  useReply: (hookOpts?: {
    mutation?: { onSuccess?: () => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: () => void; onError?: (err: unknown) => void },
    ) => {
      latestReplyOptions = {
        onSuccess: function () {
          hookOpts?.mutation?.onSuccess?.()
          callOpts?.onSuccess?.()
        },
        onError: function (err: unknown) {
          hookOpts?.mutation?.onError?.(err)
          callOpts?.onError?.(err)
        },
      }
      replyMutateMock(vars)
    },
  }),
  useCreateTemplate: (hookOpts?: {
    mutation?: { onSuccess?: () => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (vars: unknown) => {
      latestCreateTemplateOptions = hookOpts?.mutation
      createTemplateMutateMock(vars)
    },
  }),
  useUpdateTemplate: () => ({
    isPending: false,
    mutate: (vars: unknown) => updateTemplateMutateMock(vars),
  }),
  useDeleteTemplate: () => ({
    isPending: false,
    mutate: (vars: unknown) => deleteTemplateMutateMock(vars),
  }),
  useReport: () => ({
    isPending: false,
    mutate: (vars: unknown) => reportMutateMock(vars),
  }),
}))

const baseReview = {
  productId: 'p1',
  productName: 'Áo Thun Oversize',
  buyerDisplayName: 'K***g',
  variantLabel: 'L · Trắng',
  stars: 5,
  comment: 'Áo mặc cực kỳ thoải mái và mát.',
  imageKeys: ['reviews/khang-1.jpg'],
  tags: ['Chất lượng tốt', 'Size đúng chuẩn'],
  anonymous: true,
  helpfulCount: 4,
  sellerReply: null,
  isReported: false,
  createdAt: '2026-10-20T10:00:00Z',
}

function setupDefaultMocks() {
  canMock.mockImplementation(() => true)
  latestReplyOptions = undefined
  latestCreateTemplateOptions = undefined

  useList3Mock.mockReturnValue({
    isLoading: false,
    data: {
      status: 200,
      data: [
        {
          id: 'rev-1',
          productId: 'p1',
          productName: 'Áo Thun Oversize',
          buyerDisplayName: 'K***g',
          variantLabel: 'L · Trắng',
          stars: 5,
          comment: 'Áo mặc cực kỳ thoải mái và mát.',
          imageKeys: ['reviews/khang-1.jpg'],
          tags: ['Chất lượng tốt', 'Size đúng chuẩn'],
          anonymous: true,
          helpfulCount: 4,
          sellerReply: null,
          isReported: false,
          createdAt: '2026-10-20T10:00:00Z',
        },
      ],
    },
  })

  useProductsMock.mockReturnValue({
    data: {
      status: 200,
      data: [
        { id: 'p1', name: 'Áo Thun Oversize', reviewCount: 8 },
        { id: 'p2', name: 'Quần Jeans Đứng', reviewCount: 4 },
      ],
    },
  })

  useTrendMock.mockReturnValue({
    isLoading: false,
    isError: false,
    data: {
      status: 200,
      data: {
        period: 'day',
        points: [
          { label: '2026-10-20', reviewCount: 4, averageRating: 4.5 },
          { label: '2026-10-21', reviewCount: 8, averageRating: 4.25 },
        ],
      },
    },
  })

  useListTemplatesMock.mockReturnValue({
    data: {
      status: 200,
      data: [
        {
          id: 'tpl-1',
          shopId: 'shop-1',
          title: 'Cảm ơn 5 sao',
          content: 'Cảm ơn bạn đã ủng hộ shop!',
          updatedAt: '2026-10-20T10:00:00Z',
        },
        {
          id: 'tpl-2',
          shopId: 'shop-1',
          title: 'Hỗ trợ đổi size',
          content: 'Bạn nhắn shop để được đổi size nhé.',
          updatedAt: '2026-10-20T09:00:00Z',
        },
      ],
    },
  })
}

function renderTab() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <SellerReviewsTab shopId="shop-1" />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SellerReviewsTab', () => {
  it('hiển thị thống kê thật, productName độc lập CSKH và chi tiết đánh giá của khách', () => {
    setupDefaultMocks()
    useProductsMock.mockReturnValue({
      data: { status: 200, data: [] },
    })

    renderTab()

    expect(screen.getByText('4.4')).toBeTruthy()
    expect(screen.getByText('Dựa trên 12 lượt đánh giá')).toBeTruthy()
    // Tên sản phẩm hiển thị trên group header (luôn thấy)
    expect(screen.getByText('Áo Thun Oversize')).toBeTruthy()

    // Expand group để thấy chi tiết review
    fireEvent.click(screen.getByRole('button', { name: /Áo Thun Oversize/i }))

    expect(screen.getByText('Phân loại: L · Trắng')).toBeTruthy()
    expect(screen.getByText('Ẩn danh')).toBeTruthy()
    expect(screen.getByText('Chất lượng tốt')).toBeTruthy()
    expect(screen.getByText('Size đúng chuẩn')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Trả lời đánh giá này' })).toBeTruthy()
  })

  it('gửi bộ lọc sao, sản phẩm và chưa phản hồi lên API', () => {
    setupDefaultMocks()
    renderTab()

    fireEvent.click(screen.getByRole('button', { name: 'Chưa phản hồi' }))
    expect(useList3Mock).toHaveBeenLastCalledWith(
      { shopId: 'shop-1', unreplied: true },
      expect.anything(),
    )

    fireEvent.click(screen.getByRole('button', { name: '5 sao' }))
    expect(useList3Mock).toHaveBeenLastCalledWith(
      { shopId: 'shop-1', unreplied: true, stars: 5 },
      expect.anything(),
    )

    fireEvent.change(screen.getByLabelText('Lọc theo sản phẩm'), {
      target: { value: 'p2' },
    })
    expect(useList3Mock).toHaveBeenLastCalledWith(
      { shopId: 'shop-1', unreplied: true, stars: 5, productId: 'p2' },
      expect.anything(),
    )
  })

  it('chèn mẫu khi ô trống hoặc nối xuống dòng khi đã có text và chỉ toast sau khi phản hồi thành công', () => {
    setupDefaultMocks()
    renderTab()

    // Expand group trước (accordion collapsed by default)
    fireEvent.click(screen.getByRole('button', { name: /Áo Thun Oversize/i }))

    fireEvent.click(screen.getByRole('button', { name: 'Trả lời đánh giá này' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cảm ơn 5 sao' }))
    const textarea = screen.getByPlaceholderText(
      'Nhập nội dung phản hồi công khai dưới đánh giá...',
    ) as HTMLTextAreaElement
    expect(textarea.value).toBe('Cảm ơn bạn đã ủng hộ shop!')

    fireEvent.click(screen.getByRole('button', { name: 'Hỗ trợ đổi size' }))
    expect(textarea.value).toBe('Cảm ơn bạn đã ủng hộ shop!\nBạn nhắn shop để được đổi size nhé.')

    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }))
    expect(replyMutateMock).toHaveBeenCalledWith({
      id: 'rev-1',
      data: { reply: 'Cảm ơn bạn đã ủng hộ shop!\nBạn nhắn shop để được đổi size nhé.' },
    })
    expect(screen.queryByText('Đã gửi phản hồi đánh giá của khách hàng!')).toBeNull()

    act(() => {
      latestReplyOptions?.onError?.(new ApiError(403, 'Forbidden'))
    })
    expect(screen.getByText('Bạn không có quyền phản hồi đánh giá này.')).toBeTruthy()
    expect(screen.queryByText('Đã gửi phản hồi đánh giá của khách hàng!')).toBeNull()

    act(() => {
      latestReplyOptions?.onSuccess?.()
    })
    expect(screen.getByText('Đã gửi phản hồi đánh giá của khách hàng!')).toBeTruthy()
  })

  it('quản lý mẫu phản hồi nhanh trong modal và ẩn chỉnh sửa khi chỉ có quyền đọc', () => {
    setupDefaultMocks()
    const view = renderTab()

    fireEvent.click(screen.getByRole('button', { name: /Quản lý mẫu/i }))
    fireEvent.change(screen.getByLabelText('Tiêu đề mẫu'), {
      target: { value: 'Cảm ơn 5 sao' },
    })
    fireEvent.change(screen.getByLabelText('Nội dung phản hồi'), {
      target: { value: 'Nội dung trùng tiêu đề' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mẫu' }))

    expect(createTemplateMutateMock).toHaveBeenCalledWith({
      params: { shopId: 'shop-1' },
      data: { title: 'Cảm ơn 5 sao', content: 'Nội dung trùng tiêu đề' },
    })
    act(() => {
      latestCreateTemplateOptions?.onError?.(new ApiError(409, 'Conflict'))
    })
    expect(screen.getByText('Tiêu đề mẫu đã tồn tại hoặc shop đã đạt tối đa 50 mẫu.')).toBeTruthy()

    view.unmount()
    canMock.mockImplementation((perm) => perm === 'REVIEW_READ')
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: /Quản lý mẫu/i }))
    expect(screen.queryByRole('button', { name: 'Thêm mẫu' })).toBeNull()
  })

  it('chuyển chu kỳ/chỉ số xu hướng đánh giá và chặn khoảng ngày from lớn hơn to', () => {
    setupDefaultMocks()
    renderTab()

    expect(screen.getByText('5★')).toBeTruthy()
    expect(screen.queryByText(/₫/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Theo tuần' }))
    expect(useTrendMock).toHaveBeenLastCalledWith(
      { shopId: 'shop-1', period: 'week' },
      { query: { enabled: true } },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Số đánh giá' }))
    expect(screen.getByText('Số lượt đánh giá')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Từ ngày'), {
      target: { value: '2026-10-25' },
    })
    fireEvent.change(screen.getByLabelText('Đến ngày'), {
      target: { value: '2026-10-20' },
    })
    expect(screen.getByText('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.')).toBeTruthy()
    expect(useTrendMock).toHaveBeenLastCalledWith(
      { shopId: 'shop-1', period: 'week', from: '2026-10-25', to: '2026-10-20' },
      { query: { enabled: false } },
    )
  })
})

describe('grouped-by-product view', () => {
  it('hiển thị header nhóm sản phẩm với tên sản phẩm và số lượng đánh giá', () => {
    setupDefaultMocks()
    useList3Mock.mockReturnValue({
      isLoading: false,
      data: {
        status: 200,
        data: [
          { ...baseReview, id: 'r1', productId: 'p1', productName: 'Áo Thun Oversize' },
          { ...baseReview, id: 'r2', productId: 'p1', productName: 'Áo Thun Oversize' },
          { ...baseReview, id: 'r3', productId: 'p2', productName: 'Quần Jeans' },
        ],
      },
    })
    renderTab()
    expect(screen.getAllByText('Áo Thun Oversize').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('2 đánh giá')).toBeTruthy()
    expect(screen.getByText('Quần Jeans')).toBeTruthy()
    expect(screen.getByText('1 đánh giá')).toBeTruthy()
  })

  it('accordion toggle: mặc định collapsed, click header expand, click lại collapse', () => {
    setupDefaultMocks()
    useList3Mock.mockReturnValue({
      isLoading: false,
      data: {
        status: 200,
        data: [{ ...baseReview, id: 'r1', productId: 'p1', productName: 'Áo Thun Oversize' }],
      },
    })
    renderTab()
    // Mặc định collapsed — comment không thấy
    expect(screen.queryByText('Áo mặc cực kỳ thoải mái và mát.')).toBeNull()
    // Click header để expand
    fireEvent.click(screen.getByRole('button', { name: /Áo Thun Oversize/i }))
    expect(screen.getByText('Áo mặc cực kỳ thoải mái và mát.')).toBeTruthy()
    // Click lại để collapse
    fireEvent.click(screen.getByRole('button', { name: /Áo Thun Oversize/i }))
    expect(screen.queryByText('Áo mặc cực kỳ thoải mái và mát.')).toBeNull()
  })

  it('mở nhiều nhóm độc lập nhau', () => {
    setupDefaultMocks()
    useList3Mock.mockReturnValue({
      isLoading: false,
      data: {
        status: 200,
        data: [
          { ...baseReview, id: 'r1', productId: 'p1', productName: 'Áo Thun', comment: 'cmt-p1' },
          {
            ...baseReview,
            id: 'r2',
            productId: 'p2',
            productName: 'Quần Jeans',
            comment: 'cmt-p2',
          },
        ],
      },
    })
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: /Áo Thun/i }))
    fireEvent.click(screen.getByRole('button', { name: /Quần Jeans/i }))
    expect(screen.getByText('cmt-p1')).toBeTruthy()
    expect(screen.getByText('cmt-p2')).toBeTruthy()
  })
})
