// @vitest-environment happy-dom
import { MemoryRouter } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const { sendMessageMutateMock } = vi.hoisted(() => ({
  sendMessageMutateMock: vi.fn(),
}))

vi.mock('@generated/endpoints/chat/chat', () => ({
  getMessagesQueryKey: (id: string) => ['messages', id],
  getSellerConversationsQueryKey: (params: unknown) => ['seller-conversations', params],
  useSellerConversations: () => ({
    data: {
      status: 200,
      data: [
        {
          id: 'conv-1',
          buyerId: 'buyer-1',
          shopId: 'shop-1',
          shopName: 'Áo Trắng Store',
          lastMessageText: '/product/prod-1',
          lastMessageAt: '2026-01-01T10:00:00Z',
          unreadCount: 0,
        },
      ],
    },
  }),
  useMessages: () => ({
    data: {
      status: 200,
      data: [
        {
          id: 'msg-1',
          senderType: 'BUYER',
          content: '/product/prod-1',
          sentAt: '2026-01-01T10:00:00Z',
        },
        {
          id: 'msg-2',
          senderType: 'SELLER',
          content: 'Shop gửi bạn xem ạ: /product/prod-2',
          sentAt: '2026-01-01T10:01:00Z',
        },
      ],
    },
  }),
  useSendMessage: () => ({ mutate: sendMessageMutateMock }),
  useMarkRead: () => ({ mutate: vi.fn() }),
}))

vi.mock('@generated/endpoints/seller-orders/seller-orders', () => ({
  useList5: () => ({ data: { status: 200, data: [] } }),
}))

vi.mock('@generated/endpoints/shops/shops', () => ({
  getMineQueryKey: () => ['shops-mine'],
  useUpdateProfile: () => ({ mutate: vi.fn() }),
}))

vi.mock('@generated/endpoints/seller-products-inventory/seller-products-inventory', () => ({
  useListProducts: (
    _shopId: string,
    _params: unknown,
    opts?: { query?: { enabled?: boolean } },
  ) => {
    if (opts?.query?.enabled === false) {
      return { data: undefined, isPending: false }
    }
    return {
      isPending: false,
      data: {
        status: 200,
        data: [
          {
            id: 'prod-1',
            name: 'Áo Sơ Mi Lụa Trắng',
            slug: 'ao-so-mi-lua-trang',
            status: 'ACTIVE',
            minPrice: 350000,
            maxPrice: 390000,
            defaultImageKey: 'products/ao-lua.jpg',
          },
          {
            id: 'prod-2',
            name: 'Quần Tây Ống Suông',
            slug: 'quan-tay-ong-suong',
            status: 'ACTIVE',
            minPrice: 450000,
            maxPrice: 450000,
            defaultImageKey: 'products/quan-tay.jpg',
          },
        ],
      },
    }
  },
}))

vi.mock('@generated/endpoints/products/products', () => ({
  useDetail1: (id: string, opts?: { query?: { enabled?: boolean } }) => {
    if (opts?.query?.enabled === false) {
      return { data: undefined, isPending: false }
    }
    let name = 'Áo Sơ Mi Lụa Trắng'
    let slug = 'ao-so-mi-lua-trang'
    if (id === 'prod-2') {
      name = 'Quần Tây Ống Suông'
      slug = 'quan-tay-ong-suong'
    }
    return {
      isPending: false,
      data: {
        status: 200,
        data: {
          id,
          name,
          slug,
          images: [{ s3Key: 'products/sample.jpg' }],
          variants: [{ price: 350000 }],
        },
      },
    }
  },
}))

vi.mock('@/hooks/useChatRealtime', () => ({
  useChatMessagesRealtime: vi.fn(),
  useConversationListRealtime: vi.fn(),
}))

vi.mock('@/lib/api/uploadImage', () => ({
  uploadImage: vi.fn().mockResolvedValue('chat/uploaded.jpg'),
}))

import SellerChatTab from './SellerChatTab'

describe('SellerChatTab product card & picker', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    sendMessageMutateMock.mockClear()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('ẩn link /product/... thô, hiển thị [Sản phẩm] preview và cho shop chọn gửi card sản phẩm', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SellerChatTab shopId="shop-1" autoReplyText="" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Sidebar preview dùng [Sản phẩm] thay vì đường dẫn thô
    expect(screen.getByText('[Sản phẩm]')).toBeTruthy()

    // Khung tin nhắn render card chi tiết nhưng không còn hiện chuỗi /product/prod-1 thô
    expect(screen.getAllByTestId('chat-product-card').length).toBe(2)
    expect(screen.getByText('Shop gửi bạn xem ạ:')).toBeTruthy()
    expect(screen.queryByText('/product/prod-1')).toBeNull()
    expect(screen.queryByText(/\/product\/prod-2/)).toBeNull()

    // Mở modal chọn sản phẩm của shop
    await user.click(screen.getByRole('button', { name: 'Gửi sản phẩm' }))
    expect(await screen.findByText('Chọn sản phẩm gửi cho khách')).toBeTruthy()

    // Lọc theo tên sản phẩm
    const searchInput = screen.getByPlaceholderText('Tìm sản phẩm của shop...')
    await user.type(searchInput, 'Quần Tây')

    const sendButtons = await screen.findAllByRole('button', { name: 'Gửi vào chat' })
    expect(sendButtons.length).toBe(1)

    await user.click(sendButtons[0])

    await waitFor(() => {
      expect(sendMessageMutateMock).toHaveBeenCalledWith({
        id: 'conv-1',
        data: {
          content: '/product/prod-2',
          imageKey: undefined,
        },
      })
    })
    expect(screen.queryByText('Chọn sản phẩm gửi cho khách')).toBeNull()
  })
})
