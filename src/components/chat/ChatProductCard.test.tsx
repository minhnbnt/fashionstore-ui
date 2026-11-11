// @vitest-environment happy-dom
import { MemoryRouter } from 'react-router'

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import ChatProductCard from './ChatProductCard'

vi.mock('@generated/endpoints/products/products', () => ({
  useDetail1: vi.fn().mockReturnValue({
    data: undefined,
    isPending: false,
  }),
}))

describe('ChatProductCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('hiển thị thông tin sản phẩm từ prop product', () => {
    const product = {
      id: 'prod-123',
      name: 'Áo Polo Nam Cổ Bẻ',
      slug: 'ao-polo-nam',
      defaultImageKey: 'products/polo.jpg',
      minPrice: 250000,
      maxPrice: 300000,
    }

    render(
      <MemoryRouter>
        <ChatProductCard product={product} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Áo Polo Nam Cổ Bẻ')).toBeTruthy()
    expect(screen.getByText('250.000 ₫ - 300.000 ₫')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Xem chi tiết' }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/product/ao-polo-nam')
  })

  it('gọi onSendProduct khi bấm nút Gửi vào chat', async () => {
    const user = userEvent.setup()
    const onSendProduct = vi.fn()
    const product = {
      id: 'prod-456',
      name: 'Quần Khaki Slimfit',
      slug: 'quan-khaki',
      minPrice: 350000,
    }

    render(
      <MemoryRouter>
        <ChatProductCard product={product} onSendProduct={onSendProduct} />
      </MemoryRouter>,
    )

    const btn = screen.getByRole('button', { name: 'Gửi vào chat' })
    await user.click(btn)

    expect(onSendProduct).toHaveBeenCalledWith({
      id: 'prod-456',
      name: 'Quần Khaki Slimfit',
      slug: 'quan-khaki',
    })
  })
})
