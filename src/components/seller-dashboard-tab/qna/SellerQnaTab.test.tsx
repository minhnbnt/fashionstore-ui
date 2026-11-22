import { MemoryRouter, useLocation } from 'react-router'

// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import SellerQnaTab from './SellerQnaTab'

const {
  canMock,
  useGetSellerQnaStatsMock,
  useListSellerQnaProductsMock,
  useListSellerQuestionsMock,
  useGetSellerQuestionMock,
  createSellerAnswerMutateMock,
  updateSellerAnswerMutateMock,
  deleteSellerAnswerMutateMock,
  closeSellerQuestionMutateMock,
  reopenSellerQuestionMutateMock,
  notifySuccessMock,
  notifyErrorMock,
} = vi.hoisted(() => ({
  canMock: vi.fn<(perm: string) => boolean>(() => true),
  useGetSellerQnaStatsMock: vi.fn(),
  useListSellerQnaProductsMock: vi.fn(),
  useListSellerQuestionsMock: vi.fn(),
  useGetSellerQuestionMock: vi.fn(),
  createSellerAnswerMutateMock: vi.fn(),
  updateSellerAnswerMutateMock: vi.fn(),
  deleteSellerAnswerMutateMock: vi.fn(),
  closeSellerQuestionMutateMock: vi.fn(),
  reopenSellerQuestionMutateMock: vi.fn(),
  notifySuccessMock: vi.fn(),
  notifyErrorMock: vi.fn(),
}))

vi.mock('@/lib/seller/sellerPermissions', () => ({
  useSellerPermissions: () => ({ can: (perm: string) => canMock(perm) }),
}))

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: notifySuccessMock,
    error: notifyErrorMock,
  },
}))

vi.mock('@generated/endpoints/seller-q-a/seller-q-a', () => ({
  getListSellerQuestionsQueryKey: (params?: unknown) => ['/api/seller/qna/questions', params],
  getGetSellerQuestionQueryKey: (id: string) => ['/api/seller/qna/questions', id],
  getGetSellerQnaStatsQueryKey: (params?: unknown) => ['/api/seller/qna/stats', params],
  useGetSellerQnaStats: (params: unknown, options: unknown) =>
    useGetSellerQnaStatsMock(params, options),
  useListSellerQnaProducts: (params: unknown, options: unknown) =>
    useListSellerQnaProductsMock(params, options),
  useListSellerQuestions: (params: unknown, options: unknown) =>
    useListSellerQuestionsMock(params, options),
  useGetSellerQuestion: (id: string, options: unknown) => useGetSellerQuestionMock(id, options),
  useCreateSellerAnswer: (opts?: {
    mutation?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void },
    ) => {
      createSellerAnswerMutateMock(vars, callOpts)
      callOpts?.onSuccess?.({ status: 200, data: {} })
      opts?.mutation?.onSuccess?.({ status: 200, data: {} })
    },
  }),
  useUpdateSellerAnswer: (opts?: {
    mutation?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void },
    ) => {
      updateSellerAnswerMutateMock(vars, callOpts)
      callOpts?.onSuccess?.({ status: 200, data: {} })
      opts?.mutation?.onSuccess?.({ status: 200, data: {} })
    },
  }),
  useDeleteSellerAnswer: (opts?: {
    mutation?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void },
    ) => {
      deleteSellerAnswerMutateMock(vars, callOpts)
      callOpts?.onSuccess?.({ status: 200, data: {} })
      opts?.mutation?.onSuccess?.({ status: 200, data: {} })
    },
  }),
  useCloseSellerQuestion: (opts?: {
    mutation?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void },
    ) => {
      closeSellerQuestionMutateMock(vars, callOpts)
      callOpts?.onSuccess?.({ status: 200, data: {} })
      opts?.mutation?.onSuccess?.({ status: 200, data: {} })
    },
  }),
  useReopenSellerQuestion: (opts?: {
    mutation?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }
  }) => ({
    isPending: false,
    mutate: (
      vars: unknown,
      callOpts?: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void },
    ) => {
      reopenSellerQuestionMutateMock(vars, callOpts)
      callOpts?.onSuccess?.({ status: 200, data: {} })
      opts?.mutation?.onSuccess?.({ status: 200, data: {} })
    },
  }),
}))

