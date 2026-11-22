// @vitest-environment happy-dom
import { MemoryRouter, Route, Routes } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import ProductQnaSection from './ProductQnaSection'

import type { ProductAnswerResponse } from '@generated/model/productAnswerResponse'
import type { ProductQuestionPageResponse } from '@generated/model/productQuestionPageResponse'
import type { ProductQuestionResponse } from '@generated/model/productQuestionResponse'

const {
  mockUseListProductQuestions,
  mockCreateQuestionMutate,
  mockUpdateQuestionMutate,
  mockDeleteQuestionMutate,
  mockCreateAnswerMutate,
  mockUpdateAnswerMutate,
  mockDeleteAnswerMutate,
  mockSessionState,
  mockNotifySuccess,
  mockNotifyError,
} = vi.hoisted(() => ({
  mockUseListProductQuestions: vi.fn(),
  mockCreateQuestionMutate: vi.fn(),
  mockUpdateQuestionMutate: vi.fn(),
  mockDeleteQuestionMutate: vi.fn(),
  mockCreateAnswerMutate: vi.fn(),
  mockUpdateAnswerMutate: vi.fn(),
  mockDeleteAnswerMutate: vi.fn(),
  mockSessionState: { loggedIn: true, pending: false },
  mockNotifySuccess: vi.fn(),
  mockNotifyError: vi.fn(),
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: () => {
    if (mockSessionState.pending) {
      return { data: undefined, isPending: true }
    }
    if (mockSessionState.loggedIn) {
      return { data: { user: { id: 'u-1', email: 'test@example.com' } }, isPending: false }
    }
    return { data: null, isPending: false }
  },
}))

vi.mock('@generated/endpoints/product-q-a/product-q-a', () => ({
  getListProductQuestionsQueryKey: (productId: string, params?: unknown) => {
    if (params) {
      return [`/api/products/${productId}/questions`, params]
    }
    return [`/api/products/${productId}/questions`]
  },
  useListProductQuestions: mockUseListProductQuestions,
  useCreateProductQuestion: () => ({ mutate: mockCreateQuestionMutate, isPending: false }),
  useUpdateProductQuestion: () => ({ mutate: mockUpdateQuestionMutate, isPending: false }),
  useDeleteProductQuestion: () => ({ mutate: mockDeleteQuestionMutate, isPending: false }),
  useCreateProductAnswer: () => ({ mutate: mockCreateAnswerMutate, isPending: false }),
  useUpdateProductAnswer: () => ({ mutate: mockUpdateAnswerMutate, isPending: false }),
  useDeleteProductAnswer: () => ({ mutate: mockDeleteAnswerMutate, isPending: false }),
}))

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: mockNotifySuccess,
    error: mockNotifyError,
    fromError: vi.fn(),
  },
}))

function sampleAnswers(): ProductAnswerResponse[] {
  return [
    {
      id: 'ans-1',
      questionId: 'q-1',
      authorDisplayName: 'DHMQ Store',
      authorRole: 'SHOP',
      verifiedBuyer: false,
      content: 'Chào bạn, sản phẩm chuẩn form rộng thoải mái bạn nhé!',
      mine: false,
      canEdit: false,
      canDelete: false,
      createdAt: '2026-11-10T09:00:00Z',
    },
    {
      id: 'ans-2',
      questionId: 'q-1',
      authorDisplayName: 'Trần Văn B',
      authorRole: 'VERIFIED_BUYER',
      verifiedBuyer: true,
      content: 'Mình cao 1m75 nặng 68kg mặc size L rất vừa vặn.',
      mine: false,
      canEdit: false,
      canDelete: false,
      createdAt: '2026-11-11T14:30:00Z',
    },
  ]
}

function sampleQuestions(): ProductQuestionResponse[] {
  return [
    {
      id: 'q-1',
      code: 'QA-00000001',
      productId: 'prod-100',
      askerDisplayName: 'Nguyễn Văn A',
      content: 'Áo này form rộng hay form ôm vừa vậy shop?',
      status: 'ANSWERED',
      mine: false,
      canEdit: false,
      canDelete: false,
      createdAt: '2026-11-09T08:00:00Z',
      answers: sampleAnswers(),
    },
    {
      id: 'q-2',
      code: 'QA-00000002',
      productId: 'prod-100',
      askerDisplayName: 'Lê Thị C',
      content: 'Chất vải giặt máy có bị co rút nhiều không ạ?',
      status: 'UNANSWERED',
      mine: true,
      canEdit: true,
      canDelete: true,
      createdAt: '2026-11-08T10:15:00Z',
      answers: [],
    },
  ]
}

