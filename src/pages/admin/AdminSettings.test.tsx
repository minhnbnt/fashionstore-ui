// @vitest-environment happy-dom
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import AdminSettings from './AdminSettings'

const { mockNotifyWarning, mockNotifyPromise } = vi.hoisted(() => ({
  mockNotifyWarning: vi.fn(),
  mockNotifyPromise: vi.fn(
    (
      promise: Promise<unknown>,
      _messages: { loading: string; success: string; error: (err: unknown) => string },
      _options?: { id?: string },
    ) => promise,
  ),
}))

vi.mock('@generated/endpoints/admin-settings/admin-settings', () => ({
  getGetSystemSettingsQueryKey: vi.fn(() => ['/api/admin/settings'] as const),
  getListConfigAuditQueryKey: vi.fn(() => ['/api/admin/config-audit'] as const),
  useGetSystemSettings: vi.fn(),
  useUpdateSystemSettings: vi.fn(),
  useListConfigAudit: vi.fn(),
}))

vi.mock('@generated/endpoints/admin-stats/admin-stats', () => ({
  getGetAdminStatsQueryKey: vi.fn(() => ['/api/admin/stats'] as const),
  useGetAdminStats: vi.fn(() => ({
    data: undefined,
    isSuccess: false,
    isPending: false,
    isError: false,
  })),
}))

vi.mock('@/hooks/useSession', () => ({
  useSessionQuery: vi.fn(() => ({
    data: {
      user: {
        id: 'admin-1',
        email: 'admin@dhmq.vn',
        app_metadata: { role: 'admin' },
      },
    },
    isLoading: false,
  })),
}))

vi.mock('@/hooks/useAuthMutations', () => ({
  useSignOut: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/components/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />,
}))

vi.mock('@/lib/notifications', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    warning: mockNotifyWarning,
    info: vi.fn(),
    loading: vi.fn(),
    fromError: vi.fn(),
    promise: mockNotifyPromise,
  },
  safeErrorMessage: vi.fn((_err: unknown, _endpoint?: string, fallback?: string) => {
    if (fallback !== undefined) {
      return fallback
    }
    return 'Đã xảy ra lỗi.'
  }),
}))

import {
  useGetSystemSettings,
  useListConfigAudit,
  useUpdateSystemSettings,
} from '@generated/endpoints/admin-settings/admin-settings'
import { ListConfigAuditEntity } from '@generated/model/listConfigAuditEntity'

const MOCK_SETTINGS = {
  siteName: 'DHMQ Store',
  hotline: '1900 8888',
  supportEmail: 'support@dhmq.vn',
  freeShippingThreshold: 500000,
  baseItems: 3,
  paymentHoldMinutes: 30,
  autoCompleteDays: 7,
  codMinTotal: 100000,
  codMaxTotal: 5000000,
}