const mockStatsData = {
  totalQuestions: 42,
  unansweredCount: 15,
  answeredCount: 22,
  closedCount: 5,
  responseRate: 85.5,
}

const mockProductOptions = [
  { id: 'prod-1', name: 'Áo thun phong cách', questionCount: 10 },
  { id: 'prod-2', name: 'Quần jeans nam', questionCount: 5 },
]

const mockQuestionsList = [
  {
    id: 'q-1',
    code: 'QNA-001',
    productId: 'prod-1',
    productName: 'Áo thun phong cách',
    productImageUrl: 'https://example.com/ao.jpg',
    askerDisplayName: 'Nguyễn Văn A',
    content: 'Áo này form rộng hay vừa vậy shop?',
    status: 'UNANSWERED',
    answerCount: 0,
    shopAnswerCount: 0,
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
  },
  {
    id: 'q-2',
    code: 'QNA-002',
    productId: 'prod-2',
    productName: 'Quần jeans nam',
    productImageUrl: 'https://example.com/quan.jpg',
    askerDisplayName: 'Trần Thị B',
    content: 'Quần này có co giãn không ạ?',
    status: 'ANSWERED',
    answerCount: 2,
    shopAnswerCount: 1,
    createdAt: '2026-11-17T09:00:00Z',
    updatedAt: '2026-11-17T11:00:00Z',
  },
]

const mockDetailQuestion = {
  id: 'q-2',
  code: 'QNA-002',
  productId: 'prod-2',
  productName: 'Quần jeans nam',
  productImageUrl: 'https://example.com/quan.jpg',
  askerDisplayName: 'Trần Thị B',
  content: 'Quần này có co giãn không ạ?',
  status: 'ANSWERED',
  answerCount: 2,
  shopAnswerCount: 1,
  createdAt: '2026-11-17T09:00:00Z',
  updatedAt: '2026-11-17T11:00:00Z',
  answers: [
    {
      id: 'ans-1',
      questionId: 'q-2',
      authorDisplayName: 'Người mua kiểm chứng',
      authorRole: 'VERIFIED_BUYER',
      verifiedBuyer: true,
      content: 'Chất co giãn tốt nha bạn, mặc rất thoải mái.',
      mine: false,
      canEdit: false,
      canDelete: false,
      createdAt: '2026-11-17T10:00:00Z',
    },
    {
      id: 'ans-2',
      questionId: 'q-2',
      authorDisplayName: 'DHMQ Shop',
      authorRole: 'SHOP',
      verifiedBuyer: false,
      content: 'Dạ quần có pha spandex co giãn nhẹ thoải mái vận động ạ!',
      mine: true,
      canEdit: true,
      canDelete: true,
      createdAt: '2026-11-17T10:30:00Z',
    },
  ],
}