function mockQnaPage(data?: Partial<ProductQuestionPageResponse>) {
  const defaultPage: ProductQuestionPageResponse = {
    items: sampleQuestions(),
    total: 2,
    page: 0,
    size: 10,
    canAnswerAsBuyer: true,
    maxContentLength: 1000,
  }
  const merged = { ...defaultPage, ...data }
  mockUseListProductQuestions.mockReturnValue({
    data: { status: 200, data: merged },
    isPending: false,
    isError: false,
    error: null,
  })
}

function renderQnaSection(initialRoute = '/product/prod-100') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/product/:id" element={<ProductQnaSection productId="prod-100" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockSessionState.loggedIn = true
  mockSessionState.pending = false
})

describe('ProductQnaSection — PDP Q&A Component', () => {
  it('1. Renders heading, total count badge, questions, unanswered pill, Shop vs Đã mua hàng badges, and asserts NO violation reporting', () => {
    mockQnaPage()
    renderQnaSection()

    expect(screen.getByRole('heading', { level: 2, name: /Hỏi đáp về sản phẩm/i })).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('Áo này form rộng hay form ôm vừa vậy shop?')).toBeTruthy()
    expect(screen.getByText('Chất vải giặt máy có bị co rút nhiều không ạ?')).toBeTruthy()
    expect(screen.getByText('Chưa có câu trả lời')).toBeTruthy()

    expect(screen.getByText('Shop')).toBeTruthy()
    expect(screen.getByText('Đã mua hàng')).toBeTruthy()

    // STRICT CONSTRAINT: asserts NO violation report button or text exists
    expect(screen.queryByText(/báo cáo/i)).toBeNull()
    expect(screen.queryByText(/tố cáo/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /báo cáo/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /report/i })).toBeNull()
  })

  it('2. Guest user sees login prompt CTA instead of Ask Question textarea', () => {
    mockSessionState.loggedIn = false
    mockQnaPage()
    renderQnaSection()

    expect(screen.getByText('Đăng nhập để đặt câu hỏi về sản phẩm')).toBeTruthy()
    const loginLink = screen.getByRole('link', { name: /đăng nhập/i })
    expect(loginLink.getAttribute('href')).toBe('/login')
    expect(screen.queryByPlaceholderText('Nhập câu hỏi của bạn về sản phẩm...')).toBeNull()
  })

  it('3. Logged-in user submitting whitespace-only text sees inline error without firing mutation or dialog; valid text opens ConfirmDialog and fires createProductQuestion with trimmed text', async () => {
    mockSessionState.loggedIn = true
    mockQnaPage()
    const user = userEvent.setup()
    renderQnaSection()

    const textarea = screen.getByPlaceholderText('Nhập câu hỏi của bạn về sản phẩm...')
    const submitBtn = screen.getByRole('button', { name: 'Gửi câu hỏi' })

    // Blank / whitespace-only submit
    await user.type(textarea, '     ')
    await user.click(submitBtn)

    expect(screen.getByText('Vui lòng nhập nội dung câu hỏi')).toBeTruthy()
    expect(screen.queryByText('Xác nhận gửi câu hỏi?')).toBeNull()
    expect(mockCreateQuestionMutate).not.toHaveBeenCalled()

    // Valid text submit
    await user.clear(textarea)
    await user.type(textarea, '   Áo này có kèm thắt lưng không shop?   ')
    await user.click(submitBtn)

    // Confirm dialog opens
    expect(screen.getByText('Xác nhận gửi câu hỏi?')).toBeTruthy()
    const dialog = screen.getByRole('dialog')
    const confirmBtn = within(dialog).getByRole('button', { name: 'Gửi câu hỏi' })
    await user.click(confirmBtn)

    expect(mockCreateQuestionMutate).toHaveBeenCalledWith(
      {
        productId: 'prod-100',
        data: { content: 'Áo này có kèm thắt lưng không shop?' },
      },
      expect.any(Object),
    )

    // Test onSuccess callback triggers success toast
    const mutateCallArgs = mockCreateQuestionMutate.mock.calls[0] as unknown[]
    const callbacks = mutateCallArgs[1] as { onSuccess: () => void }
    callbacks.onSuccess()
    expect(mockNotifySuccess).toHaveBeenCalledWith('Đã gửi câu hỏi thành công!')
  })

  it('4. Keyword search calls useListProductQuestions with q, shows empty-search message when no results, and Clear button resets keyword', async () => {
    mockUseListProductQuestions.mockImplementation(function (_productId, params) {
      if (params && params.q) {
        return {
          data: {
            status: 200,
            data: { items: [], total: 0, page: 0, size: 10, maxContentLength: 1000 },
          },
          isPending: false,
          isError: false,
          error: null,
        }
      }
      return {
        data: {
          status: 200,
          data: { items: sampleQuestions(), total: 2, page: 0, size: 10, maxContentLength: 1000 },
        },
        isPending: false,
        isError: false,
        error: null,
      }
    })
    const user = userEvent.setup()
    renderQnaSection()

    const searchInput = screen.getByPlaceholderText('Tìm kiếm câu hỏi hoặc câu trả lời...')
    await user.type(searchInput, 'màu xanh{enter}')

    expect(mockUseListProductQuestions).toHaveBeenCalledWith(
      'prod-100',
      expect.objectContaining({ q: 'màu xanh', page: 0, size: 10 }),
      expect.any(Object),
    )

    expect(
      screen.getByText(/Không tìm thấy câu hỏi hoặc câu trả lời phù hợp với từ khóa/),
    ).toBeTruthy()

    const clearBtns = screen.getAllByRole('button', { name: /Xóa từ khóa|Xóa tìm kiếm/i })
    await user.click(clearBtns[0])

    expect(screen.getByText('Áo này form rộng hay form ôm vừa vậy shop?')).toBeTruthy()
  })

  it('5. Expand/collapse toggle hides and shows answers; ?questionId=<id> in URL auto-expands and highlights that question', async () => {
    mockQnaPage()
    const user = userEvent.setup()
    renderQnaSection()

    // Question q-1 has 2 answers and is expanded by default (<= 2 answers)
    expect(screen.getByText('Chào bạn, sản phẩm chuẩn form rộng thoải mái bạn nhé!')).toBeTruthy()

    // Collapse answers
    const collapseBtn = screen.getByRole('button', { name: /Thu gọn câu trả lời/i })
    await user.click(collapseBtn)
    expect(screen.queryByText('Chào bạn, sản phẩm chuẩn form rộng thoải mái bạn nhé!')).toBeNull()

    // Expand answers again
    const expandBtn = screen.getByRole('button', { name: /Xem 2 câu trả lời/i })
    await user.click(expandBtn)
    expect(screen.getByText('Chào bạn, sản phẩm chuẩn form rộng thoải mái bạn nhé!')).toBeTruthy()

    cleanup()

    // Deep-link to q-2 via URL search param
    renderQnaSection('/product/prod-100?questionId=q-2')
    const q2Card = document.getElementById('q-2')
    expect(q2Card).not.toBeNull()
    if (q2Card) {
      expect(q2Card.className).toContain('ring-2')
    }
  })

  it('6. Verified buyer sees inline answer composer on open questions, validates blank input, and submits answer cleanly', async () => {
    mockSessionState.loggedIn = true
    mockQnaPage({ canAnswerAsBuyer: true })
    const user = userEvent.setup()
    renderQnaSection()

    // q-1 is open, shows reply button
    const replyButtons = screen.getAllByRole('button', { name: 'Trả lời câu hỏi' })
    await user.click(replyButtons[0])

    const answerInput = screen.getByPlaceholderText('Nhập câu trả lời của bạn...')
    const sendAnswerBtn = screen.getByRole('button', { name: 'Gửi câu trả lời' })

    // Blank submit
    await user.type(answerInput, '    ')
    await user.click(sendAnswerBtn)
    expect(screen.getByText('Vui lòng nhập nội dung câu trả lời')).toBeTruthy()
    expect(mockCreateAnswerMutate).not.toHaveBeenCalled()

    // Valid submit
    await user.clear(answerInput)
    await user.type(answerInput, 'Vải mặc rất thoáng và dễ chịu.')
    await user.click(sendAnswerBtn)

    expect(mockCreateAnswerMutate).toHaveBeenCalledWith(
      {
        productId: 'prod-100',
        questionId: 'q-1',
        data: { content: 'Vải mặc rất thoáng và dễ chịu.' },
      },
      expect.any(Object),
    )

    const mutateCallArgs = mockCreateAnswerMutate.mock.calls[0] as unknown[]
    const callbacks = mutateCallArgs[1] as { onSuccess: () => void }
    callbacks.onSuccess()
    expect(mockNotifySuccess).toHaveBeenCalledWith('Đã gửi câu trả lời!')
  })

  it('7. Edit/Delete buttons render ONLY when canEdit/canDelete is true on own question / own answer; hidden on others content', async () => {
    const questionsWithAnswerOwner: ProductQuestionResponse[] = [
      {
        id: 'q-1',
        productId: 'prod-100',
        askerDisplayName: 'Nguyễn Văn A',
        content: 'Form áo có ôm không?',
        status: 'ANSWERED',
        mine: false,
        canEdit: false,
        canDelete: false,
        answers: [
          {
            id: 'ans-mine',
            questionId: 'q-1',
            authorDisplayName: 'Tôi',
            authorRole: 'VERIFIED_BUYER',
            verifiedBuyer: true,
            content: 'Câu trả lời của tôi',
            mine: true,
            canEdit: true,
            canDelete: true,
            createdAt: '2026-11-12T10:00:00Z',
          },
        ],
      },
      {
        id: 'q-2',
        productId: 'prod-100',
        askerDisplayName: 'Tôi',
        content: 'Câu hỏi của tôi chưa có trả lời',
        status: 'UNANSWERED',
        mine: true,
        canEdit: true,
        canDelete: true,
        answers: [],
      },
    ]

    mockQnaPage({ items: questionsWithAnswerOwner, total: 2 })
    const user = userEvent.setup()
    renderQnaSection()

    // Question q-2 has edit & delete buttons
    const deleteQuestionBtns = screen.getAllByRole('button', { name: 'Xóa' })
    expect(deleteQuestionBtns.length).toBe(2) // 1 on q-2, 1 on ans-mine

    const editQuestionBtns = screen.getAllByRole('button', { name: 'Chỉnh sửa' })
    expect(editQuestionBtns.length).toBe(2) // 1 on q-2, 1 on ans-mine

    // Click delete on q-2
    await user.click(deleteQuestionBtns[1])
    expect(screen.getByText('Xác nhận xóa câu hỏi?')).toBeTruthy()
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Xóa câu hỏi' })
    await user.click(confirmDeleteBtn)

    expect(mockDeleteQuestionMutate).toHaveBeenCalledWith(
      { productId: 'prod-100', questionId: 'q-2' },
      expect.any(Object),
    )
  })

  it('8. "Tải thêm câu hỏi" button appears when loaded count < total and requests next page', async () => {
    mockUseListProductQuestions.mockImplementation(function (_productId, params) {
      if (params && params.page === 1) {
        return {
          data: {
            status: 200,
            data: {
              items: [
                {
                  id: 'q-3',
                  content: 'Câu hỏi trang 2',
                  createdAt: '2026-11-07T10:00:00Z',
                  answers: [],
                },
              ],
              total: 5,
              page: 1,
              size: 2,
              canAnswerAsBuyer: true,
            },
          },
          isPending: false,
          isError: false,
          error: null,
        }
      }
      return {
        data: {
          status: 200,
          data: {
            items: sampleQuestions(),
            total: 5,
            page: 0,
            size: 2,
          },
        },
        isPending: false,
        isError: false,
        error: null,
      }
    })
    const user = userEvent.setup()
    renderQnaSection()

    const loadMoreBtn = screen.getByRole('button', { name: 'Tải thêm câu hỏi' })
    expect(loadMoreBtn).toBeTruthy()

    await user.click(loadMoreBtn)
    expect(mockUseListProductQuestions).toHaveBeenCalledWith(
      'prod-100',
      expect.objectContaining({ page: 1 }),
      expect.any(Object),
    )
    expect(screen.getByText('Câu hỏi trang 2')).toBeTruthy()
  })

  it('9. Product ID change resets search keyword, pagination page, and accumulated extraQuestions', async () => {
    mockUseListProductQuestions.mockImplementation(function (productId, params) {
      if (productId === 'prod-200') {
        return {
          data: {
            status: 200,
            data: {
              items: [
                {
                  id: 'q-new-1',
                  productId: 'prod-200',
                  askerDisplayName: 'Người dùng mới',
                  content: 'Câu hỏi sản phẩm 200',
                  answers: [],
                },
              ],
              total: 1,
              page: 0,
              size: 10,
            },
          },
          isPending: false,
          isError: false,
          error: null,
        }
      }
      if (params && params.page === 1) {
        return {
          data: {
            status: 200,
            data: {
              items: [
                {
                  id: 'q-page-2',
                  productId: 'prod-100',
                  content: 'Câu hỏi trang 2',
                  answers: [],
                },
              ],
              total: 5,
              page: 1,
              size: 2,
              canAnswerAsBuyer: true,
            },
          },
          isPending: false,
          isError: false,
          error: null,
        }
      }
      return {
        data: {
          status: 200,
          data: {
            items: sampleQuestions(),
            total: 5,
            page: 0,
            size: 2,
          },
        },
        isPending: false,
        isError: false,
        error: null,
      }
    })

    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/product/prod-100']}>
          <ProductQnaSection productId="prod-100" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const searchInput = screen.getByPlaceholderText('Tìm kiếm câu hỏi hoặc câu trả lời...')
    await user.type(searchInput, 'form rộng{enter}')

    const loadMoreBtn = screen.getByRole('button', { name: 'Tải thêm câu hỏi' })
    await user.click(loadMoreBtn)
    expect(screen.getByText('Câu hỏi trang 2')).toBeTruthy()

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/product/prod-200']}>
          <ProductQnaSection productId="prod-200" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const updatedSearchInput = screen.getByPlaceholderText(
      'Tìm kiếm câu hỏi hoặc câu trả lời...',
    ) as HTMLInputElement
    expect(updatedSearchInput.value).toBe('')

    expect(mockUseListProductQuestions).toHaveBeenCalledWith(
      'prod-200',
      expect.objectContaining({ page: 0 }),
      expect.any(Object),
    )
    expect(screen.getByText('Câu hỏi sản phẩm 200')).toBeTruthy()
    expect(screen.queryByText('Câu hỏi trang 2')).toBeNull()
  })

  it('10. Mutating an item while page > 0 resets pagination page and clears accumulated extraQuestions', async () => {
    mockUseListProductQuestions.mockImplementation(function (_productId, params) {
      if (params && params.page === 1) {
        return {
          data: {
            status: 200,
            data: {
              items: [
                {
                  id: 'q-page-2',
                  productId: 'prod-100',
                  askerDisplayName: 'Người dùng B',
                  content: 'Câu hỏi trang 2',
                  status: 'UNANSWERED',
                  mine: true,
                  canEdit: true,
                  canDelete: true,
                  createdAt: '2026-11-07T10:00:00Z',
                  answers: [],
                },
              ],
              total: 5,
              page: 1,
              size: 2,
              canAnswerAsBuyer: true,
            },
          },
          isPending: false,
          isError: false,
          error: null,
        }
      }
      return {
        data: {
          status: 200,
          data: {
            items: sampleQuestions(),
            total: 5,
            page: 0,
            size: 2,
          },
        },
        isPending: false,
        isError: false,
        error: null,
      }
    })

    const user = userEvent.setup()
    renderQnaSection()

    // Advance to page 1 via load more
    const loadMoreBtn = screen.getByRole('button', { name: 'Tải thêm câu hỏi' })
    await user.click(loadMoreBtn)
    expect(screen.getByText('Câu hỏi trang 2')).toBeTruthy()

    // Delete question q-2
    const deleteBtns = screen.getAllByRole('button', { name: 'Xóa' })
    await user.click(deleteBtns[0])

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Xóa câu hỏi' })
    await user.click(confirmDeleteBtn)

    expect(mockDeleteQuestionMutate).toHaveBeenCalled()

    // Trigger onSuccess callback of delete mutation
    const deleteCallArgs = mockDeleteQuestionMutate.mock.calls[0] as unknown[]
    const callbacks = deleteCallArgs[1] as { onSuccess: () => void }
    await act(async () => {
      callbacks.onSuccess()
    })

    // Verify useListProductQuestions is invoked for page 0
    expect(mockUseListProductQuestions).toHaveBeenLastCalledWith(
      'prod-100',
      expect.objectContaining({ page: 0 }),
      expect.any(Object),
    )
  })

  it('11. Creating or editing an answer while page > 0 resets pagination page and syncs the list', async () => {
    mockUseListProductQuestions.mockImplementation(function (_productId, params) {
      if (params && params.page === 1) {
        return {
          data: {
            status: 200,
            data: {
              items: [
                {
                  id: 'q-page-2',
                  productId: 'prod-100',
                  askerDisplayName: 'Người dùng B',
                  content: 'Câu hỏi trang 2',
                  status: 'UNANSWERED',
                  mine: false,
                  canEdit: false,
                  canDelete: false,
                  createdAt: '2026-11-07T10:00:00Z',
                  answers: [],
                },
              ],
              total: 5,
              page: 1,
              size: 2,
              canAnswerAsBuyer: true,
            },
          },
          isPending: false,
          isError: false,
          error: null,
        }
      }
      return {
        data: {
          status: 200,
          data: {
            items: sampleQuestions(),
            total: 5,
            page: 0,
            size: 2,
            canAnswerAsBuyer: true,
          },
        },
        isPending: false,
        isError: false,
        error: null,
      }
    })

    const user = userEvent.setup()
    renderQnaSection()

    // Advance to page 1 via load more
    const loadMoreBtn = screen.getByRole('button', { name: 'Tải thêm câu hỏi' })
    await user.click(loadMoreBtn)
    expect(screen.getByText('Câu hỏi trang 2')).toBeTruthy()

    // Reply to question q-1 (from page 0, held in extraQuestions)
    const replyBtns = screen.getAllByRole('button', { name: 'Trả lời câu hỏi' })
    await user.click(replyBtns[0])

    const answerInput = screen.getByPlaceholderText('Nhập câu trả lời của bạn...')
    await user.type(answerInput, 'Đúng vậy form chuẩn.')
    const sendAnswerBtn = screen.getByRole('button', { name: 'Gửi câu trả lời' })
    await user.click(sendAnswerBtn)

    expect(mockCreateAnswerMutate).toHaveBeenCalled()

    const answerCallArgs = mockCreateAnswerMutate.mock.calls[0] as unknown[]
    const callbacks = answerCallArgs[1] as { onSuccess: () => void }
    await act(async () => {
      callbacks.onSuccess()
    })

    // Verify useListProductQuestions is invoked for page 0
    expect(mockUseListProductQuestions).toHaveBeenLastCalledWith(
      'prod-100',
      expect.objectContaining({ page: 0 }),
      expect.any(Object),
    )
  })

  it('scrolls to the deep-linked question once Q&A data is available', () => {
    const scrollSpy = vi.fn()
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
    Element.prototype.scrollIntoView = scrollSpy
    try {
      mockQnaPage()
      renderQnaSection('/product/prod-100?questionId=q-1')
      expect(scrollSpy).toHaveBeenCalled()
      expect(document.getElementById('q-1')).not.toBeNull()
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
      } else {
        Object.defineProperty(Element.prototype, 'scrollIntoView', original)
      }
    }
  })

  it('shows a retry state instead of the empty state when fetching fails', () => {
    mockUseListProductQuestions.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('network down'),
      refetch: vi.fn(),
    })
    renderQnaSection()

    expect(screen.getByText('Không thể tải danh sách câu hỏi')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
    expect(
      screen.queryByText('Chưa có câu hỏi nào cho sản phẩm này. Hãy là người đầu tiên đặt câu hỏi!'),
    ).toBeNull()
  })

  it('does not show the guest CTA while the session is still pending', () => {
    mockSessionState.loggedIn = false
    mockSessionState.pending = true
    mockQnaPage()
    renderQnaSection()

    expect(screen.queryByText('Đăng nhập để đặt câu hỏi về sản phẩm')).toBeNull()
    expect(screen.queryByPlaceholderText('Nhập câu hỏi của bạn về sản phẩm...')).toBeNull()
  })
})