const MOCK_AUDITS = [
  {
    id: 'audit-1',
    entity: ListConfigAuditEntity.SETTING,
    entityKey: 'freeShippingThreshold',
    action: 'UPDATE',
    oldValue: '300000',
    newValue: '500000',
    changedBy: 'admin-uuid-01',
    changedAt: '2026-11-18T03:30:00Z',
  },
  {
    id: 'audit-2',
    entity: ListConfigAuditEntity.CARRIER,
    entityKey: 'GHN',
    action: 'CREATE',
    oldValue: '',
    newValue: '"active"',
    changedBy: 'admin-uuid-02',
    changedAt: '2026-11-17T09:15:00Z',
  },
]

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/settings']}>
        <AdminSettings />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminSettings', () => {
  const mutateAsync = vi.fn()

  beforeEach(function () {
    vi.clearAllMocks()

    mutateAsync.mockResolvedValue({
      status: 200,
      data: MOCK_SETTINGS,
    })

    vi.mocked(useGetSystemSettings).mockReturnValue({
      data: {
        status: 200,
        data: MOCK_SETTINGS,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetSystemSettings>)

    vi.mocked(useUpdateSystemSettings).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateSystemSettings>)

    vi.mocked(useListConfigAudit).mockReturnValue({
      data: {
        status: 200,
        data: {
          items: MOCK_AUDITS,
          total: MOCK_AUDITS.length,
          page: 0,
          size: 15,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useListConfigAudit>)
  })

  afterEach(function () {
    cleanup()
  })

  it('hiển thị skeleton khi đang tải và đổ đúng giá trị từ useGetSystemSettings', function () {
    vi.mocked(useGetSystemSettings).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetSystemSettings>)

    renderPage()
    expect(screen.getByLabelText('Đang tải cấu hình hệ thống')).toBeTruthy()
    cleanup()

    renderPage()
    const siteNameInput = screen.getByLabelText('Tên sàn') as HTMLInputElement
    const hotlineInput = screen.getByLabelText('Hotline hiển thị') as HTMLInputElement
    const emailInput = screen.getByLabelText('Email hỗ trợ') as HTMLInputElement
    const freeShipInput = screen.getByLabelText('Ngưỡng freeship (VND)') as HTMLInputElement
    const baseItemsInput = screen.getByLabelText('Số SP tối đa phí cơ bản') as HTMLInputElement
    const paymentHoldInput = screen.getByLabelText(
      'Phút giữ đơn chờ thanh toán',
    ) as HTMLInputElement
    const autoCompleteInput = screen.getByLabelText('Ngày tự hoàn tất đơn') as HTMLInputElement
    const codMinInput = screen.getByLabelText('Tổng đơn tối thiểu COD (VND)') as HTMLInputElement
    const codMaxInput = screen.getByLabelText('Tổng đơn tối đa COD (VND)') as HTMLInputElement

    expect(siteNameInput.value).toBe('DHMQ Store')
    expect(hotlineInput.value).toBe('1900 8888')
    expect(emailInput.value).toBe('support@dhmq.vn')
    expect(freeShipInput.value).toBe('500000')
    expect(baseItemsInput.value).toBe('3')
    expect(paymentHoldInput.value).toBe('30')
    expect(autoCompleteInput.value).toBe('7')
    expect(codMinInput.value).toBe('100000')
    expect(codMaxInput.value).toBe('5000000')
  })

  it('chặn lưu và gọi notify.warning khi codMaxTotal nhỏ hơn codMinTotal', function () {
    renderPage()

    const codMinInput = screen.getByLabelText('Tổng đơn tối thiểu COD (VND)')
    const codMaxInput = screen.getByLabelText('Tổng đơn tối đa COD (VND)')

    fireEvent.change(codMinInput, { target: { value: '500000' } })
    fireEvent.change(codMaxInput, { target: { value: '200000' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }))

    expect(mockNotifyWarning).toHaveBeenCalledWith(
      'Giới hạn COD không hợp lệ',
      'Tổng đơn COD tối đa phải lớn hơn hoặc bằng mức tối thiểu (hoặc đặt 0 để không giới hạn).',
    )
    expect(mutateAsync).not.toHaveBeenCalled()
    expect(mockNotifyPromise).not.toHaveBeenCalled()
  })

  it('chặn lưu khi tên sàn trống và hỗ trợ hoàn tác thay đổi', function () {
    renderPage()

    const siteNameInput = screen.getByLabelText('Tên sàn') as HTMLInputElement
    fireEvent.change(siteNameInput, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }))

    expect(mockNotifyWarning).toHaveBeenCalledWith(
      'Thiếu tên sàn',
      'Vui lòng nhập tên sàn hiển thị trước khi lưu.',
    )
    expect(mutateAsync).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác thay đổi' }))
    expect(siteNameInput.value).toBe('DHMQ Store')
  })

  it('gọi mutateAsync thông qua notify.promise khi submit hợp lệ', async function () {
    renderPage()

    const siteNameInput = screen.getByLabelText('Tên sàn')
    const freeShipInput = screen.getByLabelText('Ngưỡng freeship (VND)')
    const codMaxInput = screen.getByLabelText('Tổng đơn tối đa COD (VND)')

    fireEvent.change(siteNameInput, { target: { value: 'DHMQ Fashion' } })
    fireEvent.change(freeShipInput, { target: { value: '600000' } })
    fireEvent.change(codMaxInput, { target: { value: '0' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }))

    await waitFor(function () {
      expect(mutateAsync).toHaveBeenCalledTimes(1)
    })

    expect(mutateAsync).toHaveBeenCalledWith({
      data: {
        siteName: 'DHMQ Fashion',
        hotline: '1900 8888',
        supportEmail: 'support@dhmq.vn',
        freeShippingThreshold: 600000,
        baseItems: 3,
        paymentHoldMinutes: 30,
        autoCompleteDays: 7,
        codMinTotal: 100000,
        codMaxTotal: 0,
      },
    })

    expect(mockNotifyPromise).toHaveBeenCalledTimes(1)
    const promiseCall = mockNotifyPromise.mock.calls[0]
    expect(promiseCall[1].loading).toBe('Đang lưu cấu hình hệ thống...')
    expect(promiseCall[1].success).toBe('Cập nhật cấu hình hệ thống thành công')
    expect(promiseCall[2]).toEqual({ id: 'admin-settings-save' })
  })

  it('hiển thị danh sách lịch sử thay đổi cấu hình và hỗ trợ lọc theo đối tượng', function () {
    renderPage()

    expect(screen.getAllByText('freeShippingThreshold').length).toBeGreaterThan(0)
    expect(screen.getAllByText('300000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('500000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('admin-uuid-01').length).toBeGreaterThan(0)

    expect(screen.getAllByText('GHN').length).toBeGreaterThan(0)
    expect(screen.getAllByText('active').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('tab', { name: 'Đơn vị vận chuyển' }))

    expect(useListConfigAudit).toHaveBeenLastCalledWith({
      page: 0,
      size: 15,
      entity: ListConfigAuditEntity.CARRIER,
    })
  })
})
