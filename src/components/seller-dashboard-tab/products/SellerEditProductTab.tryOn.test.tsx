// @vitest-environment happy-dom
import {
  useGetAuditLogs,
  useGetDetail,
  useToggleStatus,
  useUpdate1,
} from '@generated/endpoints/shop-products/shop-products'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import SellerEditProductTab from './SellerEditProductTab'

vi.mock('@generated/endpoints/categories/categories', () => ({
  useListCategories: vi.fn(() => ({
    data: {
      status: 200,
      data: [{ id: 'cat-1', name: 'Áo sơ mi' }],
    },
    isPending: false,
  })),
}))

vi.mock('@generated/endpoints/seller-products-inventory/seller-products-inventory', () => ({
  getInventoryQueryKey: vi.fn(() => ['inventory']),
  getListProductsQueryKey: vi.fn(() => ['listProducts']),
}))

vi.mock('@generated/endpoints/shop-products/shop-products', () => ({
  getGetAuditLogsQueryKey: vi.fn(() => ['auditLogs']),
  getGetDetailQueryKey: vi.fn(() => ['productDetail']),
  useGetAuditLogs: vi.fn(),
  useGetDetail: vi.fn(),
  useToggleStatus: vi.fn(),
  useUpdate1: vi.fn(),
}))

const mutateSpy = vi.fn()

function mockProductDetail(overrides: Record<string, unknown> = {}) {
  vi.mocked(useGetDetail).mockReturnValue({
    data: {
      status: 200,
      data: {
        id: 'prod-1',
        name: 'Áo Sơ Mi Lụa Cao Cấp',
        slug: 'ao-so-mi-lua-cao-cap',
        categoryId: 'cat-1',
        status: 'ACTIVE',
        description: 'Mô tả áo sơ mi lụa',
        images: [
          { uploadId: 'img-1', url: 'https://s3.test/1.jpg' },
          { uploadId: 'img-2', url: 'https://s3.test/2.jpg' },
          { uploadId: 'img-3', url: 'https://s3.test/3.jpg' },
        ],
        videoUrl: null,
        videoUploadId: null,
        garmentUrl: 'https://s3.test/garment.jpg',
        garmentUploadId: 'garment-1',
        tryOnEnabled: true,
        material: 'Lụa',
        origin: 'Việt Nam',
        careInstructions: 'Giặt tay',
        sizeGuide: 'M, L',
        weightGrams: 300,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 5,
        variants: [
          {
            id: 'var-1',
            sku: 'ASM-LUA-M',
            size: 'M',
            color: 'Trắng',
            price: 299000,
            compareAtPrice: 350000,
            stockQuantity: 20,
            defaultVariant: true,
          },
        ],
        ...overrides,
      },
    },
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useGetDetail>)
}

beforeEach(function () {
  mutateSpy.mockReset()
  vi.mocked(useGetAuditLogs).mockReturnValue({
    data: { status: 200, data: [] },
    isPending: false,
  } as unknown as ReturnType<typeof useGetAuditLogs>)
  vi.mocked(useToggleStatus).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useToggleStatus>)
  vi.mocked(useUpdate1).mockReturnValue({
    mutate: mutateSpy,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdate1>)
})

afterEach(function () {
  cleanup()
})

function renderEditTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SellerEditProductTab shopId="shop-1" productId="prod-1" onBack={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('SellerEditProductTab - validate ảnh Garment khi bật thử đồ ảo', () => {
  it('chặn lưu và hiển thị lỗi tiếng Việt khi tryOnEnabled=true nhưng người bán xóa ảnh Garment', async function () {
    mockProductDetail({
      tryOnEnabled: true,
      garmentUrl: 'https://s3.test/garment.jpg',
      garmentUploadId: 'garment-1',
    })

    renderEditTab()

    const removeGarmentBtn = await screen.findByRole('button', { name: 'Xóa ảnh garment' })
    fireEvent.click(removeGarmentBtn)

    const saveBtn = screen.getByRole('button', { name: 'Lưu thay đổi' })
    fireEvent.click(saveBtn)

    await waitFor(function () {
      expect(
        screen.getByText(
          'Ảnh garment (trải phẳng trên nền trắng) là bắt buộc khi bật tính năng thử đồ ảo.',
        ),
      ).toBeTruthy()
    })

    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('chặn lưu khi sản phẩm bật tryOnEnabled=true nhưng garmentUploadId bị rỗng', async function () {
    mockProductDetail({
      tryOnEnabled: true,
      garmentUrl: null,
      garmentUploadId: null,
    })

    renderEditTab()

    const saveBtn = await screen.findByRole('button', { name: 'Lưu thay đổi' })
    fireEvent.click(saveBtn)

    await waitFor(function () {
      expect(
        screen.getByText(
          'Ảnh garment (trải phẳng trên nền trắng) là bắt buộc khi bật tính năng thử đồ ảo.',
        ),
      ).toBeTruthy()
    })

    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('cho phép lưu bình thường khi tryOnEnabled=true và có ảnh Garment hợp lệ', async function () {
    mockProductDetail({
      tryOnEnabled: true,
      garmentUrl: 'https://s3.test/garment.jpg',
      garmentUploadId: 'garment-1',
    })

    renderEditTab()

    const saveBtn = await screen.findByRole('button', { name: 'Lưu thay đổi' })
    fireEvent.click(saveBtn)

    await waitFor(function () {
      expect(mutateSpy).toHaveBeenCalledTimes(1)
    })

    const firstCall = mutateSpy.mock.calls[0]?.[0] as {
      shopId: string
      id: string
      data: {
        tryOnEnabled: boolean
        garmentUploadId: string | null
        garmentUploadIds?: string[] | null
      }
    }
    expect(firstCall.shopId).toBe('shop-1')
    expect(firstCall.id).toBe('prod-1')
    expect(firstCall.data.tryOnEnabled).toBe(true)
    expect(firstCall.data.garmentUploadId).toBe('garment-1')
  })

  it('lưu nhiều ảnh Garment (garments) thì gửi đủ garmentUploadIds và garmentUploadId đầu tiên', async function () {
    mockProductDetail({
      tryOnEnabled: true,
      garments: [
        { id: 'gi-1', uploadId: 'garment-1', url: 'https://s3.test/g1.jpg', sortOrder: 0 },
        { id: 'gi-2', uploadId: 'garment-2', url: 'https://s3.test/g2.jpg', sortOrder: 1 },
      ],
      garmentUrl: 'https://s3.test/g1.jpg',
      garmentUploadId: 'garment-1',
    })

    renderEditTab()

    const saveBtn = await screen.findByRole('button', { name: 'Lưu thay đổi' })
    fireEvent.click(saveBtn)

    await waitFor(function () {
      expect(mutateSpy).toHaveBeenCalledTimes(1)
    })

    const firstCall = mutateSpy.mock.calls[0]?.[0] as {
      shopId: string
      id: string
      data: {
        tryOnEnabled: boolean
        garmentUploadId: string | null
        garmentUploadIds?: string[] | null
      }
    }
    expect(firstCall.data.tryOnEnabled).toBe(true)
    expect(firstCall.data.garmentUploadId).toBe('garment-1')
    expect(firstCall.data.garmentUploadIds).toEqual(['garment-1', 'garment-2'])
  })
})
