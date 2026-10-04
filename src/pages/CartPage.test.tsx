import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Toaster } from 'sonner'
import { afterEach, describe, expect, it } from 'vitest'

import CartPage from '@/pages/CartPage'
import { CartProvider } from '@/hooks/useCart'

function seedCart() {
  window.localStorage.setItem(
    'fashionstore:cart',
    JSON.stringify([
      { id: 1, name: 'Áo sơ mi lụa trắng', price: 890000, imageKey: 'mock/ao.jpg', qty: 2 },
    ]),
  )
}

afterEach(() => {
  window.localStorage.clear()
})

describe('CartPage', () => {
  it('renders lines, lets quantity change and shows the total', async () => {
    const user = userEvent.setup()
    seedCart()
    render(
      <MemoryRouter>
        <CartProvider>
          <CartPage />
        </CartProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Áo sơ mi lụa trắng')).toBeInTheDocument()
    expect(screen.getAllByText('1.780.000 ₫')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Tăng số lượng' }))

    expect(await screen.findAllByText('2.670.000 ₫')).toHaveLength(2)
  })

  it('shows an empty state linking home', async () => {
    render(
      <MemoryRouter>
        <CartProvider>
          <CartPage />
        </CartProvider>
      </MemoryRouter>,
    )

    const link = await screen.findByRole('link', { name: 'Tiếp tục mua sắm' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('toasts that checkout comes later', async () => {
    const user = userEvent.setup()
    seedCart()
    render(
      <MemoryRouter>
        <Toaster />
        <CartProvider>
          <CartPage />
        </CartProvider>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Đặt hàng' }))

    expect(await screen.findByText('Thanh toán ra mắt ở iteration sau')).toBeInTheDocument()
  })
})