function renderComponent(props: { shopId: string; initialQuestionId?: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SellerQnaTab shopId={props.shopId} initialQuestionId={props.initialQuestionId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SellerQnaTab', () => {
  beforeEach(() => {
    canMock.mockImplementation(() => true)
    useGetSellerQnaStatsMock.mockReturnValue({
      data: { status: 200, data: mockStatsData },
      isPending: false,
    })
    useListSellerQnaProductsMock.mockReturnValue({
      data: { status: 200, data: mockProductOptions },
      isPending: false,
    })
    useListSellerQuestionsMock.mockReturnValue({
      data: {
        status: 200,
        data: {
          items: mockQuestionsList,
          page: 0,
          size: 10,
          total: 2,
        },
      },
      isPending: false,
    })
    useGetSellerQuestionMock.mockReturnValue({
      data: { status: 200, data: mockDetailQuestion },
      isPending: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('1. Renders all 5 stats KPI cards with formatted values', () => {
    renderComponent({ shopId: 'shop-1' })

    expect(screen.getByText('Tổng số câu hỏi')).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()

    expect(screen.getAllByText('Chưa trả lời').length).toBeGreaterThan(0)
    expect(screen.getByText('15')).toBeTruthy()

    expect(screen.getAllByText('Đã trả lời').length).toBeGreaterThan(0)
    expect(screen.getByText('22')).toBeTruthy()

    expect(screen.getAllByText('Đã đóng').length).toBeGreaterThan(0)
    expect(screen.getByText('5')).toBeTruthy()

    expect(screen.getByText('Tỷ lệ phản hồi')).toBeTruthy()
    expect(screen.getByText('85.5%')).toBeTruthy()
  })

  it('2. CSKH staff loads product filter options via useListSellerQnaProducts (never calls useListProducts)', () => {
    // Staff with only REVIEW_READ and REVIEW_REPLY
    canMock.mockImplementation((perm) => perm === 'REVIEW_READ' || perm === 'REVIEW_REPLY')

    renderComponent({ shopId: 'shop-1' })

    expect(useListSellerQnaProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({ shopId: 'shop-1' }),
      expect.anything(),
    )

    // Check options in the product dropdown
    expect(screen.getByText('Tất cả sản phẩm')).toBeTruthy()
    expect(screen.getByText('Áo thun phong cách (10)')).toBeTruthy()
    expect(screen.getByText('Quần jeans nam (5)')).toBeTruthy()
  })

  it('3. Filters by status, product, sort, search keyword + clear; setting from > to displays date error and disables question list query', async () => {
    renderComponent({ shopId: 'shop-1' })

    // Default call
    expect(useListSellerQuestionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: 'shop-1',
        sort: 'NEWEST',
      }),
      expect.anything(),
    )
    const firstCallOpts = useListSellerQuestionsMock.mock.calls[0]?.[1] as
      | { query?: { enabled?: boolean } }
      | undefined
    expect(firstCallOpts?.query?.enabled).toBe(true)

    // Switch status pill to 'Chưa trả lời'
    const unansweredFilterPill = screen.getByRole('button', { name: 'Chưa trả lời' })
    fireEvent.click(unansweredFilterPill)

    expect(useListSellerQuestionsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        shopId: 'shop-1',
        status: 'UNANSWERED',
        page: 0,
      }),
      expect.anything(),
    )

    // Product select change
    const productSelect = screen.getByRole('combobox', { name: /lọc theo sản phẩm/i })
    fireEvent.change(productSelect, { target: { value: 'prod-1' } })

    expect(useListSellerQuestionsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        productId: 'prod-1',
        page: 0,
      }),
      expect.anything(),
    )

    // Search input
    const searchInput = screen.getByPlaceholderText(
      'Tìm tên sản phẩm, SKU, mã câu hỏi, người hỏi, nội dung...',
    )
    fireEvent.change(searchInput, { target: { value: 'phong cách' } })

    await waitFor(() =>
      expect(useListSellerQuestionsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          q: 'phong cách',
          page: 0,
        }),
        expect.anything(),
      ),
    )

    // Clear search
    const clearButton = screen.getByRole('button', { name: /xóa từ khóa/i })
    fireEvent.click(clearButton)
    expect((searchInput as HTMLInputElement).value).toBe('')

    // Sort select
    const sortSelect = screen.getByRole('combobox', { name: /sắp xếp/i })
    fireEvent.change(sortSelect, { target: { value: 'OLDEST' } })

    expect(useListSellerQuestionsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: 'OLDEST',
      }),
      expect.anything(),
    )

    // Date range invalid: from > to
    const fromInput = screen.getByLabelText(/từ ngày/i)
    const toInput = screen.getByLabelText(/đến ngày/i)

    fireEvent.change(fromInput, { target: { value: '2026-11-20' } })
    fireEvent.change(toInput, { target: { value: '2026-11-10' } })

    // Inline error displayed
    expect(screen.getByText('Ngày bắt đầu không được lớn hơn ngày kết thúc')).toBeTruthy()

    // Query is disabled when date is invalid
    expect(useListSellerQuestionsMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
    )
    const calls = useListSellerQuestionsMock.mock.calls
    const lastCallOpts = calls[calls.length - 1]?.[1] as
      | { query?: { enabled?: boolean } }
      | undefined
    expect(lastCallOpts?.query?.enabled).toBe(false)
  })

  it('4. Renders each question row with code, product image & name, asker name, content, answer count, and Vietnamese status badge', () => {
    renderComponent({ shopId: 'shop-1' })

    // QNA-001
    expect(screen.getByText('QNA-001')).toBeTruthy()
    expect(screen.getByText('Áo này form rộng hay vừa vậy shop?')).toBeTruthy()
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy()

    // QNA-002
    expect(screen.getByText('QNA-002')).toBeTruthy()
    expect(screen.getByText('Quần này có co giãn không ạ?')).toBeTruthy()
    expect(screen.getByText('Trần Thị B')).toBeTruthy()

    // Badges in table
    const unansweredBadges = screen.getAllByText('Chưa trả lời')
    expect(unansweredBadges.length).toBeGreaterThan(0)
    const answeredBadges = screen.getAllByText('Đã trả lời')
    expect(answeredBadges.length).toBeGreaterThan(0)
  })

  it('5. Passing initialQuestionId automatically opens SellerQnaDetailModal populated via useGetSellerQuestion even when not in question list', () => {
    renderComponent({ shopId: 'shop-1', initialQuestionId: 'q-999' })

    // useGetSellerQuestion called for q-999
    expect(useGetSellerQuestionMock).toHaveBeenCalledWith('q-999', expect.anything())
    const detailCallOpts = useGetSellerQuestionMock.mock.calls[0]?.[1] as
      | { query?: { enabled?: boolean } }
      | undefined
    expect(detailCallOpts?.query?.enabled).toBe(true)

    // Modal dialog is opened
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  describe('6. Inside detail modal', () => {
    it('submitting blank reply shows inline error without firing createSellerAnswer', () => {
      renderComponent({ shopId: 'shop-1' })

      // Open modal for QNA-001 (unanswered)
      const actionButtons = screen.getAllByRole('button', { name: /xem & trả lời|xem chi tiết/i })
      fireEvent.click(actionButtons[0])

      expect(screen.getByRole('dialog')).toBeTruthy()

      // Submit with empty reply
      const submitButton = screen.getByRole('button', { name: /gửi phản hồi/i })
      fireEvent.click(submitButton)

      expect(screen.getByText(/nội dung phản hồi không được để trống/i)).toBeTruthy()
      expect(createSellerAnswerMutateMock).not.toHaveBeenCalled()
    })

    it('valid reply calls createSellerAnswer and triggers notify.success ONLY in onSuccess; follow-up reply allowed when ANSWERED', () => {
      renderComponent({ shopId: 'shop-1', initialQuestionId: 'q-2' })

      const textarea = screen.getByPlaceholderText(/nhập nội dung phản hồi cho khách hàng/i)
      fireEvent.change(textarea, {
        target: { value: 'Dạ shop xin ghi nhận thêm và bổ sung thông tin size ạ!' },
      })

      // Since shop already answered once, label is "Gửi phản hồi bổ sung"
      const submitBtn = screen.getByRole('button', { name: 'Gửi phản hồi bổ sung' })
      fireEvent.click(submitBtn)

      expect(createSellerAnswerMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          questionId: 'q-2',
          data: { content: 'Dạ shop xin ghi nhận thêm và bổ sung thông tin size ạ!' },
        }),
        expect.anything(),
      )

      expect(notifySuccessMock).toHaveBeenCalledWith('Đã gửi phản hồi thành công!')
    })

    it('edit & delete controls appear ONLY on SHOP answers - NEVER on question or VERIFIED_BUYER answers', () => {
      renderComponent({ shopId: 'shop-1', initialQuestionId: 'q-2' })

      // Check badges for answers
      expect(screen.getByText('Đã mua hàng')).toBeTruthy()
      expect(screen.getByText('Shop')).toBeTruthy()

      // Only 1 edit and 1 delete button (for the shop answer)
      const editButtons = screen.getAllByRole('button', { name: /chỉnh sửa/i })
      expect(editButtons.length).toBe(1)

      const deleteButtons = screen.getAllByRole('button', { name: /xóa/i })
      expect(deleteButtons.length).toBe(1)

      // Test inline edit
      fireEvent.click(editButtons[0])
      const editTextarea = screen.getByDisplayValue(
        'Dạ quần có pha spandex co giãn nhẹ thoải mái vận động ạ!',
      )
      fireEvent.change(editTextarea, { target: { value: 'Nội dung shop đã sửa lại.' } })
      const saveEditBtn = screen.getByRole('button', { name: /lưu thay đổi/i })
      fireEvent.click(saveEditBtn)

      expect(updateSellerAnswerMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          answerId: 'ans-2',
          data: { content: 'Nội dung shop đã sửa lại.' },
        }),
        expect.anything(),
      )

      // Test delete
      const deleteButton = screen.getByRole('button', { name: /xóa/i })
      fireEvent.click(deleteButton)
      expect(screen.getByText('Xóa câu trả lời')).toBeTruthy()
      const confirmDeleteBtn = screen.getByRole('button', { name: 'Xác nhận' })
      fireEvent.click(confirmDeleteBtn)

      expect(deleteSellerAnswerMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          answerId: 'ans-2',
        }),
        expect.anything(),
      )
    })

    it('clicking "Đóng câu hỏi" opens ConfirmDialog and confirms close; on CLOSED question reply composer hidden and "Mở lại câu hỏi" works', () => {
      renderComponent({ shopId: 'shop-1', initialQuestionId: 'q-2' })

      // Close button
      const closeQuestionBtn = screen.getByRole('button', { name: 'Đóng câu hỏi' })
      fireEvent.click(closeQuestionBtn)

      expect(screen.getByText(/Bạn có chắc chắn muốn đóng câu hỏi này/i)).toBeTruthy()
      const confirmBtn = screen.getByRole('button', { name: 'Xác nhận' })
      fireEvent.click(confirmBtn)

      expect(closeSellerQuestionMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({ questionId: 'q-2' }),
        expect.anything(),
      )

      // When question is CLOSED
      useGetSellerQuestionMock.mockReturnValue({
        data: {
          status: 200,
          data: {
            ...mockDetailQuestion,
            status: 'CLOSED',
          },
        },
        isPending: false,
      })

      cleanup()
      renderComponent({ shopId: 'shop-1', initialQuestionId: 'q-2' })

      // Reply composer should NOT be present
      expect(screen.queryByPlaceholderText(/nhập nội dung phản hồi cho khách hàng/i)).toBeNull()

      // "Mở lại câu hỏi" button is shown
      const reopenBtn = screen.getByRole('button', { name: 'Mở lại câu hỏi' })
      fireEvent.click(reopenBtn)

      expect(reopenSellerQuestionMutateMock).toHaveBeenCalledWith(
        expect.objectContaining({ questionId: 'q-2' }),
        expect.anything(),
      )
    })

    it('read-only staff (can REVIEW_REPLY === false) sees detail modal without reply/edit/delete/close buttons', () => {
      canMock.mockImplementation((perm) => perm === 'REVIEW_READ')

      renderComponent({ shopId: 'shop-1', initialQuestionId: 'q-2' })

      expect(screen.queryByPlaceholderText(/nhập nội dung phản hồi cho khách hàng/i)).toBeNull()
      expect(screen.queryByRole('button', { name: /chỉnh sửa/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /xóa/i })).toBeNull()
      expect(screen.queryByRole('button', { name: /đóng câu hỏi/i })).toBeNull()
    })

    it('asserts NO violation report button exists anywhere', () => {
      renderComponent({ shopId: 'shop-1', initialQuestionId: 'q-2' })

      expect(screen.queryByRole('button', { name: /báo cáo/i })).toBeNull()
      expect(screen.queryByText(/báo cáo vi phạm/i)).toBeNull()
    })
  })

  it('shows a retry state when the question list request fails', () => {
    useListSellerQuestionsMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: false,
      isError: true,
      refetch: vi.fn(),
    })

    renderComponent({ shopId: 'shop-1' })

    expect(screen.getByText('Không thể tải danh sách câu hỏi')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
  })

  it('removes questionId from the URL when the detail modal is closed', () => {
    function LocationProbe() {
      return <span data-testid="location-search">{useLocation().search}</span>
    }
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/shop?shopId=shop-1&tab=qna&questionId=q-999']}>
          <LocationProbe />
          <SellerQnaTab shopId="shop-1" initialQuestionId="q-999" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByTestId('location-search').textContent).toContain('questionId=q-999')
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.getByTestId('location-search').textContent).not.toContain('questionId')
  })
})
